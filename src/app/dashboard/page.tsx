// app/dashboard/page.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/context/authcontext'

export default function DashboardRedirect() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else {
        // Redirect based on role
        switch (userRole) {
          case 'admin':
            router.push('/dashboard/admin/dashboard')
            break
          case 'user':
          default:
            router.push('/dashboard/staff')
            break
        }
      }
    }
  }, [user, userRole, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(0.96_0_0)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[oklch(0.68_0.19_35)] mx-auto mb-4"></div>
        <p className="text-[oklch(0.45_0_0)]">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}