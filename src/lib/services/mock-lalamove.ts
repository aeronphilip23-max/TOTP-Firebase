import { getAdminDb } from "@/src/lib/firebase-admin";

export type MockDeliveryStatus = "ASSIGNING_DRIVER" | "DRIVER_ASSIGNED" | "PICKED_UP" | "COMPLETED" | "CANCELED";

interface MockStop {
  address: string;
  coordinates: { lat: number; lng: number };
}

export interface MockDelivery {
  id: string;
  status: MockDeliveryStatus;
  stops: MockStop[];
  driver?: { name: string; phone: string } | null;
  created_at: string;
  updated_at: string;
}

export class MockLalamoveService {
  private collection = "mockDeliveries";

  private normalizeStop(s: any): MockStop {
    const address =
      typeof s?.addresses?.en_PH === "string"
        ? s.addresses.en_PH
        : typeof s?.addresses?.en_PH?.displayString === "string"
        ? s.addresses.en_PH.displayString
        : typeof s?.address === "string"
        ? s.address
        : typeof s?.destination === "string"
        ? s.destination
        : "Unknown";

    const coordinates = {
      lat: typeof s?.location?.lat === "number" ? s.location.lat : Number(s?.location?.lat) || 0,
      lng: typeof s?.location?.lng === "number" ? s.location.lng : Number(s?.location?.lng) || 0,
    };

    return { address, coordinates };
  }

  async createDelivery(data: any): Promise<{ id: string }> {
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 500));

    const orderId = `MOCK-${Date.now()}`;
    const delivery: MockDelivery = {
      id: orderId,
      status: "ASSIGNING_DRIVER",
      stops: (data.stops || []).map((s: any) => this.normalizeStop(s)),
      driver: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Use Admin SDK to store in Firestore (bypasses security rules)
      const adminDb = getAdminDb();
      await adminDb.collection(this.collection).doc(orderId).set(delivery);
      
      console.log('[MOCK] Successfully created delivery:', orderId);
    } catch (error) {
      console.error('[MOCK] Error creating delivery in Firestore:', error);
      throw new Error('Failed to create mock delivery: ' + (error as Error).message);
    }

    return { id: orderId };
  }
}