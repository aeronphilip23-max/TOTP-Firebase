"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type MultiFactorResolver,
  getMultiFactorResolver,
  getAuth,
  type MultiFactorError,
  sendPasswordResetEmail,
  multiFactor,
  signOut,
  sendEmailVerification,
} from "firebase/auth"
import { doc, getDoc, getFirestore } from "firebase/firestore"
import { auth } from "@/src/lib/firebase"
import { Package, Eye, EyeOff, ArrowLeft, Mail, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import { 
  trackFailedLogin, 
  resetFailedAttempts,
  checkRateLimit 
} from '@/src/lib/services/ratelimitservice'

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [mfaLoading, setMfaLoading] = useState(false)
  const [showForgotDialog, setShowForgotDialog] = useState(false)
  const [resetEmailValue, setResetEmailValue] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isAccountBlocked, setIsAccountBlocked] = useState(false)
  const [blockUntil, setBlockUntil] = useState<number | null>(null)
  const [blockCount, setBlockCount] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [resetSuccess, setResetSuccess] = useState(false)
  const router = useRouter()

  // Countdown timer effect
  useEffect(() => {
    if (!blockUntil) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const timeLeft = blockUntil - now;

      if (timeLeft <= 0) {
        setIsAccountBlocked(false);
        setBlockUntil(null);
        setCountdown("");
        return;
      }

      // Format countdown display
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [blockUntil]);

  // Calculate progressive block duration (5 minutes + 5 minutes each subsequent block, max 24 hours)
  const calculateBlockDuration = (blockCount: number): number => {
    const baseMinutes = 5;
    const progressiveMinutes = baseMinutes + (baseMinutes * blockCount);
    const maxMinutes = 24 * 60; // 24 hours in minutes
    return Math.min(progressiveMinutes, maxMinutes) * 60 * 1000; // Convert to milliseconds
  };

  // Helper to display progressive block duration
  const getBlockDurationDisplay = (blockCount: number): string => {
    if (blockCount === 1) {
      return "5 minutes";
    } else if (blockCount === 2) {
      return "10 minutes";
    } else {
      const baseMinutes = 15;
      const progressiveMinutes = baseMinutes * Math.pow(2, blockCount - 3);
      const finalMinutes = Math.min(progressiveMinutes, 24 * 60);
      
      if (finalMinutes < 60) {
        return `${finalMinutes} minutes`;
      } else if (finalMinutes < 24 * 60) {
        const hours = Math.ceil(finalMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return "24 hours";
      }
    }
  };

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // FIXED: Check if account is currently blocked - proper validation
  const isCurrentlyBlocked = (): boolean => {
    if (!blockUntil) return false;
    const now = Date.now();
    return now < blockUntil;
  };

  // Function to set ID token and user role as cookies for middleware
  const setAuthCookies = async (user: any, role: string = 'user') => {
    try {
      const idToken = await user.getIdToken();
      
      // Use SameSite=Lax instead of strict for better compatibility
      const cookieOptions = `path=/; max-age=3600; SameSite=Lax`;
      
      document.cookie = `idToken=${idToken}; ${cookieOptions}`;
      document.cookie = `userRole=${role}; ${cookieOptions}`;
      
      console.log("✅ Auth cookies set successfully");
      console.log("🔐 Role set to:", role);
      console.log("📱 ID Token length:", idToken.length);
      
      // Verify cookies were set
      const cookiesSet = document.cookie.includes('idToken') && document.cookie.includes('userRole');
      console.log("🍪 Cookies verified:", cookiesSet);
      
    } catch (error) {
      console.error("❌ Error setting auth cookies:", error);
    }
  };

  // Get user role and set cookies
  const getUserRoleAndSetCookies = async (user: any) => {
    try {
      const db = getFirestore()
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const role = userData.role || 'user'
        
        console.log("🎯 User role from Firestore:", role)
        console.log("📊 User data:", userData)
        
        await setAuthCookies(user, role);
        return role;
      } else {
        console.error("No user document found for UID:", user.uid)
        await setAuthCookies(user, 'user');
        return 'user';
      }
    } catch (error) {
      console.error("Error getting user role:", error);
      await setAuthCookies(user, 'user');
      return 'user';
    }
  };

  // Navigation based on role
  const navigateBasedOnRole = async (role: string) => {
    console.log("🎯 NAVIGATION DEBUG:");
    console.log("Role received:", role);
    
    // Add a small delay to ensure cookies are set
    setTimeout(() => {
      const currentPath = window.location.pathname;
      
      // Only redirect if we're still on a login/auth page
      if (currentPath.includes('/auth/')) {
        switch (role) {
          case 'admin':
            console.log("Redirecting to ADMIN dashboard");
            window.location.replace("/dashboard/admin/dashboard");
            break;
          case 'user':
          default:
            console.log("Redirecting to STAFF dashboard");
            window.location.replace("/dashboard/staff");
            break;
        }
      }
    }, 200);
  };

  // Resend email verification
  const handleResendVerification = async () => {
    setResendVerificationLoading(true);
    setError("");

    try {
      // Create a temporary auth instance to send verification email
      const tempAuth = getAuth();
      const user = tempAuth.currentUser;
      
      if (user) {
        await sendEmailVerification(user);
        setVerificationSent(true);
        setError("");
      } else {
        // If no user is currently signed in, try to sign in temporarily to send verification
        const userCredential = await signInWithEmailAndPassword(tempAuth, email, password);
        await sendEmailVerification(userCredential.user);
        // Sign out the temporary user
        await signOut(tempAuth);
        setVerificationSent(true);
        setError("");
      }
    } catch (err: any) {
      console.error("Error sending verification email:", err);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setResendVerificationLoading(false);
    }
  };

  // FIXED HANDLE SUBMIT - WITH PROPER BRUTE FORCE PROTECTION VALIDATION
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // ✅ Validate email format with @ symbol
    if (!validateEmail(email)) {
      setError("Please enter a valid email address with @ symbol.");
      return;
    }

    // Check if account is currently blocked using proper validation
    if (isCurrentlyBlocked() && blockUntil) {
      const blockDuration = getBlockDurationDisplay(blockCount);
      setError(`${blockDuration}.${countdown}`);
      return;
    }

    setLoading(true)
    setError("")
    setMfaRequired(false)
    setEmailNotVerified(false)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log("Logged in! User UID:", user.uid)
      
      // CHECK IF EMAIL IS VERIFIED
      if (!user.emailVerified) {
        setEmailNotVerified(true);
        setError("Please verify your email address before logging in.");
        
        // Sign out the user since they're not verified
        await signOut(auth);
        setLoading(false);
        return;
      }
      
      // Reset failed attempts on successful login
      try {
        await resetFailedAttempts(email);
      } catch (error) {
        console.error("Error resetting failed attempts:", error);
        // Continue even if reset fails
      }
      
      setFailedAttempts(0);
      setIsAccountBlocked(false);
      setBlockUntil(null);
      setBlockCount(0);
      
      // Direct navigation without TOTP setup check
      if (!isRedirecting) {
        setIsRedirecting(true);
        const role = await getUserRoleAndSetCookies(user);
        
        // Add a small delay to ensure everything is processed
        setTimeout(() => {
          navigateBasedOnRole(role);
        }, 500);
      }
            
    } catch (err: any) {
      console.log("Login error:", err);
      
      // Handle authentication errors with proper logic
      if (err?.code === "auth/user-not-found") {
        // Email doesn't exist in the system - show unauthorized message
        setError("Not authorized email. Please check your email address.");
        await trackFailedLogin(email, 'auth/user-not-found');
        
        
      } else if (err?.code === "auth/wrong-password" || 
                err?.code === "auth/invalid-credential" ||
                err?.code === "auth/too-many-requests") {
        
        // ✅ ONLY track failed attempts for authorized emails (wrong password on existing account)
        try {
          const newStatus = await trackFailedLogin(email, err.code);
          
          console.log("New rate limit status:", newStatus);
          
          // Update all states
          setFailedAttempts(newStatus.attempts);
          setIsAccountBlocked(newStatus.isBlocked);
          setBlockUntil(newStatus.blockUntil);
          setBlockCount(newStatus.blockCount || 0);
          
          if (newStatus.isBlocked && newStatus.blockUntil) {
            // Account is now blocked - show our custom blocking message
            const blockDuration = getBlockDurationDisplay(newStatus.blockCount || 0);
            setError(` ${countdown}`);
          } else {
            // Account not blocked yet - show remaining attempts
            const attemptsLeft = 5 - newStatus.attempts;
            setError(`Invalid credentials. ${attemptsLeft} attempt(s) remaining.`);
          }
        } catch (rateLimitError) {
          console.error("Error tracking failed login:", rateLimitError);
          // Fallback error message if rate limit service fails
          setError("Invalid credentials. Please try again.");
        }
      } else if (err?.code === "auth/multi-factor-auth-required") {
        const mfaResolver = getMultiFactorResolver(getAuth(), err as MultiFactorError)
        setMfaResolver(mfaResolver)
        setMfaRequired(true)
        setError("Multi-factor authentication required. Please enter your TOTP code.")
      } else {
        setError(err?.message || "An error occurred during authentication.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMfaVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaResolver || !totpCode) {
      setError("Please enter a valid TOTP code.")
      return
    }

    if (totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      setError("Please enter a valid 6-digit TOTP code.")
      return
    }

    setMfaLoading(true)
    setError("")

    try {
      const totpFactor = mfaResolver.hints[0]

      if (!totpFactor) {
        throw new Error("No TOTP factor found.")
      }

      const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpFactor.uid, totpCode)

      const userCredential = await mfaResolver.resolveSignIn(assertion)
      const user = userCredential.user
      
      console.log("MFA verification successful! User UID:", user.uid)
      
      // CHECK IF EMAIL IS VERIFIED AFTER MFA
      if (!user.emailVerified) {
        setEmailNotVerified(true);
        setError("Please verify your email address before logging in.");
        
        // Sign out the user since they're not verified
        await signOut(auth);
        setMfaLoading(false);
        return;
      }
      
      // Reset failed attempts on successful MFA verification
      try {
        await resetFailedAttempts(email);
      } catch (error) {
        console.error("Error resetting failed attempts:", error);
        // Continue even if reset fails
      }
      
      setFailedAttempts(0);
      setIsAccountBlocked(false);
      setBlockUntil(null);
      setBlockCount(0);
      
      // After MFA, navigate directly without TOTP setup check
      if (!isRedirecting) {
        setIsRedirecting(true);
        const role = await getUserRoleAndSetCookies(user);
        
        // Add a small delay to ensure everything is processed
        setTimeout(() => {
          navigateBasedOnRole(role);
        }, 500);
      }
      
    } catch (err: any) {
      setError("Invalid TOTP code: " + err.message)
      setTotpCode("")
    } finally {
      setMfaLoading(false)
    }
  }

  const handleCancelMfa = () => {
    setMfaRequired(false)
    setMfaResolver(null)
    setTotpCode("")
    setError("")
  }

  const handleForgotPassword = async () => {
    if (!resetEmailValue.trim()) {
      setError("Please enter your email address.");
      return;
    }

    // Validate email format for forgot password
    if (!validateEmail(resetEmailValue.trim())) {
      setError("Please enter a valid email address with @ symbol.");
      return;
    }

    setResetLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, resetEmailValue.trim());
      setResetSuccess(true);
      setError("");
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred.";
      switch (err?.code) {
        case "auth/user-not-found":
          errorMessage = "No account with this email exists.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        default:
          errorMessage = err?.message || "An unexpected error occurred.";
      }
      setError(errorMessage);
      setResetSuccess(false);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotDialog = () => {
    setShowForgotDialog(false);
    setResetEmailValue("");
    setError("");
    setResetSuccess(false);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Back to landing page function
  const handleBackToLanding = async () => {
    if (isNavigating) return;
    
    console.log("Back button clicked - navigating to landing page");
    setIsNavigating(true);
    
    try {
      document.cookie = "idToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      signOut(auth).catch(console.error);
      
      // Only clear localStorage if it's available (client-side)
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      console.log("Cleared auth data, redirecting...");
      window.location.href = "/landingpage";
    } catch (error) {
      console.error("Error during back to home:", error);
      window.location.href = "/landingpage";
    }
  };


  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.18_0.08_250)] via-[oklch(0.22_0.09_250)] to-[oklch(0.15_0.07_250)] flex items-center justify-center p-6 relative">
      {/* Back Button */}
      <button
        onClick={handleBackToLanding}
        disabled={isNavigating}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 text-white bg-[oklch(0.68_0.19_35)] hover:bg-[oklch(0.72_0.19_35)] rounded-lg transition-colors font-medium shadow-lg z-10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNavigating ? "Loading..." : "Back to Home"}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Package className="h-10 w-10 text-[oklch(0.68_0.19_35)]" />
          <span className="text-3xl font-bold text-white">LogiTrack</span>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-[oklch(0.18_0.08_250)] mb-6 text-center">
            {mfaRequired ? "Verify Your Identity" : "Welcome Back"}
          </h2>

          {/* EMAIL VERIFICATION REQUIRED WARNING */}
          {emailNotVerified && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-800 mb-2">Email Verification Required</h3>
                  <p className="text-yellow-700 text-sm mb-3">
                    Please verify your email address before logging in. Check your inbox for the verification email.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendVerificationLoading || verificationSent}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {resendVerificationLoading ? "Sending..." : verificationSent ? "Sent!" : "Resend Verification"}
                    </button>
                    {verificationSent && (
                      <span className="text-green-600 text-sm flex items-center">
                        ✓ Check your email
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BRUTE FORCE PROTECTION WARNINGS */}
          {/* {failedAttempts > 0 && !mfaRequired && !isCurrentlyBlocked() && !emailNotVerified && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${
              failedAttempts >= 3 
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            }`}>
              <p>⚠️ {failedAttempts} failed attempt(s). {5 - failedAttempts} attempt(s) remaining.</p>
            </div>
          )} */}

          {isCurrentlyBlocked() && blockUntil && !mfaRequired && !emailNotVerified && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 text-sm mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                <p className="font-medium">Account Temporarily Locked</p>
              </div>
              <p>Too many failed login attempts. Please wait:</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-bold text-lg">{countdown}</span>
                <span className="text-xs">(mm:ss)</span>
              </div>
              {blockCount > 0 && (
                <p className="text-xs mt-2">
                  Lock duration increases with repeated blocks for security.
                  Current lock: {getBlockDurationDisplay(blockCount)}
                </p>
              )}
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isCurrentlyBlocked()}
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)]">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotDialog(true)}
                    className="text-sm text-[oklch(0.68_0.19_35)] hover:underline disabled:opacity-50"
                    disabled={isCurrentlyBlocked()}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isCurrentlyBlocked()}
                    className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isCurrentlyBlocked()}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)] transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && !emailNotVerified && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || isCurrentlyBlocked()}
                className="w-full px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerification} className="space-y-4">
              <div className="bg-[oklch(0.96_0_0)] p-4 rounded-lg mb-4">
                <p className="text-sm text-[oklch(0.45_0_0)]">
                  Please enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">TOTP Code</label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  required
                  className="w-full px-4 py-3 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelMfa}
                  className="flex-1 px-4 py-3 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mfaLoading || totpCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mfaLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
       {showForgotDialog && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        {!resetSuccess ? (
          <>
            <h3 className="text-xl font-bold text-[oklch(0.18_0.08_250)] mb-2">Reset Password</h3>
            <p className="text-sm text-[oklch(0.45_0_0)] mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Email</label>
                <input
                  type="email"
                  value={resetEmailValue}
                  onChange={(e) => setResetEmailValue(e.target.value)}
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCloseForgotDialog}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success Message Design */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-[oklch(0.18_0.08_250)] mb-2">
                Check Your Email!
              </h3>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 text-sm">
                  We've sent a password reset link to:
                </p>
                <p className="text-green-900 font-medium mt-1">{resetEmailValue}</p>
              </div>

              <div className="text-xs text-[oklch(0.45_0_0)] space-y-1 mb-6">
                <p>📧 Check your inbox (and spam folder)</p>
                <p>⏱️ The link expires in 1 hour</p>
                <p>🔒 Follow the instructions to set a new password</p>
              </div>

              <button
                type="button"
                onClick={handleCloseForgotDialog}
                className="w-full px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium"
              >
                Return to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )}
</div>
)
}

export default Login