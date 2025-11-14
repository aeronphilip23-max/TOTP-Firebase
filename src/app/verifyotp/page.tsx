"use client"

import { useEffect, useState } from "react"
import { initializeApp } from "firebase/app"
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret, getAuth } from "firebase/auth"
import type { User } from "firebase/auth"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { Package, Shield, CheckCircle } from "lucide-react"
import { doc, getDoc, getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCTM5_DoF5CdbVqOCpnd7_ps1e9wSahTMY",
  authDomain: "logitrack-e1972.firebaseapp.com",
  projectId: "logitrack-e1972",
  storageBucket: "logitrack-e1972.firebasestorage.app",
  messagingSenderId: "29625075825",
  appId: "1:29625075825:web:0fcbaa6ff2bb1d9fe433d0",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

const VerifyOTP = () => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [totpUri, setTotpUri] = useState("")
  const navigate = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        // Get user role from Firestore
        try {
          const db = getFirestore()
          const userDocRef = doc(db, "users", currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const role = userData.role || 'user'
            setUserRole(role)
            console.log("User role in VerifyOTP:", role)
          }
        } catch (err) {
          console.error("Error fetching user role:", err)
        }
      } else {
        setUser(null)
        navigate.push("/auth/login")
      }
    })
    return () => unsubscribe()
  }, [navigate])

  // Role-based navigation function
  const navigateBasedOnRole = (role: string) => {
    console.log("Navigating based on role from VerifyOTP:", role);
    switch (role) {
      case 'admin':
        navigate.push("/dashboard/admin/dashboard");
        break;
      case 'user':
      default:
        navigate.push("/dashboard/staff");  
        break;
    }
  };

  const enrollTotpMfa = async () => {
    if (!user) {
      setError("No user is signed in.")
      return
    }

    try {
      const multiFactorSession = await multiFactor(user).getSession()
      const secret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession)
      const totpInfo = await multiFactor(user).enrolledFactors
      if (totpInfo.length > 0) {
        setError("TOTP MFA is already enrolled.")
        return
      }

      const totpUri = secret.generateQrCodeUrl(user.email || "", "LogiTrack OTP")

      setTotpSecret(secret)
      setTotpUri(totpUri)
      setError("")
      setSuccess("Scan the QR code with your authenticator app.")
    } catch (err) {
      setError("Error initiating TOTP MFA: " + (err as Error).message)
    }
  }

  const verifyTotpCode = async () => {
    if (!user || !totpSecret || !totpCode) {
      setError("Please provide a valid TOTP code.")
      return
    }

    try {
      await multiFactor(user).enroll(
        TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpCode),
        "TOTP Authenticator",
      )
      setSuccess("TOTP MFA enrolled successfully! Redirecting to dashboard...")
      setError("")
      setTotpSecret(null)
      setTotpCode("")
      
      // Use the stored userRole for navigation
      setTimeout(() => {
        navigateBasedOnRole(userRole)
      }, 2000)
    } catch (err) {
      setError("Error enrolling TOTP MFA: " + (err as Error).message)
    }
  }

  const handleSkip = () => {
    // Navigate based on role when skipping
    navigateBasedOnRole(userRole)
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
          {user ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-[oklch(0.68_0.19_35)] rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-[oklch(0.18_0.08_250)] mb-2 text-center">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-[oklch(0.45_0_0)] mb-6 text-center">
                Welcome, {user.email || "User"}! {userRole === 'admin' ? '(Admin)' : '(User)'} Secure your account with 2FA.
              </p>

              {!totpSecret ? (
                <div className="space-y-4">
                  <div className="bg-[oklch(0.96_0_0)] p-4 rounded-lg">
                    <p className="text-sm text-[oklch(0.45_0_0)]">
                      Enable two-factor authentication to add an extra layer of security to your account.
                    </p>
                  </div>
                  <button
                    onClick={enrollTotpMfa}
                    className="w-full px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium"
                  >
                    Enable TOTP MFA
                  </button>
                  <button
                    onClick={handleSkip}
                    className="w-full px-4 py-3 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors font-medium"
                  >
                    Skip for Now
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-[oklch(0.88_0_0)]">
                      <QRCodeSVG value={totpUri} size={200} />
                    </div>
                  </div>

                  <div className="bg-[oklch(0.96_0_0)] p-4 rounded-lg">
                    <p className="text-sm text-[oklch(0.45_0_0)]">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the
                      6-digit code below.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-4 py-3 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={verifyTotpCode}
                    disabled={totpCode.length !== 6}
                    className="w-full px-4 py-3 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify TOTP Code
                  </button>
                </div>
              )}

              {success && (
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
              )}
              {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

              <button
                onClick={() => auth.signOut()}
                className="w-full mt-6 px-4 py-2 text-sm text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <p className="text-center text-[oklch(0.45_0_0)]">Loading...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyOTP