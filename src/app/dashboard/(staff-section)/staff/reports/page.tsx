"use client"

import { FileText, Download, TrendingUp, X, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { db } from "@/src/lib/firebase"
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore"

export default function ReportsPage() {
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState("")
  const [reportTitle, setReportTitle] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState("Last 30 days")
  const [selectedFormat, setSelectedFormat] = useState("CSV")
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [showReportPreview, setShowReportPreview] = useState(false)
  const [recentReports, setRecentReports] = useState<any[]>([
    { id: "1", name: "Q4 Shipment Analysis", date: "2024-01-10", size: "2.4 MB", type: "Shipment Analysis" },
    { id: "2", name: "December Inventory", date: "2024-01-05", size: "1.8 MB", type: "Inventory Report" },
    { id: "3", name: "Delayed Shipments Dec", date: "2024-01-03", size: "890 KB", type: "Delayed Shipments" },
  ])
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedDownloadReport, setSelectedDownloadReport] = useState<any>(null)

  const reportTypes = [
    {
      title: "Shipment Analysis",
      description: "Comprehensive analysis of all shipment data and trends",
      icon: TrendingUp,
    },
    {
      title: "Inventory Report",
      description: "Current inventory levels and material usage statistics",
      icon: FileText,
    },
    {
      title: "Delayed Shipments",
      description: "Report on delayed shipments and their causes",
      icon: FileText,
    },
  ]

  const handleGenerateClick = (reportType: string) => {
    setSelectedReportType(reportType)
    setReportTitle("")
    setShowGenerateModal(true)
  }

  // Fetch recent reports from Firestore
  useEffect(() => {
    const fetchRecentReports = async () => {
      try {
        const reportsRef = collection(db, "reports")
        const q = query(reportsRef, orderBy("createdAt", "desc"), limit(5))
        const snapshot = await getDocs(q)
        const reports = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().title,
          date: doc.data().createdAt?.toDate().toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
          size: doc.data().size || "~1.2 MB",
          type: doc.data().type,
          format: doc.data().format || "CSV",
          content: doc.data().content,
        }))
        setRecentReports(reports)
      } catch (error) {
        console.error("Error fetching recent reports:", error)
      }
    }

    fetchRecentReports()
  }, [])

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      alert("Please select a report type")
      return
    }

    if (!reportTitle.trim()) {
      alert("Please enter a report title")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: selectedReportType,
          dateRange: selectedDateRange,
          format: selectedFormat,
          reportTitle: reportTitle,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate report")
      }

      // Add to recent reports from Firestore
      const newReport = {
        name: reportTitle,
        date: new Date().toISOString().split("T")[0],
        size: "~1.2 MB",
        type: selectedReportType,
      }
      setRecentReports(prevReports => {
        const updated = [newReport, ...prevReports];
        return updated.slice(0, 5);
      })

      if (selectedFormat === "CSV") {
        // Download CSV directly
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${selectedReportType.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else if (selectedFormat === "PDF") {
        // Download PDF directly
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${selectedReportType.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      setShowGenerateModal(false)
    } catch (error: any) {
      console.error("Error generating report:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadReport = async (report: any) => {
    if (!report.id || !report.content) {
      setSelectedDownloadReport({ ...report, error: "Report data not available for download" })
      setShowDownloadModal(true)
      return
    }

    setDownloadingReportId(report.id)
    try {
      // Determine file type based on report format or regenerate from API if needed
      // Since recent reports store CSV content, we need to fetch the actual format
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: report.type,
          dateRange: "Last 30 days",
          format: report.format || "CSV",
          reportTitle: report.name,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to download report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const extension = report.format === "PDF" ? "pdf" : "csv"
      a.download = `${report.name.replace(/ /g, "_")}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // Show success modal
      setSelectedDownloadReport({ ...report, success: true })
      setShowDownloadModal(true)
    } catch (error) {
      console.error("Error downloading report:", error)
      setSelectedDownloadReport({ ...report, error: "Error downloading report" })
      setShowDownloadModal(true)
    } finally {
      setDownloadingReportId(null)
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold text-[oklch(0.18_0.08_250)]">Reports</h1>

      {/* Generate reports */}
      <div>
        <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-4">Generate Report</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <div
                key={report.title}
                className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-[oklch(0.68_0.19_35)] rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[oklch(0.18_0.08_250)] mb-2">{report.title}</h3>
                <p className="text-sm text-[oklch(0.45_0_0)] mb-4">{report.description}</p>
                <button
                  onClick={() => handleGenerateClick(report.title)}
                  className="w-full px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
                >
                  Generate
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent reports */}
      <div>
        <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)] mb-4">Recent Reports</h2>
        <div className="bg-white rounded-lg border border-[oklch(0.88_0_0)]">
          {recentReports.map((report, index) => (
            <div
              key={report.name}
              className={`flex items-center justify-between p-4 ${
                index !== recentReports.length - 1 ? "border-b border-[oklch(0.88_0_0)]" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-[oklch(0.68_0.19_35)]" />
                <div>
                  <h3 className="font-medium text-[oklch(0.18_0.08_250)]">{report.name}</h3>
                  <p className="text-sm text-[oklch(0.45_0_0)]">
                    {report.date} • {report.size}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedDownloadReport(report)
                  setShowDownloadModal(true)
                }}
                disabled={downloadingReportId === report.id}
                className="flex items-center gap-2 px-4 py-2 text-[oklch(0.68_0.19_35)] hover:bg-[oklch(0.96_0_0)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingReportId === report.id ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Downloading
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Generate Report</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Report Type</label>
                <input
                  type="text"
                  value={selectedReportType}
                  readOnly
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg bg-[oklch(0.96_0_0)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Report Title *</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter a name for this report"
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Date Range</label>
                <select 
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>Last year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Format</label>
                <select 
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]"
                >
                  <option value="CSV">CSV</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showReportPreview && reportData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">{reportData.reportType} Preview</h2>
              <button
                onClick={() => {
                  setShowReportPreview(false)
                  setReportData(null)
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <pre className="bg-[oklch(0.96_0_0)] p-4 rounded-lg overflow-x-auto text-sm text-[oklch(0.18_0.08_250)] whitespace-pre-wrap break-words">
                {JSON.stringify(reportData.data, null, 2)}
              </pre>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReportPreview(false)
                  setReportData(null)
                }}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const element = document.createElement("a")
                  const file = new Blob([reportData.csvContent], { type: "text/csv" })
                  element.href = URL.createObjectURL(file)
                  element.download = `${reportData.reportType.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
                  document.body.appendChild(element)
                  element.click()
                  document.body.removeChild(element)
                }}
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Download as CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Report Modal */}
      {showDownloadModal && selectedDownloadReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">
                {selectedDownloadReport.success ? "Download Complete" : selectedDownloadReport.error ? "Download Error" : "Download Report"}
              </h2>
              <button
                onClick={() => {
                  setShowDownloadModal(false)
                  setSelectedDownloadReport(null)
                }}
                className="text-[oklch(0.45_0_0)] hover:text-[oklch(0.18_0.08_250)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {selectedDownloadReport.error ? (
                <p className="text-sm text-red-600">{selectedDownloadReport.error}</p>
              ) : selectedDownloadReport.success ? (
                <div className="text-center">
                  <div className="text-green-600 mb-2">✓</div>
                  <p className="text-sm text-[oklch(0.45_0_0)]">
                    Report "{selectedDownloadReport.name}" has been downloaded successfully.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[oklch(0.45_0_0)] mb-4">
                    Download report: <strong>{selectedDownloadReport.name}</strong>
                  </p>
                  <p className="text-sm text-[oklch(0.45_0_0)]">
                    Type: {selectedDownloadReport.type}
                  </p>
                  <p className="text-sm text-[oklch(0.45_0_0)]">
                    Date: {selectedDownloadReport.date}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDownloadModal(false)
                  setSelectedDownloadReport(null)
                }}
                className="flex-1 px-4 py-2 border border-[oklch(0.88_0_0)] rounded-lg hover:bg-[oklch(0.96_0_0)] transition-colors"
              >
                {selectedDownloadReport.success || selectedDownloadReport.error ? "Close" : "Cancel"}
              </button>
              {!selectedDownloadReport.success && !selectedDownloadReport.error && (
                <button
                  onClick={() => {
                    handleDownloadReport(selectedDownloadReport)
                    setShowDownloadModal(false)
                  }}
                  className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
