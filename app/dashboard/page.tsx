import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardClientComponents } from "@/components/DashboardClientComponents"
import { Suspense } from "react"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'
import { ACTIVE_CHALLENGES_QUERY, type ActiveChallengesData } from '@/app/hooks/useActiveChallenges'

// Import the new investable tokens query
const INVESTABLE_TOKENS_QUERY = gql`{
  investableTokens(first: 50, orderBy: symbol, orderDirection: asc, where: { isInvestable: true }, subgraphError: allow) {
    id
    tokenAddress
    decimals
    symbol
    isInvestable
    updatedTimestamp
  }
}`

export function DashboardStats({ data }: { data: any }) {
  if (!data?.activeChallenges) return null;
  
  const activeChallenges = data.activeChallenges;
  
  // Calculate number of active challenges
  const activeChallengesCount = [
    { isCompleted: activeChallenges.one_week_isCompleted, startTime: activeChallenges.one_week_startTime },
    { isCompleted: activeChallenges.one_month_isCompleted, startTime: activeChallenges.one_month_startTime },
    { isCompleted: activeChallenges.three_month_isCompleted, startTime: activeChallenges.three_month_startTime },
    { isCompleted: activeChallenges.six_month_isCompleted, startTime: activeChallenges.six_month_startTime },
    { isCompleted: activeChallenges.one_year_isCompleted, startTime: activeChallenges.one_year_startTime }
  ].filter(challenge => 
    !challenge.isCompleted && challenge.startTime && challenge.startTime !== "0"
  ).length;

  // Calculate total number of participants
  const totalParticipants = 
    Number(activeChallenges.one_week_investorCounter || 0) +
    Number(activeChallenges.one_month_investorCounter || 0) +
    Number(activeChallenges.three_month_investorCounter || 0) +
    Number(activeChallenges.six_month_investorCounter || 0) +
    Number(activeChallenges.one_year_investorCounter || 0);

  // Calculate total reward amount (USD)
  const totalRewards = 
    Number(activeChallenges.one_week_rewardAmountUSD || 0) +
    Number(activeChallenges.one_month_rewardAmountUSD || 0) +
    Number(activeChallenges.three_month_rewardAmountUSD || 0) +
    Number(activeChallenges.six_month_rewardAmountUSD || 0) +
    Number(activeChallenges.one_year_rewardAmountUSD || 0);

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-2xl font-bold">{activeChallengesCount}</div>
            <div className="flex items-center mt-1 text-sm">
            <span className="text-muted-foreground">Currently active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-2xl font-bold">{totalParticipants}</div>
            <div className="flex items-center mt-1 text-sm">
            <span className="text-muted-foreground">Across all challenges</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Earned Rewards</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-2xl font-bold">${totalRewards.toFixed(2)}</div>
            <div className="flex items-center mt-1 text-sm">
            <span className="text-muted-foreground">From all challenges</span>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-48 bg-muted animate-pulse rounded" />
      <div className="h-64 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

export default async function Dashboard() {
  const queryClient = new QueryClient()
  let activeChallengesData: ActiveChallengesData | null = null
  
  try {
    // Prefetch active challenges data using the hook's query
    await queryClient.prefetchQuery({
      queryKey: ['activeChallenges'],
      queryFn: async () => {
        return await request(SUBGRAPH_URL, ACTIVE_CHALLENGES_QUERY, {}, headers)
      }
    })
    
    // Prefetch investable tokens data using the new query
    await queryClient.prefetchQuery({
      queryKey: ['investable-tokens'],
      queryFn: async () => {
        return await request(SUBGRAPH_URL, INVESTABLE_TOKENS_QUERY, {}, headers)
      }
    })

    // Get the data for server-side rendering
    activeChallengesData = await request(SUBGRAPH_URL, ACTIVE_CHALLENGES_QUERY, {}, headers) as ActiveChallengesData
  } catch (error) {
    console.error('Failed to prefetch data:', error)
    // Continue rendering even if prefetch fails
  }
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        
        {/* Render DashboardStats directly on the server */}
        {activeChallengesData && activeChallengesData.activeChallenges && (
          <DashboardStats data={activeChallengesData} />
        )}
        
        <DashboardClientComponents />
      </div>
    </HydrationBoundary>
  )
} 