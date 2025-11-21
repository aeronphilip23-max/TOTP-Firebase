import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

// Initialize Firebase Admin
admin.initializeApp();

// Configuration optimized for production
const CONFIG = {
  BATCH_SIZE: 50,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

// Utility function for retry logic
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, CONFIG.RETRY_DELAY * attempt)
        );
      }
    }
  }
  
  throw lastError!;
};

// Email verification check
export const checkEmailVerifications = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'UTC',
  },
  async (event) => {
    const batch = admin.firestore().batch();
    let processedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];
    
    try {
      // Get recent unverified users
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('emailVerified', '==', false)
        .where('createdAt', '>', thirtyDaysAgo.toISOString())
        .orderBy('createdAt', 'desc')
        .limit(CONFIG.BATCH_SIZE)
        .get();

      if (usersSnapshot.empty) {
        console.log('No unverified users found in recent period');
        return;
      }

      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        processedCount++;

        try {
          const authUser = await retryOperation(() => 
            admin.auth().getUser(userData.id)
          );

          if (authUser.emailVerified && !userData.emailVerified) {
            batch.update(doc.ref, {
              emailVerified: true,
              emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
            updatedCount++;
            console.log(`Queued verification update for user: ${userData.id}`);
          }
        } catch (error) {
          const errorMsg = `User ${userData.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`Error processing user ${userData.id}:`, error);
        }
      }

      
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`Successfully updated ${updatedCount} users' verification status`);
      }
      
      console.log(`Email verification check completed: Processed ${processedCount} users, updated ${updatedCount} users`);
      
      
      if (errors.length > 0) {
        await logBulkError('checkEmailVerifications', errors);
      }
      
    } catch (error) {
      console.error('Critical error in email verification check:', error);
      await logErrorToMonitoring('checkEmailVerifications', error as Error);
    }
  }
);

// User creation - using blocking function
export const onUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  
  // Check if user data exists
  if (!user || !user.uid) {
    console.error('User data is undefined or missing uid');
    return;
  }
  
  if (!checkRateLimit('user_creation', 50, 60000)) {
    console.warn('Rate limit exceeded for user creation events');
    return;
  }

  const userRef = admin.firestore().collection('users').doc(user.uid);
  const userData = {
    id: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    role: 'staff',
    emailVerified: user.emailVerified || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    status: 'active',
    authProvider: user.providerData && user.providerData.length > 0 
      ? user.providerData[0].providerId 
      : 'email_password',
    photoURL: user.photoURL || null,
    phoneNumber: user.phoneNumber || null,
  };

  try {
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set(userData);
      console.log(`Created Firestore document for new user: ${user.uid}`);
    } else {
      await userRef.update({
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        ...(user.emailVerified && { emailVerified: true }),
      });
      console.log(`Updated existing user document: ${user.uid}`);
    }
    
    await logUserEvent(user.uid, 'user_created', {
      provider: userData.authProvider,
      email_verified: user.emailVerified,
    });
    
  } catch (error) {
    console.error('Error in user creation process:', error);
    await logErrorToMonitoring('onUserCreated', error as Error, {
      userId: user.uid,
      email: user.email,
    });
  }
});

// Utility functions
async function logErrorToMonitoring(
  functionName: string, 
  error: Error, 
  context?: Record<string, any>
): Promise<void> {
  try {
    const errorData = {
      function: functionName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context,
    };
    
    await admin.firestore()
      .collection('errorLogs')
      .add(errorData);
    
    console.error('MONITORING_ERROR:', JSON.stringify(errorData));
  } catch (logError) {
    console.error('Failed to log error to monitoring:', logError);
  }
}

async function logBulkError(
  functionName: string, 
  errors: string[]
): Promise<void> {
  try {
    await admin.firestore()
      .collection('bulkErrorLogs')
      .add({
        function: functionName,
        errors: errors.slice(0, 10),
        errorCount: errors.length,
        timestamp: new Date().toISOString(),
      });
  } catch (logError) {
    console.error('Failed to log bulk errors:', logError);
  }
}

async function logUserEvent(
  userId: string, 
  eventType: string, 
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await admin.firestore()
      .collection('userEvents')
      .add({
        userId,
        eventType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata,
      });
  } catch (error) {
    console.error('Failed to log user event:', error);
  }
}


export const healthCheck = onRequest(async (req, res) => {
  try {
    await admin.firestore().collection('health').doc('check').set({
      timestamp: new Date().toISOString(),
      status: 'healthy',
    });
    
    await admin.auth().listUsers(1);
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        firestore: 'connected',
        auth: 'connected',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});