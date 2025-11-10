import { NextResponse } from "next/server";
import { LalamoveService } from "@/src/lib/services/lalamove";
import { geocodeAddress, isValidCoordinate } from "@/src/lib/services/geocoding";

async function geocodeStop(stop: any, index: number) {
  // First check if we already have valid coordinates
  if (
    stop.location?.lat &&
    stop.location?.lng &&
    isValidCoordinate(stop.location.lat, stop.location.lng)
  ) {
    return stop;
  }

  // Extract address from stop - check both en_PH and en_HK locales
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
    console.error('[API] Stop data:', JSON.stringify(stop, null, 2));
    throw new Error(`Stop ${index} has no valid coordinates or address to geocode`);
  }

  console.log(`[API] Geocoding address for stop ${index}: "${address}"`);
  const coords = await geocodeAddress(address);
  
  if (!coords || !isValidCoordinate(coords.lat, coords.lng)) {
    throw new Error(
      `Failed to geocode address for stop ${index}: "${address}". ` +
      `Please provide a more specific address or valid coordinates.`
    );
  }

  // Return stop with normalized structure
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

async function reverseGeocode(lat: number, lng: number, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `https://geocode.maps.co/reverse?` +
        `lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lng)}` +
        `&api_key=6911f9876f7cd008218026vcrb318d9`;  // Add your API key

      console.log(`[API] Reverse geocoding coordinates:`, { lat, lng, url });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TOTP-Firebase/1.0 (nonut1619@gmail.com)'
        }
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[API] Rate limited, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[API] Reverse geocode result:`, data);

      // For Lalamove PH market, we'll consider both 'ph' and 'phl' as valid country codes
      const countryCode = data?.address?.country_code?.toLowerCase();
      if (!countryCode) {
        throw new Error('No country code in response');
      }

      // Normalize country codes
      const normalizedCode = countryCode === 'phl' ? 'ph' : countryCode;
      return normalizedCode;
    } catch (error) {
      console.error(`[API] Reverse geocode attempt ${attempt + 1} failed:`, error);
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("[API] /api/lalamove/create payload:", JSON.stringify(payload));

    if (!payload.stops || payload.stops.length < 2) {
      return NextResponse.json({ error: "Invalid stops" }, { status: 400 });
    }

    // Geocode stops if needed
    try {
      const geocodedStops = await Promise.all(
        payload.stops.map((stop: any, index: number) => geocodeStop(stop, index))
      );
      payload.stops = geocodedStops;
    } catch (error: any) {
      console.error("[API] Geocoding error:", error);
      return NextResponse.json(
        { error: "Geocoding failed", details: error.message },
        { status: 400 }
      );
    }

    const svc = new LalamoveService();

    try {
      // Add shipment ID as partner order ID for tracking
      payload.partnerOrderId = `SH-${String(Date.now())}`;
      
      const resp = await svc.createDelivery(payload);
      console.log("[API] Lalamove create result:", resp);
      return NextResponse.json(resp);
    } catch (err: any) {
      console.error("[API] Lalamove error:", err);
      
      // Check for specific quotation errors
      if (err.status === 400 && err.body?.includes('quotation')) {
        return NextResponse.json({ 
          error: "Failed to get delivery quote", 
          details: err.body 
        }, { status: 400 });
      }

      // Other error handling...
      return NextResponse.json(
        { error: "Upstream Lalamove error", details: err.body || err.message },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error("[API] Unexpected error:", err);
    return NextResponse.json(
      { error: "internal server error", details: err.message },
      { status: 500 }
    );
  }
}