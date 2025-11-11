import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

export async function GET() {
  try {
    const shipmentsSnap = await getDocs(collection(db, "shipments"));
    const mockSnap = await getDocs(collection(db, "mockDeliveries"));

    const mapping = shipmentsSnap.docs.map(doc => ({
      shipmentId: doc.id,
      lalamoveOrderId: doc.data().lalamoveOrderId || null,
      shipmentStatus: doc.data().status || null,
    }));

    const mockDocs = mockSnap.docs.map(doc => ({
      docId: doc.id,
      id: doc.data().id,
      status: doc.data().status,
    }));

    return NextResponse.json({
      shipments: mapping,
      mockDeliveries: mockDocs,
      message: "Match lalamoveOrderId from shipments with docId in mockDeliveries"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}