'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'

export const getInvestableTokensQuery = () => gql`{
  investableTokens(first: 30, orderBy: id, orderDirection: asc, where: { isInvestable: true }, subgraphError: allow) {
    id
    tokenAddress
    decimals
    symbol
    isInvestable
    updatedTimestamp
  }
}`

export interface TokenData {
    id: string
    tokenAddress: string
    decimals: string
    symbol: string
  isInvestable: boolean
    updatedTimestamp: string
  }

export interface TokensData {
  investableTokens: TokenData[]
}

export function useTokensData() {
  return useQuery<TokensData>({
    queryKey: ['tokens'],
    queryFn: async () => {
      return await request(SUBGRAPH_URL, getInvestableTokensQuery(), {}, headers)
    }
  })
}