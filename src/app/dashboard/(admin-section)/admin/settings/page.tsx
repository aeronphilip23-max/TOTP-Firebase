"use client"

import { User, Lock, UserPlus, X, Shield, QrCode, Calendar } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/src/context/authcontext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/src/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { multiFactor, TotpMultiFactorGenerator } from "firebase/auth"
import { QRCodeSVG } from "qrcode.react"

export default function SettingsTab() {
  const { user } = useAuth()
  const [settingsTab, setSettingsTab] = useState<"profile" | "security" | "accounts">("profile")
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false)
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    gender: "",
    birthday: "",
    email: "",
    phone: "",
  })
  const [newAccount, setNewAccount] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  })
  const [totpData, setTotpData] = useState({
    secret: null as any,
    uri: "",
    code: "",
    isEnrolled: false,
  })
  const [accountError, setAccountError] = useState("")
  const [accountSuccess, setAccountSuccess] = useState("")
  const [accountLoading, setAccountLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState("")
  const [totpSuccess, setTotpSuccess] = useState("")
  const { toast } = useToast()

  // Gender options
  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "woman", label: "Woman" },
    { value: "man", label: "Man" },
    { value: "non-binary", label: "Non-binary" },
    { value: "other", label: "Other" },
  ]

  // Calculate age from birthday
    const calculateAge = (birthday: string) => {
      if (!birthday) return ""
      const birthDate = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      return age.toString()
    }

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserProfile({
            fullName: data.name || "",
            gender: data.gender || "",
            birthday: data.birthday || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
          })
        } else {
          setUserProfile(prev => ({
            ...prev,
            email: user.email || ""
          }))
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }

    loadUserProfile()
    checkTotpStatus()
  }, [user])

  // Validate if user is at least 18 years old
  const validateAge = (birthday: string): boolean => {
    if (!birthday) return true // Allow empty initially
    
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age >= 18
  }

  // Calculate maximum allowed birth date (18 years ago)
  const getMaxBirthDate = (): string => {
    const today = new Date()
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    return maxDate.toISOString().split('T')[0]
  }


  // Check if TOTP is already enrolled
  const checkTotpStatus = async () => {
    if (!user) return
    
    try {
      const enrolledFactors = await multiFactor(user).enrolledFactors
      const isEnrolled = enrolledFactors.length > 0
      setTotpData(prev => ({ ...prev, isEnrolled }))
    } catch (error) {
      console.error('Error checking TOTP status:', error)
    }
  }

  // Initialize TOTP setup
  const setupTotp = async () => {
    if (!user) return
    
    setTotpLoading(true)
    setTotpError("")
    setTotpSuccess("")

    try {
      const multiFactorSession = await multiFactor(user).getSession()
      const secret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession)
      const totpUri = secret.generateQrCodeUrl(user.email || "", "LogiTrack OTP")

      setTotpData({
        secret,
        uri: totpUri,
        code: "",
        isEnrolled: false
      })
      setShowTotpModal(true)
    } catch (error) {
      console.error('Error setting up TOTP:', error)
      setTotpError("Failed to setup TOTP. Please try again.")
      toast({
        title: "Error",
        description: "Failed to setup TOTP.",
        variant: "destructive",
      })
    } finally {
      setTotpLoading(false)
    }
  }

  // Verify and enroll TOTP
  const verifyTotp = async () => {
    if (!user || !totpData.secret || !totpData.code) {
      setTotpError("Please provide a valid TOTP code.")
      return
    }

    setTotpLoading(true)
    setTotpError("")

    try {
      await multiFactor(user).enroll(
        TotpMultiFactorGenerator.assertionForEnrollment(totpData.secret, totpData.code),
        "TOTP Authenticator",
      )
      
      setTotpSuccess("TOTP enabled successfully!")
      setTotpData(prev => ({ ...prev, isEnrolled: true }))
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled.",
      })

      setTimeout(() => {
        setShowTotpModal(false)
        setTotpSuccess("")
      }, 2000)
    } catch (error) {
      console.error('Error enrolling TOTP:', error)
      setTotpError("Invalid TOTP code. Please try again.")
      toast({
        title: "Error",
        description: "Failed to enable TOTP.",
        variant: "destructive",
      })
    } finally {
      setTotpLoading(false)
    }
  }

  // Disable TOTP using the API endpoint
  const disableTotp = async () => {
    if (!user) return
    
    setTotpLoading(true)
    setTotpError("")

    try {
      const idToken = await user.getIdToken()
      
      const response = await fetch('/api/disable-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to disable MFA')
      }

      setTotpSuccess("TOTP disabled successfully!")
      setTotpData(prev => ({ ...prev, isEnrolled: false }))
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled.",
      })

      // Force refresh the user token to reflect the changes
      await user.getIdToken(true)
      
    } catch (error) {
      console.error('Error disabling TOTP:', error)
      setTotpError("Failed to disable TOTP. Please try again.")
      toast({
        title: "Error",
        description: "Failed to disable TOTP.",
        variant: "destructive",
      })
    } finally {
      setTotpLoading(false)
    }
  }

    const handleSaveProfile = async () => {
    if (!user) {
      setProfileError("User not authenticated")
      return
    }

    // Validate age before saving
    if (userProfile.birthday && !validateAge(userProfile.birthday)) {
      setProfileError("You must be at least 18 years old to use this system.")
      toast({
        title: "Age Restriction",
        description: "You must be at least 18 years old.",
        variant: "destructive",
      })
      return
    }

    setProfileLoading(true)
    setProfileError("")
    setProfileSuccess("")

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: userProfile.fullName,
        gender: userProfile.gender,
        birthday: userProfile.birthday,
        email: userProfile.email,
        phone: userProfile.phone,
      })

      setProfileSuccess("Profile updated successfully!")
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      })

      setTimeout(() => {
        setProfileSuccess("")
      }, 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setProfileError("Failed to update profile. Please try again.")
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    setAccountError("")
    setAccountSuccess("")
    setAccountLoading(true)

    try {
      const { email, name, password, role } = newAccount

      if (!name || !email || !password) {
        setAccountError("Please fill in all fields.")
        setAccountLoading(false)
        return
      }

      if (password.length < 6) {
        setAccountError("Password should be at least 6 characters long.")
        setAccountLoading(false)
        return
      }

      // Simulate account creation (replace with actual Firebase logic)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setAccountSuccess(`Account created successfully for ${name}!`)
      setTimeout(() => {
        setShowCreateAccountModal(false)
        setNewAccount({ name: "", email: "", password: "", role: "user" })
        setAccountSuccess("")
      }, 2000)
    } catch (error) {
      setAccountError("Error creating account. Please try again.")
    } finally {
      setAccountLoading(false)
    }
  }

  return (
    <>
      <div className="max-w-4xl space-y-6">
        <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Admin Settings</h2>

        {/* Settings Tabs */}
        <div className="flex gap-4 border-b border-[oklch(0.88_0_0)]">
          <button
            onClick={() => setSettingsTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              settingsTab === "profile"
                ? "border-[oklch(0.68_0.19_35)] text-[oklch(0.68_0.19_35)]"
                : "border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
            }`}
          >
            <User className="h-5 w-5" />
            Profile
          </button>
          <button
            onClick={() => setSettingsTab("security")}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              settingsTab === "security"
                ? "border-[oklch(0.68_0.19_35)] text-[oklch(0.68_0.19_35)]"
                : "border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
            }`}
          >
            <Lock className="h-5 w-5" />
            Security
          </button>
          <button
            onClick={() => setSettingsTab("accounts")}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              settingsTab === "accounts"
                ? "border-[oklch(0.68_0.19_35)] text-[oklch(0.68_0.19_35)]"
                : "border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
            }`}
          >
            <UserPlus className="h-5 w-5" />
            Account Management
          </button>
        </div>

        {/* Profile tab */}
        {settingsTab === "profile" && (
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
            <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Profile Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Full Name</label>
                <input
                  type="text"
                  value={userProfile.fullName}
                  onChange={(e) => setUserProfile({ ...userProfile, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>
              
              {/* Gender Dropdown */}
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Gender</label>
                <select
                  value={userProfile.gender}
                  onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Birthday Field */}
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Birthday</label>
                <div className="relative">
                  <input
                    type="date"
                    value={userProfile.birthday}
                    onChange={(e) => {
                      const newBirthday = e.target.value
                      setUserProfile({ ...userProfile, birthday: newBirthday })
                      
                      // Real-time validation feedback
                      if (newBirthday && !validateAge(newBirthday)) {
                        setProfileError("You must be at least 18 years old.")
                      } else {
                        setProfileError("")
                      }
                    }}
                    max={getMaxBirthDate()} // This prevents selecting dates that would make age < 18
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[oklch(0.45_0_0)] pointer-events-none" />
                </div>
                {userProfile.birthday && (
                  <div className="mt-1">
                    <p className="text-sm text-[oklch(0.45_0_0)]">
                      Age: {calculateAge(userProfile.birthday)} years old
                    </p>
                    {!validateAge(userProfile.birthday) && (
                      <p className="text-red-500 text-sm mt-1">
                        ❌ Must be at least 18 years old
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={userProfile.phone}
                  onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>
              {profileError && <p className="text-red-500 text-sm">{profileError}</p>}
              {profileSuccess && <p className="text-green-600 text-sm">{profileSuccess}</p>}
              <button 
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="px-6 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Security tab */}
        {settingsTab === "security" && (
          <div className="space-y-6">
            {/* Change Password Section */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
              <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  />
                </div>
                <button className="px-6 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors">
                  Update Password
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication Section */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
              <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Two-Factor Authentication</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[oklch(0.18_0.08_250)]">TOTP Authenticator</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">
                      {totpData.isEnrolled 
                        ? "TOTP is currently enabled for your account." 
                        : "Add an extra layer of security to your account using TOTP."
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {totpData.isEnrolled ? (
                      <>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Enabled
                        </span>
                        <button
                          onClick={disableTotp}
                          disabled={totpLoading}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          {totpLoading ? "Disabling..." : "Disable"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={setupTotp}
                        disabled={totpLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50"
                      >
                        <Shield className="h-4 w-4" />
                        {totpLoading ? "Setting up..." : "Enable TOTP"}
                      </button>
                    )}
                  </div>
                </div>
                
                {totpError && <p className="text-red-500 text-sm">{totpError}</p>}
                {totpSuccess && <p className="text-green-600 text-sm">{totpSuccess}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Account Management tab */}
        {settingsTab === "accounts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">User Account Management</h3>
                <p className="text-sm text-[oklch(0.45_0_0)] mt-1">Create and manage user accounts for the system</p>
              </div>
              <button
                onClick={() => setShowCreateAccountModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                Create Account
              </button>
            </div>

            <div className="bg-white rounded-lg border border-[oklch(0.88_0_0)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[oklch(0.96_0_0)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[oklch(0.88_0_0)]">
                  <tr className="hover:bg-[oklch(0.98_0_0)]">
                    <td className="px-6 py-4 text-sm text-[oklch(0.18_0.08_250)] font-medium">John Doe</td>
                    <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">john.doe@example.com</td>
                    <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">User</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[oklch(0.98_0_0)]">
                    <td className="px-6 py-4 text-sm text-[oklch(0.18_0.08_250)] font-medium">Jane Smith</td>
                    <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">jane.smith@example.com</td>
                    <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">User</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Create New Account</h2>
              <button
                onClick={() => {
                  setShowCreateAccountModal(false)
                  setAccountError("")
                  setAccountSuccess("")
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Full Name</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={accountLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Email</label>
                <input
                  type="email"
                  value={newAccount.email}
                  onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={accountLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Password</label>
                <input
                  type="password"
                  value={newAccount.password}
                  onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={accountLoading}
                />
                <p className="text-xs text-[oklch(0.45_0_0)] mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Role</label>
                <select
                  value={newAccount.role}
                  onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  disabled={accountLoading}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {accountError && <p className="text-red-500 text-sm">{accountError}</p>}
              {accountSuccess && <p className="text-green-600 text-sm">{accountSuccess}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateAccountModal(false)
                  setAccountError("")
                  setAccountSuccess("")
                }}
                disabled={accountLoading}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={accountLoading}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50"
              >
                {accountLoading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOTP Setup Modal */}
      {showTotpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Setup TOTP Authenticator</h2>
              <button
                onClick={() => {
                  setShowTotpModal(false)
                  setTotpError("")
                  setTotpSuccess("")
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-[oklch(0.88_0_0)]">
                  <QRCodeSVG value={totpData.uri} size={200} />
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
                  value={totpData.code}
                  onChange={(e) => setTotpData({ ...totpData, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {totpError && <p className="text-red-500 text-sm">{totpError}</p>}
              {totpSuccess && <p className="text-green-600 text-sm">{totpSuccess}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTotpModal(false)
                  setTotpError("")
                  setTotpSuccess("")
                }}
                disabled={totpLoading}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyTotp}
                disabled={totpLoading || totpData.code.length !== 6}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50"
              >
                {totpLoading ? "Verifying..." : "Enable TOTP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}