"use client"

import type React from "react"

import { useState } from "react"
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
  const router = useRouter()

  // Function to set ID token and user role as cookies for middleware
  const setAuthCookies = async (user: any, role: string = 'user') => {
    try {
      // Get the ID token
      const idToken = await user.getIdToken();
      
      // Set both cookies with proper attributes
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
        
        console.log("User role from Firestore:", role)
        
        // Set cookies with the role
        await setAuthCookies(user, role);
        return role;
      } else {
        console.error("No user document found for UID:", user.uid)
        // Set default role if no document found
        await setAuthCookies(user, 'user');
        return 'user';
      }
    } catch (error) {
      console.error("Error getting user role:", error);
      // Set default role on error
      await setAuthCookies(user, 'user');
      return 'user';
    }
  };

  // In your login page - update the navigation
  const navigateBasedOnRole = async (role: string) => {
    console.log("Navigating based on role:", role);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (role) {
      case 'admin':
        router.push("/dashboard/admin/dashboard");
        break;
      case 'user':
      default:
        router.push("/dashboard/staff");  // All non-admin users go to staff dashboard
        break;
    }
  };

  // Check if user needs TOTP setup
  const checkTOTPSetup = async (user: any): Promise<boolean> => {
    try {
      const enrolledFactors = await multiFactor(user).enrolledFactors;
      const hasTOTP = enrolledFactors.some(factor => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      
      console.log("User has TOTP setup:", hasTOTP);
      
      // If user doesn't have TOTP setup, redirect to setup page
      if (!hasTOTP) {
        console.log("Redirecting to TOTP setup page");
        
        // Get user role and set cookies before redirecting
        const role = await getUserRoleAndSetCookies(user);
        console.log("Setting cookies for TOTP setup with role:", role);
        
        router.push("/verifyotp");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking TOTP setup:", error);
      // If there's an error checking TOTP, proceed with normal login
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMfaRequired(false)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log("Logged in! User UID:", user.uid)
      
      // Check if user needs TOTP setup
      const hasTOTP = await checkTOTPSetup(user);
      
      // Only navigate if TOTP is already set up
      if (hasTOTP) {
        const role = await getUserRoleAndSetCookies(user);
        navigateBasedOnRole(role);
      }
      // If TOTP is not set up, the user will be redirected to verifyotp page
      
    } catch (err: any) {
      if (err?.code === "auth/multi-factor-auth-required") {
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

  // FIXED BACK TO LANDING PAGE FUNCTION
const handleBackToLanding = async () => {
  if (isNavigating) return;
  
  console.log("Back button clicked - navigating to landing page");
  setIsNavigating(true);
  
  try {
    // Clear specific auth cookies
    document.cookie = "idToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Sign out from Firebase (non-blocking)
    signOut(auth).catch(console.error);
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log("Cleared auth data, redirecting...");
    
    // Navigate to landing page - either will work now
    window.location.href = "/landingpage";
    // OR: window.location.href = "/"; (both will work)
    
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

          {!mfaRequired ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)]">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotDialog(true)}
                    className="text-sm text-[oklch(0.68_0.19_35)] hover:underline"
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
                    className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)] transition-colors"
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
                disabled={loading}
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
    </div>
  )
}

export default Login