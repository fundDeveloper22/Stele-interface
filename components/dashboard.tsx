import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActiveChallenges } from "@/components/active-challenges"
import { InvestableTokens } from "@/components/investable-tokens"
import { TokenStatsOverview } from "@/components/token-stats-overview"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import DashBoardQuery from '@/app/subgraph/DashBoard'
import { query } from '@/app/subgraph/DashBoard'
import { url, headers } from '@/lib/constants'

// Import the new investable tokens query
const INVESTABLE_TOKENS_QUERY = gql`{
  tokens(first: 50, orderBy: symbol, orderDirection: asc, where: { isInvestable: true }, subgraphError: allow) {
    id
    tokenAddress
    decimals
    symbol
    isInvestable
    updatedTimestamp
  }
}`

export function DashboardStats({ data }: { data: any }) {
  if (!data?.challenges) return null;
  
  const challenges = data.challenges;
  
  // Calculate number of active challenges
  const activeChallengesCount = challenges.filter((challenge: any) => 
    !challenge.isCompleted && challenge.startTime && challenge.startTime !== "0"
  ).length;

  // Calculate total number of participants
  const totalParticipants = challenges.reduce((sum: number, challenge: any) => 
    sum + (Number(challenge.investorCounter) || 0), 0
  );

  // Calculate total reward amount (USD)
  const totalRewards = challenges.reduce((sum: number, challenge: any) => 
    sum + (Number(challenge.rewardAmountUSD) || 0), 0
  );

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

export async function Dashboard() {
  const queryClient = new QueryClient()
  
  // Prefetch dashboard data
  await queryClient.prefetchQuery({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })
  
  // Prefetch investable tokens data using the new query
  await queryClient.prefetchQuery({
    queryKey: ['investable-tokens'],
    async queryFn() {
      return await request(url, INVESTABLE_TOKENS_QUERY, {}, headers)
    }
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <DashBoardQuery />
        <ActiveChallenges />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InvestableTokens />
          <TokenStatsOverview />
        </div>
      </div>
    </HydrationBoundary>
  )
}
