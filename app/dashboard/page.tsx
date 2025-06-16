'use client'

import { DashboardClientComponents } from "@/components/DashboardClientComponents"
import { DashboardCharts } from "@/components/dashboard-charts"

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">Dashboard</h1>
      </div>
      <DashboardCharts />
      <DashboardClientComponents />
    </div>
  )
} 