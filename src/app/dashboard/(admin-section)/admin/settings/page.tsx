"use client"

import { User, Lock, UserPlus, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/src/context/authcontext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/src/lib/firebase"
import { useToast } from "@/hooks/use-toast"

export default function SettingsTab() {
  const { user } = useAuth()
  const [settingsTab, setSettingsTab] = useState<"profile" | "security" | "accounts">("profile")
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false)
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    gender: "",
    age: "",
    email: "",
    phone: "",
  })
  const [newAccount, setNewAccount] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  })
  const [accountError, setAccountError] = useState("")
  const [accountSuccess, setAccountSuccess] = useState("")
  const [accountLoading, setAccountLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")
  const { toast } = useToast()

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
            age: data.age || "",
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
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) {
      setProfileError("User not authenticated")
      return
    }

    setProfileLoading(true)
    setProfileError("")
    setProfileSuccess("")

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: userProfile.fullName,
        gender: userProfile.gender,
        age: userProfile.age,
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
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Gender</label>
                <input
                  type="text"
                  value={userProfile.gender}
                  onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Age</label>
                <input
                  type="text"
                  value={userProfile.age}
                  onChange={(e) => setUserProfile({ ...userProfile, age: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Email Address</label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
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
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
            <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Change Password</h3>
            <div className="space-y-4">
                            <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Change Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>
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
    </>
  )
}
