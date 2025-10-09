"use client"

import { Plus, Search, Filter, X } from "lucide-react"
import { useState } from "react"

export default function ShipmentsTab() {
  const [showAddShipmentModal, setShowAddShipmentModal] = useState(false)
  const [showFilterShipmentsModal, setShowFilterShipmentsModal] = useState(false)
  const [newShipment, setNewShipment] = useState({
    destination: "",
    materials: "",
    eta: "",
  })
  const [shipments, setShipments] = useState([
    {
      id: "SH-001",
      destination: "New York, NY",
      status: "In Transit",
      eta: "2024-01-15",
      materials: "Steel Beams, Concrete Mix",
    },
    {
      id: "SH-002",
      destination: "Los Angeles, CA",
      status: "Delivered",
      eta: "2024-01-10",
      materials: "Electrical Components",
    },
    {
      id: "SH-003",
      destination: "Chicago, IL",
      status: "Pending",
      eta: "2024-01-20",
      materials: "Piping Systems",
    },
  ])

  const handleAddShipment = () => {
    if (!newShipment.destination || !newShipment.materials || !newShipment.eta) {
      alert("Please fill in all fields")
      return
    }
    const shipment = {
      id: `SH-${String(shipments.length + 1).padStart(3, "0")}`,
      destination: newShipment.destination,
      status: "Pending",
      eta: newShipment.eta,
      materials: newShipment.materials,
    }
    setShipments([...shipments, shipment])
    setShowAddShipmentModal(false)
    setNewShipment({ destination: "", materials: "", eta: "" })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Manage Shipments</h2>
          <button
            onClick={() => setShowAddShipmentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Shipment
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[oklch(0.45_0_0)]" />
            <input
              type="text"
              placeholder="Search shipments..."
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

        <div className="space-y-4">
          {shipments.map((shipment) => (
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
                    shipment.status === "Delivered"
                      ? "bg-green-100 text-green-700"
                      : shipment.status === "In Transit"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Shipment Modal */}
      {showAddShipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Add New Shipment</h2>
              <button
                onClick={() => setShowAddShipmentModal(false)}
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
                  placeholder="e.g., New York, NY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Materials</label>
                <input
                  type="text"
                  value={newShipment.materials}
                  onChange={(e) => setNewShipment({ ...newShipment, materials: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="e.g., Steel Beams, Concrete Mix"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">ETA</label>
                <input
                  type="date"
                  value={newShipment.eta}
                  onChange={(e) => setNewShipment({ ...newShipment, eta: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddShipmentModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShipment}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Add Shipment
              </button>
            </div>
          </div>
        </div>
      )}

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
                <select className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]">
                  <option>All</option>
                  <option>Pending</option>
                  <option>In Transit</option>
                  <option>Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Date Range</label>
                <select className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]">
                  <option>All Time</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFilterShipmentsModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Filters applied!")
                  setShowFilterShipmentsModal(false)
                }}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
