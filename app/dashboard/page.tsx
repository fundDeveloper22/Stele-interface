'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardClientComponents } from "@/components/DashboardClientComponents"
import { DashboardCharts } from "@/components/dashboard-charts"
import { useActiveChallenges } from '@/app/hooks/useActiveChallenges'

export function DashboardStats() {
  const { data, isLoading, error } = useActiveChallenges();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gray-900/50 border-gray-700/50">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data?.activeChallenges) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-100">Active Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">-</div>
            <div className="flex items-center mt-1 text-sm">
              <span className="text-gray-400">Error loading data</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-100">Active Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-100">{activeChallengesCount}</div>
          <div className="flex items-center mt-1 text-sm">
            <span className="text-gray-400">Currently active</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-100">Total Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-100">{totalParticipants}</div>
          <div className="flex items-center mt-1 text-sm">
            <span className="text-gray-400">Across all challenges</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-100">Earned Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-100">${totalRewards.toFixed(2)}</div>
          <div className="flex items-center mt-1 text-sm">
            <span className="text-gray-400">From all challenges</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">Dashboard</h1>
      </div>
      
      <DashboardCharts />
      <DashboardStats />
      <DashboardClientComponents />
    </div>
  )
} 