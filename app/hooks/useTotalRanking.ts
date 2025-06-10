'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { SUBGRAPH_URL } from '@/lib/constants'

const GET_TOTAL_RANKING_QUERY = `
  query GetTotalRanking($first: Int = 100, $orderBy: TotalRanking_orderBy = profitRatio, $orderDirection: OrderDirection = desc) {
    totalRankings(first: $first, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      challengeId
      seedMoney
      user
      score
      profitRatio
      updatedAtTimestamp
    }
  }
`

export interface TotalRankingData {
  id: string
  challengeId: string
  seedMoney: string
  user: string
  score: string
  profitRatio: string
  updatedAtTimestamp: string
}

interface GraphQLResponse {
  totalRankings: TotalRankingData[]
}

export function useTotalRanking() {
  return useQuery({
    queryKey: ['totalRanking'],
    queryFn: async (): Promise<TotalRankingData[]> => {
      try {
        const data = await request<GraphQLResponse>(
          SUBGRAPH_URL,
          GET_TOTAL_RANKING_QUERY,
          { 
            first: 100, 
            orderBy: 'score',
            orderDirection: 'desc'
          }
        )
        
        return data.totalRankings || []
      } catch (error) {
        console.error('Error fetching total ranking data:', error)
        throw error
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
} 