"use client"

import { Package, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/src/components/ui/chart"
import { Calendar } from "@/src/components/ui/calendar"
import { useState, useEffect } from "react"
import { db } from "@/src/lib/firebase"
import { collection, getDocs, query, where, getCountFromServer } from "firebase/firestore"

interface Activity {
  id: string;
  type: 'shipment' | 'material' | 'alert';
  message: string;
  timestamp: Date;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [inventoryData, setInventoryData] = useState<Array<{ name?: string; quantity?: number }>>([])
  const [shipmentsData, setShipmentsData] = useState<Array<{ month: string; shipments: number }>>([])
  const [activeShipmentsCount, setActiveShipmentsCount] = useState(0)
  const [completedTodayCount, setCompletedTodayCount] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [totalMaterials, setTotalMaterials] = useState(0)
  const [warehouseCapacity, setWarehouseCapacity] = useState(0)
  const [onTimeDeliveryPercent, setOnTimeDeliveryPercent] = useState(94)
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])

  const getMaterials = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "inventory"))
      const materialsList = querySnapshot.docs
        .map(doc => {
          const data = doc.data() as any
          return {
            id: doc.id,
            name: data.name || "Unknown",
            quantity: typeof data.quantity === "number" ? data.quantity : 0,
          }
        })
        .filter(item => item.quantity > 0) // Only show items with quantity > 0
      
      setInventoryData(materialsList)

      const total = materialsList.reduce((sum, item) => sum + (item.quantity || 0), 0)
      const lowStock = materialsList.filter(item => (item.quantity || 0) < 100).length
      setTotalMaterials(total)
      setLowStockCount(lowStock)
    } catch (error) {
      console.error("Error loading inventory:", error)
    }
  }

  const getShipmentsData = async () => {
    try {
      const shipmentsRef = collection(db, "shipments")
      const q = query(shipmentsRef, where("status", "==", "COMPLETED"))
      const querySnapshot = await getDocs(q)

      const monthlyShipments = new Map<string, number>()
      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

      querySnapshot.forEach((doc) => {
        const eta = doc.data().eta
        if (!eta) return
        const dateObj = typeof eta?.toDate === "function" ? eta.toDate() : new Date(eta)
        const month = dateObj.toLocaleString("default", { month: "short" })
        monthlyShipments.set(month, (monthlyShipments.get(month) || 0) + 1)
      })

      const chartData = Array.from(monthlyShipments.entries())
        .map(([month, count]) => ({ month, shipments: count }))
        .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))

      setShipmentsData(chartData)
    } catch (error) {
      console.error("Error loading shipments data:", error)
    }
  }

  const getActiveShipmentsCount = async () => {
    try {
      const q = query(
        collection(db, "shipments"),
        where("status", "in", ["ASSIGNING_DRIVER", "DRIVER_ASSIGNED", "PICKED_UP"])
      )
      const snapshot = await getCountFromServer(q)
      setActiveShipmentsCount(snapshot.data().count)
    } catch (error) {
      console.error("Error loading active shipments:", error)
    }
  }

  const getCompletedTodayCount = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const q = query(collection(db, "shipments"), where("status", "==", "COMPLETED"))
      const querySnapshot = await getDocs(q)
      
      let count = 0
      querySnapshot.forEach(doc => {
        const data = doc.data()
        const updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt || 0)
        if (updatedAt >= today && updatedAt < tomorrow) {
          count++
        }
      })
      
      setCompletedTodayCount(count)
    } catch (error) {
      console.error("Error loading completed today:", error)
    }
  }

  const getRecentActivity = async () => {
    try {
      const shipmentsSnap = await getDocs(collection(db, "shipments"))
      const activities: Activity[] = []

      shipmentsSnap.docs.slice(0, 3).forEach(doc => {
        const data = doc.data()
        if (data.status === "COMPLETED") {
          activities.push({
            id: doc.id,
            type: 'shipment',
            message: `Shipment ${doc.id} delivered`,
            timestamp: new Date(data.updatedAt || Date.now())
          })
        }
      })

      const inventorySnap = await getDocs(collection(db, "inventory"))
      inventorySnap.docs.forEach(doc => {
        const data = doc.data()
        if ((data.quantity || 0) < 10) {
          activities.push({
            id: doc.id,
            type: 'alert',
            message: `Low stock alert: ${data.name}`,
            timestamp: new Date()
          })
        }
      })

      setRecentActivity(activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 3))
    } catch (error) {
      console.error("Error loading recent activity:", error)
    }
  }

  const calculateWarehouseCapacity = () => {
    const maxCapacity = 10000
    const used = totalMaterials
    const percent = Math.min((used / maxCapacity) * 100, 100)
    setWarehouseCapacity(Math.round(percent))
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  useEffect(() => {
    getMaterials()
    getShipmentsData()
    getActiveShipmentsCount()
    getCompletedTodayCount()
    getRecentActivity()
  }, [])

  useEffect(() => {
    calculateWarehouseCapacity()
  }, [totalMaterials])

  const stats = [
    {
      title: "Total Materials",
      value: totalMaterials.toString(),
      icon: Package,
      color: "text-[oklch(0.68_0.19_35)]",
      bgColor: "bg-[oklch(0.68_0.19_35)]/10",
    },
    {
      title: "Active Shipments",
      value: activeShipmentsCount.toString(),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Low Stock Items",
      value: lowStockCount.toString(),
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Completed Today",
      value: completedTodayCount.toString(),
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
            {recentActivity.length === 0 ? (
              <p className="text-[oklch(0.45_0_0)]">No recent activity</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div key={activity.id} className={`flex items-center gap-4 pb-4 ${idx < recentActivity.length - 1 ? 'border-b border-[oklch(0.88_0_0)]' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'shipment' ? 'bg-green-500' :
                    activity.type === 'material' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">{activity.message}</p>
                    <p className="text-xs text-[oklch(0.45_0_0)]">{getTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
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
              <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">{warehouseCapacity}%</span>
            </div>
            <div className="w-full bg-[oklch(0.96_0_0)] rounded-full h-2">
              <div className="bg-[oklch(0.68_0.19_35)] h-2 rounded-full" style={{ width: `${warehouseCapacity}%` }}></div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-[oklch(0.45_0_0)]">On-Time Delivery</span>
              <span className="text-sm font-medium text-green-600">{onTimeDeliveryPercent}%</span>
            </div>
            <div className="w-full bg-[oklch(0.96_0_0)] rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${onTimeDeliveryPercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}