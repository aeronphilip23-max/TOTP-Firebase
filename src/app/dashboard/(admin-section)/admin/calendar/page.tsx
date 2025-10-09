"use client"

import { CalendarIcon, Clock, Plus, X } from "lucide-react"
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"

export default function CalendarTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showScheduleShipmentModal, setShowScheduleShipmentModal] = useState(false)
  const [newShipment, setNewShipment] = useState({
    destination: "",
    materials: "",
    eta: "",
  })
  const [scheduledEvents, setScheduledEvents] = useState([
    {
      id: 1,
      title: "Shipment to New York",
      date: "2024-01-15",
      time: "09:00 AM",
      type: "shipment",
    },
    {
      id: 2,
      title: "Inventory Audit",
      date: "2024-01-18",
      time: "02:00 PM",
      type: "audit",
    },
    {
      id: 3,
      title: "Shipment to Chicago",
      date: "2024-01-20",
      time: "11:00 AM",
      type: "shipment",
    },
  ])

  const handleScheduleShipment = () => {
    const event = {
      id: scheduledEvents.length + 1,
      title: newShipment.destination ? `Shipment to ${newShipment.destination}` : "New Shipment",
      date: newShipment.eta || new Date().toISOString().split("T")[0],
      time: "09:00 AM",
      type: "shipment" as const,
    }
    setScheduledEvents([...scheduledEvents, event])
    setShowScheduleShipmentModal(false)
    setNewShipment({ destination: "", materials: "", eta: "" })
  }

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Schedule Management</h2>
            <button
              onClick={() => setShowScheduleShipmentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
            >
              <Plus className="h-5 w-5" />
              Schedule Shipment
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="w-full"
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-4">Scheduled Events</h3>
            <div className="space-y-3">
              {scheduledEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white p-4 rounded-lg border border-[oklch(0.88_0_0)] hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[oklch(0.18_0.08_250)] mb-1">{event.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-[oklch(0.45_0_0)]">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{event.time}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        event.type === "shipment" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {event.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
            <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Event Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[oklch(0.45_0_0)]">Total Events</span>
                <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">{scheduledEvents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[oklch(0.45_0_0)]">Shipments</span>
                <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">
                  {scheduledEvents.filter((e) => e.type === "shipment").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Shipment Modal */}
      {showScheduleShipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Schedule Shipment</h2>
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
                  placeholder="e.g., Steel Beams"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Date</label>
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
                onClick={() => setShowScheduleShipmentModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleShipment}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
