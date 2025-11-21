"use client"

import { Package, TrendingUp, AlertTriangle, CheckCircle, CalendarIcon, Clock } from "lucide-react"
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

interface Shipment {
  id: string;
  destination?: string;
  materials?: string;
  eta?: string;
  status?: string;
  lalamoveOrderId?: string | null;
  quantity?: number;
  materialId?: string;
  delayReason?: string;
  createdAt?: any;
}

// Enhanced Calendar Component using CSS Modifiers
const EnhancedCalendar = ({ 
  selectedDate, 
  onSelect, 
  shipments 
}: { 
  selectedDate: Date; 
  onSelect: (date: Date | undefined) => void; 
  shipments: Shipment[];
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get unique dates that have shipments for CSS modifiers
  const shipmentDates = shipments
    .filter(shipment => shipment.eta) // Only include shipments with ETA
    .map(shipment => new Date(shipment.eta as string));

  return (
    <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="h-5 w-5 text-[oklch(0.68_0.19_35)]" />
        <h3 className="font-semibold text-[oklch(0.18_0.08_250)]">Calendar</h3>
      </div>
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-[oklch(0.18_0.08_250)]">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <div className="flex items-center gap-2 text-sm text-[oklch(0.45_0_0)]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Shipments</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelect}
        onMonthChange={setCurrentMonth}
        className="w-full"
        modifiers={{
          hasShipments: shipmentDates
        }}
        modifiersClassNames={{
          hasShipments: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:bg-blue-500 after:rounded-full"
        }}
      />

      {/* Calendar Legend */}
      <div className="mt-4 pt-4 border-t border-[oklch(0.88_0_0)]">
        <div className="flex items-center justify-between text-xs text-[oklch(0.45_0_0)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[oklch(0.68_0.19_35)] rounded"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Has Shipments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status badge styling function
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-700 border-green-300";
    case "PICKED_UP":
    case "DRIVER_ASSIGNED":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "CANCELED":
      return "bg-red-100 text-red-700 border-red-300";
    case "DELAYED":
      return "bg-orange-100 text-orange-700 border-orange-300";
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
  }
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
  const [allShipments, setAllShipments] = useState<Shipment[]>([])

  // Load all shipments for calendar
  const getAllShipments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "shipments"));
      const shipmentsData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Shipment[];

      setAllShipments(shipmentsData);
    } catch (error) {
      console.error("Error loading shipments:", error);
    }
  }

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

  // Filter shipments for selected date
  const shipmentsForSelectedDate = allShipments.filter(shipment => {
    if (!shipment.eta) return false;
    
    try {
      // Parse the shipment ETA date
      const shipmentDate = new Date(shipment.eta);
      
      // Create comparison dates at start of day (to ignore time)
      const shipmentDateStart = new Date(shipmentDate);
      shipmentDateStart.setHours(0, 0, 0, 0);
      
      const selectedDateStart = new Date(selectedDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      
      // Compare dates (ignoring time)
      return shipmentDateStart.getTime() === selectedDateStart.getTime();
    } catch (error) {
      console.error('Error parsing shipment date:', shipment.eta, error);
      return false;
    }
  });

  useEffect(() => {
    getMaterials()
    getShipmentsData()
    getActiveShipmentsCount()
    getCompletedTodayCount()
    getRecentActivity()
    getAllShipments()
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
        {/* Enhanced Calendar */}
        <EnhancedCalendar
          selectedDate={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          shipments={allShipments}
        />

        {/* Selected Date Shipments */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[oklch(0.18_0.08_250)]">
              Shipments for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <span className="px-2 py-1 bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)] text-sm rounded-md">
              {shipmentsForSelectedDate.length} shipments
            </span>
          </div>
          
          {shipmentsForSelectedDate.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {shipmentsForSelectedDate.map((shipment) => (
                <div
                  key={shipment.id}
                  className="p-3 rounded-lg border border-[oklch(0.88_0_0)] hover:border-[oklch(0.68_0.19_35)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(shipment.status || 'ASSIGNING_DRIVER')}`}
                    >
                      {shipment.status?.toLowerCase().replace(/_/g, ' ') || 'assigning driver'}
                    </span>
                    {shipment.delayReason && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                        Delayed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">{shipment.id}</p>
                  <p className="text-xs text-[oklch(0.45_0_0)] mb-1">{shipment.destination}</p>
                  <div className="flex items-center gap-2 text-xs text-[oklch(0.45_0_0)]">
                    <Package className="h-3 w-3" />
                    <span className="truncate">{shipment.materials}</span>
                  </div>
                  {shipment.delayReason && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-[oklch(0.45_0_0)]">
                      <Clock className="h-3 w-3" />
                      <span>Delay: {shipment.delayReason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CalendarIcon className="h-8 w-8 text-[oklch(0.88_0_0)] mx-auto mb-2" />
              <p className="text-sm text-[oklch(0.45_0_0)]">No shipments scheduled for this date</p>
            </div>
          )}
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