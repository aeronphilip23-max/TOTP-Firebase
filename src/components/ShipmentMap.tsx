import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { useEffect, useState } from 'react';

// Fix Leaflet marker icon issue in Next.js
const defaultIcon = new Icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface ShipmentMapProps {
  shipments: Array<{
    id: string;
    destination?: string;
    tracking?: {
      lat: number;
      lng: number;
    };
  }>;
}

export function ShipmentMap({ shipments }: ShipmentMapProps) {
  const [mounted, setMounted] = useState(false);
  
  // Handle SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Calculate center based on shipments or default to a fallback
  const validShipments = shipments.filter(s => s.tracking);
  const center = validShipments.length > 0
    ? { 
        lat: validShipments[0].tracking!.lat, 
        lng: validShipments[0].tracking!.lng 
      }
    : { lat: 22.3193, lng: 114.1694 }; // Default center (Hong Kong)

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={10}
      className="w-full h-[400px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shipments.map(shipment => 
        shipment.tracking && (
          <Marker
            key={shipment.id}
            position={[shipment.tracking.lat, shipment.tracking.lng]}
            icon={defaultIcon}
          >
            <Popup>
              {shipment.destination || `Shipment ${shipment.id}`}
            </Popup>
          </Marker>
        )
      )}
    </MapContainer>
  );
}