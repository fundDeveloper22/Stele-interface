import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

// GraphQL query for Challenge snapshots
export const CHALLENGE_SNAPSHOTS_QUERY = gql`
  query GetChallengeSnapshots($challengeId: String!, $first: Int!, $orderBy: ChallengeSnapshot_orderBy!, $orderDirection: OrderDirection!) {
    challengeSnapshots(
      where: { challengeId: $challengeId }
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      challengeId
      timestamp
      investorCount
      rewardAmountUSD
      topUsers
      score
    }
  }
`

export interface ChallengeSnapshot {
  id: string
  challengeId: string
  timestamp: string
  investorCount: string
  rewardAmountUSD: string
  topUsers: string[]
  score: string[]
}

export interface ChallengeSnapshotsData {
  challengeSnapshots: ChallengeSnapshot[]
}

export function useChallengeSnapshots(challengeId: string, limit: number = 30) {
  return useQuery<ChallengeSnapshotsData>({
    queryKey: ['challengeSnapshots', challengeId, limit],
    queryFn: async () => {
      return await request(
        SUBGRAPH_URL, 
        CHALLENGE_SNAPSHOTS_QUERY, 
        {
          challengeId,
          first: limit,
          orderBy: 'timestamp',
          orderDirection: 'asc'
        }, 
        headers
      )
    },
    staleTime: 300000, // 5 minutes - snapshots don't change frequently
    gcTime: 600000, // 10 minutes - keep data in cache longer
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!challengeId, // Only run query if challengeId is provided
  })
} 