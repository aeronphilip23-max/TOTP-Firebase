"use client"

import { useRouter } from "next/navigation"
import { Package, TrendingUp, Shield, Zap } from "lucide-react"

export default function LandingPage() {
  const navigate = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.18_0.08_250)] via-[oklch(0.22_0.09_250)] to-[oklch(0.15_0.07_250)]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8 text-[oklch(0.68_0.19_35)]" />
          <span className="text-2xl font-bold text-white">LogiTrack</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate.push("/auth/login")}
            className="px-4 py-2 text-white hover:text-[oklch(0.68_0.19_35)] transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => navigate.push("/auth/login")}
            className="px-6 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="px-6 py-20 lg:px-12 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Unified Logistics Platform
              </h1>
              <p className="text-lg lg:text-xl text-[oklch(0.85_0.02_250)] mb-8 leading-relaxed">
                Unlock unequalled business performance with real-time insights, automation, an expanding marketplace,
                and digital tracking. Join the logistics revolution in the making.
              </p>
              <button
                onClick={() => navigate.push("/auth/login")}
                className="px-8 py-4 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors font-medium text-lg"
              >
                Get Started
              </button>
            </div>

            {/* Wireframe Illustration */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.68_0.19_35)] to-[oklch(0.75_0.08_240)] opacity-20 blur-3xl"></div>
              <div className="relative border-2 border-[oklch(0.75_0.08_240)] rounded-lg p-8 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-[oklch(0.75_0.08_240)] rounded p-4 bg-[oklch(0.22_0.09_250)]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.19_35)]"></div>
                      <span className="text-sm text-white">Advanced Reports</span>
                    </div>
                    <div className="h-16 border-t border-[oklch(0.75_0.08_240)] mt-2"></div>
                  </div>
                  <div className="border border-[oklch(0.75_0.08_240)] rounded p-4 bg-[oklch(0.22_0.09_250)]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.19_35)]"></div>
                      <span className="text-sm text-white">Inventory Management</span>
                    </div>
                    <div className="h-16 border-t border-[oklch(0.75_0.08_240)] mt-2"></div>
                  </div>
                  <div className="col-span-2 border border-[oklch(0.75_0.08_240)] rounded p-4 bg-[oklch(0.22_0.09_250)]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.19_35)]"></div>
                      <span className="text-sm text-white">Smart Scheduling</span>
                    </div>
                    <div className="h-12 border-t border-[oklch(0.75_0.08_240)] mt-2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-20 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[oklch(0.18_0.08_250)] mb-16">
            Everything you need to manage logistics
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[oklch(0.68_0.19_35)] rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-2">Advanced Reports</h3>
              <p className="text-[oklch(0.45_0_0)]">Generate comprehensive reports for better decision making</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[oklch(0.68_0.19_35)] rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-2">Inventory Management</h3>
              <p className="text-[oklch(0.45_0_0)]">Track engineering materials and supplies efficiently</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[oklch(0.68_0.19_35)] rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-2">Smart Scheduling</h3>
              <p className="text-[oklch(0.45_0_0)]">Schedule and manage shipments with integrated calendar</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20 lg:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to transform your logistics?</h2>
          <p className="text-lg text-[oklch(0.85_0.02_250)] mb-8">
            Join us using LogiTrack
          </p>

        </div>
      </div>
    </div>
  )
}
