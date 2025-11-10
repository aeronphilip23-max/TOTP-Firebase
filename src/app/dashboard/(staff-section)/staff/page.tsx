"use client"

import { Package, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/src/components/ui/chart"
import { Calendar } from "@/src/components/ui/calendar"
import { useState, useEffect } from "react"

import { db } from "@/src/lib/firebase"
import { LalamoveService } from '@/src/lib/services/lalamove';

import { collection, getDocs, onSnapshot, getAggregateFromServer, sum, count, getCountFromServer, where, or, query, doc, setDoc } from "firebase/firestore";



interface ShipmentWithTracking {
  id: string;
  destination: string;
  materials: string;
  eta: string;
  status: string;
  lalamoveOrderId?: string;
  tracking?: {
    lat: number;
    lng: number;
    driverName?: string;
    driverPhone?: string;
    lastUpdate: string;
  };
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  
  const [inventoryData, setInventoryData] = useState<Array<{ 
    id?: string;
    name?: string;
    quantity?: number
  }>>([]);

  // inventory total and percentage variables 
  const currentTotal = inventoryData.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [inventoryPercent, setInventoryPercent] = useState('');

  // store active shipments count
  const [activeShipmentsCount, setActiveShipmentsCount] = useState(0);
  // store shipments data for chart
  const [shipmentsData, setShipmentsData] = useState<Array<{ month: string; shipments: number }>>([]);
  const lalamoveService = new LalamoveService();
  const [shipments, setShipments] = useState<ShipmentWithTracking[]>([]);

  // get inventory data from db  
  const getMaterials = async () => {
    const querySnapshot = await getDocs(collection(db, "inventory"));
    const materialsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
    setInventoryData(materialsList);
  }
  
  useEffect(() => {
    getMaterials();
  }, []);


  // calculating percentage change from total materials in inventory
  const getAggregateData = async () => {
    const materialSnapshot = await getAggregateFromServer(collection(db, "inventory"), {
      totalMaterials: sum("quantity")
    });
    setTotalMaterials(materialSnapshot.data().totalMaterials);
  };

  useEffect(() => {
    getAggregateData();

    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const percent = ((totalMaterials - currentTotal) / totalMaterials) * 100;
      let percentString = "";
      if (percent >= 0){
        percentString = "+" + percent + "%";  
        
      } else {
        percentString = "-" + percent + "%";
      }
      setInventoryPercent(percentString);
    });
    return () => unsubscribe();

  }, [currentTotal, totalMaterials]);


  const getActiveShipmentsCount = async () => {
    const q = query(collection(db, "shipments"), or(where("status", "==", "Pending"), where("status", "==", "In Transit")) );
    const snapshot = await getCountFromServer(q);
    setActiveShipmentsCount(snapshot.data().count);
  }

  

  const getShipmentsData = async () => {
    const shipmentsRef = collection(db, "shipments");
    const q = query(shipmentsRef, where("status", "==", "Delivered"));
    const querySnapshot = await getDocs(q);

    const monthlyShipments = new Map<string, number>();
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    querySnapshot.forEach((doc) => {
      const eta = doc.data().eta;
      if (!eta) return;

      const dateObj: Date = typeof eta?.toDate === "function" ? eta.toDate() : new Date(eta);
      const month = dateObj.toLocaleString("default", { month: "short" });
      monthlyShipments.set(month, (monthlyShipments.get(month) || 0) + 1);
    });

    // Convert map to sorted array (month only). Keep year empty to avoid type issues.
    const chartData = Array.from(monthlyShipments.entries())
      .map(([month, count]) => ({ month, year: "", shipments: count }))
      .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    setShipmentsData(chartData);
  };

  // Add this function to update tracking info
  const updateShipmentTracking = async (shipment: ShipmentWithTracking) => {
    if (!shipment.lalamoveOrderId) return;

    try {
      const orderStatus = await lalamoveService.getOrderStatus(shipment.lalamoveOrderId);
      
      // Update shipment in Firestore
      await setDoc(doc(db, "shipments", shipment.id), {
        ...shipment,
        status: orderStatus.status,
        tracking: {
          lat: orderStatus.tracking?.lat,
          lng: orderStatus.tracking?.lng,
          driverName: orderStatus.driver?.name,
          driverPhone: orderStatus.driver?.phone,
          lastUpdate: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating tracking:', error);
    }
  };

  // Modify your existing getShipments function
  const getShipments = async () => {
    const querySnapshot = await getDocs(collection(db, "shipments"));
    const shipmentsData = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as ShipmentWithTracking[];

    // Update tracking for all shipments with Lalamove orders
    await Promise.all(
      shipmentsData
        .filter(s => s.lalamoveOrderId)
        .map(updateShipmentTracking)
    );

    setShipments(shipmentsData);
  };

  // Add tracking update interval
  useEffect(() => {
    const interval = setInterval(() => {
      getShipments();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getActiveShipmentsCount();
    getShipmentsData();
  }, []);



  const stats = [
    {
      title: "Total Materials",
      value: currentTotal.toString(),
      change: inventoryPercent,
      icon: Package,
      color: "text-[oklch(0.68_0.19_35)]",
      bgColor: "bg-[oklch(0.68_0.19_35)]/10",
    },
    {
      title: "Active Shipments",
      value: activeShipmentsCount.toString(),
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
          <XAxis
            dataKey="month"
            tickFormatter={(month) => month}
            interval={0} // Show all months
          />
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
