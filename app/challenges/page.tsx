import { Metadata } from "next"
import { ActiveChallenges } from "@/components/active-challenges"
import { RecentChallengesTable } from "@/components/recent-challenges-table"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'
import { ACTIVE_CHALLENGES_QUERY } from '@/app/hooks/useActiveChallenges'
import { RECENT_CHALLENGES_QUERY } from '@/app/hooks/useRecentChallenges'

export const metadata: Metadata = {
  title: "Challenges - Stele",
  description: "View and participate in investment challenges",
}

export default async function ChallengesPage() {
  const queryClient = new QueryClient()
  
  // Prefetch active challenges data
  await queryClient.prefetchQuery({
    queryKey: ['activeChallenges'],
    queryFn: async () => {
      return await request(SUBGRAPH_URL, ACTIVE_CHALLENGES_QUERY, {}, headers)
    }
  })

  // Prefetch recent challenges data
  await queryClient.prefetchQuery({
    queryKey: ['recentChallenges'],
    queryFn: async () => {
      return await request(SUBGRAPH_URL, RECENT_CHALLENGES_QUERY, {}, headers)
    }
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Total Challenges</h1>
        </div>
        <RecentChallengesTable />
      </div>
    </HydrationBoundary>
  )
} 