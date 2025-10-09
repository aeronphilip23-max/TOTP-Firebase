"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/src/lib/firebase"
import { Package, Mail, CheckCircle } from "lucide-react"

type RegisterProps = {
  email: string
  password: string
  name: string
}

const Register = () => {
  const navigate = useRouter()
  const [user, setUser] = useState<RegisterProps>({
    name: "",
    password: "",
    email: "",
  })
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUser((prev) => ({ ...prev, [name]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const { email, name, password } = user

      if (!name || !email || !password) {
        setError("Please fill in all fields.")
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError("Password should be at least 6 characters long.")
        setLoading(false)
        return
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const newUser = userCredential.user

      await updateProfile(newUser, {
        displayName: name,
      })

      await sendEmailVerification(newUser)
      setIsEmailSent(true)
      setSuccess(
        "Account created! A verification email has been sent to your email address. Please verify your email before logging in.",
      )

      await setDoc(doc(db, "users", newUser.uid), {
        name: name,
        email: email,
        emailVerified: false,
        createdAt: new Date(),
        uid: newUser.uid,
      })
    } catch (error) {
      const errorCode = (error as any).code
      const errorMessage = (error as Error).message
      switch (errorCode) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please use a different email.")
          break
        case "auth/invalid-email":
          setError("Please enter a valid email address.")
          break
        case "auth/weak-password":
          setError("Password should be at least 6 characters long.")
          break
        default:
          setError(`Error creating account: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!currentUser) {
      setError("No user found. Please try registering again.")
      return
    }

    try {
      setLoading(true)
      setError("")
      await sendEmailVerification(currentUser)
      setSuccess("Verification email sent successfully! Please check your inbox.")
    } catch (error) {
      setError("Error sending verification email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    if (!currentUser) {
      setError("No user found. Please try registering again.")
      return
    }

    try {
      setLoading(true)
      await currentUser.reload()
      const updatedUser = auth.currentUser

      if (updatedUser?.emailVerified) {
        setSuccess("Email verified successfully! Redirecting to login...")
        setTimeout(() => {
          navigate.push("/auth/login")
        }, 2000)
      } else {
        setError("Email not verified yet. Please check your inbox and verify your email.")
      }
    } catch (error) {
      setError("Error checking verification status. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleManualLoginRedirect = () => {
    if (currentUser?.emailVerified) {
      navigate.push("/auth/login")
    } else {
      setError("Please verify your email before logging in. Check your inbox for the verification link.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.18_0.08_250)] via-[oklch(0.22_0.09_250)] to-[oklch(0.15_0.07_250)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Package className="h-10 w-10 text-[oklch(0.68_0.19_35)]" />
          <span className="text-3xl font-bold text-white">LogiTrack</span>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-[oklch(0.18_0.08_250)] mb-6 text-center">Create Account</h2>

          {!isEmailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={user.name}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  value={user.email}
                  onChange={handleInputChange}
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  value={user.password}
                  onChange={handleInputChange}
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={loading}
                  required
                  minLength={6}
                />
                <p className="text-xs text-[oklch(0.45_0_0)] mt-1">Minimum 6 characters</p>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-[oklch(0.96_0_0)] border border-[oklch(0.68_0.19_35)] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[oklch(0.68_0.19_35)] mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[oklch(0.18_0.08_250)]">Email Verification Required</h3>
                    <p className="text-sm text-[oklch(0.45_0_0)] mt-1">
                      Please check your email inbox and click the verification link to activate your account.
                    </p>
                  </div>
                </div>
              </div>

              {success && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Resend Verification Email"}
                </button>

                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? "Checking..." : "I've Verified My Email"}
                </button>

                <button
                  type="button"
                  onClick={handleManualLoginRedirect}
                  className="w-full px-4 py-3 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors font-medium"
                >
                  Go to Login
                </button>
              </div>

              <div className="text-xs text-[oklch(0.45_0_0)] mt-4 space-y-1">
                <p>
                  <strong>Note:</strong> You must verify your email before you can log in.
                </p>
                <p>Check your spam folder if you don't see the email.</p>
              </div>
            </div>
          )}

          {!isEmailSent && (
            <p className="mt-6 text-center text-sm text-[oklch(0.45_0_0)]">
              Already have an account?{" "}
              <button
                onClick={() => navigate.push("/auth/login")}
                className="text-[oklch(0.68_0.19_35)] hover:underline font-medium"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register
