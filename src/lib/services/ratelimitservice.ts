import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export interface DDoSMetrics {
  requestCount: number;
  uniqueIPs: Set<string>;
  blockedIPs: Set<string>;
  startTime: number;
}

export interface IPBehavior {
  requestCount: number;
  lastRequest: number;
  score: number;
  isBlocked: boolean;
  blockedUntil?: number;
}

export interface RateLimitStatus {
  attempts: number;
  attemptsRemaining: number;
  isBlocked: boolean;
  blockUntil: number | null;
  blockCount: number;
  isAuthorizedEmail?: boolean;
}

// DDoS Configuration
const DDoS_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.DDOS_MAX_REQUESTS_PER_MINUTE || '1000'),
  MAX_REQUESTS_PER_IP_PER_MINUTE: parseInt(process.env.DDOS_MAX_REQUESTS_PER_IP || '100'),
  SUSPICIOUS_THRESHOLD: parseInt(process.env.DDOS_SUSPICIOUS_THRESHOLD || '50'),
  BLOCK_DURATION: parseInt(process.env.DDOS_BLOCK_DURATION || '900000'),
};

// Global DDoS metrics
const ddosMetrics: DDoSMetrics = {
  requestCount: 0,
  uniqueIPs: new Set(),
  blockedIPs: new Set(),
  startTime: Date.now(),
};

const ipBehaviorMap = new Map<string, IPBehavior>();

// DDoS Protection Functions
export const checkDDoSProtection = async (ip: string): Promise<{ allowed: boolean; reason?: string }> => {
  const now = Date.now();
  
  // Reset metrics every minute
  if (now - ddosMetrics.startTime > 60000) {
    ddosMetrics.requestCount = 0;
    ddosMetrics.uniqueIPs.clear();
    ddosMetrics.startTime = now;
  }

  // Update global metrics
  ddosMetrics.requestCount++;
  ddosMetrics.uniqueIPs.add(ip);

  // Check global rate limit
  if (ddosMetrics.requestCount > DDoS_CONFIG.MAX_REQUESTS_PER_MINUTE) {
    console.log(`🚨 Global rate limit exceeded: ${ddosMetrics.requestCount} requests`);
    return { allowed: false, reason: 'global_rate_limit_exceeded' };
  }

  // Check per-IP behavior
  let ipBehavior = ipBehaviorMap.get(ip);
  if (!ipBehavior) {
    ipBehavior = {
      requestCount: 0,
      lastRequest: now,
      score: 0,
      isBlocked: false,
    };
    ipBehaviorMap.set(ip, ipBehavior);
  }

  // Reset IP counter every minute
  if (now - ipBehavior.lastRequest > 60000) {
    ipBehavior.requestCount = 0;
    ipBehavior.score = Math.max(0, ipBehavior.score - 10); // Decay score
  }

  ipBehavior.requestCount++;
  ipBehavior.lastRequest = now;

  // Check if IP is blocked
  if (ipBehavior.isBlocked && ipBehavior.blockedUntil && now < ipBehavior.blockedUntil) {
    return { allowed: false, reason: 'ip_temporarily_blocked' };
  }

  // Unblock if block time expired
  if (ipBehavior.isBlocked && ipBehavior.blockedUntil && now >= ipBehavior.blockedUntil) {
    ipBehavior.isBlocked = false;
    ipBehavior.blockedUntil = undefined;
    ipBehavior.requestCount = 0;
  }

  // Check per-IP rate limit
  if (ipBehavior.requestCount > DDoS_CONFIG.MAX_REQUESTS_PER_IP_PER_MINUTE) {
    ipBehavior.score += 20;
    ipBehavior.isBlocked = true;
    ipBehavior.blockedUntil = now + DDoS_CONFIG.BLOCK_DURATION;
    ddosMetrics.blockedIPs.add(ip);
    
    console.log(`🚨 IP ${ip} blocked for DDoS-like behavior`);
    return { allowed: false, reason: 'ip_rate_limit_exceeded' };
  }

  // Check suspicious score
  if (ipBehavior.score > DDoS_CONFIG.SUSPICIOUS_THRESHOLD) {
    ipBehavior.isBlocked = true;
    ipBehavior.blockedUntil = now + DDoS_CONFIG.BLOCK_DURATION;
    return { allowed: false, reason: 'suspicious_behavior' };
  }

  return { allowed: true };
};

export const getDDoSMetrics = (): DDoSMetrics => {
  return {
    ...ddosMetrics,
    uniqueIPs: new Set(ddosMetrics.uniqueIPs),
    blockedIPs: new Set(ddosMetrics.blockedIPs),
  };
};

export const reportSuspiciousBehavior = (ip: string, reason: string, severity: number = 10): void => {
  let ipBehavior = ipBehaviorMap.get(ip);
  if (!ipBehavior) {
    ipBehavior = {
      requestCount: 0,
      lastRequest: Date.now(),
      score: 0,
      isBlocked: false,
    };
    ipBehaviorMap.set(ip, ipBehavior);
  }

  ipBehavior.score += severity;
  console.log(`⚠️ Suspicious behavior from IP ${ip}: ${reason} (score: ${ipBehavior.score})`);
};

