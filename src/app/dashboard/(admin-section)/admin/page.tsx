"use client"

import { Package, BarChart3, Box, CalendarIcon, User } from "lucide-react"
import { useState } from "react"

import ShipmentsTab from "./shipments/page"
import InventoryTab from "./inventory/page"
import ReportsTab from "./reports/page"
import CalendarTab from "./calendar/page"
import SettingsTab from "./settings/page"

type TabType = "shipments" | "inventory" | "reports" | "calendar" | "settings"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("shipments")

  const tabs = [
    { id: "shipments" as TabType, name: "Shipments", icon: Package },
    { id: "inventory" as TabType, name: "Inventory", icon: Box },
    { id: "reports" as TabType, name: "Reports", icon: BarChart3 },
    { id: "calendar" as TabType, name: "Calendar", icon: CalendarIcon },
    { id: "settings" as TabType, name: "Settings", icon: User },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-[oklch(0.88_0_0)] p-1">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-[oklch(0.68_0.19_35)] text-white"
                    : "text-[oklch(0.45_0_0)] hover:bg-[oklch(0.96_0_0)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {activeTab === "shipments" && <ShipmentsTab />}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  )
}
