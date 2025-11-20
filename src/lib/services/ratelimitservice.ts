// lib/services/ratelimitservice.ts
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface RateLimitStatus {
  attempts: number;
  attemptsRemaining: number;
  isBlocked: boolean;
  blockUntil: number | null;
  blockCount: number;
  isAuthorizedEmail?: boolean; // NEW: Track if this is an authorized email
}

// Helper to calculate block duration
const calculateBlockDuration = (blockCount: number): number => {
  const baseBlockDuration = 15 * 60 * 1000; // 15 minutes
  const progressiveBlockDuration = baseBlockDuration * Math.pow(2, blockCount);
  return Math.min(progressiveBlockDuration, 24 * 60 * 60 * 1000); // Max 24 hours
};

export const checkRateLimit = async (email: string): Promise<RateLimitStatus> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    const now = Date.now();
    const maxAttempts = 5;

    const docSnap = await getDoc(rateLimitRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const lastAttempt = data.lastAttempt?.toDate?.()?.getTime() || data.lastAttempt;
      const blockCount = data.blockCount || 0;
      const blockDuration = calculateBlockDuration(blockCount);
      const isAuthorizedEmail = data.isAuthorizedEmail || false; // NEW: Get authorized status
      
      // Reset if block time has passed and account was blocked
      if (data.isBlocked && data.blockUntil && (now > data.blockUntil)) {
        await setDoc(rateLimitRef, {
          attempts: 0,
          lastAttempt: serverTimestamp(),
          isBlocked: false,
          blockUntil: null,
          blockCount: blockCount, // Keep the block count for progressive blocking
          email: normalizedEmail,
          isAuthorizedEmail: isAuthorizedEmail // NEW: Preserve authorized status
        });
        return {
          attempts: 0,
          attemptsRemaining: maxAttempts,
          isBlocked: false,
          blockUntil: null,
          blockCount: blockCount,
          isAuthorizedEmail: isAuthorizedEmail // NEW: Return authorized status
        };
      }

      // If still blocked
      if (data.isBlocked && data.blockUntil) {
        return {
          attempts: data.attempts,
          attemptsRemaining: 0,
          isBlocked: true,
          blockUntil: data.blockUntil,
          blockCount,
          isAuthorizedEmail: isAuthorizedEmail // NEW: Return authorized status
        };
      }

      return {
        attempts: data.attempts,
        attemptsRemaining: Math.max(0, maxAttempts - data.attempts),
        isBlocked: false,
        blockUntil: null,
        blockCount,
        isAuthorizedEmail: isAuthorizedEmail // NEW: Return authorized status
      };
    } else {
      // No record exists - assume it's not an authorized email until proven otherwise
      return {
        attempts: 0,
        attemptsRemaining: maxAttempts,
        isBlocked: false,
        blockUntil: null,
        blockCount: 0,
        isAuthorizedEmail: false // NEW: Default to false for new emails
      };
    }
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return {
      attempts: 0,
      attemptsRemaining: 5,
      isBlocked: false,
      blockUntil: null,
      blockCount: 0,
      isAuthorizedEmail: false // NEW: Default to false on error
    };
  }
};

