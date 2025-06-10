import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

// GraphQL query for recent challenges (last 10)
export const RECENT_CHALLENGES_QUERY = gql`{
  challenges(
    first: 10
    orderBy: startTime
    orderDirection: desc
    where: { startTime_gt: "0" }
  ) {
    id
    challengeId
    challengeType
    startTime
    endTime
    investorCounter
    seedMoney
    entryFee
    rewardAmountUSD
    isActive
    topUsers
    score
  }
}`

export interface RecentChallenge {
  id: string
  challengeId: string
  challengeType: string
  startTime: string
  endTime: string
  investorCounter: string
  seedMoney: string
  entryFee: string
  rewardAmountUSD: string
  isActive: boolean
  topUsers: string[]
  score: string
}

export interface RecentChallengesData {
  challenges: RecentChallenge[]
}

export function useRecentChallenges() {
  return useQuery<RecentChallengesData>({
    queryKey: ['recentChallenges'],
    queryFn: async () => {
      return await request(SUBGRAPH_URL, RECENT_CHALLENGES_QUERY, {}, headers)
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
} 