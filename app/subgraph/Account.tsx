'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

export const getInvestorQuery = (investorId: string) => gql`{
  investor(id: "${investorId}") {
    challengeId
    createdAtTimestamp
    updatedAtTimestamp
    investor
    seedMoneyUSD
    currentUSD
    tokens
    tokensAmount
    tokensDecimals
    tokensSymbols
    profitUSD
    profitRatio
  }
}`

export interface InvestorData {
  investor: {
    challengeId: string
    createdAtTimestamp: string
    updatedAtTimestamp: string
    investor: string
    seedMoneyUSD: string
    currentUSD: string
    tokens: string[]
    tokensAmount: string[]
    tokensDecimals: string[]
    tokensSymbols: string[]
    profitUSD: string
    profitRatio: string
  }
}

export function useInvestorData(challengeId: string, walletAddress: string) {
  const investorId = `${challengeId}-${walletAddress.toUpperCase()}`
  return useQuery<InvestorData>({
    queryKey: ['investor', investorId],
    queryFn: async () => {
      return await request(SUBGRAPH_URL, getInvestorQuery(investorId), {}, headers)
    },
    refetchInterval: 60000, // Refetch every 60 seconds (1 minute)
    staleTime: 45000, // Consider data fresh for 45 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  })
}