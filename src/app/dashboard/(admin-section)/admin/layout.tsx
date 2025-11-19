"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Package, BarChart3, Box, FileBox, Settings, Menu, X, Shield, User } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import AuthGuard from '../../../../components/authguard'
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface UserProfile {
  name: string;
  email: string;
  gender?: string;
  age?: string;
  phone?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const navigation = [
    { name: "Dashboard", href: "/dashboard/admin/dashboard", icon: Box },
    { name: "Admin", href: "/dashboard/admin", icon: Shield },
  ]

  // Get current user from Firebase and profile from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setUserProfile({
              name: data.name || user.displayName || user.email?.split('@')[0] || 'Admin',
              email: data.email || user.email || '',
              gender: data.gender || '',
              age: data.age || '',
              phone: data.phone || '',
            })
          } else {
            // If no profile in Firestore, use auth data
            setUserProfile({
              name: user.displayName || user.email?.split('@')[0] || 'Admin',
              email: user.email || '',
            })
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
          // Fallback to auth data if Firestore fails
          setUserProfile({
            name: user.displayName || user.email?.split('@')[0] || 'Admin',
            email: user.email || '',
          })
        }
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      
      // Clear cookies
      document.cookie = 'idToken=; path=/; max-age=0';
      document.cookie = 'userRole=; path=/; max-age=0';
      
      // Sign out from Firebase
      await auth.signOut();
      
      console.log("Logout successful, redirecting to login...");
      
      // Use window.location.href for a hard redirect that bypasses middleware
      window.location.href = '/auth/login';
      
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect even if there's an error
      window.location.href = '/auth/login';
    }
  };

  // Function to get display name with priority: Firestore name > Auth displayName > email username
  const getDisplayName = () => {
    if (userProfile?.name) return userProfile.name;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'Admin';
  };

  // Function to get display email with priority: Firestore email > Auth email
  const getDisplayEmail = () => {
    if (userProfile?.email) return userProfile.email;
    if (user?.email) return user.email;
    return '';
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-[oklch(0.96_0_0)]">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
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
                <Link href={"/dashboard/admin/dashboard"} className="text-xl font-bold text-white">
                  LogiTrack
                </Link>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
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
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-[oklch(0.75_0.02_250)] truncate">
                      {getDisplayEmail()}
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
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[oklch(0.18_0.08_250)]">
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
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}