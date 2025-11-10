const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export async function geocodeAddress(address: string, retries = 3): Promise<{ lat: number; lng: number } | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Clean up the address
      const cleanAddress = address
        .replace(/[^\w\s,-]/g, '') // Remove special chars except comma and dash
        .trim();

      const encodedAddress = encodeURIComponent(`${cleanAddress}, Philippines`); // Force PH context
      const url = `https://geocode.maps.co/search?` + 
        `q=${encodedAddress}` +
        `&api_key=6911f9876f7cd008218026vcrb318d9`;
        // `&country=ph` +  // Bias to Philippines
        // `&limit=5`;     // Get multiple results

      console.log(`[GEOCODE] Searching for "${cleanAddress}" in PH:`, url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TOTP-Firebase/1.0 (nonut1619@gmail.com)'
        }
      });
      
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[GEOCODE] Rate limited, waiting ${waitTime}ms`);
        await wait(waitTime);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json() as GeocodingResult[];
      
      if (!Array.isArray(results) || results.length === 0) {
        console.warn(`[GEOCODE] No results found for address: ${cleanAddress}`);
        return null;
      }

      // Enhanced matching for Philippine addresses
      const bestMatch = results.reduce((best, current) => {
        let currentScore = 0;
        let bestScore = 0;

        // Prefer results in Philippines
        if (current.address?.country_code === 'ph') currentScore += 5;
        if (best.address?.country_code === 'ph') bestScore += 5;

        // Score based on result type
        if (current.type === 'city') currentScore += 3;
        if (current.type === 'administrative') currentScore += 2;
        if (best.type === 'city') bestScore += 3;
        if (best.type === 'administrative') bestScore += 2;

        // Add importance score
        currentScore += (current.importance || 0);
        bestScore += (best.importance || 0);
        
        return currentScore > bestScore ? current : best;
      }, results[0]);

      const lat = parseFloat(bestMatch.lat);
      const lon = parseFloat(bestMatch.lon);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid coordinates in response');
      }

      // Validate coordinates are within Philippines bounding box
      if (lat < 4.5 || lat > 21.5 || lon < 116 || lon > 127) {
        throw new Error('Coordinates outside Philippines');
      }

      console.log(`[GEOCODE] Successfully geocoded "${cleanAddress}" to:`, { 
        lat, 
        lng: lon,
        type: bestMatch.type,
        displayName: bestMatch.display_name,
        country: bestMatch.address?.country
      });
      
      return {
        lat,
        lng: lon
      };
    } catch (error) {
      console.error(`[GEOCODE] Attempt ${attempt + 1}/${retries} failed:`, error);
      
      if (attempt === retries - 1) {
        console.error(`[GEOCODE] All ${retries} attempts failed for address: ${address}`);
        return null;
      }
      
      await wait(Math.pow(2, attempt) * 1000);
    }
  }
  
  return null;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  // Add Philippines-specific bounds
  const PH_BOUNDS = {
    minLat: 4.5,   // Southernmost point
    maxLat: 21.5,  // Northernmost point
    minLng: 116.0, // Westernmost point
    maxLng: 127.0  // Easternmost point
  };

  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    !isNaN(lat) && 
    !isNaN(lng) &&
    lat >= PH_BOUNDS.minLat &&
    lat <= PH_BOUNDS.maxLat &&
    lng >= PH_BOUNDS.minLng &&
    lng <= PH_BOUNDS.maxLng &&
    !(lat === 0 && lng === 0)
  );
}