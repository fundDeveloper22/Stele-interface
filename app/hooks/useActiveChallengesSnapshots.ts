import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

// GraphQL query for Active Challenges snapshots
export const ACTIVE_CHALLENGES_SNAPSHOTS_QUERY = gql`
  query GetActiveChallengesSnapshots($first: Int!, $orderBy: ActiveChallengesSnapshot_orderBy!, $orderDirection: OrderDirection!) {
    activeChallengesSnapshots(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      totalParticipants
      totalRewards
      one_week_investorCounter
      one_week_rewardAmountUSD
      one_month_investorCounter
      one_month_rewardAmountUSD
      three_month_investorCounter
      three_month_rewardAmountUSD
      six_month_investorCounter
      six_month_rewardAmountUSD
      one_year_investorCounter
      one_year_rewardAmountUSD
    }
  }
`

export interface ActiveChallengesSnapshot {
  id: string
  totalParticipants: string
  totalRewards: string
  one_week_investorCounter: string
  one_week_rewardAmountUSD: string
  one_month_investorCounter: string
  one_month_rewardAmountUSD: string
  three_month_investorCounter: string
  three_month_rewardAmountUSD: string
  six_month_investorCounter: string
  six_month_rewardAmountUSD: string
  one_year_investorCounter: string
  one_year_rewardAmountUSD: string
}

export interface ActiveChallengesSnapshotsData {
  activeChallengesSnapshots: ActiveChallengesSnapshot[]
}

export function useActiveChallengesSnapshots(limit: number = 30) {
  return useQuery<ActiveChallengesSnapshotsData>({
    queryKey: ['activeChallengesSnapshots', limit],
    queryFn: async () => {
      return await request(
        SUBGRAPH_URL, 
        ACTIVE_CHALLENGES_SNAPSHOTS_QUERY, 
        {
          first: limit,
          orderBy: 'id',
          orderDirection: 'desc'
        }, 
        headers
      )
    },
    staleTime: 300000, // 5 minutes - snapshots don't change frequently
    gcTime: 600000, // 10 minutes - keep data in cache longer
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
} 