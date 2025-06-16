import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

// GraphQL query for Investor snapshots
export const INVESTOR_SNAPSHOTS_QUERY = gql`
  query GetInvestorSnapshots($challengeId: String!, $investor: Bytes!, $first: Int!, $orderBy: InvestorSnapshot_orderBy!, $orderDirection: OrderDirection!) {
    investorSnapshots(
      where: { challengeId: $challengeId, investor: $investor }
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      challengeId
      timestamp
      investor
      seedMoneyUSD
      currentUSD
      tokens
      tokensAmount
      tokensDecimals
      tokensSymbols
      profitRatio
    }
  }
`

export interface InvestorSnapshot {
  id: string
  challengeId: string
  timestamp: string
  investor: string
  seedMoneyUSD: string
  currentUSD: string
  tokens: string[]
  tokensAmount: string[]
  tokensDecimals: string[]
  tokensSymbols: string[]
  profitRatio: string
}

export interface InvestorSnapshotsData {
  investorSnapshots: InvestorSnapshot[]
}

export function useInvestorSnapshots(challengeId: string, investor: string, limit: number = 30) {
  return useQuery<InvestorSnapshotsData>({
    queryKey: ['investorSnapshots', challengeId, investor, limit],
    queryFn: async () => {
      return await request(
        SUBGRAPH_URL, 
        INVESTOR_SNAPSHOTS_QUERY, 
        {
          challengeId,
          investor,
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
    enabled: !!(challengeId && investor), // Only run query if both challengeId and investor are provided
  })
} 