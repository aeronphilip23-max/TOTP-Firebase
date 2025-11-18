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
} from "firebase/auth"
import { doc, getDoc, getFirestore } from "firebase/firestore"
import { auth } from "@/src/lib/firebase"
import { Package, Eye, EyeOff, ArrowLeft } from "lucide-react"
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
  const [showTOTPDialog, setShowTOTPDialog] = useState(false)
  const [pendingUser, setPendingUser] = useState<any>(null)
  const router = useRouter()

  // Check rate limit status when email changes
  useEffect(() => {
    const checkRateLimitStatus = async () => {
      if (email) {
        const status = await checkRateLimit(email);
        setIsAccountBlocked(status.isBlocked);
        setBlockUntil(status.blockUntil);
        setBlockCount(status.blockCount || 0);
        
        if (status.isBlocked && status.blockUntil) {
          const blockUntilTime = new Date(status.blockUntil);
          const blockDuration = getBlockDurationDisplay(status.blockCount || 0);
          setError(`Too many failed attempts. Account locked for ${blockDuration} until ${blockUntilTime.toLocaleTimeString()}`);
        } else {
          if (error.includes('locked') || error.includes('too-many-requests')) {
            setError("");
          }
        }
      } else {
        setIsAccountBlocked(false);
        setBlockUntil(null);
        setBlockCount(0);
        setError("");
      }
    };

    checkRateLimitStatus();
  }, [email]);

  // Helper to display progressive block duration
  const getBlockDurationDisplay = (blockCount: number): string => {
    const baseMinutes = 15;
    const progressiveMinutes = baseMinutes * Math.pow(2, blockCount);
    const finalMinutes = Math.min(progressiveMinutes, 24 * 60);
    
    if (finalMinutes < 60) {
      return `${finalMinutes} minutes`;
    } else if (finalMinutes < 24 * 60) {
      const hours = Math.ceil(finalMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return "24 hours";
    }
  };

  // Function to set ID token and user role as cookies for middleware
  const setAuthCookies = async (user: any, role: string = 'user') => {
    try {
      const idToken = await user.getIdToken();
      const cookieOptions = `path=/; max-age=3600; samesite=strict`;
      
      document.cookie = `idToken=${idToken}; ${cookieOptions}`;
      document.cookie = `userRole=${role}; ${cookieOptions}`;
      
      console.log("Auth cookies set successfully:", { idToken, role });
    } catch (error) {
      console.error("Error setting auth cookies:", error);
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
    
    setTimeout(() => {
      switch (role) {
        case 'admin':
          console.log("Redirecting to ADMIN dashboard");
          window.location.href = "/dashboard/admin/dashboard";
          break;
        case 'user':
        default:
          console.log("Redirecting to STAFF dashboard");
          window.location.href = "/dashboard/staff";
          break;
      }
    }, 100);
  };

  // Check if user needs TOTP setup
  const checkTOTPSetup = async (user: any): Promise<boolean> => {
    try {
      const enrolledFactors = await multiFactor(user).enrolledFactors;
      const hasTOTP = enrolledFactors.some(factor => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      
      console.log("User has TOTP setup:", hasTOTP);
      
      if (!hasTOTP) {
        console.log("User doesn't have TOTP setup - showing options");
        const role = await getUserRoleAndSetCookies(user);
        setPendingUser(user);
        setShowTOTPDialog(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking TOTP setup:", error);
      return true;
    }
  };

  // TOTP Dialog Handlers
  const handleSetupTOTP = () => {
    setShowTOTPDialog(false);
    setTimeout(() => {
      window.location.href = "/verifyotp";
    }, 100);
  };

  const handleSkipTOTP = async () => {
    setShowTOTPDialog(false);
    if (pendingUser) {
      const role = await getUserRoleAndSetCookies(pendingUser);
      navigateBasedOnRole(role);
    }
  };

  // UPDATED HANDLE SUBMIT - FIXED BLOCKING ISSUE
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // Check if account is blocked BEFORE attempting login
    const status = await checkRateLimit(email);
    if (status.isBlocked && status.blockUntil) {
      setIsAccountBlocked(true);
      setBlockUntil(status.blockUntil);
      setBlockCount(status.blockCount || 0);
      const blockUntilTime = new Date(status.blockUntil);
      const blockDuration = getBlockDurationDisplay(status.blockCount || 0);
      setError(`Too many failed attempts. Account locked for ${blockDuration} until ${blockUntilTime.toLocaleTimeString()}`);
      return;
    }

    setLoading(true)
    setError("")
    setMfaRequired(false)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log("Logged in! User UID:", user.uid)
      
      // Reset failed attempts on successful login
      await resetFailedAttempts(email);
      setFailedAttempts(0);
      setIsAccountBlocked(false);
      setBlockUntil(null);
      setBlockCount(0);
      
      // Check if user needs TOTP setup
      const hasTOTP = await checkTOTPSetup(user);
      
      if (hasTOTP) {
        const role = await getUserRoleAndSetCookies(user);
        navigateBasedOnRole(role);
      }
      
    } catch (err: any) {
      console.log("Login error:", err);
      
      // Handle ALL authentication errors that indicate wrong credentials
      if (err?.code === "auth/wrong-password" || 
          err?.code === "auth/user-not-found" || 
          err?.code === "auth/invalid-credential" ||
          err?.code === "auth/too-many-requests") {
        
        const newStatus = await trackFailedLogin(email);
        
        console.log("New rate limit status:", newStatus);
        
        // Update all states
        setFailedAttempts(newStatus.attempts);
        setIsAccountBlocked(newStatus.isBlocked);
        setBlockUntil(newStatus.blockUntil);
        setBlockCount(newStatus.blockCount || 0);
        
        if (newStatus.isBlocked && newStatus.blockUntil) {
          // Account is now blocked - show our custom blocking message
          const blockUntilTime = new Date(newStatus.blockUntil);
          const blockDuration = getBlockDurationDisplay(newStatus.blockCount || 0);
          setError(`Too many failed attempts. Account locked for ${blockDuration} until ${blockUntilTime.toLocaleTimeString()}`);
        } else {
          // Account not blocked yet - show remaining attempts
          const attemptsLeft = 5 - newStatus.attempts;
          setError(`Invalid credentials. ${attemptsLeft} attempt(s) remaining.`);
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
      
      // Reset failed attempts on successful MFA verification
      await resetFailedAttempts(email);
      setFailedAttempts(0);
      setIsAccountBlocked(false);
      setBlockUntil(null);
      setBlockCount(0);
      
      // After MFA, check TOTP setup and navigate
      const hasTOTP = await checkTOTPSetup(user);
      
      if (hasTOTP) {
        const role = await getUserRoleAndSetCookies(user);
        navigateBasedOnRole(role);
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

    setResetLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, resetEmailValue.trim());
      alert("Password reset email sent! Check your inbox (including spam).");
      setShowForgotDialog(false);
      setResetEmailValue("");
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
    } finally {
      setResetLoading(false);
    }
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
      localStorage.clear();
      sessionStorage.clear();
      console.log("Cleared auth data, redirecting...");
      window.location.href = "/landingpage";
    } catch (error) {
      console.error("Error during back to home:", error);
      window.location.href = "/landingpage";
    }
  };

  // Format block time for display
  const formatBlockTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format date and time for display
  const formatBlockDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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

          {/* BRUTE FORCE PROTECTION WARNINGS */}
          {failedAttempts > 0 && !mfaRequired && !isAccountBlocked && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${
              failedAttempts >= 3 
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            }`}>
              <p>⚠️ {failedAttempts} failed attempt(s). {5 - failedAttempts} attempts remaining.</p>
            </div>
          )}

          {isAccountBlocked && blockUntil && !mfaRequired && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 text-sm mb-4">
              <p>🔒 Account temporarily locked for security.</p>
              <p>Try again after: {formatBlockDateTime(blockUntil)}</p>
              {blockCount > 0 && (
                <p className="text-xs mt-1">
                  Lock duration increases with repeated blocks for security.
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
                  disabled={isAccountBlocked}
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
                    disabled={isAccountBlocked}
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
                    disabled={isAccountBlocked}
                    className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isAccountBlocked}
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || isAccountBlocked}
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

          {!mfaRequired && (
            <p className="mt-6 text-center text-sm text-[oklch(0.45_0_0)]">
              Create your account{" "}
              <button
                onClick={() => router.push("/auth/register")}
                className="text-[oklch(0.68_0.19_35)] hover:underline font-medium"
              >
                Click here
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                onClick={() => {
                  setShowForgotDialog(false)
                  setError("")
                  setResetEmailValue("")
                }}
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
          </div>
        </div>
      )}

      {/* TOTP Setup Dialog Modal */}
      {showTOTPDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-[oklch(0.18_0.08_250)] mb-4">
              Enhance Your Security
            </h3>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-[oklch(0.45_0_0)]">
                Two-factor authentication (TOTP) adds an extra layer of security to your account.
              </p>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Recommended:</strong> Setup TOTP for better protection against unauthorized access.
                </p>
              </div>
              
              <p className="text-xs text-[oklch(0.45_0_0)]">
                You can always setup TOTP later from your profile settings.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkipTOTP}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors font-medium"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={handleSetupTOTP}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium"
              >
                Setup TOTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login