"use client"

import { Plus, Search, Filter, X, Lock } from "lucide-react"
import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc, updateDoc } from "firebase/firestore";

import { db } from "@/src/lib/firebase";

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
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

export default function ShipmentsTab() {
  const [showAddShipmentModal, setShowAddShipmentModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showFilterShipmentsModal, setShowFilterShipmentsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("descending")
  const [materials, setMaterials] = useState<Material[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showDelayReasonModal, setShowDelayReasonModal] = useState(false)
  const [delayReason, setDelayReason] = useState("")
  const [selectedShipmentForDelay, setSelectedShipmentForDelay] = useState<any>(null)

  const [newShipment, setNewShipment] = useState({
    destination: "",
    selectedMaterialId: "",
    quantity: "",
    eta: "",
    deliveryAddress: "",
    deliveryLat: undefined as number | undefined,
    deliveryLng: undefined as number | undefined,
  })

  const [shipments, setShipments] = useState<Array<{
    id: string
    destination?: string
    materials?: string
    eta?: string
    status?: string
    lalamoveOrderId?: string | null
    quantity?: number
    materialId?: string
    delayReason?: string
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
    delayReason?: string
  }>>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Load materials from inventory
  const getMaterials = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "inventory"))
      const materialsList = querySnapshot.docs.map(doc => {
        const data = doc.data() as any
        return {
          id: doc.id,
          name: data.name || "Unknown",
          quantity: typeof data.quantity === "number" ? data.quantity : 0,
          unit: data.unit || "units"
        }
      }).filter(m => m.quantity > 0)
      setMaterials(materialsList)
    } catch (error) {
      console.error("Error loading materials:", error)
      showToast("Failed to load materials", "error");
    }
  }

  // Getting shipment data from db
  const getShipments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "shipments"));
      const shipmentsData = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Sort initial shipments according to current sort settings
      const sorted = [...shipmentsData].sort((a: any, b: any) => {
        if (sortBy === 'id') {
          const comparison = String(a.id).localeCompare(String(b.id));
          return sortOrder === 'descending' ? -comparison : comparison;
        }

        const dateA = a.eta ? new Date(a.eta).getTime() : 0;
        const dateB = b.eta ? new Date(b.eta).getTime() : 0;
        return sortOrder === 'descending' ? dateB - dateA : dateA - dateB;
      });

      setAllShipments(sorted as any);
      setShipments(sorted as any);
    } catch (error) {
      console.error("Error loading shipments:", error);
      showToast("Failed to load shipments", "error");
    }
  }

  useEffect(() => {
    getMaterials()
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

  const getSelectedMaterial = () => {
    return materials.find(m => m.id === newShipment.selectedMaterialId)
  }

  const handleMaterialChange = (materialId: string) => {
    setNewShipment({
      ...newShipment,
      selectedMaterialId: materialId,
      quantity: "" // Reset quantity when material changes
    })
  }

  const handleQuantityChange = (value: string) => {
    // Only allow positive integers
    if (value === "") {
      setNewShipment({ ...newShipment, quantity: "" })
      return
    }

    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue > 0) {
      const selectedMaterial = getSelectedMaterial()
      if (selectedMaterial && numValue <= selectedMaterial.quantity) {
        setNewShipment({ ...newShipment, quantity: value })
      } else if (!selectedMaterial) {
        setNewShipment({ ...newShipment, quantity: value })
      }
    }
  }

  const handleAddShipment = async () => {
    if (!newShipment.destination || !newShipment.selectedMaterialId || !newShipment.quantity || !newShipment.eta) {
      showToast("Please fill in all fields", "error");
      return
    }

    const selectedMaterial = getSelectedMaterial()
    if (!selectedMaterial) {
      showToast("Selected material not found", "error");
      return
    }

    const shipmentQuantity = parseInt(newShipment.quantity, 10)
    const shipmentId = `SH-${String(allShipments.length + 1).padStart(4, "0")}`
    const materialsString = `${selectedMaterial.name} (${newShipment.quantity} ${selectedMaterial.unit})`
    
    const shipmentRecord = {
      id: shipmentId,
      destination: newShipment.destination,
      status: "ASSIGNING_DRIVER",
      eta: newShipment.eta,
      materials: materialsString,
    }

    try {
      setIsCreating(true)
      const pickupLat = Number(process.env.NEXT_PUBLIC_WAREHOUSE_LAT || '0');
      const pickupLng = Number(process.env.NEXT_PUBLIC_WAREHOUSE_LNG || '0');
      const pickupAddress = process.env.NEXT_PUBLIC_WAREHOUSE_ADDRESS || "Warehouse";

      const deliveryLat = newShipment.deliveryLat ?? 0;
      const deliveryLng = newShipment.deliveryLng ?? 0;
      const deliveryAddress = newShipment.deliveryAddress || newShipment.destination;

      const response = await fetch('/api/lalamove/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'TRUCK',
          stops: [
            { 
              location: { lat: pickupLat, lng: pickupLng }, 
              addresses: { en_PH: pickupAddress }
            },
            { 
              location: { lat: deliveryLat, lng: deliveryLng }, 
              addresses: { en_PH: deliveryAddress }
            }
          ],
          requesterContact: {
            name: process.env.NEXT_PUBLIC_WAREHOUSE_CONTACT_NAME || "Sender",
            phone: process.env.NEXT_PUBLIC_WAREHOUSE_CONTACT_PHONE || ""
          }
        })
      });

      // Parse response safely: some errors can return HTML (e.g., 500 page)
      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();

      if (!response.ok) {
        // Try to extract JSON error if present
        let message = raw;
        if (contentType.includes('application/json')) {
          try {
            const errObj = JSON.parse(raw);
            message = errObj.error || errObj.message || JSON.stringify(errObj);
          } catch (e) {
            // fallthrough to raw
          }
        }
        throw new Error(message || 'Failed to create delivery');
      }

      // If response is JSON parse it, else show useful error with snippet
      let lalamoveResp: any = null;
      if (contentType.includes('application/json')) {
        try {
          lalamoveResp = JSON.parse(raw);
        } catch (e) {
          throw new Error('Invalid JSON response from Lalamove API');
        }
      } else {
        // Got HTML or plain text instead of JSON
        const snippet = raw.slice(0, 1000);
        throw new Error('Unexpected response from Lalamove API: ' + snippet);
      }

      const lalamoveOrderId = lalamoveResp?.id || lalamoveResp?.orderId || null;

      // Deduct from inventory
      const newInventoryQuantity = selectedMaterial.quantity - shipmentQuantity
      await updateDoc(doc(db, "inventory", newShipment.selectedMaterialId), {
        quantity: newInventoryQuantity
      })

      // Persist shipment to Firestore including lalamoveOrderId
      await setDoc(doc(db, "shipments", shipmentId), {
        destination: shipmentRecord.destination,
        status: shipmentRecord.status,
        eta: shipmentRecord.eta,
        materials: shipmentRecord.materials,
        materialId: newShipment.selectedMaterialId,
        quantity: shipmentQuantity,
        lalamoveOrderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // update local state
      const newShipmentData = { 
        ...shipmentRecord, 
        lalamoveOrderId,
        materialId: newShipment.selectedMaterialId,
        quantity: shipmentQuantity
      };
      setAllShipments(prev => [...prev, newShipmentData as any]);
      setShipments(prev => [...prev, newShipmentData as any]);

      // Update materials list
      await getMaterials()
      
      setShowAddShipmentModal(false)
      setNewShipment({ destination: "", selectedMaterialId: "", quantity: "", eta: "", deliveryAddress: "", deliveryLat: undefined, deliveryLng: undefined })
      showToast(`Shipment "${shipmentId}" created successfully!`);
    } catch (error: any) {
      console.error("Error creating shipment:", error);
      showToast(error.message || "Failed to create shipment", "error");
    } finally {
      setIsCreating(false)
    }
  }

  const updateDeliveryStatus = async (
    shipmentId: string,
    lalamoveId: string | null | undefined,
    newStatus: string,
    shipment: typeof shipments[0],
    delayReason?: string
  ) => {
    // Check if already cancelled
    if (shipment.status === "CANCELED") {
      showToast("Cannot change status of a cancelled shipment", "error");
      return
    }

    if (!lalamoveId) {
      showToast("Cannot update delivery status because shipment has no Lalamove order ID.", "error");
      return;
    }

    try {
      const now = new Date().toISOString();

      // If changing to CANCELED, refund inventory
      if (newStatus === "CANCELED" && shipment.status !== "CANCELED") {
        const material = materials.find(m => m.id === shipment.materialId)
        if (material && shipment.quantity && shipment.materialId) {
          const refundedQuantity = material.quantity + shipment.quantity
          await updateDoc(doc(db, "inventory", shipment.materialId), {
            quantity: refundedQuantity
          })
          await getMaterials()
        }
      }

      // Update mock delivery document in mockDeliveries collection
      await updateDoc(doc(db, "mockDeliveries", String(lalamoveId)), {
        status: newStatus,
        updated_at: now,
      });

      // Update shipment document status to match
      const updateData: any = {
        status: newStatus,
        updatedAt: now
      };

      // If status is DELAYED and delay reason is provided, store it
      if (newStatus === "DELAYED" && delayReason) {
        updateData.delayReason = delayReason;
      }

      // If changing from DELAYED to another status, clear the delay reason
      if (shipment.status === "DELAYED" && newStatus !== "DELAYED") {
        updateData.delayReason = null;
      }

      await updateDoc(doc(db, "shipments", shipmentId), updateData);

      console.log(`Updated ${shipmentId} and mock delivery ${lalamoveId} to ${newStatus}`);
      
      // Refresh data
      await getShipments();
      showToast(`Shipment status updated to ${newStatus}`, "success");
    } catch (err: any) {
      console.error("Failed to update status:", err);
      showToast("Failed to update status: " + (err?.message || String(err)), "error");
    }
  }

  // Confirmation modal state for cancellations
  const [confirmCancel, setConfirmCancel] = useState<any>({ open: false, shipment: null, newStatus: null });

  const handleStatusChangeWithConfirm = (shipment: any, newStatus: string) => {
    if (newStatus === 'CANCELED' && shipment.status !== 'CANCELED') {
      setConfirmCancel({ open: true, shipment, newStatus });
      return;
    }

    if (newStatus === 'DELAYED') {
      setSelectedShipmentForDelay(shipment);
      setDelayReason(shipment.delayReason || "");
      setShowDelayReasonModal(true);
      return;
    }

    updateDeliveryStatus(shipment.id, shipment.lalamoveOrderId, newStatus, shipment);
  }

  const handleDelayReasonSubmit = async () => {
    if (!delayReason.trim()) {
      showToast("Please provide a reason for the delay", "error");
      return;
    }

    if (selectedShipmentForDelay) {
      await updateDeliveryStatus(
        selectedShipmentForDelay.id,
        selectedShipmentForDelay.lalamoveOrderId,
        "DELAYED",
        selectedShipmentForDelay,
        delayReason.trim()
      );
      setShowDelayReasonModal(false);
      setDelayReason("");
      setSelectedShipmentForDelay(null);
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (selectedDate >= today) {
      setNewShipment({ ...newShipment, eta: e.target.value });
    } else {
      showToast("Please select a date that is today or in the future.", "error");
    }
  }

  const selectedMaterial = getSelectedMaterial()
  const maxQuantity = selectedMaterial?.quantity || 0

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
              placeholder="Search by ID, destination, or materials..."
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

        <div className="space-y-4">
          {shipments.length === 0 ? (
            <p className="text-[oklch(0.45_0_0)] text-center py-8">No shipments found.</p>
          ) : (
            shipments.map((shipment) => {
              const isCancelled = shipment.status === "CANCELED"
              const isDelayed = shipment.status === "DELAYED"
              return (
                <div
                  key={shipment.id}
                  className={`bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] hover:shadow-md transition-shadow ${isCancelled ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[oklch(0.18_0.08_250)]">{shipment.id}</h3>
                      <p className="text-[oklch(0.45_0_0)]">{shipment.destination}</p>
                      {isDelayed && shipment.delayReason && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                          <p className="text-sm text-orange-800">
                            <strong>Delay Reason:</strong> {shipment.delayReason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={shipment.status ?? 'ASSIGNING_DRIVER'}
                        onChange={(e) => handleStatusChangeWithConfirm(shipment, e.target.value)}
                        disabled={isCancelled}
                        className={`px-3 py-1 rounded-full text-sm font-medium border-2 cursor-pointer ${
                          shipment.status === "COMPLETED"
                            ? "bg-green-100 text-green-700 border-green-300"
                            : shipment.status === "PICKED_UP" || shipment.status === "DRIVER_ASSIGNED"
                              ? "bg-blue-100 text-blue-700 border-blue-300"
                              : shipment.status === "CANCELED"
                                ? "bg-red-100 text-red-700 border-red-300"
                                : shipment.status === "DELAYED"
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-300"
                        } ${isCancelled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="ASSIGNING_DRIVER">Assigning Driver</option>
                        <option value="DRIVER_ASSIGNED">Driver Assigned</option>
                        <option value="PICKED_UP">Picked Up</option>
                        <option value="DELAYED">Delayed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELED">Canceled</option>
                      </select>
                    </div>
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
                    <div>
                      <span className="text-[oklch(0.45_0_0)]">Status:</span>
                      <span className="ml-2 text-[oklch(0.18_0.08_250)] font-medium capitalize">{shipment.status?.toLowerCase().replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add Shipment Modal */}
      {showAddShipmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  placeholder="e.g., Santo Tomas, Batangas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Material</label>
                <select
                  value={newShipment.selectedMaterialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="">Select a material</option>
                  {materials.map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} (Available: {material.quantity} {material.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">
                  Quantity {selectedMaterial && `(Max: ${maxQuantity} ${selectedMaterial.unit})`}
                </label>
                <input
                  type="number"
                  value={newShipment.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  disabled={!newShipment.selectedMaterialId}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter quantity (must be positive)"
                  min="1"
                  max={maxQuantity}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">ETA</label>
                <input
                  type="date"
                  value={newShipment.eta}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Delivery Address (Optional)</label>
                <input
                  type="text"
                  value={newShipment.deliveryAddress}
                  onChange={(e) => setNewShipment({ ...newShipment, deliveryAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                  placeholder="Will default to destination if left empty"
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
                disabled={isCreating}
                aria-busy={isCreating}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${isCreating ? 'bg-[oklch(0.56_0.12_35)] cursor-not-allowed' : 'bg-[oklch(0.68_0.19_35)] hover:bg-[oklch(0.72_0.19_35)]'}`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <span className="inline-block h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Creating...
                  </div>
                ) : (
                  'Add Shipment'
                )}
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
                  <option value="DELAYED">Delayed</option>
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

      {/* Delay Reason Modal */}
      {showDelayReasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Delay Reason</h2>
              <button
                onClick={() => {
                  setShowDelayReasonModal(false);
                  setDelayReason("");
                  setSelectedShipmentForDelay(null);
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-[oklch(0.45_0_0)] text-sm">
                Please provide the reason for the delay. This information will be included in delayed shipment reports.
              </p>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Delay Reason *</label>
                <textarea
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g., Vehicle breakdown, Traffic congestion, Weather conditions..."
                  rows={4}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDelayReasonModal(false);
                  setDelayReason("");
                  setSelectedShipmentForDelay(null);
                }}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelayReasonSubmit}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Mark as Delayed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancellation Modal */}
      {confirmCancel?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Confirm Cancellation</h2>
              <button
                onClick={() => setConfirmCancel({ open: false, shipment: null, newStatus: null })}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[oklch(0.45_0_0)] mb-6">This action will be permanent and cannot be undone. Do you wish to continue?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel({ open: false, shipment: null, newStatus: null })}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                No
              </button>
              <button
                onClick={async () => {
                  if (confirmCancel?.shipment && confirmCancel?.newStatus) {
                    await updateDeliveryStatus(
                      confirmCancel.shipment.id,
                      confirmCancel.shipment.lalamoveOrderId,
                      confirmCancel.newStatus,
                      confirmCancel.shipment
                    );
                  }
                  setConfirmCancel({ open: false, shipment: null, newStatus: null });
                }}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}