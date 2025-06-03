'use client'

import dynamic from 'next/dynamic'
import { Suspense } from "react"

// Dynamically import client components with SSR disabled
const ActiveChallenges = dynamic(
  () => import("@/components/active-challenges").then(mod => ({ default: mod.ActiveChallenges })),
  { ssr: false }
)

const InvestableTokens = dynamic(
  () => import("@/components/investable-tokens").then(mod => ({ default: mod.InvestableTokens })),
  { ssr: false }
)

const TokenStatsOverview = dynamic(
  () => import("@/components/token-stats-overview").then(mod => ({ default: mod.TokenStatsOverview })),
  { ssr: false }
)

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-64 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

export function DashboardClientComponents() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ActiveChallenges showCreateButton={false} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvestableTokens />
        <TokenStatsOverview />
      </div>
    </Suspense>
  )
} 