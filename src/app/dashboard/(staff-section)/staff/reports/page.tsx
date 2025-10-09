"use client"

import { FileText, Download, TrendingUp, X } from "lucide-react"
import { useState } from "react"

export default function ReportsPage() {
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState("")

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

  const recentReports = [
    { name: "Q4 Shipment Analysis", date: "2024-01-10", size: "2.4 MB" },
    { name: "December Inventory", date: "2024-01-05", size: "1.8 MB" },
    { name: "Delayed Shipments Dec", date: "2024-01-03", size: "890 KB" },
  ]

  const handleGenerateClick = (reportTitle: string) => {
    setSelectedReportType(reportTitle)
    setShowGenerateModal(true)
  }

  const handleGenerateReport = () => {
    alert(`Generating ${selectedReportType}...`)
    setShowGenerateModal(false)
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
              <button className="flex items-center gap-2 px-4 py-2 text-[oklch(0.68_0.19_35)] hover:bg-[oklch(0.96_0_0)] rounded-lg transition-colors">
                <Download className="h-5 w-5" />
                Download
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
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Date Range</label>
                <select className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>Last year</option>
                  <option>Custom range</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[oklch(0.18_0.08_250)] mb-1">Format</label>
                <select className="w-full px-3 py-2 border border-[oklch(0.88_0_0)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[oklch(0.68_0.19_35)]">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
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
                className="flex-1 px-4 py-2 bg-[oklch(0.68_0.19_35)] text-white rounded-lg hover:bg-[oklch(0.72_0.19_35)] transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
