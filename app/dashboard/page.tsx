'use client'

import { DashboardClientComponents } from "@/components/DashboardClientComponents"
import { DashboardCharts } from "@/components/dashboard-charts"

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
        </div>
        <DashboardCharts />
        <div className="mt-6">
          <DashboardClientComponents />
        </div>
      </div>
    </div>
  )
} 