// Existing Rate Limit Functions
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
      const isAuthorizedEmail = data.isAuthorizedEmail || false;
      
      // Reset if block time has passed and account was blocked
      if (data.isBlocked && data.blockUntil && (now > data.blockUntil)) {
        await setDoc(rateLimitRef, {
          attempts: 0,
          lastAttempt: serverTimestamp(),
          isBlocked: false,
          blockUntil: null,
          blockCount: blockCount,
          email: normalizedEmail,
          isAuthorizedEmail: isAuthorizedEmail
        });
        return {
          attempts: 0,
          attemptsRemaining: maxAttempts,
          isBlocked: false,
          blockUntil: null,
          blockCount: blockCount,
          isAuthorizedEmail: isAuthorizedEmail
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
          isAuthorizedEmail: isAuthorizedEmail
        };
      }

      return {
        attempts: data.attempts,
        attemptsRemaining: Math.max(0, maxAttempts - data.attempts),
        isBlocked: false,
        blockUntil: null,
        blockCount,
        isAuthorizedEmail: isAuthorizedEmail
      };
    } else {
      // No record exists - assume it's not an authorized email until proven otherwise
      return {
        attempts: 0,
        attemptsRemaining: maxAttempts,
        isBlocked: false,
        blockUntil: null,
        blockCount: 0,
        isAuthorizedEmail: false
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
      isAuthorizedEmail: false
    };
  }
};

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
        isAuthorizedEmail: true,
        created: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error marking email as authorized:', error);
  }
};

export const trackFailedLogin = async (email: string, errorCode?: string): Promise<RateLimitStatus> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitRef = doc(db, 'rateLimits', normalizedEmail);
    const now = Date.now();
    const maxAttempts = 5;

    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(rateLimitRef);
      
      if (errorCode === 'auth/user-not-found') {
        if (docSnap.exists()) {
          const data = docSnap.data();
          transaction.update(rateLimitRef, {
            lastAttempt: serverTimestamp(),
            isAuthorizedEmail: false,
            email: normalizedEmail
          });
          
          return {
            attempts: data.attempts || 0,
            attemptsRemaining: Math.max(0, maxAttempts - (data.attempts || 0)),
            isBlocked: data.isBlocked || false,
            blockUntil: data.blockUntil || null,
            blockCount: data.blockCount || 0,
            isAuthorizedEmail: false
          };
        } else {
          transaction.set(rateLimitRef, {
            attempts: 0,
            lastAttempt: serverTimestamp(),
            isBlocked: false,
            blockUntil: null,
            blockCount: 0,
            isAuthorizedEmail: false,
            email: normalizedEmail,
            created: serverTimestamp()
          });

          return {
            attempts: 0,
            attemptsRemaining: maxAttempts,
            isBlocked: false,
            blockUntil: null,
            blockCount: 0,
            isAuthorizedEmail: false
          };
        }
      }
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const blockCount = data.blockCount || 0;
        const blockDuration = calculateBlockDuration(blockCount);
        const isAuthorizedEmail = data.isAuthorizedEmail || true;
        
        if (data.isBlocked && data.blockUntil && now < data.blockUntil) {
          return {
            attempts: data.attempts,
            attemptsRemaining: 0,
            isBlocked: true,
            blockUntil: data.blockUntil,
            blockCount,
            isAuthorizedEmail: true
          };
        }
        
        if (data.isBlocked && data.blockUntil && now >= data.blockUntil) {
          const newAttempts = 1;
          transaction.set(rateLimitRef, {
            attempts: newAttempts,
            lastAttempt: serverTimestamp(),
            isBlocked: false,
            blockUntil: null,
            blockCount: blockCount,
            isAuthorizedEmail: true,
            email: normalizedEmail
          });
          
          return {
            attempts: newAttempts,
            attemptsRemaining: maxAttempts - newAttempts,
            isBlocked: false,
            blockUntil: null,
            blockCount,
            isAuthorizedEmail: true
          };
        }
        
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
          isAuthorizedEmail: true
        });

        return {
          attempts: newAttempts,
          attemptsRemaining: Math.max(0, maxAttempts - newAttempts),
          isBlocked: isNowBlocked,
          blockUntil: newBlockUntil,
          blockCount: newBlockCount,
          isAuthorizedEmail: true
        };
      } else {
        transaction.set(rateLimitRef, {
          attempts: 1,
          lastAttempt: serverTimestamp(),
          isBlocked: false,
          blockUntil: null,
          blockCount: 0,
          isAuthorizedEmail: true,
          email: normalizedEmail,
          created: serverTimestamp()
        });

        return {
          attempts: 1,
          attemptsRemaining: maxAttempts - 1,
          isBlocked: false,
          blockUntil: null,
          blockCount: 0,
          isAuthorizedEmail: true
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
      isAuthorizedEmail: false
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
      isAuthorizedEmail: true,
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
};