"use client"

import { CalendarIcon, Clock, Plus, X, MapPin, Package } from "lucide-react"
import { useState } from "react"
import { Calendar } from "@/src/components/ui/calendar"

export default function CalendarTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showScheduleShipmentModal, setShowScheduleShipmentModal] = useState(false)
  const [newShipment, setNewShipment] = useState({
    destination: "",
    materials: "",
    eta: "",
    time: "09:00"
  })
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([]) // Empty array - no dummy data

  const handleScheduleShipment = () => {
    if (!newShipment.destination || !newShipment.eta) {
      alert("Please fill in destination and date")
      return
    }

    const event = {
      id: Date.now(), // Use timestamp for unique ID
      title: `Shipment to ${newShipment.destination}`,
      destination: newShipment.destination,
      date: newShipment.eta,
      time: `${newShipment.time} ${parseInt(newShipment.time) >= 12 ? 'PM' : 'AM'}`,
      type: "shipment" as const,
      materials: newShipment.materials || "General Goods"
    }
    setScheduledEvents([...scheduledEvents, event])
    setShowScheduleShipmentModal(false)
    setNewShipment({ destination: "", materials: "", eta: "", time: "09:00" })
  }

  // Filter events for selected date
  const eventsForSelectedDate = scheduledEvents.filter(
    event => event.date === selectedDate.toISOString().split("T")[0]
  )

  // Get today's events
  const todayEvents = scheduledEvents.filter(
    event => event.date === new Date().toISOString().split("T")[0]
  )

  // Get upcoming events (next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const upcomingEvents = scheduledEvents.filter(
    event => {
      const eventDate = new Date(event.date)
      return eventDate > new Date() && eventDate <= nextWeek
    }
  ).slice(0, 3) // Limit to 3 events

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Schedule Management</h2>
            <p className="text-sm text-[oklch(0.45_0_0)] mt-1">Manage and track your shipments and audits</p>
          </div>
          <button
            onClick={() => setShowScheduleShipmentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Schedule Shipment
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar Card */}
          <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-[oklch(0.68_0.19_35)]" />
              <h3 className="font-semibold text-[oklch(0.18_0.08_250)]">Calendar</h3>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="w-full"
            />
          </div>

            {/* Selected Date Events */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[oklch(0.18_0.08_250)]">
                  Events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <span className="px-2 py-1 bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)] text-sm rounded-md">
                  {eventsForSelectedDate.length} events
                </span>
              </div>
              
              {eventsForSelectedDate.length > 0 ? (
                <div className="space-y-3">
                  {eventsForSelectedDate.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border border-[oklch(0.88_0_0)] hover:border-[oklch(0.68_0.19_35)] transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                event.type === "shipment" 
                                  ? "bg-[oklch(0.68_0.19_35)]/10 text-[oklch(0.68_0.19_35)] border border-[oklch(0.68_0.19_35)]/20" 
                                  : "bg-purple-100 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {event.type}
                            </span>
                            <div className="flex items-center gap-1 text-sm text-[oklch(0.45_0_0)]">
                              <Clock className="h-3 w-3" />
                              <span>{event.time}</span>
                            </div>
                          </div>
                          <h4 className="font-semibold text-[oklch(0.18_0.08_250)] mb-1">{event.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-[oklch(0.45_0_0)]">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.destination}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{event.materials}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-[oklch(0.88_0_0)] mx-auto mb-3" />
                  <p className="text-[oklch(0.45_0_0)]">No events scheduled for this date</p>
                  <p className="text-sm text-[oklch(0.45_0_0)] mt-1">Schedule a shipment to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Events */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
              <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Today's Events</h3>
              {todayEvents.length > 0 ? (
                <div className="space-y-3">
                  {todayEvents.map((event) => (
                    <div key={event.id} className="p-3 rounded-lg bg-[oklch(0.96_0_0)] border border-[oklch(0.88_0_0)]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            event.type === "shipment" 
                              ? "bg-[oklch(0.68_0.19_35)]/10 text-[oklch(0.68_0.19_35)]" 
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {event.type}
                        </span>
                        <span className="text-xs text-[oklch(0.45_0_0)]">{event.time}</span>
                      </div>
                      <p className="text-sm font-medium text-[oklch(0.18_0.08_250)] truncate">{event.title}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[oklch(0.45_0_0)] text-center py-4">No events today</p>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
              <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Upcoming This Week</h3>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="p-3 rounded-lg border border-[oklch(0.88_0_0)] hover:border-[oklch(0.68_0.19_35)] transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            event.type === "shipment" 
                              ? "bg-[oklch(0.68_0.19_35)]/10 text-[oklch(0.68_0.19_35)]" 
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {event.type}
                        </span>
                        <span className="text-xs text-[oklch(0.45_0_0)]">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1 truncate">{event.title}</p>
                      <p className="text-xs text-[oklch(0.45_0_0)] truncate">{event.destination}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[oklch(0.45_0_0)] text-center py-4">No upcoming events</p>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] shadow-sm">
              <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Event Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-[oklch(0.96_0_0)]">
                  <span className="text-sm text-[oklch(0.45_0_0)]">Total Events</span>
                  <span className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">{scheduledEvents.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-[oklch(0.68_0.19_35)]/5 border border-[oklch(0.68_0.19_35)]/10">
                  <span className="text-sm text-[oklch(0.45_0_0)]">Shipments</span>
                  <span className="text-lg font-semibold text-[oklch(0.68_0.19_35)]">
                    {scheduledEvents.filter((e) => e.type === "shipment").length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <span className="text-sm text-[oklch(0.45_0_0)]">Audits</span>
                  <span className="text-lg font-semibold text-purple-700">
                    {scheduledEvents.filter((e) => e.type === "audit").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Shipment Modal */}
      {showScheduleShipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Schedule New Shipment</h2>
              <button
                onClick={() => setShowScheduleShipmentModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Destination</label>
                <input
                  type="text"
                  value={newShipment.destination}
                  onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] focus:border-transparent"
                  placeholder="Enter destination city or address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Materials</label>
                <input
                  type="text"
                  value={newShipment.materials}
                  onChange={(e) => setNewShipment({ ...newShipment, materials: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] focus:border-transparent"
                  placeholder="Describe the materials being shipped"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Date</label>
                  <input
                    type="date"
                    value={newShipment.eta}
                    onChange={(e) => setNewShipment({ ...newShipment, eta: e.target.value })}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-2">Time</label>
                  <select
                    value={newShipment.time}
                    onChange={(e) => setNewShipment({ ...newShipment, time: e.target.value })}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] focus:border-transparent"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 1
                      return (
                        <option key={hour} value={hour.toString().padStart(2, '0') + ':00'}>
                          {hour.toString().padStart(2, '0')}:00 AM
                        </option>
                      )
                    }).concat(
                      Array.from({ length: 12 }, (_, i) => {
                        const hour = i + 1
                        return (
                          <option key={hour + 12} value={(hour + 12).toString().padStart(2, '0') + ':00'}>
                            {hour.toString().padStart(2, '0')}:00 PM
                        </option>
                        )
                      })
                    )}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-[oklch(0.88_0_0)]">
              <button
                onClick={() => setShowScheduleShipmentModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleShipment}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Schedule Shipment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}