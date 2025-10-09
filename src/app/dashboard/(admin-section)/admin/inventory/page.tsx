"use client"

import { Package, Plus, Search, Filter, X } from "lucide-react"
import { useState } from "react"

export default function InventoryTab() {
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)
  const [showFilterInventoryModal, setShowFilterInventoryModal] = useState(false)
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    location: "Warehouse",
  })
  const [materials, setMaterials] = useState([
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

  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.category || !newMaterial.quantity || !newMaterial.unit) {
      alert("Please fill in all fields")
      return
    }
    const material = {
      id: `MAT-${String(materials.length + 1).padStart(3, "0")}`,
      name: newMaterial.name,
      category: newMaterial.category,
      quantity: Number.parseInt(newMaterial.quantity),
      unit: newMaterial.unit,
      location: newMaterial.location,
    }
    setMaterials([...materials, material])
    setShowAddMaterialModal(false)
    setNewMaterial({ name: "", category: "", quantity: "", unit: "", location: "Warehouse" })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Manage Inventory</h2>
          <button
            onClick={() => setShowAddMaterialModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Material
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[oklch(0.45_0_0)]" />
            <input
              type="text"
              placeholder="Search materials..."
              className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>
          <button
            onClick={() => setShowFilterInventoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)]"
          >
            <Filter className="h-5 w-5" />
            Filter by Category
          </button>
        </div>

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

      {/* Add Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Add New Material</h2>
              <button
                onClick={() => setShowAddMaterialModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Material Name</label>
                <input
                  type="text"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="e.g., Steel Beams"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Category</label>
                <select
                  value={newMaterial.category}
                  onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="">Select category</option>
                  <option>Structural</option>
                  <option>Building Materials</option>
                  <option>Electrical</option>
                  <option>Plumbing</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newMaterial.quantity}
                    onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Unit</label>
                  <input
                    type="text"
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                    placeholder="e.g., units, kg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Location</label>
                <input
                  type="text"
                  value={newMaterial.location}
                  onChange={(e) => setNewMaterial({ ...newMaterial, location: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="Warehouse"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddMaterialModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaterial}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Add Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Inventory Modal */}
      {showFilterInventoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Filter by Category</h2>
              <button
                onClick={() => setShowFilterInventoryModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Category</label>
                <select className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]">
                  <option>All Categories</option>
                  <option>Structural</option>
                  <option>Building Materials</option>
                  <option>Electrical</option>
                  <option>Plumbing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Stock Level</label>
                <select className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]">
                  <option>All</option>
                  <option>Low Stock</option>
                  <option>In Stock</option>
                  <option>Overstocked</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFilterInventoryModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Filters applied!")
                  setShowFilterInventoryModal(false)
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
