"use client"

import { CalendarIcon, Search, Filter } from "lucide-react"
import { useState } from "react"
import { Calendar } from "@/src/components/ui/calendar"

export default function ShipmentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [shipments] = useState([
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
              className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)]">
            <Filter className="h-5 w-5" />
            Filter
          </button>
        </div>

        {/* Shipments list */}
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
              .filter((s) => s.status === "Pending")
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
