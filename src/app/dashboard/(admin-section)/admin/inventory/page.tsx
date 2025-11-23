"use client"

import { Package, Plus, Search, Filter, X, MoreVertical, Edit, Trash2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"

import { db } from "@/src/lib/firebase"
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const UNIT_MEASUREMENTS = [ "units","kg","g","lbs","oz","liters","ml","gallons","cubic meters","cubic feet","meters","feet","inches","cm",
  "mm","tons","boxes","pallets","rolls","sheets","pieces",]

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

// Validation constants
const VALIDATION_RULES = {
  name: {
    maxLength: 100,
    minLength: 1,
    pattern: /^[a-zA-Z0-9\s\-_.,()&]+$/ // Allows letters, numbers, spaces, and common punctuation
  },
  quantity: {
    max: 999999,
    min: 0
  },
  location: {
    maxLength: 50
  }
}

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

const EllipsisMenu = ({ material, onEdit, onDelete }: { material: any, onEdit: () => void, onDelete: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const menuHeight = 80;
      
      setMenuPosition(spaceBelow < menuHeight ? 'top' : 'bottom');
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-2 hover:bg-[oklch(0.96_0_0)] rounded transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-[oklch(0.45_0_0)]" />
      </button>
      
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute right-0 ${
            menuPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
          } bg-white border border-[oklch(0.88_0_0)] rounded-lg shadow-lg z-50 min-w-[120px]`}
        >
          <button
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[oklch(0.45_0_0)] hover:bg-[oklch(0.96_0_0)] transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Validation functions
const validateName = (name: string): string | null => {
  if (!name.trim()) {
    return "Material name is required";
  }
  if (name.length > VALIDATION_RULES.name.maxLength) {
    return `Material name cannot exceed ${VALIDATION_RULES.name.maxLength} characters`;
  }
  if (name.length < VALIDATION_RULES.name.minLength) {
    return `Material name must be at least ${VALIDATION_RULES.name.minLength} character`;
  }
  if (!VALIDATION_RULES.name.pattern.test(name)) {
    return "Material name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed.";
  }
  return null;
};

const validateQuantity = (quantity: string): string | null => {
  if (!quantity.trim()) {
    return "Quantity is required";
  }
  
  const numValue = parseInt(quantity, 10);
  if (isNaN(numValue)) {
    return "Quantity must be a valid number";
  }
  if (numValue < VALIDATION_RULES.quantity.min) {
    return `Quantity cannot be less than ${VALIDATION_RULES.quantity.min}`;
  }
  if (numValue > VALIDATION_RULES.quantity.max) {
    return `Quantity cannot exceed ${VALIDATION_RULES.quantity.max.toLocaleString()}`;
  }
  return null;
};

const validateUnit = (unit: string): string | null => {
  if (!unit.trim()) {
    return "Unit of measurement is required";
  }
  if (!UNIT_MEASUREMENTS.includes(unit)) {
    return "Please select a valid unit of measurement";
  }
  return null;
};

const validateCategory = (category: string): string | null => {
  if (!category.trim()) {
    return "Category is required";
  }
  if (!CATEGORIES.includes(category)) {
    return "Please select a valid category";
  }
  return null;
};

const validateLocation = (location: string): string | null => {
  if (!location.trim()) {
    return "Location is required";
  }
  if (location.length > VALIDATION_RULES.location.maxLength) {
    return `Location cannot exceed ${VALIDATION_RULES.location.maxLength} characters`;
  }
  return null;
};

export default function InventoryTab() {
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)
  const [showFilterInventoryModal, setShowFilterInventoryModal] = useState(false)
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id?: string
    name?: string
    category?: string
    quantity?: number
    unit?: string
    location?: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedStockLevel, setSelectedStockLevel] = useState("All")
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    location: "Warehouse",
  })

  const [editMaterial, setEditMaterial] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    location: "",
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

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

  const validateMaterialForm = (material: typeof newMaterial, isEdit: boolean = false): boolean => {
    const errors: Record<string, string> = {};
    
    const nameError = validateName(material.name);
    if (nameError) errors.name = nameError;
    
    const quantityError = validateQuantity(material.quantity);
    if (quantityError) errors.quantity = quantityError;
    
    const unitError = validateUnit(material.unit);
    if (unitError) errors.unit = unitError;
    
    const categoryError = validateCategory(material.category);
    if (categoryError) errors.category = categoryError;
    
    const locationError = validateLocation(material.location);
    if (locationError) errors.location = locationError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const handleAddMaterial = async () => {
    if (!validateMaterialForm(newMaterial)) {
      showToast("Please fix the validation errors before submitting", "error");
      return;
    }

    const quantity = Number.parseInt(newMaterial.quantity);
    
    const material = {
      id: `MAT-${String(allMaterials.length + 1).padStart(4, "0")}`,
      name: newMaterial.name.trim(),
      category: newMaterial.category,
      quantity: quantity,
      unit: newMaterial.unit,
      location: newMaterial.location.trim(),
    }

    try {
      await setDoc(doc(db, "inventory", material.id), {
        name: material.name,
        category: material.category,
        quantity: material.quantity,
        unit: material.unit,
        location: material.location,
      });

      const updatedAllMaterials = [...allMaterials, material];
      setAllMaterials(updatedAllMaterials);
      
      const passesFilters = applyFiltersToSingleItem(material, searchQuery, selectedCategory, selectedStockLevel);
      if (passesFilters) {
        const updatedMaterials = [...materials, material];
        setMaterials(updatedMaterials);
      }

      setShowAddMaterialModal(false)
      setNewMaterial({ name: "", category: "", quantity: "", unit: "", location: "Warehouse" })
      setValidationErrors({})
      showToast(`Material "${material.name}" added successfully!`);
    } catch (error) {
      showToast("Failed to add material", "error");
      console.error("Error adding material:", error);
    }
  }

  const applyFiltersToSingleItem = (material: any, query: string, category: string, stockLevel: string) => {
    if (query) {
      const passesQuery = 
        material.id?.toLowerCase().includes(query.toLowerCase()) ||
        material.name?.toLowerCase().includes(query.toLowerCase()) ||
        material.category?.toLowerCase().includes(query.toLowerCase());
      if (!passesQuery) return false;
    }

    if (category !== "All Categories" && material.category !== category) {
      return false;
    }

    if (stockLevel !== "All") {
      const checker = STOCK_LEVELS[stockLevel as keyof typeof STOCK_LEVELS];
      if (checker && !checker(material.quantity || 0)) {
        return false;
      }
    }

    return true;
  }

  const openEditModal = (material: any) => {
    setSelectedMaterial(material);
    setEditMaterial({
      name: material.name || "",
      category: material.category || "",
      quantity: material.quantity?.toString() || "",
      unit: material.unit || "",
      location: material.location || "Warehouse",
    });
    setValidationErrors({});
    setShowEditMaterialModal(true);
  }

  const openDeleteModal = (material: any) => {
    setSelectedMaterial(material);
    setShowDeleteModal(true);
  }

  const handleEditMaterial = async () => {
    if (!validateMaterialForm(editMaterial, true)) {
      showToast("Please fix the validation errors before submitting", "error");
      return;
    }

    const quantity = Number.parseInt(editMaterial.quantity);

    try {
      const changes = [];
      if (selectedMaterial?.name !== editMaterial.name) changes.push("name");
      if (selectedMaterial?.category !== editMaterial.category) changes.push("category");
      if (selectedMaterial?.quantity !== quantity) changes.push("quantity");
      if (selectedMaterial?.unit !== editMaterial.unit) changes.push("unit");
      if (selectedMaterial?.location !== editMaterial.location) changes.push("location");

      await updateDoc(doc(db, "inventory", selectedMaterial!.id!), {
        name: editMaterial.name.trim(),
        category: editMaterial.category,
        quantity: quantity,
        unit: editMaterial.unit,
        location: editMaterial.location.trim(),
      });

      const updatedAllMaterials = allMaterials.map(m =>
        m.id === selectedMaterial!.id ? { 
          ...m, 
          name: editMaterial.name.trim(),
          category: editMaterial.category,
          quantity: quantity,
          unit: editMaterial.unit,
          location: editMaterial.location.trim(),
        } : m
      );
      
      setAllMaterials(updatedAllMaterials);
      
      const updatedMaterials = materials.map(m =>
        m.id === selectedMaterial!.id ? { 
          ...m, 
          name: editMaterial.name.trim(),
          category: editMaterial.category,
          quantity: quantity,
          unit: editMaterial.unit,
          location: editMaterial.location.trim(),
        } : m
      );
      
      setMaterials(updatedMaterials);
      
      setShowEditMaterialModal(false);
      setSelectedMaterial(null);
      setEditMaterial({ name: "", category: "", quantity: "", unit: "", location: "Warehouse" });
      setValidationErrors({});
      
      if (changes.length > 0) {
        showToast(`Material updated! Changed: ${changes.join(", ")}`, "info");
      } else {
        showToast("No changes were made", "info");
      }
    } catch (err: any) {
      console.error("Failed to update material:", err);
      showToast("Failed to update material", "error");
    }
  }

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial?.id) return;

    try {
      await deleteDoc(doc(db, "inventory", selectedMaterial.id));

      const updatedAllMaterials = allMaterials.filter(m => m.id !== selectedMaterial.id);
      setAllMaterials(updatedAllMaterials);
      
      const updatedMaterials = materials.filter(m => m.id !== selectedMaterial.id);
      setMaterials(updatedMaterials);
      
      setShowDeleteModal(false);
      showToast(`Material "${selectedMaterial.name}" deleted successfully!`, "info");
      setSelectedMaterial(null);
    } catch (err: any) {
      console.error("Failed to delete material:", err);
      showToast("Failed to delete material", "error");
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const value = e.target.value;
    
    if (value === "") {
      if (isEdit) {
        setEditMaterial({ ...editMaterial, quantity: "" });
      } else {
        setNewMaterial({ ...newMaterial, quantity: "" });
      }
      return;
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= VALIDATION_RULES.quantity.max) {
      if (isEdit) {
        setEditMaterial({ ...editMaterial, quantity: value });
      } else {
        setNewMaterial({ ...newMaterial, quantity: value });
      }
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const value = e.target.value;
    if (value.length <= VALIDATION_RULES.name.maxLength) {
      if (isEdit) {
        setEditMaterial({ ...editMaterial, name: value });
      } else {
        setNewMaterial({ ...newMaterial, name: value });
      }
    }
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const value = e.target.value;
    if (value.length <= VALIDATION_RULES.location.maxLength) {
      if (isEdit) {
        setEditMaterial({ ...editMaterial, location: value });
      } else {
        setNewMaterial({ ...newMaterial, location: value });
      }
    }
  }

  const clearValidationError = (field: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }

  const getStockLevelBadge = (quantity: number | undefined) => {
    if (!quantity) return { label: "Out of Stock", color: "bg-gray-100 text-gray-700" };
    if (quantity < 10) return { label: "Low Stock", color: "bg-red-100 text-red-700" };
    if (quantity >= 10 && quantity <= 100) return { label: "In Stock", color: "bg-green-100 text-green-700" };
    return { label: "High Stock", color: "bg-blue-100 text-blue-700" };
  }

  return (
    <>
      <div className="space-y-6">
        {/* Toast Notification */}
        {toast && (
          <ToastNotification 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

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
                <th className="px-6 py-3 text-left text-sm font-semibold text-[oklch(0.18_0.08_250)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.88_0_0)]">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-[oklch(0.45_0_0)]">
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
                        <span className="font-medium text-[oklch(0.18_0.08_250)]">
                          {material.quantity} {material.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {stockBadge && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stockBadge.color}`}>
                            {stockBadge.label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[oklch(0.45_0_0)]">{material.location}</td>
                      <td className="px-6 py-4">
                        <EllipsisMenu
                          material={material}
                          onEdit={() => openEditModal(material)}
                          onDelete={() => openDeleteModal(material)}
                        />
                      </td>
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
                onClick={() => {
                  setShowAddMaterialModal(false);
                  setValidationErrors({});
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Material Name
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {newMaterial.name.length}/{VALIDATION_RULES.name.maxLength}
                  </span>
                </label>
                <input
                  type="text"
                  value={newMaterial.name}
                  onChange={(e) => handleNameChange(e, false)}
                  onBlur={() => clearValidationError('name')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                    validationErrors.name ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                  }`}
                  placeholder="e.g., Steel Beams"
                  maxLength={VALIDATION_RULES.name.maxLength}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Category
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={newMaterial.category}
                  onChange={(e) => {
                    setNewMaterial({ ...newMaterial, category: e.target.value });
                    clearValidationError('category');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                    validationErrors.category ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                  }`}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                    Quantity
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    value={newMaterial.quantity}
                    onChange={(e) => handleQuantityChange(e, false)}
                    onBlur={() => clearValidationError('quantity')}
                    min="0"
                    max={VALIDATION_RULES.quantity.max}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                      validationErrors.quantity ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                    }`}
                    placeholder="0"
                  />
                  {validationErrors.quantity && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {VALIDATION_RULES.quantity.max.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                    Unit
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={newMaterial.unit}
                    onChange={(e) => {
                      setNewMaterial({ ...newMaterial, unit: e.target.value });
                      clearValidationError('unit');
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                      validationErrors.unit ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                    }`}
                  >
                    <option value="">Select unit</option>
                    {UNIT_MEASUREMENTS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {validationErrors.unit && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.unit}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Location
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {newMaterial.location.length}/{VALIDATION_RULES.location.maxLength}
                  </span>
                </label>
                <input
                  type="text"
                  value={newMaterial.location}
                  onChange={(e) => handleLocationChange(e, false)}
                  onBlur={() => clearValidationError('location')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                    validationErrors.location ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                  }`}
                  placeholder="Warehouse"
                  maxLength={VALIDATION_RULES.location.maxLength}
                />
                {validationErrors.location && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.location}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddMaterialModal(false);
                  setValidationErrors({});
                }}
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

      {/* Edit Material Modal */}
      {showEditMaterialModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Edit Material</h2>
              <button
                onClick={() => {
                  setShowEditMaterialModal(false);
                  setValidationErrors({});
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Material Name
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {editMaterial.name.length}/{VALIDATION_RULES.name.maxLength}
                  </span>
                </label>
                <input
                  type="text"
                  value={editMaterial.name}
                  onChange={(e) => handleNameChange(e, true)}
                  onBlur={() => clearValidationError('name')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                    validationErrors.name ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                  }`}
                  placeholder="e.g., Steel Beams"
                  maxLength={VALIDATION_RULES.name.maxLength}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Category
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={editMaterial.category}
                  onChange={(e) => {
                    setEditMaterial({ ...editMaterial, category: e.target.value });
                    clearValidationError('category');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                    validationErrors.category ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                  }`}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                    Quantity
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    value={editMaterial.quantity}
                    onChange={(e) => handleQuantityChange(e, true)}
                    onBlur={() => clearValidationError('quantity')}
                    min="0"
                    max={VALIDATION_RULES.quantity.max}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                      validationErrors.quantity ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                    }`}
                    placeholder="0"
                  />
                  {validationErrors.quantity && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {VALIDATION_RULES.quantity.max.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                    Unit
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={editMaterial.unit}
                    onChange={(e) => {
                      setEditMaterial({ ...editMaterial, unit: e.target.value });
                      clearValidationError('unit');
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                      validationErrors.unit ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                    }`}
                  >
                    <option value="">Select unit</option>
                    {UNIT_MEASUREMENTS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {validationErrors.unit && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.unit}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Location
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {editMaterial.location.length}/{VALIDATION_RULES.location.maxLength}
                  </span>
                </label>
                <input
                  type="text"
                  value={editMaterial.location}
                  onChange={(e) => handleLocationChange(e, true)}
                  onBlur={() => clearValidationError('location')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] ${
                    validationErrors.location ? 'border-red-500' : 'border-[oklch(0.88_0_0)]'
                  }`}
                  placeholder="Warehouse"
                  maxLength={VALIDATION_RULES.location.maxLength}
                />
                {validationErrors.location && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.location}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditMaterialModal(false);
                  setValidationErrors({});
                }}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMaterial}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Delete Material</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-[oklch(0.45_0_0)]">
                Are you sure you want to delete <strong>{selectedMaterial.name}</strong> (ID: {selectedMaterial.id})? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMaterial}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
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