import { NextResponse } from "next/server";
import { geocodeAddress, isValidCoordinate } from "@/src/lib/services/geocoding";
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('[API] Missing Firebase Admin credentials:', {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey
      });
      throw new Error('Firebase Admin credentials not configured. Please check your .env.local file.');
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('[API] Firebase admin initialization error:', error);
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
  }
}

type MockDeliveryStatus = "ASSIGNING_DRIVER" | "DRIVER_ASSIGNED" | "PICKED_UP" | "COMPLETED" | "CANCELED";

interface MockStop {
  address: string;
  coordinates: { lat: number; lng: number };
}

interface MockDelivery {
  id: string;
  status: MockDeliveryStatus;
  stops: MockStop[];
  driver?: { name: string; phone: string } | null;
  created_at: string;
  updated_at: string;
}

function normalizeStop(s: any): MockStop {
  try {
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
  } catch (error) {
    console.error('[API] Error normalizing stop:', error);
    return { address: "Unknown", coordinates: { lat: 0, lng: 0 } };
  }
}

async function geocodeStop(stop: any, index: number) {
  // First check if we already have valid coordinates
  if (
    stop.location?.lat &&
    stop.location?.lng &&
    isValidCoordinate(stop.location.lat, stop.location.lng)
  ) {
    console.log(`[API] Stop ${index} already has valid coordinates`);
    return stop;
  }

  // Extract address from stop
  const address =
    typeof stop.address === "string"
      ? stop.address
      : typeof stop.addresses?.en_PH === "string"
      ? stop.addresses.en_PH
      : typeof stop.addresses?.["en_PH"] === "string"
      ? stop.addresses["en_PH"]
      : stop.addresses?.en_HK || 
        stop.destination || 
        null;

  if (!address) {
    console.warn('[API] Stop has no address, using fallback coordinates');
    const fallbackCoords = { lat: 14.5995, lng: 120.9842 };
    
    return {
      ...stop,
      location: fallbackCoords,
      addresses: {
        en_PH: {
          displayString: "Unknown Address",
          geocoding: { ...fallbackCoords, fallback: true }
        }
      }
    };
  }

  console.log(`[API] Geocoding address for stop ${index}: "${address}"`);
  const coords = await geocodeAddress(address);
  
  if (!coords || !isValidCoordinate(coords.lat, coords.lng)) {
    console.warn(`[API] Geocoding failed for "${address}", using fallback coordinates`);
    const fallbackCoords = { lat: 14.5995, lng: 120.9842 };
    
    return {
      ...stop,
      location: fallbackCoords,
      addresses: {
        en_PH: {
          displayString: address,
          geocoding: { ...fallbackCoords, fallback: true }
        }
      }
    };
  }

  return {
    ...stop,
    location: coords,
    addresses: {
      en_PH: {
        displayString: address,
        geocoding: coords
      }
    }
  };
}

export async function POST(req: Request) {
  console.log("[API] /api/lalamove/create called");
  
  try {
    // Initialize Firebase Admin first
    let app;
    try {
      app = initializeFirebaseAdmin();
      console.log('[API] Firebase Admin initialized successfully');
    } catch (initError: any) {
      console.error('[API] Firebase Admin initialization failed:', initError);
      return NextResponse.json(
        { 
          error: "Server configuration error",
          details: initError.message,
          hint: "Please check Firebase Admin credentials in environment variables"
        },
        { status: 500 }
      );
    }

    // Check if request is JSON
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error("[API] Invalid content type:", contentType);
      return NextResponse.json(
        { error: "Invalid content type. Expected application/json" },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = await req.json();
      console.log("[API] Payload received:", JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.error("[API] JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate payload
    if (!payload.stops || !Array.isArray(payload.stops) || payload.stops.length < 2) {
      console.error("[API] Invalid stops:", payload.stops);
      return NextResponse.json(
        { error: "Invalid stops. At least 2 stops required" },
        { status: 400 }
      );
    }

    if (!payload.requesterContact?.name || !payload.requesterContact?.phone) {
      console.error("[API] Missing requester contact:", payload.requesterContact);
      return NextResponse.json(
        { error: "Missing requester contact information" },
        { status: 400 }
      );
    }

    // Geocode stops if needed
    try {
      console.log("[API] Starting geocoding for", payload.stops.length, "stops");
      const geocodedStops = await Promise.all(
        payload.stops.map((stop: any, index: number) => geocodeStop(stop, index))
      );
      payload.stops = geocodedStops;
      console.log("[API] Geocoding completed successfully");
    } catch (error: any) {
      console.error("[API] Geocoding error (non-fatal):", error);
      // Continue with original stops
    }

    // Simulate API latency
    await new Promise((r) => setTimeout(r, 500));
    
    const orderId = `MOCK-${Date.now()}`;
    
    try {
      const delivery: MockDelivery = {
        id: orderId,
        status: "ASSIGNING_DRIVER",
        stops: (payload.stops || []).map((s: any) => normalizeStop(s)),
        driver: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[API] Creating delivery document:', orderId);

      // Use Admin SDK to store in Firestore
      const db = admin.firestore();
      await db.collection('mockDeliveries').doc(orderId).set(delivery);
      
      console.log('[API] Successfully created delivery:', orderId);
      
      return NextResponse.json(
        { 
          id: orderId,
          status: delivery.status,
          created_at: delivery.created_at
        }, 
        { 
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (firestoreError: any) {
      console.error('[API] Firestore error:', firestoreError);
      
      // Return mock ID even if Firestore fails
      console.log('[API] Returning mock ID despite Firestore error:', orderId);
      return NextResponse.json(
        { 
          id: orderId,
          status: "ASSIGNING_DRIVER",
          created_at: new Date().toISOString(),
          warning: "Delivery created but not persisted to database"
        }, 
        { 
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (err: any) {
    console.error("[API] Unexpected error:", err);
    console.error("[API] Error stack:", err.stack);
    
    // Always return JSON
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        type: err.name || 'Error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}