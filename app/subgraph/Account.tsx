'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers } from '@/lib/constants'

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
      return await request(url, getInvestorQuery(investorId), {}, headers)
    }
  })
}