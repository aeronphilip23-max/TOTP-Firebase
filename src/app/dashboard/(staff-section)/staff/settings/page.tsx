"use client"

import { User, Lock, Shield, X, Calendar, Check, AlertCircle, Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/src/context/authcontext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/src/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { multiFactor, TotpMultiFactorGenerator, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { QRCodeSVG } from "qrcode.react"


export default function SettingsPage() {
  const { user , refreshIdToken } = useAuth()
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile")
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    gender: "",
    birthday: "",
    email: "",
    phone: "",
  })
  const [totpData, setTotpData] = useState({
    secret: null as any,
    uri: "",
    code: "",
    isEnrolled: false,
  })
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState("")
  const [totpSuccess, setTotpSuccess] = useState("")
  const [nameError, setNameError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const { toast } = useToast()

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  // Password validation checks
  const passwordChecks = {
    hasMinLength: passwordData.newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(passwordData.newPassword),
    hasLowerCase: /[a-z]/.test(passwordData.newPassword),
    hasNumber: /[0-9]/.test(passwordData.newPassword),
    hasSpecialChar: /[!@#$%^&*]/.test(passwordData.newPassword),
  }

  const isNewPasswordValid = Object.values(passwordChecks).every(Boolean)
  const doPasswordsMatch = passwordData.newPassword === passwordData.confirmPassword
  const canChangePassword = passwordData.currentPassword && 
                           passwordData.newPassword && 
                           passwordData.confirmPassword && 
                           isNewPasswordValid && 
                           doPasswordsMatch

  // Gender options - Updated labels
  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "female", label: "Male" },
    { value: "male", label: "Female" },
    { value: "non-binary", label: "Non-binary" },
    { value: "other", label: "Other" },
  ]

  // Name validation function (same as CreateUserModal)
  const validateFullName = (name: string): { isValid: boolean; error: string } => {
    if (!name.trim()) {
      return { isValid: false, error: "Full name is required" }
    }

    if (!name.includes(',')) {
      return { 
        isValid: false, 
        error: "Please use format: Last Name, First Name, M.I. (comma separated)" 
      }
    }

    const parts = name.split(',').map(part => part.trim()).filter(part => part.length > 0)
    
    if (parts.length < 2) {
      return { 
        isValid: false, 
        error: "Please provide both Last Name and First Name separated by comma" 
      }
    }

    if (parts[0].length === 0 || parts[1].length === 0) {
      return { 
        isValid: false, 
        error: "Last Name and First Name cannot be empty" 
      }
    }

    const nameRegex = /^[a-zA-Z\s.'-]+$/
    if (!nameRegex.test(parts[0]) || !nameRegex.test(parts[1])) {
      return { 
        isValid: false, 
        error: "Names should contain only letters, spaces, and common name characters" 
      }
    }

    return { isValid: true, error: "" }
  }

  // Phone number validation function
  const validatePhoneNumber = (phone: string): { isValid: boolean; error: string } => {
    if (!phone.trim()) {
      return { isValid: true, error: "" }
    }

    const digitsOnly = phone.replace(/\D/g, '')
    
    if (digitsOnly.length !== 11) {
      return { 
        isValid: false, 
        error: "Phone number must contain exactly 11 digits" 
      }
    }

    const phoneRegex = /^(\d{4}-?\d{3}-?\d{4}|\d{11})$/
    if (!phoneRegex.test(phone)) {
      return { 
        isValid: false, 
        error: "Please use format: 0881-756-9989 or 08817569989" 
      }
    }

    const validPrefixes = ['09', '08', '07']
    const startsWithValidPrefix = validPrefixes.some(prefix => digitsOnly.startsWith(prefix))
    
    if (!startsWithValidPrefix) {
      return { 
        isValid: false, 
        error: "Please enter a valid Philippine mobile number" 
      }
    }

    return { isValid: true, error: "" }
  }

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '')
    const limitedDigits = digitsOnly.slice(0, 11)
    
    if (limitedDigits.length <= 4) {
      return limitedDigits
    } else if (limitedDigits.length <= 7) {
      return `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4)}`
    } else {
      return `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4, 7)}-${limitedDigits.slice(7)}`
    }
  }

  // Handle phone number change with auto-formatting
  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhoneNumber(value)
    setUserProfile(prev => ({ ...prev, phone: formattedPhone }))
    
    if (value.trim()) {
      const validation = validatePhoneNumber(formattedPhone)
      setPhoneError(validation.error)
    } else {
      setPhoneError("")
    }
  }

  // Handle name change with validation
  const handleNameChange = (value: string) => {
    setUserProfile(prev => ({ ...prev, fullName: value }))
    
    if (value.trim()) {
      const validation = validateFullName(value)
      setNameError(validation.error)
    } else {
      setNameError("")
    }
  }

  // Password Requirement Component
  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-sm ${met ? 'text-green-600' : 'text-red-600'}`}>
        {text}
      </span>
    </div>
  )

  // Handle password change
  const handleChangePassword = async () => {
    if (!user) {
      setPasswordError("User not authenticated")
      return
    }

    if (!canChangePassword) {
      setPasswordError("Please fill all fields and meet password requirements")
      return
    }

    setPasswordLoading(true)
    setPasswordError("")
    setPasswordSuccess("")

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email!,
        passwordData.currentPassword
      )
      
      await reauthenticateWithCredential(user, credential)
      
      // Update password
      await updatePassword(user, passwordData.newPassword)

      setPasswordSuccess("Password updated successfully!")
      
      // Reset form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })

      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      })

      setTimeout(() => {
        setPasswordSuccess("")
      }, 3000)

    } catch (error: any) {
      console.error('Error changing password:', error)
      
      let errorMessage = "Failed to change password. Please try again."
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect."
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak. Please choose a stronger password."
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log in again to change your password."
      }

      setPasswordError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }

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
    if (!birthday) return true
    
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
  if (!user) return;
  
  setTotpLoading(true);
  setTotpError("");

  try {
    // Use refreshIdToken if available, otherwise get fresh token
    let freshIdToken;
    
    if (refreshIdToken) {
      freshIdToken = await refreshIdToken();
    } else {
      // Fallback: get fresh token directly from user
      freshIdToken = await user.getIdToken(true);
    }
    
    if (!freshIdToken) {
      throw new Error('Failed to refresh authentication token');
    }

    const response = await fetch('/api/disable-mfa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: freshIdToken }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to disable MFA');
    }

    // If we got a custom token, sign in with it immediately
    if (result.customToken) {
      console.log('🔄 Signing in with new custom token to prevent expiration');
      
      const { signInWithCustomToken } = await import('firebase/auth');
      const { auth } = await import('@/src/lib/firebase');
      
      // Sign in with the new custom token
      await signInWithCustomToken(auth, result.customToken);
      
      // Get the new ID token
      const newUser = auth.currentUser;
      if (newUser) {
        const newIdToken = await newUser.getIdToken(true);
        document.cookie = `idToken=${newIdToken}; path=/; max-age=3600; SameSite=Lax`;
        console.log('✅ Successfully signed in with new token after MFA disable');
      }
    }

    // Update UI state
    setTotpSuccess("TOTP disabled successfully!");
    setTotpData(prev => ({ ...prev, isEnrolled: false }));
    
    toast({
      title: "Success",
      description: "Two-factor authentication has been disabled.",
    });
    
    } catch (error: any) {
      console.error('Error disabling TOTP:', error);
      
      setTotpError(error.message || "Failed to disable TOTP. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to disable TOTP.",
        variant: "destructive",
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const nameValidation = validateFullName(userProfile.fullName)
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error)
      toast({
        title: "Invalid Name Format",
        description: nameValidation.error,
        variant: "destructive",
      });
      return;
    }

    const phoneValidation = validatePhoneNumber(userProfile.phone)
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error)
      toast({
        title: "Invalid Phone Number",
        description: phoneValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      setProfileError("User not authenticated")
      return
    }

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

  // Phone number examples
  const phoneExamples = [
    "0917-123-4567",
    "0922-987-6543", 
    "0881-756-9989",
    "09171234567"
  ]

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[oklch(0.88_0_0)]">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "profile"
              ? "border-[oklch(0.68_0.19_35)] text-[oklch(0.68_0.19_35)]"
              : "border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
          }`}
        >
          <User className="h-5 w-5" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "security"
              ? "border-[oklch(0.68_0.19_35)] text-[oklch(0.68_0.19_35)]"
              : "border-transparent text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
          }`}
        >
          <Lock className="h-5 w-5" />
          Security
        </button>
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                Last Name, First Name, M.I
              </label>
              <input
                type="text"
                value={userProfile.fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  nameError 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-[oklch(0.88_0_0)] focus:ring-[oklch(0.68_0.19_35)]'
                }`}
                placeholder="Doe, John A."
              />
              {nameError && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-600">{nameError}</p>
                </div>
              )}
              {!nameError && userProfile.fullName && (
                <div className="flex items-center gap-1 mt-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-600">Name format is correct</p>
                </div>
              )}
              <div className="mt-1">
                <p className="text-xs text-[oklch(0.45_0_0)]">
                  <strong>Format:</strong> Last Name, First Name, Middle Initial (optional)
                </p>
              </div>
            </div>
            
            {/* Gender Dropdown - UPDATED */}
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
                    
                    if (newBirthday && !validateAge(newBirthday)) {
                      setProfileError("You must be at least 18 years old.")
                    } else {
                      setProfileError("")
                    }
                  }}
                  max={getMaxBirthDate()}
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

            {/* Phone Number Field */}
            <div>
              <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={userProfile.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  phoneError 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-[oklch(0.88_0_0)] focus:ring-[oklch(0.68_0.19_35)]'
                }`}
                placeholder="0917-123-4567"
                maxLength={13}
              />
              {phoneError && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-600">{phoneError}</p>
                </div>
              )}
              {!phoneError && userProfile.phone && (
                <div className="flex items-center gap-1 mt-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-green-600">Phone number is valid</p>
                </div>
              )}
              <div className="mt-1">
                <p className="text-xs text-[oklch(0.45_0_0)]">
                  <strong>Format:</strong> 11-digit Philippine mobile number
                </p>
                <p className="text-xs text-[oklch(0.45_0_0)]">
                  <strong>Examples:</strong> {phoneExamples.join(", ")}
                </p>
              </div>
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
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password Section */}
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
            <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Change Password</h2>
            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.45_0_0)]"
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.45_0_0)]"
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      passwordData.confirmPassword && !doPasswordsMatch
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-[oklch(0.88_0_0)] focus:ring-[oklch(0.68_0.19_35)]'
                    }`}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[oklch(0.45_0_0)]"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordData.confirmPassword && !doPasswordsMatch && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <X className="h-4 w-4" />
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              {passwordData.newPassword && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Password Requirements:</h4>
                  <div className="space-y-1">
                    <PasswordRequirement 
                      met={passwordChecks.hasMinLength} 
                      text="At least 8 characters long" 
                    />
                    <PasswordRequirement 
                      met={passwordChecks.hasUpperCase} 
                      text="At least one uppercase letter (A-Z)" 
                    />
                    <PasswordRequirement 
                      met={passwordChecks.hasLowerCase} 
                      text="At least one lowercase letter (a-z)" 
                    />
                    <PasswordRequirement 
                      met={passwordChecks.hasNumber} 
                      text="At least one number (0-9)" 
                    />
                    <PasswordRequirement 
                      met={passwordChecks.hasSpecialChar} 
                      text="At least one special character (!@#$%^&*)" 
                    />
                  </div>
                </div>
              )}

              {/* Error and Success Messages */}
              {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
              {passwordSuccess && <p className="text-green-600 text-sm">{passwordSuccess}</p>}

              <button
                onClick={handleChangePassword}
                disabled={!canChangePassword || passwordLoading}
                className="px-6 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {passwordLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </div>

          {/* Two-Factor Authentication Section */}
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Two-Factor Authentication</h2>
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
    </div>
  )
}