"use client"

import { User, Lock } from "lucide-react"
import { useState } from "react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile")

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
                defaultValue="John Doe"
                className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Email Address</label>
              <input
                type="email"
                defaultValue="john.doe@example.com"
                className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Phone Number</label>
              <input
                type="tel"
                defaultValue="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
              />
            </div>
            <button className="px-6 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors">
              Save Changes
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
