import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

// GraphQL query for Stele snapshots
export const STELE_SNAPSHOTS_QUERY = gql`
  query GetSteleSnapshots($first: Int!, $orderBy: SteleSnapshot_orderBy!, $orderDirection: OrderDirection!) {
    steleSnapshots(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      date
      rewardRatio
      seedMoney
      entryFee
      maxAssets
      owner
      challengeCounter
      investorCounter
      totalRewardUSD
    }
  }
`

export interface SteleSnapshot {
  id: string
  date: string
  rewardRatio: string[]
  seedMoney: string
  entryFee: string
  maxAssets: string
  owner: string
  challengeCounter: string
  investorCounter: string
  totalRewardUSD: string
}

export interface SteleSnapshotsData {
  steleSnapshots: SteleSnapshot[]
}

export function useSteleSnapshots(limit: number = 30) {
  return useQuery<SteleSnapshotsData>({
    queryKey: ['steleSnapshots', limit],
    queryFn: async () => {
      return await request(
        SUBGRAPH_URL, 
        STELE_SNAPSHOTS_QUERY, 
        {
          first: limit,
          orderBy: 'date',
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