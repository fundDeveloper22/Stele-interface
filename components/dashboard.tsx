import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActiveChallenges } from "@/components/active-challenges"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import DashBoardQuery from '@/app/subgraph/DashBoard'
import { query } from '@/app/subgraph/DashBoard'
import { url, headers } from '@/lib/constants'

export function DashboardStats({ data }: { data: any }) {
  if (!data?.activeChallenges) return null;
  
  const activeChallenges = data.activeChallenges;
  
  // Calculate number of active challenges
  const activeChallengesCount = [
    activeChallenges.one_week_isCompleted === false,
    activeChallenges.one_month_isCompleted === false,
    activeChallenges.three_month_isCompleted === false,
    activeChallenges.six_month_isCompleted === false,
    activeChallenges.one_year_isCompleted === false
  ].filter(Boolean).length;

  // Calculate total number of participants
  const totalParticipants = [
    activeChallenges.one_week_investorCounter,
    activeChallenges.one_month_investorCounter,
    activeChallenges.three_month_investorCounter,
    activeChallenges.six_month_investorCounter,
    activeChallenges.one_year_investorCounter
  ].reduce((sum, count) => sum + (Number(count) || 0), 0);

  // Calculate total reward amount (USD)
  const totalRewards = [
    activeChallenges.one_week_rewardAmountUSD,
    activeChallenges.one_month_rewardAmountUSD,
    activeChallenges.three_month_rewardAmountUSD,
    activeChallenges.six_month_rewardAmountUSD,
    activeChallenges.one_year_rewardAmountUSD
  ].reduce((sum, amount) => sum + (Number(amount) || 0), 0);

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
  await queryClient.prefetchQuery({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
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
    </div>
    </HydrationBoundary>
  )
}
