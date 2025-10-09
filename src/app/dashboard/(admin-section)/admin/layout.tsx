"use client"

import type React from "react"

import { useRouter, usePathname } from "next/navigation"
import { Package, BarChart3, Box, Settings, Menu, X, Shield } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/dashboard/admin/dashboard", icon: Box },
    { name: "Admin", href: "/dashboard/admin", icon: Shield },
  ]

  return (
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

        <nav className="p-4 space-y-2">
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
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
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
  )
}
