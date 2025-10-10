"use client"

import { Package, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/src/components/ui/chart"
import { Calendar } from "@/src/components/ui/calendar"
import { useState } from "react"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const inventoryData = [
    { name: "Steel Beams", quantity: 150 },
    { name: "Concrete Mix", quantity: 2500 },
    { name: "Electrical Cables", quantity: 5000 },
    { name: "Piping Systems", quantity: 300 },
    { name: "Insulation", quantity: 800 },
  ]

  const shipmentsData = [
    { month: "Jan", shipments: 45 },
    { month: "Feb", shipments: 52 },
    { month: "Mar", shipments: 48 },
    { month: "Apr", shipments: 61 },
    { month: "May", shipments: 55 },
    { month: "Jun", shipments: 67 },
  ]

  const stats = [
    {
      title: "Total Materials",
      value: "3,950",
      change: "+12.5%",
      icon: Package,
      color: "text-[oklch(0.68_0.19_35)]",
      bgColor: "bg-[oklch(0.68_0.19_35)]/10",
    },
    {
      title: "Active Shipments",
      value: "24",
      change: "+8.2%",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Low Stock Items",
      value: "7",
      change: "-3.1%",
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Completed Today",
      value: "12",
      change: "+5.4%",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Dashboard Overview</h1>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
                <h3 className="text-2xl font-bold text-[oklch(0.18_0.08_250)]">{stat.value}</h3>
                <p className="text-sm text-[oklch(0.45_0_0)] mt-1">{stat.title}</p>
              </div>
            )
          })}
        </div>

        {/* Shipments Chart */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-lg font-semibold text-[oklch(0.18_0.08_250)] mb-4">Shipments Overview</h2>
          <ChartContainer
            config={{
              shipments: {
                label: "Shipments",
                color: "oklch(0.68 0.19 35)",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shipmentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="shipments" stroke="oklch(0.68 0.19 35)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Inventory Chart */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-lg font-semibold text-[oklch(0.18_0.08_250)] mb-4">Inventory Levels</h2>
          <ChartContainer
            config={{
              quantity: {
                label: "Quantity",
                color: "oklch(0.68 0.19 35)",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="oklch(0.68 0.19 35)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-lg font-semibold text-[oklch(0.18_0.08_250)] mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-[oklch(0.88_0_0)]">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">Shipment SH-001 delivered</p>
                <p className="text-xs text-[oklch(0.45_0_0)]">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pb-4 border-b border-[oklch(0.88_0_0)]">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">New material added to warehouse</p>
                <p className="text-xs text-[oklch(0.45_0_0)]">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">Low stock alert: Steel Beams</p>
                <p className="text-xs text-[oklch(0.45_0_0)]">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h2 className="text-lg font-semibold text-[oklch(0.18_0.08_250)] mb-4">Calendar</h2>
          <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[oklch(0.45_0_0)]">Warehouse Capacity</span>
              <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">78%</span>
            </div>
            <div className="w-full bg-[oklch(0.96_0_0)] rounded-full h-2">
              <div className="bg-[oklch(0.68_0.19_35)] h-2 rounded-full" style={{ width: "78%" }}></div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-[oklch(0.45_0_0)]">On-Time Delivery</span>
              <span className="text-sm font-medium text-green-600">94%</span>
            </div>
            <div className="w-full bg-[oklch(0.96_0_0)] rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "94%" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
