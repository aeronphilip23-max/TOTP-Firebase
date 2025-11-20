import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Use a scheduled function to periodically check for email verification changes
export const checkEmailVerifications = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  try {
    // Get all users who might need verification status updates
    // This is a simplified approach - in production you'd want more sophisticated logic
    const usersSnapshot = await admin.firestore().collection('users')
      .where('emailVerified', '==', false)
      .limit(100)
      .get();
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      try {
        // Get the latest auth state for this user
        const authUser = await admin.auth().getUser(userData.id);
        
        if (authUser.emailVerified && !userData.emailVerified) {
          // Update Firestore if email was verified
          await admin.firestore().collection('users').doc(userData.id).update({
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
          });
          
          console.log(`Updated email verification status for user: ${userData.id}`);
        }
      } catch (error) {
        console.error(`Error checking user ${userData.id}:`, error);
      }
    }
    
    console.log('Email verification check completed');
  } catch (error) {
    console.error('Error in email verification check:', error);
  }
});

// Sync user creation from Auth to Firestore
export const onUserCreated = functions.auth.user().onCreate(async (user: admin.auth.UserRecord) => {
  try {
    // Check if user document already exists
    const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      // Create basic user document
      await admin.firestore().collection('users').doc(user.uid).set({
        id: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        role: 'staff', // Default role
        emailVerified: user.emailVerified || false,
        createdAt: new Date().toISOString(),
        status: 'active',
        authProvider: user.providerData[0]?.providerId || 'email_password',
      });
      
      console.log(`Created Firestore document for new user: ${user.uid}`);
    }
  } catch (error) {
    console.error('Error creating user document:', error);
  }
});