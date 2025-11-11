"use client"

import { useState, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function MockDeliveriesPage() {
  const [shipments, setShipments] = useState<Array<{
    id: string;
    lalamoveOrderId?: string | null;
    status?: string | null;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyWithLalamoveId, setShowOnlyWithLalamoveId] = useState(true);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, "shipments"));
      if (querySnapshot.empty) {
        setShipments([]);
        return;
      }

      const shipmentsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          lalamoveOrderId: data.lalamoveOrderId ?? null,
          status: data.status ?? null
        };
      });

      setShipments(shipmentsData);
    } catch (err: any) {
      console.error("Failed to load shipments:", err);
      setError(err?.message || String(err));
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (
    shipmentId: string,
    lalamoveId: string | null | undefined,
    newStatus: string
  ) => {
    if (!lalamoveId) {
      alert("Cannot update delivery status because shipment has no Lalamove order ID.");
      return;
    }

    try {
      const now = new Date().toISOString();

      // Update mock delivery document in mockDeliveries collection
      await updateDoc(doc(db, "mockDeliveries", String(lalamoveId)), {
        status: newStatus,
        updated_at: now,
      });

      // Update shipment document status to match
      await updateDoc(doc(db, "shipments", shipmentId), {
        status: newStatus
      });

      console.log(`Updated ${shipmentId} and mock delivery ${lalamoveId} to ${newStatus}`);
      await loadShipments();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert("Failed to update status: " + (err?.message || String(err)));
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const visible = showOnlyWithLalamoveId ? shipments.filter(s => s.lalamoveOrderId) : shipments;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mock Delivery Management</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm">Filter by status</label>
          <select
            className="border rounded p-2"
            defaultValue="ALL"
            onChange={async (e) => {
              const value = e.target.value;
              // Reload shipments then apply status filter so we always start from fresh data
              await loadShipments();
              if (value === 'ALL') {
                // ensure we show all shipments (disable the old "show only" behavior)
                setShowOnlyWithLalamoveId(false);
                return;
              }
              // ensure full list is used (not limited to only-with-lalamove) and then filter by status
              setShowOnlyWithLalamoveId(false);
              setShipments(prev => prev.filter(s => s.status === value));
            }}
          >
            <option value="ALL">All deliveries</option>
            <option value="ASSIGNING_DRIVER">Assigning Driver</option>
            <option value="DRIVER_ASSIGNED">Driver Assigned</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>

          <button
            onClick={loadShipments}
            className="ml-2 px-3 py-1 border rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <p>Loading shipments...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && visible.length === 0 && (
        <p className="text-gray-600">No shipments found.</p>
      )}

      <div className="space-y-4">
        {visible.map(shipment => (
          <div key={shipment.id} className="border p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Shipment: {shipment.id}</h3>
                <p className="text-sm text-gray-600">Mock ID: {shipment.lalamoveOrderId ?? '—'}</p>
                <p className="text-sm">Status: {shipment.status ?? '—'}</p>
              </div>

              <select
                className="border rounded p-2"
                value={shipment.status ?? 'ASSIGNING_DRIVER'}
                onChange={(e) => updateDeliveryStatus(
                  shipment.id,
                  shipment.lalamoveOrderId,
                  e.target.value
                )}
              >
                <option value="ASSIGNING_DRIVER">Assigning Driver</option>
                <option value="DRIVER_ASSIGNED">Driver Assigned</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}