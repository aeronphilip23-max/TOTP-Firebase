"use client"

import { CalendarIcon, Clock, Plus, X, MapPin, Package, Search, Filter } from "lucide-react"
import { useState, useEffect } from "react"
import { Calendar } from "@/src/components/ui/calendar"
import { collection, getDocs, setDoc, doc, updateDoc, query, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/src/lib/firebase"

// Toast Notification Component
const ToastNotification = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300 ease-in-out`}>
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
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
  
  // Count shipments per date for styling
  const shipmentsByDate = shipments.reduce((acc, shipment) => {
    if (shipment.eta) {
      const dateKey = shipment.eta.split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

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
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Has Shipments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CalendarTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showScheduleShipmentModal, setShowScheduleShipmentModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  const [newShipment, setNewShipment] = useState({
    destination: "",
    selectedMaterialId: "",
    quantity: "",
    eta: "",
    time: "09:00",
    deliveryAddress: "",
    deliveryLat: undefined as number | undefined,
    deliveryLng: undefined as number | undefined,
  })

  const [shipments, setShipments] = useState<Shipment[]>([])
  const [allShipments, setAllShipments] = useState<Shipment[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Load materials from inventory
  const getMaterials = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "inventory"))
      const materialsList = querySnapshot.docs.map(doc => {
        const data = doc.data() as any
        return {
          id: doc.id,
          name: data.name || "Unknown",
          quantity: typeof data.quantity === "number" ? data.quantity : 0,
          unit: data.unit || "units"
        }
      }).filter(m => m.quantity > 0)
      setMaterials(materialsList)
    } catch (error) {
      console.error("Error loading materials:", error)
      showToast("Failed to load materials", "error");
    }
  }

  // Load shipments from Firestore (same as shipments tab)
  const getShipments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "shipments"));
      const shipmentsData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Shipment[];

      // Sort by ETA date
      const sorted = [...shipmentsData].sort((a: any, b: any) => {
        const dateA = a.eta ? new Date(a.eta).getTime() : 0;
        const dateB = b.eta ? new Date(b.eta).getTime() : 0;
        return dateB - dateA; // Descending by default
      });

      setAllShipments(sorted);
      setShipments(sorted);
    } catch (error) {
      console.error("Error loading shipments:", error);
      showToast("Failed to load shipments", "error");
    }
  }

  useEffect(() => {
    getMaterials()
    getShipments();
  }, [])

  // Apply filters when allShipments changes
  useEffect(() => {
    applyFilters(searchQuery, selectedStatus);
  }, [allShipments])

  // Search and filter logic
  const applyFilters = (query: string = searchQuery, status: string = selectedStatus) => {
    let filtered = allShipments;

    if (query) {
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(query.toLowerCase()) ||
        s.destination?.toLowerCase().includes(query.toLowerCase()) ||
        s.materials?.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (status !== "ALL") {
      filtered = filtered.filter(s => s.status === status);
    }

    setShipments(filtered);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(query, selectedStatus);
  }

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    applyFilters(searchQuery, status);
  }

  const getSelectedMaterial = () => {
    return materials.find(m => m.id === newShipment.selectedMaterialId)
  }

  const handleMaterialChange = (materialId: string) => {
    setNewShipment({
      ...newShipment,
      selectedMaterialId: materialId,
      quantity: "" 
    })
  }

  const handleQuantityChange = (value: string) => {
    if (value === "") {
      setNewShipment({ ...newShipment, quantity: "" })
      return
    }

    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      const selectedMaterial = getSelectedMaterial()
      if (selectedMaterial && numValue <= selectedMaterial.quantity) {
        setNewShipment({ ...newShipment, quantity: value })
      } else if (!selectedMaterial) {
        setNewShipment({ ...newShipment, quantity: value })
      }
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate >= today) {
      setNewShipment({ ...newShipment, eta: e.target.value });
    } else {
      showToast("Please select a date that is today or in the future.", "error");
    }
  }

  // Updated handleScheduleShipment to create actual shipment (same as shipments tab)
  const handleScheduleShipment = async () => {
  if (!newShipment.destination || !newShipment.selectedMaterialId || !newShipment.quantity || !newShipment.eta) {
    showToast("Please fill in all fields", "error");
    return
  }

  const selectedMaterial = getSelectedMaterial()
  if (!selectedMaterial) {
    showToast("Selected material not found", "error");
    return
  }

  try {
    setIsCreating(true)
    
    // Get ALL shipments to find the highest ID number
    const shipmentsQuery = collection(db, "shipments");
    const querySnapshot = await getDocs(shipmentsQuery);
    
    let nextIdNumber = 1;
    if (!querySnapshot.empty) {
      // Extract ALL document IDs (not from doc.data().id)
      const allShipmentIds = querySnapshot.docs.map(doc => doc.id); // Use doc.id instead of doc.data().id
      
      // Filter for valid SH- format IDs
      const validShipmentIds = allShipmentIds.filter(id => id && id.startsWith('SH-'));
      
      if (validShipmentIds.length > 0) {
        // Extract numbers from all SH- IDs and find the maximum
        const idNumbers = validShipmentIds.map(id => {
          const match = id.match(/SH-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        }).filter(num => num > 0);
        
        if (idNumbers.length > 0) {
          nextIdNumber = Math.max(...idNumbers) + 1;
        }
      }
    }
    
    // Generate the new shipment ID in the correct format
    const shipmentId = `SH-${String(nextIdNumber).padStart(4, "0")}`;
    console.log('[Calendar] Generated shipment ID:', shipmentId); // Debug log
    
    const shipmentQuantity = parseInt(newShipment.quantity, 10)
    const materialsString = `${selectedMaterial.name} (${newShipment.quantity} ${selectedMaterial.unit})`

    const pickupLat = Number(process.env.NEXT_PUBLIC_WAREHOUSE_LAT || '0');
    const pickupLng = Number(process.env.NEXT_PUBLIC_WAREHOUSE_LNG || '0');
    const pickupAddress = process.env.NEXT_PUBLIC_WAREHOUSE_ADDRESS || "Warehouse";

    const deliveryLat = newShipment.deliveryLat ?? 0;
    const deliveryLng = newShipment.deliveryLng ?? 0;
    const deliveryAddress = newShipment.deliveryAddress || newShipment.destination;

    // Create Lalamove delivery first
    const response = await fetch('/api/lalamove/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceType: 'TRUCK',
        stops: [
          { 
            location: { lat: pickupLat, lng: pickupLng }, 
            addresses: { en_PH: pickupAddress }
          },
          { 
            location: { lat: deliveryLat, lng: deliveryLng }, 
            addresses: { en_PH: deliveryAddress }
          }
        ],
        requesterContact: {
          name: process.env.NEXT_PUBLIC_WAREHOUSE_CONTACT_NAME || "Sender",
          phone: process.env.NEXT_PUBLIC_WAREHOUSE_CONTACT_PHONE || ""
        }
      })
    });

    // Parse response safely
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();

    if (!response.ok) {
      let message = raw;
      if (contentType.includes('application/json')) {
        try {
          const errObj = JSON.parse(raw);
          message = errObj.error || errObj.message || JSON.stringify(errObj);
        } catch (e) {
          // fallthrough to raw
        }
      }
      throw new Error(message || 'Failed to create delivery');
    }

    let lalamoveResp: any = null;
    if (contentType.includes('application/json')) {
      try {
        lalamoveResp = JSON.parse(raw);
      } catch (e) {
        throw new Error('Invalid JSON response from Lalamove API');
      }
    } else {
      const snippet = raw.slice(0, 1000);
      throw new Error('Unexpected response from Lalamove API: ' + snippet);
    }

    const lalamoveOrderId = lalamoveResp?.id || lalamoveResp?.orderId || null;
    console.log('[Calendar] Lalamove Order ID:', lalamoveOrderId); // Debug log

    // Deduct from inventory
    const newInventoryQuantity = selectedMaterial.quantity - shipmentQuantity
    await updateDoc(doc(db, "inventory", newShipment.selectedMaterialId), {
      quantity: newInventoryQuantity
    })

    // Create the shipment document - USE THE SHIPMENT ID AS THE DOCUMENT ID
    await setDoc(doc(db, "shipments", shipmentId), {
      id: shipmentId, 
      destination: newShipment.destination,
      status: "ASSIGNING_DRIVER",
      eta: newShipment.eta,
      materials: materialsString,
      materialId: newShipment.selectedMaterialId,
      quantity: shipmentQuantity,
      lalamoveOrderId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    console.log('[Calendar] Created shipment document:', shipmentId); // Debug log

    // Refresh shipments list
    await getShipments();

    // Update materials list
    await getMaterials()
    
    setShowScheduleShipmentModal(false)
    setNewShipment({ 
      destination: "", 
      selectedMaterialId: "", 
      quantity: "", 
      eta: "", 
      time: "09:00",
      deliveryAddress: "",
      deliveryLat: undefined,
      deliveryLng: undefined
    })
    showToast(`Shipment "${shipmentId}" scheduled successfully!`);
  } catch (error: any) {
    console.error("Error scheduling shipment:", error);
    showToast(error.message || "Failed to schedule shipment", "error");
  } finally {
    setIsCreating(false)
  }
}

// Filter shipments for selected date 
const shipmentsForSelectedDate = shipments.filter(shipment => {
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

// Get today's shipments 
const today = new Date();
today.setHours(0, 0, 0, 0); // Set to start of day

const todayShipments = shipments.filter(shipment => {
  if (!shipment.eta) return false;
  
  try {
    const shipmentDate = new Date(shipment.eta);
    const shipmentDateStart = new Date(shipmentDate);
    shipmentDateStart.setHours(0, 0, 0, 0);
    
    return shipmentDateStart.getTime() === today.getTime();
  } catch (error) {
    console.error('Error parsing shipment date:', shipment.eta, error);
    return false;
  }
});

  // Get upcoming shipments (next 7 days)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999); // End of the 7th day

  const upcomingShipments = shipments.filter(shipment => {
    if (!shipment.eta) return false;
    
    try {
      const eventDate = new Date(shipment.eta);
      return eventDate > todayStart && eventDate <= nextWeek;
    } catch (error) {
      console.error('Error parsing shipment date:', shipment.eta, error);
      return false;
    }
  });

  const selectedMaterial = getSelectedMaterial()
  const maxQuantity = selectedMaterial?.quantity || 0

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

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* Toast Notification */}
        {toast && (
          <ToastNotification 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Schedule Management</h2>
            <p className="text-sm text-[oklch(0.45_0_0)] mt-1">Manage and track your shipments calendar</p>
          </div>
          <button
            onClick={() => setShowScheduleShipmentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Schedule Shipment
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[oklch(0.45_0_0)]" />
            <input
              type="text"
              placeholder="Search shipments by ID, destination, or materials..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)]"
          >
            <Filter className="h-5 w-5" />
            Filter
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Calendar with Shipment Indicators */}
            <EnhancedCalendar
              selectedDate={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              shipments={shipments}
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
                <div className="space-y-3">
                  {shipmentsForSelectedDate.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-4 rounded-lg border border-[oklch(0.88_0_0)] hover:border-[oklch(0.68_0.19_35)] transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
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
                          <h4 className="font-semibold text-[oklch(0.18_0.08_250)] mb-1">{shipment.id} - {shipment.destination}</h4>
                          <div className="flex items-center gap-4 text-sm text-[oklch(0.45_0_0)]">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{shipment.materials}</span>
                            </div>
                            {shipment.delayReason && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Delay: {shipment.delayReason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-[oklch(0.88_0_0)] mx-auto mb-3" />
                  <p className="text-[oklch(0.45_0_0)]">No shipments scheduled for this date</p>
                  <p className="text-sm text-[oklch(0.45_0_0)] mt-1">Schedule a shipment to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Shipments */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
              <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">
                Today's Shipments ({todayShipments.length})
              </h3>
              {todayShipments.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto"> {/* Added scroll for many shipments */}
                  {todayShipments.map((shipment) => (
                    <div key={shipment.id} className="p-3 rounded-lg bg-[oklch(0.96_0_0)] border border-[oklch(0.88_0_0)] hover:border-[oklch(0.68_0.19_35)] transition-colors">
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Package className="h-8 w-8 text-[oklch(0.88_0_0)] mx-auto mb-2" />
                  <p className="text-sm text-[oklch(0.45_0_0)]">No shipments scheduled for today</p>
                </div>
              )}
            </div>

           

          {/* Upcoming Shipments */}
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
            <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">
              Upcoming This Week ({upcomingShipments.length})
            </h3>
            {upcomingShipments.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto"> {/* Added scroll for many shipments */}
                {upcomingShipments.map((shipment) => (
                  <div key={shipment.id} className="p-3 rounded-lg border border-[oklch(0.88_0_0)] hover:border-[oklch(0.68_0.19_35)] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(shipment.status || 'ASSIGNING_DRIVER')}`}
                      >
                        {shipment.status?.toLowerCase().replace(/_/g, ' ') || 'assigning driver'}
                      </span>
                      <span className="text-xs text-[oklch(0.45_0_0)] font-medium">
                        {shipment.eta ? new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">{shipment.id}</p>
                    <p className="text-xs text-[oklch(0.45_0_0)] mb-1">{shipment.destination}</p>
                    <div className="flex items-center gap-2 text-xs text-[oklch(0.45_0_0)]">
                      <Package className="h-3 w-3" />
                      <span className="truncate">{shipment.materials}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CalendarIcon className="h-8 w-8 text-[oklch(0.88_0_0)] mx-auto mb-2" />
                <p className="text-sm text-[oklch(0.45_0_0)]">No upcoming shipments this week</p>
              </div>
            )}
          </div>

            {/* Stats Card */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
              <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Shipment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-[oklch(0.96_0_0)]">
                  <span className="text-sm text-[oklch(0.45_0_0)]">Total Shipments</span>
                  <span className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">{shipments.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-[oklch(0.68_0.19_35)]/5 border border-[oklch(0.68_0.19_35)]/10">
                  <span className="text-sm text-[oklch(0.45_0_0)]">Scheduled</span>
                  <span className="text-lg font-semibold text-[oklch(0.68_0.19_35)]">
                    {shipments.filter((s) => s.status === "ASSIGNING_DRIVER" || s.status === "DRIVER_ASSIGNED").length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-sm text-[oklch(0.45_0_0)]">In Transit</span>
                  <span className="text-lg font-semibold text-blue-700">
                    {shipments.filter((s) => s.status === "PICKED_UP").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Shipment Modal - Same as shipments tab */}
      {showScheduleShipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Schedule New Shipment</h2>
              <button
                onClick={() => setShowScheduleShipmentModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Destination</label>
                <input
                  type="text"
                  value={newShipment.destination}
                  onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="e.g., Santo Tomas, Batangas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Material</label>
                <select
                  value={newShipment.selectedMaterialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="">Select a material</option>
                  {materials.map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} (Available: {material.quantity} {material.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Quantity {selectedMaterial && `(Max: ${maxQuantity} ${selectedMaterial.unit})`}
                </label>
                <input
                  type="number"
                  value={newShipment.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  disabled={!newShipment.selectedMaterialId}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter quantity (must be positive)"
                  min="1"
                  max={maxQuantity}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">ETA</label>
                <input
                  type="date"
                  value={newShipment.eta}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Delivery Address (Optional)</label>
                <input
                  type="text"
                  value={newShipment.deliveryAddress}
                  onChange={(e) => setNewShipment({ ...newShipment, deliveryAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="Will default to destination if left empty"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleShipmentModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleShipment}
                disabled={isCreating}
                aria-busy={isCreating}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${isCreating ? 'bg-[oklch(0.56_0.12_35)] cursor-not-allowed' : 'bg-[oklch(0.68_0.19_35)] hover:bg-[oklch(0.72_0.19_35)]'}`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <span className="inline-block h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Scheduling...
                  </div>
                ) : (
                  'Schedule Shipment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Filter Shipments</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Status</label>
                <select 
                  value={selectedStatus}
                  onChange={(e) => {
                    handleStatusFilterChange(e.target.value);
                    setShowFilterModal(false);
                  }}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ASSIGNING_DRIVER">Assigning Driver</option>
                  <option value="DRIVER_ASSIGNED">Driver Assigned</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}