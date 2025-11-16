"use client"

import { BarChart3, X, Loader2 } from "lucide-react"
import { useState } from "react"

export default function ReportsTab() {
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState("")
  const [reportTitle, setReportTitle] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState("Last 30 days")
  const [selectedFormat, setSelectedFormat] = useState("CSV")
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [showReportPreview, setShowReportPreview] = useState(false)

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

      setShowGenerateReportModal(false)
    } catch (error: any) {
      console.error("Error generating report:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-[oklch(0.18_0.08_250)]">Generate Reports</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Shipment Analysis", description: "Comprehensive analysis of all shipment data and trends" },
            { title: "Inventory Report", description: "Current inventory levels and material usage statistics" },
            { title: "Delayed Shipments", description: "Report on delayed shipments and their causes" },
          ].map((report) => (
            <div
              key={report.title}
              className="bg-white p-6 rounded-lg border border-[oklch(0.88_0_0)] hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-[oklch(0.68_0.19_35)] rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[oklch(0.18_0.08_250)] mb-2">{report.title}</h3>
              <p className="text-sm text-[oklch(0.45_0_0)] mb-4">{report.description}</p>
              <button
                onClick={() => {
                  setSelectedReportType(report.title)
                  setReportTitle("")
                  setShowGenerateReportModal(true)
                }}
                className="w-full px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Generate
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[oklch(0.18_0.08_250)]">Generate Report</h2>
              <button
                onClick={() => setShowGenerateReportModal(false)}
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
                onClick={() => setShowGenerateReportModal(false)}
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
    </>
  )
}
