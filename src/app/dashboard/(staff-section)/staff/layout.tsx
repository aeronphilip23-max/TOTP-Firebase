"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Package, BarChart3, Box, Settings, Menu, X, User } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import AuthGuard from '@/src/components/authguard'
import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { app } from "@/src/lib/firebase" // Adjust path to your Firebase config

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  const navigation = [
    { name: "Dashboard", href: "/dashboard/staff", icon: Package },
    { name: "Shipments", href: "/dashboard/staff/shipments", icon: Package },
    { name: "Reports", href: "/dashboard/staff/reports", icon: BarChart3 },
    { name: "Inventory", href: "/dashboard/staff/inventory", icon: Box },
    { name: "Settings", href: "/dashboard/staff/settings", icon: Settings },
  ]

  // Get current user from Firebase
  useEffect(() => {
    const auth = getAuth(app)
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = () => {
    const auth = getAuth(app)
    auth.signOut().then(() => {
      // Clear cookies and redirect to login
      document.cookie = 'idToken=; path=/; max-age=0'
      document.cookie = 'userRole=; path=/; max-age=0'
      router.push('/auth/login')
    })
  }

  return (
    <AuthGuard requiredRole="user">
      <div className="min-h-screen bg-[oklch(0.96_0_0)]">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-64 bg-[oklch(0.18_0.08_250)] transform transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[oklch(0.25_0.1_250)]">
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-[oklch(0.68_0.19_35)]" />
                <Link href="/dashboard/staff" className="text-xl font-bold text-white">
                  LogiTrack
                </Link>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="lg:hidden text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[oklch(0.68_0.19_35)] text-white"
                        : "text-[oklch(0.85_0.02_250)] hover:bg-[oklch(0.25_0.1_250)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                )
              })}
            </nav>

            {/* User Avatar Footer */}
            <div className="p-4 border-t border-[oklch(0.25_0.1_250)]">
              {!loading && user ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.25_0.1_250)]">
                  <div className="flex-shrink-0">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-[oklch(0.68_0.19_35)] flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-[oklch(0.75_0.02_250)] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.25_0.1_250)]">
                  <div className="h-10 w-10 rounded-full bg-[oklch(0.3_0.1_250)] animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-[oklch(0.3_0.1_250)] rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-[oklch(0.3_0.1_250)] rounded animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <header className="bg-white border-b border-[oklch(0.88_0_0)] px-6 py-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="lg:hidden text-[oklch(0.18_0.08_250)]"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-4 ml-auto">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}