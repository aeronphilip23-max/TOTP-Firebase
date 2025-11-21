import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
const apps = getApps();
if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

interface ReportRequest {
  reportType: string;
  dateRange: string;
  format: "PDF" | "CSV";
  reportTitle: string;
}

// Helper function to clean undefined values from data
function cleanData(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanData);
  }
  
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanData(value);
      } else {
        cleaned[key] = null; // Replace undefined with null
      }
    }
    return cleaned;
  }
  
  return obj;
}

async function getShipmentAnalysis(dateRange: string) {
  try {
    const shipmentsSnapshot = await db.collection("shipments").get();
    const shipments = shipmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const statuses: { [key: string]: number } = {};
    shipments.forEach((shipment: any) => {
      const status = shipment.status || "UNKNOWN";
      statuses[status] = (statuses[status] || 0) + 1;
    });

    const reportData = {
      totalShipments: shipments.length,
      statusBreakdown: statuses,
      shipments: shipments.map((s: any) => ({
        id: s.id,
        destination: s.destination || "Unknown",
        materials: s.materials || "No materials",
        eta: s.eta || "Unknown",
        status: s.status || "UNKNOWN",
        delayReason: s.delayReason || null,
        lalamoveOrderId: s.lalamoveOrderId || null,
        quantity: s.quantity !== undefined ? s.quantity : 0, 
        createdAt: s.createdAt || new Date().toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    };

    return cleanData(reportData);
  } catch (error) {
    console.error("Error generating shipment analysis:", error);
    throw error;
  }
}

async function getInventoryReport(dateRange: string) {
  try {
    const inventorySnapshot = await db.collection("inventory").get();
    const materials = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lowStockItems = materials.filter((m: any) => (m.quantity || 0) < 10);
    const totalValue = materials.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);

    const reportData = {
      totalMaterials: materials.length,
      totalUnits: totalValue,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map((m: any) => ({
        id: m.id,
        name: m.name || "Unknown Material",
        quantity: m.quantity || 0,
        unit: m.unit || "units",
      })),
      generatedAt: new Date().toISOString(),
    };

    return cleanData(reportData);
  } catch (error) {
    console.error("Error generating inventory report:", error);
    throw error;
  }
}

async function getDelayedShipmentsReport(dateRange: string) {
  try {
    const shipmentsSnapshot = await db.collection("shipments").get();
    const shipments = shipmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get shipments with DELAYED status (including their delay reasons)
    const delayedShipments = shipments.filter((s: any) => s.status === "DELAYED");

    const reportData = {
      totalDelayed: delayedShipments.length,
      delayedShipments: delayedShipments.map((s: any) => ({
        id: s.id,
        destination: s.destination || "Unknown",
        eta: s.eta || "Unknown",
        status: s.status || "DELAYED",
        materials: s.materials || "No materials",
        delayReason: s.delayReason || "No reason provided",
        lalamoveOrderId: s.lalamoveOrderId || null,
        quantity: s.quantity !== undefined ? s.quantity : 0,
        createdAt: s.createdAt || new Date().toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    };

    return cleanData(reportData);
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
    
    // Add detailed shipment data with delay reasons
    csv += "\nDetailed Shipment Data\n";
    csv += "Shipment ID,Destination,Materials,ETA,Status,Delay Reason,Lalamove ID,Quantity,Created At\n";
    data.shipments.forEach((shipment: any) => {
      csv += `${shipment.id},"${shipment.destination}","${shipment.materials}",${shipment.eta},${shipment.status},"${shipment.delayReason || 'N/A'}",${shipment.lalamoveOrderId || 'N/A'},${shipment.quantity || 0},"${shipment.createdAt}"\n`;
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
    csv += "Shipment ID,Destination,ETA,Status,Materials,Delay Reason,Lalamove ID,Quantity,Created At\n";
    data.delayedShipments.forEach((shipment: any) => {
      csv += `${shipment.id},"${shipment.destination}",${shipment.eta},${shipment.status},"${shipment.materials}","${shipment.delayReason}",${shipment.lalamoveOrderId || 'N/A'},${shipment.quantity || 0},"${shipment.createdAt}"\n`;
    });
  }

  return csv;
}

// Enhanced HTML-based PDF generation
function generateHTMLPDF(data: any, reportType: string, reportTitle: string): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>${reportType}</title>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; 
      padding: 20px; 
      color: #333; 
      background: white;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 3px solid #2c5aa0; 
      padding-bottom: 20px; 
    }
    .header h1 { 
      color: #2c5aa0; 
      margin: 0; 
      font-size: 28px;
    }
    .report-info { 
      margin: 10px 0; 
      color: #666; 
      font-size: 14px;
    }
    .summary { 
      background-color: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 25px;
      border-left: 4px solid #2c5aa0;
    }
    .summary h3 { 
      margin-top: 0; 
      color: #2c5aa0;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px; 
      font-size: 12px;
      page-break-inside: auto;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 12px 8px; 
      text-align: left; 
    }
    th { 
      background-color: #2c5aa0; 
      color: white; 
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .delay-reason { 
      max-width: 200px; 
      word-wrap: break-word; 
    }
    .no-data { 
      text-align: center; 
      color: #666; 
      padding: 40px; 
      font-style: italic;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .status-delayed {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-completed {
      background-color: #d1edff;
      color: #0c5460;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    @media print {
      body { margin: 0; padding: 15px; }
      .header { border-bottom: 2px solid #2c5aa0; }
      table { font-size: 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportTitle || reportType}</h1>
    <div class="report-info">
      <p><strong>Report Type:</strong> ${reportType} | <strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Page:</strong> <span class="page-number"></span></p>
    </div>
  </div>
  `;

  if (reportType === "Delayed Shipments") {
    html += `
    <div class="summary">
      <h3>Executive Summary</h3>
      <p><strong>Total Delayed Shipments:</strong> ${data.totalDelayed}</p>
      <p><strong>Report Period:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    `;

    if (data.delayedShipments && data.delayedShipments.length > 0) {
      html += `
      <h3>Delayed Shipments Details</h3>
      <table>
        <thead>
          <tr>
            <th>Shipment ID</th>
            <th>Destination</th>
            <th>Original ETA</th>
            <th>Materials</th>
            <th>Delay Reason</th>
            <th>Lalamove ID</th>
            <th>Quantity</th>
            <th>Created Date</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      data.delayedShipments.forEach((shipment: any) => {
        html += `
          <tr>
            <td><strong>${shipment.id || 'N/A'}</strong></td>
            <td>${shipment.destination || 'Unknown'}</td>
            <td>${shipment.eta || 'Unknown'}</td>
            <td>${shipment.materials || 'No materials'}</td>
            <td class="delay-reason">${shipment.delayReason || 'No reason provided'}</td>
            <td>${shipment.lalamoveOrderId || 'N/A'}</td>
            <td>${shipment.quantity || 0}</td>
            <td>${shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'Unknown'}</td>
          </tr>
        `;
      });
      
      html += `
        </tbody>
      </table>
      `;
    } else {
      html += `
      <div class="no-data">
        <h3>No Delayed Shipments Found</h3>
        <p>There are currently no shipments marked as delayed in the system for the selected period.</p>
      </div>
      `;
    }
  } else if (reportType === "Shipment Analysis") {
    html += `
    <div class="summary">
      <h3>Shipment Overview</h3>
      <p><strong>Total Shipments:</strong> ${data.totalShipments || 0}</p>
      <p><strong>Analysis Period:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <h3>Status Distribution</h3>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
    `;
    
    Object.entries(data.statusBreakdown || {}).forEach(([status, count]: [string, any]) => {
      const percentage = ((count / data.totalShipments) * 100).toFixed(1);
      html += `
        <tr>
          <td>
            <span class="status-badge ${status.toLowerCase() === 'delayed' ? 'status-delayed' : 'status-completed'}">
              ${status}
            </span>
          </td>
          <td>${count}</td>
          <td>${percentage}%</td>
        </tr>
      `;
    });
    
    html += `
      </tbody>
    </table>
    `;

    // Show delayed shipments with reasons
    const delayedShipments = (data.shipments || []).filter((s: any) => s.status === "DELAYED");
    if (delayedShipments.length > 0) {
      html += `
      <h3>Delayed Shipments Analysis (${delayedShipments.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Shipment ID</th>
            <th>Destination</th>
            <th>Delay Reason</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      delayedShipments.forEach((shipment: any) => {
        html += `
          <tr>
            <td>${shipment.id || 'N/A'}</td>
            <td>${shipment.destination || 'Unknown'}</td>
            <td class="delay-reason">${shipment.delayReason || 'No reason provided'}</td>
            <td>${shipment.quantity || 0}</td>
          </tr>
        `;
      });
      
      html += `
        </tbody>
      </table>
      `;
    }
  } else if (reportType === "Inventory Report") {
    html += `
    <div class="summary">
      <h3>Inventory Summary</h3>
      <p><strong>Total Materials:</strong> ${data.totalMaterials || 0}</p>
      <p><strong>Total Units in Stock:</strong> ${data.totalUnits || 0}</p>
      <p><strong>Low Stock Items:</strong> ${data.lowStockCount || 0}</p>
    </div>
    `;

    if (data.lowStockItems && data.lowStockItems.length > 0) {
      html += `
      <h3>Low Stock Items Requiring Attention</h3>
      <table>
        <thead>
          <tr>
            <th>Material ID</th>
            <th>Name</th>
            <th>Current Quantity</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      data.lowStockItems.forEach((item: any) => {
        const status = (item.quantity || 0) < 5 ? 'CRITICAL' : 'LOW';
        html += `
          <tr>
            <td>${item.id || 'N/A'}</td>
            <td>${item.name || 'Unknown Material'}</td>
            <td><strong>${item.quantity || 0}</strong></td>
            <td>${item.unit || 'units'}</td>
            <td>
              <span class="status-badge ${status === 'CRITICAL' ? 'status-delayed' : 'status-completed'}">
                ${status}
              </span>
            </td>
          </tr>
        `;
      });
      
      html += `
        </tbody>
      </table>
      `;
    } else {
      html += `
      <div class="no-data">
        <h3>No Low Stock Items</h3>
        <p>All inventory items are sufficiently stocked.</p>
      </div>
      `;
    }
  }

  html += `
  <div class="footer">
    <p>Generated by Shipment Management System | ${new Date().toLocaleString()} | Confidential</p>
  </div>

  <script>
    // Add page numbers
    document.addEventListener('DOMContentLoaded', function() {
      const pages = document.querySelectorAll('.page-number');
      pages.forEach((page, index) => {
        page.textContent = \`\${index + 1}\`;
      });
    });
  </script>
</body>
</html>`;

  return html;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReportRequest;
    const { reportType, dateRange, format, reportTitle } = body;

    console.log(`📊 Generating ${reportType} report in ${format} format...`);

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

    // Clean the data before saving to Firestore
    const cleanedReportData = cleanData(reportData);

    // Save report to Firestore using Admin SDK
    const reportDoc = {
      title: reportTitle,
      type: reportType,
      dateRange: dateRange,
      format: format,
      content: csvContent,
      data: cleanedReportData, // Use cleaned data
      createdAt: FieldValue.serverTimestamp(),
      size: `${Math.round(csvContent.length / 1024)} KB`,
    };

    console.log("💾 Saving report to Firestore...");
    const docRef = await db.collection("reports").add(reportDoc);
    console.log("✅ Report saved with ID:", docRef.id);

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

    // Generate PDF - using the enhanced HTML version
    if (format === "PDF") {
      const htmlContent = generateHTMLPDF(reportData, reportType, reportTitle);
      
      return new NextResponse(JSON.stringify({
        html: htmlContent,
        reportId: docRef.id,
        filename: `${reportTitle.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Report-ID": docRef.id,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: String(error) },
      { status: 500 }
    );
  }
}