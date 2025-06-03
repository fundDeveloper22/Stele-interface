import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Portfolio - Stele",
  description: "View your investment portfolio across all challenges",
}

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
      </div>
      <div className="text-center py-12">
        <h2 className="text-lg font-medium mb-2">Portfolio Overview</h2>
        <p className="text-muted-foreground">
          View your portfolio details by navigating to individual challenges.
        </p>
      </div>
    </div>
  )
} 