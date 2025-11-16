import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTM5_DoF5CdbVqOCpnd7_ps1e9wSahTMY",
  authDomain: "logitrack-e1972.firebaseapp.com",
  projectId: "logitrack-e1972",
  storageBucket: "logitrack-e1972.firebasestorage.app",
  messagingSenderId: "29625075825",
  appId: "1:29625075825:web:0fcbaa6ff2bb1d9fe433d0"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface ReportRequest {
  reportType: string;
  dateRange: string;
  format: "PDF" | "CSV";
  reportTitle: string;
}

async function getShipmentAnalysis(dateRange: string) {
  try {
    const shipmentsRef = collection(db, "shipments");
    const shipmentsSnapshot = await getDocs(shipmentsRef);
    const shipments = shipmentsSnapshot.docs.map(doc => doc.data());

    const statuses: { [key: string]: number } = {};
    shipments.forEach(shipment => {
      const status = (shipment as any).status || "UNKNOWN";
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return {
      totalShipments: shipments.length,
      statusBreakdown: statuses,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating shipment analysis:", error);
    throw error;
  }
}

async function getInventoryReport(dateRange: string) {
  try {
    const inventoryRef = collection(db, "inventory");
    const inventorySnapshot = await getDocs(inventoryRef);
    const materials = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lowStockItems = materials.filter((m: any) => m.quantity < 10);
    const totalValue = materials.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);

    return {
      totalMaterials: materials.length,
      totalUnits: totalValue,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map((m: any) => ({
        id: m.id,
        name: m.name,
        quantity: m.quantity,
        unit: m.unit,
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating inventory report:", error);
    throw error;
  }
}

async function getDelayedShipmentsReport(dateRange: string) {
  try {
    const shipmentsRef = collection(db, "shipments");
    const shipmentsSnapshot = await getDocs(shipmentsRef);
    const shipments = shipmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter for "delayed" shipments (not completed after ETA)
    const today = new Date();
    const delayedShipments = shipments.filter((s: any) => {
      if (!s.eta || s.status === "COMPLETED") return false;
      const eta = new Date(s.eta);
      return eta < today;
    });

    return {
      totalDelayed: delayedShipments.length,
      delayedShipments: delayedShipments.map((s: any) => ({
        id: s.id,
        destination: s.destination,
        eta: s.eta,
        status: s.status,
        materials: s.materials,
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating delayed shipments report:", error);
    throw error;
  }
}

function generateCSV(data: any, reportType: string): string {
  let csv = `${reportType} Report\n`;
  csv += `Generated: ${new Date().toISOString()}\n\n`;

  if (reportType === "Shipment Analysis") {
    csv += "Total Shipments,Status,Count\n";
    csv += `${data.totalShipments},\n`;
    Object.entries(data.statusBreakdown).forEach(([status, count]) => {
      csv += `,${status},${count}\n`;
    });
  } else if (reportType === "Inventory Report") {
    csv += "Total Materials,Total Units,Low Stock Count\n";
    csv += `${data.totalMaterials},${data.totalUnits},${data.lowStockCount}\n\n`;
    csv += "Low Stock Items\n";
    csv += "Material ID,Name,Quantity,Unit\n";
    data.lowStockItems.forEach((item: any) => {
      csv += `${item.id},${item.name},${item.quantity},${item.unit}\n`;
    });
  } else if (reportType === "Delayed Shipments") {
    csv += "Total Delayed,\n";
    csv += `${data.totalDelayed}\n\n`;
    csv += "Delayed Shipments\n";
    csv += "Shipment ID,Destination,ETA,Status,Materials\n";
    data.delayedShipments.forEach((shipment: any) => {
      csv += `${shipment.id},"${shipment.destination}",${shipment.eta},${shipment.status},"${shipment.materials}"\n`;
    });
  }

  return csv;
}

function generatePDF(data: any, reportType: string, csvContent: string): Buffer {
  // Create a simple PDF structure with proper PDF format
  let pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 1000 >>
stream
BT
/F1 12 Tf
50 750 Td
(${reportType} Report) Tj
0 -20 Td
(Generated: ${new Date().toLocaleString()}) Tj
0 -40 Td
`;

  if (reportType === "Shipment Analysis") {
    pdfContent += `(SHIPMENT ANALYSIS SUMMARY) Tj
0 -15 Td
(Total Shipments: ${data.totalShipments}) Tj
0 -15 Td
(Status Breakdown:) Tj
`;
    Object.entries(data.statusBreakdown).forEach(([status, count]) => {
      pdfContent += `0 -15 Td
(${status}: ${count}) Tj
`;
    });
  } else if (reportType === "Inventory Report") {
    pdfContent += `(INVENTORY REPORT SUMMARY) Tj
0 -15 Td
(Total Materials: ${data.totalMaterials}) Tj
0 -15 Td
(Total Units: ${data.totalUnits}) Tj
0 -15 Td
(Low Stock Count: ${data.lowStockCount}) Tj
0 -15 Td
(Low Stock Items:) Tj
`;
    data.lowStockItems.forEach((item: any) => {
      pdfContent += `0 -15 Td
(${item.name} - ${item.quantity} ${item.unit}) Tj
`;
    });
  } else if (reportType === "Delayed Shipments") {
    pdfContent += `(DELAYED SHIPMENTS REPORT) Tj
0 -15 Td
(Total Delayed: ${data.totalDelayed}) Tj
0 -15 Td
(Delayed Shipments:) Tj
`;
    data.delayedShipments.forEach((shipment: any) => {
      pdfContent += `0 -15 Td
(${shipment.id} to ${shipment.destination} - ETA: ${shipment.eta}) Tj
`;
    });
  }

  pdfContent += `
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000210 00000 n
0000000310 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${pdfContent.length + 100}
%%EOF`;

  return Buffer.from(pdfContent, 'utf-8');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReportRequest;
    const { reportType, dateRange, format, reportTitle } = body;

    let reportData: any;

    switch (reportType) {
      case "Shipment Analysis":
        reportData = await getShipmentAnalysis(dateRange);
        break;
      case "Inventory Report":
        reportData = await getInventoryReport(dateRange);
        break;
      case "Delayed Shipments":
        reportData = await getDelayedShipmentsReport(dateRange);
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Generate CSV format
    const csvContent = generateCSV(reportData, reportType);

    // Save report to Firestore
    const reportsRef = collection(db, "reports");
    const reportDoc = {
      title: reportTitle,
      type: reportType,
      dateRange: dateRange,
      format: format,
      content: csvContent, // Always store CSV content for text-based storage
      data: reportData,
      createdAt: serverTimestamp(),
      size: `${Math.round(csvContent.length / 1024)} KB`,
    };

    const docRef = await addDoc(reportsRef, reportDoc);

    if (format === "CSV") {
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${reportType.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.csv"`,
          "X-Report-ID": docRef.id,
        },
      });
    }

    // Generate PDF
    if (format === "PDF") {
      const pdfBuffer = generatePDF(reportData, reportType, csvContent);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${reportType.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf"`,
          "X-Report-ID": docRef.id,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: String(error) },
      { status: 500 }
    );
  }
}
