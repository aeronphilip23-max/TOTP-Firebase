"use client"

import { User, Lock } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/src/context/authcontext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/src/lib/firebase"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile")
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    gender: "",
    age: "",
    email: "",
    phone: "",
  })
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
      {activeTab === "security" && (
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-6">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Change Email</label>
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
              <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Confirm New Password</label>
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
    </div>
  )
}
