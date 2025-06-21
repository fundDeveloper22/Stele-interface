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
      <div className="container mx-auto p-6 py-16">
        <div className="max-w-6xl mx-auto space-y-6">
          <RecentChallengesTable />
        </div>
      </div>
    </HydrationBoundary>
  )
} 