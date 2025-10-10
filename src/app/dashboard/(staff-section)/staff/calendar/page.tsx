"use client"

import { CalendarIcon, Clock } from "lucide-react"
import { useState } from "react"
import { Calendar } from "@/src/components/ui/calendar"

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const scheduledEvents = [
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
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Calendar</h1>

        {/* Calendar view */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="w-full"
          />
        </div>

        {/* Scheduled events */}
        <div>
          <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-4">Scheduled Events</h2>
          <div className="space-y-3">
            {scheduledEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-lg border border-[oklch(0.88_0_0)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-1">{event.title}</h3>
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

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Upcoming This Week</h3>
          <div className="space-y-3">
            {scheduledEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[oklch(0.68_0.19_35)]"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[oklch(0.18_0.08_250)]">{event.title}</p>
                  <p className="text-xs text-[oklch(0.45_0_0)]">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

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
            <div className="flex justify-between items-center">
              <span className="text-sm text-[oklch(0.45_0_0)]">Other Events</span>
              <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">
                {scheduledEvents.filter((e) => e.type !== "shipment").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
