"use client"

import { CalendarIcon, Search, X, Filter } from "lucide-react"
import { useState, useEffect } from "react"
import { Calendar } from "@/src/components/ui/calendar"

import { db } from "@/src/lib/firebase"

import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export default function ShipmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showFilterShipmentsModal, setShowFilterShipmentsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("descending")

  const [shipments, setShipments] = useState<Array<{
      id: string
      destination?: string
      materials?: string
      eta?: string
      status?: string
      lalamoveOrderId?: string | null
      quantity?: number
      materialId?: string
    }>>([])

  const [allShipments, setAllShipments] = useState<Array<{
      id: string
      destination?: string
      materials?: string
      eta?: string
      status?: string
      lalamoveOrderId?: string | null
      quantity?: number
      materialId?: string
    }>>([])
  
    // Getting shipment data from db
  
    const getShipments = async () => {
      const querySnapshot = await getDocs(collection(db, "shipments"));
      const shipmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      setAllShipments(shipmentsData as any);
      setShipments(shipmentsData as any);
    }
  
    useEffect(() => {
      getShipments();
    }, [])

    useEffect(() => {
      applyFilters(searchQuery, selectedStatus, sortBy, sortOrder);
    }, [allShipments])

    // Search and filter logic
      const applyFilters = (query: string = searchQuery, status: string = selectedStatus, sort: string = sortBy, order: string = sortOrder) => {
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
    
        // Apply sorting
        if (sort === "id") {
          filtered.sort((a, b) => {
            const comparison = a.id.localeCompare(b.id);
            return order === "descending" ? -comparison : comparison;
          });
        } else if (sort === "date") {
          filtered.sort((a, b) => {
            const dateA = a.eta ? new Date(a.eta).getTime() : 0;
            const dateB = b.eta ? new Date(b.eta).getTime() : 0;
            return order === "descending" ? dateB - dateA : dateA - dateB;
          });
        }
    
        setShipments(filtered);
      }
    
      const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        applyFilters(query, selectedStatus, sortBy, sortOrder);
      }
    
      const handleStatusFilterChange = (status: string) => {
        setSelectedStatus(status);
        applyFilters(searchQuery, status, sortBy, sortOrder);
      }
    
      const handleSortByChange = (sort: string) => {
        setSortBy(sort);
        applyFilters(searchQuery, selectedStatus, sort, sortOrder);
      }
    
      const handleSortOrderChange = (order: string) => {
        setSortOrder(order);
        applyFilters(searchQuery, selectedStatus, sortBy, order);
      }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Shipments</h1>
        </div>

        {/* Search and filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[oklch(0.45_0_0)]" />
            <input
              type="text"
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>
          <button 
            onClick={() => setShowFilterShipmentsModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)]"
          >
            <Filter className="h-5 w-5" />
            Filter
          </button>
        </div>

        {/* Shipments list */}
        <div className="space-y-4">
          {shipments.length === 0 ? (
            <p className="text-[oklch(0.45_0_0)] text-center py-8">No shipments found.</p>
            ) : (shipments.map((shipment) => (
            <div
              key={shipment.id}
              className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">{shipment.id}</h3>
                  <p className="text-[oklch(0.45_0_0)]">{shipment.destination}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    shipment.status === "COMPLETED"
                    ? "bg-green-100 text-green-700 border-green-300"
                      : shipment.status === "PICKED_UP" || shipment.status === "DRIVER_ASSIGNED"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                      : shipment.status === "CANCELED"
                    ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  }`} 
                >
                  {shipment.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[oklch(0.45_0_0)]">ETA:</span>
                  <span className="ml-2 text-[oklch(0.18_0.08_250)] font-medium">{shipment.eta}</span>
                </div>
                <div>
                  <span className="text-[oklch(0.45_0_0)]">Materials:</span>
                  <span className="ml-2 text-[oklch(0.18_0.08_250)]">{shipment.materials}</span>
                </div>
                <div>
                  <span className="text-[oklch(0.45_0_0)]">Lalamove ID:</span>
                  <span className="ml-2 text-[oklch(0.18_0.08_250)] font-medium">{shipment.lalamoveOrderId || 'N/A'}</span>
                </div>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* Filter Shipments Modal */}
      {showFilterShipmentsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Filter Shipments</h2>
              <button
                onClick={() => setShowFilterShipmentsModal(false)}
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
                    setShowFilterShipmentsModal(false);
                  }}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ASSIGNING_DRIVER">Assigning Driver</option>
                  <option value="DRIVER_ASSIGNED">Driver Assigned</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELED">Canceled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Sort By</label>
                <select 
                  value={sortBy}
                  onChange={(e) => handleSortByChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="date">Date</option>
                  <option value="id">Shipment ID</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Sort Order</label>
                <select 
                  value={sortOrder}
                  onChange={(e) => handleSortOrderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="descending">Descending</option>
                  <option value="ascending">Ascending</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFilterShipmentsModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">Schedule</h2>
            <CalendarIcon className="h-5 w-5 text-[oklch(0.68_0.19_35)]" />
          </div>

          <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
        </div>

        {/* Upcoming shipments */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Upcoming This Week</h3>
          <div className="space-y-3">
            {shipments
              .filter((s) => s.status === "ASSIGNING_DRIVER")
               .map((shipment) => (
                 <div key={shipment.id} className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.19_35)]"></div>
                   <div className="flex-1">
                     <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">{shipment.id}</p>
                     <p className="text-xs text-[oklch(0.45_0_0)]">{shipment.eta}</p>
                   </div>
                 </div>
               ))}
          </div>
        </div>
      </div>
    </div>
  )
}
