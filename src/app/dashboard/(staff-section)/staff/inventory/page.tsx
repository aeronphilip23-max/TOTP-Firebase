"use client"

import { Search, Package, CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Calendar } from "@/src/components/ui/calendar"

export default function InventoryPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [materials] = useState([
    {
      id: "MAT-001",
      name: "Steel Beams",
      category: "Structural",
      quantity: 150,
      unit: "units",
      location: "Warehouse",
    },
    {
      id: "MAT-002",
      name: "Concrete Mix",
      category: "Building Materials",
      quantity: 2500,
      unit: "kg",
      location: "Warehouse",
    },
    {
      id: "MAT-003",
      name: "Electrical Cables",
      category: "Electrical",
      quantity: 5000,
      unit: "meters",
      location: "Warehouse",
    },
    {
      id: "MAT-004",
      name: "Piping Systems",
      category: "Plumbing",
      quantity: 300,
      unit: "units",
      location: "Warehouse",
    },
  ])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Inventory</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[oklch(0.45_0_0)]" />
          <input
            type="text"
            placeholder="Search materials..."
            className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
          />
        </div>

        {/* Materials table */}
        <div className="bg-white rounded-lg border border-[oklch(0.88_0_0)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[oklch(0.96_0_0)]">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Material ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.88_0_0)]">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-[oklch(0.98_0_0)]">
                  <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-[oklch(0.68_0.19_35)]" />
                      <span className="font-medium text-[oklch(0.18_0.08_250)]">{material.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.category}</td>
                  <td className="px-6 py-4 text-sm text-[oklch(0.18_0.08_250)] font-medium">
                    {material.quantity} {material.unit}
                  </td>
                  <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar Sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">Calendar</h2>
            <CalendarIcon className="h-5 w-5 text-[oklch(0.68_0.19_35)]" />
          </div>
          <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
        </div>

        {/* Inventory Summary */}
        <div className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)]">
          <h3 className="font-semibold text-[oklch(0.18_0.08_250)] mb-4">Warehouse Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[oklch(0.45_0_0)]">Total Items</span>
              <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">{materials.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[oklch(0.45_0_0)]">Categories</span>
              <span className="text-sm font-medium text-[oklch(0.18_0.08_250)]">
                {new Set(materials.map((m) => m.category)).size}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[oklch(0.45_0_0)]">Low Stock</span>
              <span className="text-sm font-medium text-yellow-600">
                {materials.filter((m) => m.quantity < 200).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