// NEW FUNCTION: Mark an email as authorized (call this when user signs up or email is verified)
export const markEmailAsAuthorized = async (email: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    
    const docSnap = await getDoc(rateLimitRef);
    if (docSnap.exists()) {
      await updateDoc(rateLimitRef, {
        isAuthorizedEmail: true,
        lastUpdated: serverTimestamp()
      });
    } else {
      await setDoc(rateLimitRef, {
        attempts: 0,
        lastAttempt: serverTimestamp(),
        isBlocked: false,
        blockUntil: null,
        blockCount: 0,
        email: normalizedEmail,
        isAuthorizedEmail: true, // NEW: Mark as authorized
        created: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error marking email as authorized:', error);
  }
};

// UPDATED: trackFailedLogin now handles both authorized and unauthorized emails
export const trackFailedLogin = async (email: string, errorCode?: string): Promise<RateLimitStatus> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    const now = Date.now();
    const maxAttempts = 5;

    // Use transaction to prevent race conditions
    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(rateLimitRef);
      
      // NEW: Handle user-not-found errors (unauthorized emails)
      if (errorCode === 'auth/user-not-found') {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // For unauthorized emails, we don't increment attempts but we track the attempt
          transaction.update(rateLimitRef, {
            lastAttempt: serverTimestamp(),
            isAuthorizedEmail: false, // NEW: Ensure it's marked as unauthorized
            email: normalizedEmail
          });
          
          return {
            attempts: data.attempts || 0,
            attemptsRemaining: Math.max(0, maxAttempts - (data.attempts || 0)),
            isBlocked: data.isBlocked || false,
            blockUntil: data.blockUntil || null,
            blockCount: data.blockCount || 0,
            isAuthorizedEmail: false // NEW: Return unauthorized status
          };
        } else {
          // First attempt with unauthorized email
          transaction.set(rateLimitRef, {
            attempts: 0, // NEW: Don't count attempts for unauthorized emails
            lastAttempt: serverTimestamp(),
            isBlocked: false,
            blockUntil: null,
            blockCount: 0,
            isAuthorizedEmail: false, // NEW: Mark as unauthorized
            email: normalizedEmail,
            created: serverTimestamp()
          });

          return {
            attempts: 0,
            attemptsRemaining: maxAttempts,
            isBlocked: false,
            blockUntil: null,
            blockCount: 0,
            isAuthorizedEmail: false // NEW: Return unauthorized status
          };
        }
      }
      
      // EXISTING LOGIC for authorized emails (wrong-password, invalid-credential, etc.)
      if (docSnap.exists()) {
        const data = docSnap.data();
        const blockCount = data.blockCount || 0;
        const blockDuration = calculateBlockDuration(blockCount);
        const isAuthorizedEmail = data.isAuthorizedEmail || true; // Assume authorized for existing records
        
        // Check if currently blocked
        if (data.isBlocked && data.blockUntil && now < data.blockUntil) {
          return {
            attempts: data.attempts,
            attemptsRemaining: 0,
            isBlocked: true,
            blockUntil: data.blockUntil,
            blockCount,
            isAuthorizedEmail: true // NEW: Return authorized status
          };
        }
        
        // Reset if block time has passed
        if (data.isBlocked && data.blockUntil && now >= data.blockUntil) {
          const newAttempts = 1; // Start fresh but keep block count
          transaction.set(rateLimitRef, {
            attempts: newAttempts,
            lastAttempt: serverTimestamp(),
            isBlocked: false,
            blockUntil: null,
            blockCount: blockCount, // Keep the progressive block count
            isAuthorizedEmail: true, // NEW: Mark as authorized
            email: normalizedEmail
          });
          
          return {
            attempts: newAttempts,
            attemptsRemaining: maxAttempts - newAttempts,
            isBlocked: false,
            blockUntil: null,
            blockCount,
            isAuthorizedEmail: true // NEW: Return authorized status
          };
        }
        
        // Increment attempts for non-blocked authorized account
        const newAttempts = data.attempts + 1;
        const isNowBlocked = newAttempts >= maxAttempts;
        const newBlockCount = isNowBlocked ? blockCount + 1 : blockCount;
        const newBlockUntil = isNowBlocked ? now + calculateBlockDuration(newBlockCount) : null;
        
        transaction.update(rateLimitRef, {
          attempts: newAttempts,
          lastAttempt: serverTimestamp(),
          isBlocked: isNowBlocked,
          blockUntil: newBlockUntil,
          blockCount: newBlockCount,
          isAuthorizedEmail: true // NEW: Ensure it's marked as authorized
        });

        return {
          attempts: newAttempts,
          attemptsRemaining: Math.max(0, maxAttempts - newAttempts),
          isBlocked: isNowBlocked,
          blockUntil: newBlockUntil,
          blockCount: newBlockCount,
          isAuthorizedEmail: true // NEW: Return authorized status
        };
      } else {
        // First attempt - assume it's authorized until proven otherwise
        transaction.set(rateLimitRef, {
          attempts: 1,
          lastAttempt: serverTimestamp(),
          isBlocked: false,
          blockUntil: null,
          blockCount: 0,
          isAuthorizedEmail: true, // NEW: Default to authorized for new records
          email: normalizedEmail,
          created: serverTimestamp()
        });

        return {
          attempts: 1,
          attemptsRemaining: maxAttempts - 1,
          isBlocked: false,
          blockUntil: null,
          blockCount: 0,
          isAuthorizedEmail: true // NEW: Return authorized status
        };
      }
    });
  } catch (error) {
    console.error('Error tracking failed login:', error);
    return {
      attempts: 0,
      attemptsRemaining: 5,
      isBlocked: false,
      blockUntil: null,
      blockCount: 0,
      isAuthorizedEmail: false // NEW: Default to false on error
    };
  }
};

export const resetFailedAttempts = async (email: string): Promise<void> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    
    await setDoc(rateLimitRef, {
      attempts: 0,
      lastAttempt: serverTimestamp(),
      isBlocked: false,
      blockUntil: null,
      blockCount: 0,
      isAuthorizedEmail: true, // NEW: Mark as authorized on successful login
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
};