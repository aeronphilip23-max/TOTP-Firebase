// Client-side only brute force protection (works with free plan)
interface RateLimitData {
  attempts: number;
  lastAttempt: number;
  lockUntil?: number;
}

export const trackFailedLogin = async (email: string): Promise<{ isBlocked: boolean; attemptsRemaining: number; blockUntil?: number }> => {
  const key = `login_attempts_${btoa(email)}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Get existing data
  const stored = localStorage.getItem(key);
  let data: RateLimitData = stored ? JSON.parse(stored) : { attempts: 0, lastAttempt: 0 };

  // Remove old attempts outside the time window
  if (data.lastAttempt < now - windowMs) {
    data.attempts = 0;
  }

  // Add new attempt
  data.attempts += 1;
  data.lastAttempt = now;

  // Check if should block
  let isBlocked = false;
  let blockUntil: number | undefined;

  if (data.attempts >= 10) {
    // Lock for 1 hour after 10 attempts
    blockUntil = now + (60 * 60 * 1000);
    isBlocked = true;
  } else if (data.attempts >= 5) {
    // Lock for 15 minutes after 5 attempts
    blockUntil = now + (15 * 60 * 1000);
    isBlocked = true;
  }

  data.lockUntil = blockUntil;

  // Save back to localStorage
  localStorage.setItem(key, JSON.stringify(data));

  return {
    isBlocked,
    attemptsRemaining: Math.max(0, maxAttempts - data.attempts),
    blockUntil
  };
};

export const checkIPStatus = async (): Promise<{ isBlocked: boolean; attemptsRemaining: number; blockUntil?: number }> => {
  // For client-side, we'll use a session-based approach
  const key = 'current_login_attempts';
  const stored = sessionStorage.getItem(key);
  const attempts = stored ? parseInt(stored) : 0;
  
  return {
    isBlocked: false, // Client-side can't reliably block by IP
    attemptsRemaining: Math.max(0, 5 - attempts)
  };
};

export const resetFailedAttempts = async (email: string): Promise<{ success: boolean }> => {
  const key = `login_attempts_${btoa(email)}`;
  localStorage.removeItem(key);
  sessionStorage.removeItem('current_login_attempts');
  return { success: true };
};

// Track current session attempts
export const trackSessionAttempt = () => {
  const key = 'current_login_attempts';
  const stored = sessionStorage.getItem(key);
  const attempts = stored ? parseInt(stored) + 1 : 1;
  sessionStorage.setItem(key, attempts.toString());
  return attempts;
};

export const getClientIP = async (): Promise<string> => {
  // For client-side, we'll use email-based tracking instead of IP
  return 'client';
};