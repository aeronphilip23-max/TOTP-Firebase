"use client"

import { Package, Plus, Search, Filter, X, Minus } from "lucide-react"
import { useState, useEffect } from "react"

import { db } from "@/src/lib/firebase"

import { collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";

const UNIT_MEASUREMENTS = [
  "units",
  "kg",
  "g",
  "lbs",
  "oz",
  "liters",
  "ml",
  "gallons",
  "cubic meters",
  "cubic feet",
  "meters",
  "feet",
  "inches",
  "cm",
  "mm",
  "tons",
  "boxes",
  "pallets",
  "rolls",
  "sheets",
  "pieces",
]

const CATEGORIES = [
  "Structural",
  "Building Materials",
  "Electrical",
  "Plumbing",
  "Safety Equipment",
  "Tools",
  "Other",
]

const STOCK_LEVELS = {
  "Low Stock": (qty: number) => qty < 10,
  "In Stock": (qty: number) => qty >= 10 && qty <= 100,
}

export default function InventoryTab() {
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)
  const [showFilterInventoryModal, setShowFilterInventoryModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedStockLevel, setSelectedStockLevel] = useState("All")

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    location: "Warehouse",
  })

  const [materials, setMaterials] = useState<Array<{
    id?: string
    name?: string
    category?: string
    quantity?: number
    unit?: string
    location?: string
  }>>([])

  const [allMaterials, setAllMaterials] = useState<Array<{
    id?: string
    name?: string
    category?: string
    quantity?: number
    unit?: string
    location?: string
  }>>([])

  const getMaterials = async () => {
    const querySnapshot = await getDocs(collection(db, "inventory"));
    const materialsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAllMaterials(materialsList);
    setMaterials(materialsList);
  }

  useEffect(() => {
    getMaterials();
  }, []);

  const applyFilters = (query: string = searchQuery, category: string = selectedCategory, stockLevel: string = selectedStockLevel) => {
    let filtered = allMaterials;

    if (query) {
      filtered = filtered.filter(m =>
        m.id?.toLowerCase().includes(query.toLowerCase()) ||
        m.name?.toLowerCase().includes(query.toLowerCase()) ||
        m.category?.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (category !== "All Categories") {
      filtered = filtered.filter(m => m.category === category);
    }

    if (stockLevel !== "All") {
      filtered = filtered.filter(m => {
        const checker = STOCK_LEVELS[stockLevel as keyof typeof STOCK_LEVELS];
        return checker ? checker(m.quantity || 0) : true;
      });
    }

    setMaterials(filtered);
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(query, selectedCategory, selectedStockLevel);
  }

  const handleAddMaterial = async () => {
    if (!newMaterial.name || !newMaterial.category || !newMaterial.quantity || !newMaterial.unit) {
      alert("Please fill in all fields")
      return
    }
    const material = {
      id: `MAT-${String(allMaterials.length + 1).padStart(4, "0")}`,
      name: newMaterial.name,
      category: newMaterial.category,
      quantity: Number.parseInt(newMaterial.quantity),
      unit: newMaterial.unit,
      location: newMaterial.location,
    }

    await setDoc(doc(db, "inventory", material.id), {
      name: material.name,
      category: material.category,
      quantity: material.quantity,
      unit: material.unit,
      location: material.location,
    });

    const updated = [...allMaterials, material];
    setAllMaterials(updated);
    applyFilters(searchQuery, selectedCategory, selectedStockLevel);
    setShowAddMaterialModal(false)
    setNewMaterial({ name: "", category: "", quantity: "", unit: "", location: "Warehouse" })
  }

  // Replace updateQuantity with prompt-based amount input
  const promptAndUpdateQuantity = async (materialId: string | undefined, isAdd: boolean) => {
    if (!materialId) return;

    // ask user for amount
    const action = isAdd ? "add" : "deduct";
    const input = window.prompt(`Enter amount to ${action}:`, "1");
    if (input === null) return; // user cancelled

    const amount = parseInt(input.trim(), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid positive number");
      return;
    }

    try {
      const material = allMaterials.find(m => m.id === materialId);
      if (!material) {
        alert("Material not found");
        return;
      }

      const newQuantity = Math.max(0, (material.quantity || 0) + (isAdd ? amount : -amount));

      await updateDoc(doc(db, "inventory", materialId), {
        quantity: newQuantity,
      });

      // Update both allMaterials and materials to refresh UI
      const updatedAll = allMaterials.map(m =>
        m.id === materialId ? { ...m, quantity: newQuantity } : m
      );
      setAllMaterials(updatedAll);
      
      // Re-apply filters to refresh the displayed list
      setMaterials(updatedAll.filter(m => {
        let passes = true;
        
        if (searchQuery) {
          passes = (m.id?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                   (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                   (m.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        }
        
        if (selectedCategory !== "All Categories") {
          passes = passes && m.category === selectedCategory;
        }
        
        if (selectedStockLevel !== "All") {
          const checker = STOCK_LEVELS[selectedStockLevel as keyof typeof STOCK_LEVELS];
          passes = passes && (checker ? checker(m.quantity || 0) : true);
        }
        
        return passes;
      }));
    } catch (err: any) {
      console.error("Failed to update quantity:", err);
      alert("Failed to update quantity: " + (err?.message || String(err)));
    }
  }

  const getStockLevelBadge = (quantity: number | undefined) => {
    if (!quantity) return null;
    if (quantity < 10) return { label: "Low Stock", color: "bg-red-100 text-red-700" };
    if (quantity <= 100) return { label: "In Stock", color: "bg-green-100 text-green-700" };
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
              placeholder="Search by ID, name, or category..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
            />
          </div>
          <button
            onClick={() => setShowFilterInventoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)]"
          >
            <Filter className="h-5 w-5" />
            Filter
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Stock Level</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.88_0_0)]">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-[oklch(0.45_0_0)]">
                    No materials found.
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const stockBadge = getStockLevelBadge(material.quantity);
                  return (
                    <tr key={material.id} className="hover:bg-[oklch(0.98_0_0)]">
                      <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-[oklch(0.68_0.19_35)]" />
                          <span className="font-medium text-[oklch(0.18_0.08_250)]">{material.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => promptAndUpdateQuantity(material.id, false)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Minus className="h-4 w-4 text-red-600" />
                          </button>
                          <span className="font-medium text-[oklch(0.18_0.08_250)] min-w-[40px] text-center">
                            {material.quantity} {material.unit}
                          </span>
                          <button
                            onClick={() => promptAndUpdateQuantity(material.id, true)}
                            className="p-1 hover:bg-green-100 rounded transition-colors"
                          >
                            <Plus className="h-4 w-4 text-green-600" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {stockBadge && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stockBadge.color}`}>
                            {stockBadge.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.location}</td>
                    </tr>
                  );
                })
              )}
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
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
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
                  <select
                    value={newMaterial.unit}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  >
                    <option value="">Select unit</option>
                    {UNIT_MEASUREMENTS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
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
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Filter Materials</h2>
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
                <select 
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    applyFilters(searchQuery, e.target.value, selectedStockLevel);
                  }}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option>All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Stock Level</label>
                <select 
                  value={selectedStockLevel}
                  onChange={(e) => {
                    setSelectedStockLevel(e.target.value);
                    applyFilters(searchQuery, selectedCategory, e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Overstocked">Overstocked</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFilterInventoryModal(false)}
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
