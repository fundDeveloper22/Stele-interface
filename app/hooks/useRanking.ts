'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { SUBGRAPH_URL } from '@/lib/constants'

const GET_RANKING_QUERY = `
  query GetRanking($challengeId: String!) {
    ranking(id: $challengeId) {
      id
      challengeId
      topUsers
      scores
      updatedAtTimestamp
      updatedAtBlockNumber
      updatedAtTransactionHash
    }
  }
`

export interface RankingData {
  id: string
  challengeId: string
  topUsers: string[]
  scores: string[]
  updatedAtTimestamp: string
  updatedAtBlockNumber: string
  updatedAtTransactionHash: string
}

interface GraphQLResponse {
  ranking?: RankingData
}

export function useRanking(challengeId: string) {
  return useQuery({
    queryKey: ['ranking', challengeId],
    queryFn: async (): Promise<RankingData | null> => {
      try {
        const data = await request<GraphQLResponse>(
          SUBGRAPH_URL,
          GET_RANKING_QUERY,
          { challengeId }
        )
        
        return data.ranking || null
      } catch (error) {
        console.error('Error fetching ranking data:', error)
        throw error
      }
    },
    enabled: !!challengeId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
} 