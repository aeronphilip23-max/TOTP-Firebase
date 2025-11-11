import crypto from "crypto";
import { URL } from "url";

interface LalamoveConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  market: string;
  locale: string;
}

const config: LalamoveConfig = {
  baseUrl: process.env.LALAMOVE_BASE_URL || "https://rest.sandbox.lalamove.com",
  // prefer server-side var; fall back to NEXT_PUBLIC if needed
  apiKey: "pk_test_433c0efdc50c8aefee5abe50ebba24af",
  apiSecret: "sk_test_Gtt9pzn4cdM89cf1FcQ/3WN++nWcBh645mSRM5C0FU+qGFs6Y97l5IB9wjlqwbBl",
  market: process.env.LALAMOVE_MARKET || process.env.NEXT_PUBLIC_LALAMOVE_MARKET || "PH",
  locale: process.env.LALAMOVE_LOCALE || "en_PH",
};

if (!config.apiKey || !config.apiSecret) {
  console.error("[LALAMOVE] Missing API credentials (set LALAMOVE_API_KEY and LALAMOVE_API_SECRET)");
}

export class LalamoveService {
  private generateSignature(timestamp: number, method: string, path: string, body: string = ""): string {
    const rawSignature = `${timestamp}\n${method}\n${path}\n\n${body}`;
    return crypto.createHmac("sha256", config.apiSecret).update(rawSignature).digest("hex");
  }

  private async makeRequest(method: string, path: string, body?: any): Promise<any> {
    if (!config.apiKey || !config.apiSecret) {
      throw new Error("Lalamove credentials not configured on server");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const methodUpper = method.toUpperCase();
    const bodyString = body ? JSON.stringify(body) : "";
    const signature = this.generateSignature(timestamp, methodUpper, path, bodyString);

    const url = `${config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `hmac ${config.apiKey}:${timestamp}:${signature}`,
      Market: config.market,
      "User-Agent": "LogiTrack",
    };

    // DO NOT set Host or Content-Length manually; let fetch handle them.
    console.log("[LALAMOVE] REQUEST", { url, method: methodUpper, timestamp, body: bodyString, headers });

    const res = await fetch(url, {
      method: methodUpper,
      headers,
      body: bodyString || undefined,
    });

    const text = await res.text();
    console.log("[LALAMOVE] RESPONSE status=", res.status, "headers=", Array.from(res.headers.entries()));
    console.log("[LALAMOVE] RESPONSE body=", text);

    if (!res.ok) {
      const err: any = new Error(`Lalamove API error ${res.status}: ${text}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private normalizeStops(rawStops: any[]): any[] {
    const locale = config.locale;
    return rawStops.map((s, idx) => {
      if (!s.location || typeof s.location.lat !== "number" || typeof s.location.lng !== "number") {
        throw new Error("Each stop.location must include numeric lat and lng");
      }

      const lat = Number(s.location.lat);
      const lng = Number(s.location.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        throw new Error("Stop location must be valid non-zero coordinates");
      }

      // Normalize the address string
      let displayString = "";
      if (typeof s.addresses?.[locale] === "string") {
        displayString = s.addresses[locale];
      } else if (typeof s.addresses?.[locale]?.displayString === "string") {
        displayString = s.addresses[locale].displayString;
      } else if (typeof s.address === "string") {
        displayString = s.address;
      } else if (typeof s.destination === "string") {
        displayString = s.destination;
      } else {
        displayString = idx === 0 ? "Pickup Location" : "Dropoff Location";
      }

      // Simplify the stop object structure
      return {
        stopId: idx.toString(),
        coordinates: {
          lat,
          lng
        },
        address: displayString,
        name: s.name || (idx === 0 ? "Pickup" : "Dropoff"),
        type: s.type || (idx === 0 ? "PICKUP" : "DROP_OFF")
      };
    });
  }

  private async getQuotation(data: any) {
    const stops = this.normalizeStops(data.stops);
    
    const quotationPayload = {
      serviceType: data.serviceType || "TRUCK",
      stops: stops.map(stop => ({
        coordinates: {
          lat: stop.coordinates.lat,
          lng: stop.coordinates.lng
        }
      })),
      language: config.locale
    };

    return this.makeRequest("POST", "/v3/quotations", quotationPayload);
  }

  async createDelivery(data: any) {
    const allowedServiceTypes = ["MOTORCYCLE", "VAN", "TRUCK"];
    const serviceType = allowedServiceTypes.includes(String(data.serviceType).toUpperCase())
      ? String(data.serviceType).toUpperCase()
      : "TRUCK";

    if (!data.stops || !Array.isArray(data.stops) || data.stops.length < 2) {
      throw new Error("stops must be an array with at least two stops");
    }

    // First get a quotation
    console.log("[LALAMOVE] Getting quotation...");
    const quotation = await this.getQuotation({
      serviceType,
      stops: data.stops
    });

    console.log("[LALAMOVE] Quotation received:", quotation);

    if (!quotation.totalFee) {
      throw new Error("Invalid quotation response from Lalamove");
    }

    const stops = this.normalizeStops(data.stops);
    
    // Format phone number (remove +63 prefix and non-digits)
    const phone = (data.requesterContact?.phone || "").replace(/^\+63/, "").replace(/\D/g, "");
    
    const payload = {
      serviceType,
      quotedTotalFee: quotation.totalFee,
      stops: stops.map((stop, idx) => ({
        coordinates: {
          lat: stop.coordinates.lat,
          lng: stop.coordinates.lng
        },
        address: stop.address,
        name: stop.name,
        type: stop.type
      })),
      sender: {
        stopId: "0",
        name: data.requesterContact?.name || "",
        phone: {
          number: phone,
          countryCode: "+63"
        }
      },
      isPODEnabled: true,
      isRecipientSMSEnabled: true,
      specialRequests: [],
      partnerOrderId: data.partnerOrderId || undefined
    };

    console.log("[LALAMOVE] Creating order with payload:", JSON.stringify(payload, null, 2));
    return this.makeRequest("POST", "/v3/orders", payload);
  }

  async getOrderStatus(orderId: string) {
    return this.makeRequest("GET", `/v3/orders/${orderId}`);
  }

  async cancelOrder(orderId: string) {
    return this.makeRequest("POST", `/v3/orders/${orderId}/cancel`);
  }
}