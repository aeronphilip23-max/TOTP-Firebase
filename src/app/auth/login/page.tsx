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
} from "firebase/auth"
import { doc, getDoc, getFirestore } from "firebase/firestore"
import { auth } from "@/src/lib/firebase"
import { Package } from "lucide-react"

// UserRole interface
interface UserRole {
  role: 'user' | 'admin';
  firstName?: string;
  lastName?: string;
  email: string;
}

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
  const router = useRouter()

  // Role-based navigation function
  const navigateBasedOnRole = (role: string) => {
    console.log("Navigating based on role:", role);
    switch (role) {
      case 'admin':
        router.push("/dashboard/admin/dashboard");
        break;
      case 'user':
      default:
        router.push("/dashboard/staff");  
        break;
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
      
      // Get user role from Firestore
      const db = getFirestore()
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const role = userData.role || 'user'
        
        console.log("User role from Firestore:", role)
        console.log("User data:", userData)
        
        // Navigate based on role
        navigateBasedOnRole(role)
      } else {
        setError("User document not found in database.")
        console.error("No user document found for UID:", user.uid)
      }
      
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
      
      // Get user role from Firestore after MFA
      const db = getFirestore()
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const role = userData.role || 'user'
        
        console.log("User role from Firestore after MFA:", role)
        console.log("User data after MFA:", userData)
        
        // Navigate based on role
        navigateBasedOnRole(role)
      } else {
        setError("User document not found in database.")
        console.error("No user document found for UID:", user.uid)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.18_0.08_250)] via-[oklch(0.22_0.09_250)] to-[oklch(0.15_0.07_250)] flex items-center justify-center p-6">
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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="••••••••"
                />
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