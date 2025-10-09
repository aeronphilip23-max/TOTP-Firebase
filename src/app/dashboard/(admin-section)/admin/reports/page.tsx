"use client"

import { BarChart3, X } from "lucide-react"
import { useState } from "react"

export default function ReportsTab() {
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState("")

  const handleGenerateReport = () => {
    alert(`Generating ${selectedReportType}...`)
    setShowGenerateReportModal(false)
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
                onClick={() => setShowGenerateReportModal(false)}
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
    </>
  )
}
