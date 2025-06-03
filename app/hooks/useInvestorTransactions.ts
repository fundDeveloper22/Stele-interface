'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { SUBGRAPH_URL } from '@/lib/constants'

const GET_INVESTOR_TRANSACTIONS_QUERY = `
  query GetInvestorTransactions($challengeId: BigInt!, $userAddress: Bytes!) {
    joins(
      where: { 
        challengeId: $challengeId,
        user: $userAddress
      }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      challengeId
      user
      seedMoney
      blockTimestamp
      transactionHash
    }
    swaps(
      where: { 
        challengeId: $challengeId,
        user: $userAddress
      }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      challengeId
      user
      fromAsset
      toAsset
      fromAmount
      fromPriceUSD
      toPriceUSD
      toAmount
      blockTimestamp
      transactionHash
    }
    registers(
      where: { 
        challengeId: $challengeId,
        user: $userAddress
      }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      challengeId
      user
      performance
      blockTimestamp
      transactionHash
    }
    rewards(
      where: { 
        challengeId: $challengeId,
        user: $userAddress
      }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      challengeId
      user
      rewardAmount
      blockTimestamp
      transactionHash
    }
  }
`

export interface InvestorTransactionData {
  type: 'join' | 'swap' | 'register' | 'reward'
  id: string
  challengeId: string
  user: string
  amount?: string
  details: string
  timestamp: number
  transactionHash: string
}

interface GraphQLResponse {
  joins?: Array<{
    id: string
    challengeId: string
    user: string
    seedMoney: string
    blockTimestamp: string
    transactionHash: string
  }>
  swaps?: Array<{
    id: string
    challengeId: string
    user: string
    fromAsset: string
    toAsset: string
    fromAmount: string
    fromPriceUSD: string
    toPriceUSD: string
    toAmount: string
    blockTimestamp: string
    transactionHash: string
  }>
  registers?: Array<{
    id: string
    challengeId: string
    user: string
    performance: string
    blockTimestamp: string
    transactionHash: string
  }>
  rewards?: Array<{
    id: string
    challengeId: string
    user: string
    rewardAmount: string
    blockTimestamp: string
    transactionHash: string
  }>
}

export function useInvestorTransactions(challengeId: string, walletAddress: string) {
  return useQuery({
    queryKey: ['investorTransactions', challengeId, walletAddress],
    queryFn: async () => {      
      try {
        const data = await request<GraphQLResponse>(SUBGRAPH_URL, GET_INVESTOR_TRANSACTIONS_QUERY, {
          challengeId: challengeId,
          userAddress: walletAddress.toLowerCase() // Ensure lowercase for address matching
        })

        // Check if data is valid
        if (!data) {
          console.error('❌ GraphQL response is null or undefined')
          return []
        }

        // Combine and sort all transactions by timestamp
        const allTransactions: InvestorTransactionData[] = []

        // Process joins
        if (data.joins && Array.isArray(data.joins)) {
          data.joins.forEach((join) => {
            allTransactions.push({
              type: 'join',
              id: join.id,
              challengeId: join.challengeId,
              user: join.user,
              amount: `$${(parseInt(join.seedMoney) / 1e6).toFixed(2)}`, // USDC has 6 decimals
              details: 'Challenge Joined',
              timestamp: parseInt(join.blockTimestamp),
              transactionHash: join.transactionHash,
            })
          })
        }

        // Process swaps
        if (data.swaps && Array.isArray(data.swaps)) {
          data.swaps.forEach((swap) => {
            // Get token symbols from addresses (simplified)
            const getTokenSymbol = (address: string) => {
              const addr = address.toLowerCase()
              if (addr.includes('usdc') || addr === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913') return 'USDC'
              if (addr.includes('eth') || addr === '0x4200000000000000000000000000000000000006') return 'ETH'
              if (addr.includes('dai')) return 'DAI'
              return `${address.slice(0, 6)}...${address.slice(-4)}`
            }

            const fromSymbol = getTokenSymbol(swap.fromAsset)
            const toSymbol = getTokenSymbol(swap.toAsset)

            allTransactions.push({
              type: 'swap',
              id: swap.id,
              challengeId: swap.challengeId,
              user: swap.user,
              amount: `${parseFloat(swap.fromAmount).toFixed(4)} ${fromSymbol}`,
              details: `${fromSymbol} → ${toSymbol}`,
              timestamp: parseInt(swap.blockTimestamp),
              transactionHash: swap.transactionHash,
            })
          })
        }

        // Process registers
        if (data.registers && Array.isArray(data.registers)) {
          data.registers.forEach((register) => {
            allTransactions.push({
              type: 'register',
              id: register.id,
              challengeId: register.challengeId,
              user: register.user,
              amount: `${(parseInt(register.performance) / 100).toFixed(2)}%`,
              details: 'Performance Registered',
              timestamp: parseInt(register.blockTimestamp),
              transactionHash: register.transactionHash,
            })
          })
        }

        // Process rewards
        if (data.rewards && Array.isArray(data.rewards)) {
          data.rewards.forEach((reward) => {
            allTransactions.push({
              type: 'reward',
              id: reward.id,
              challengeId: reward.challengeId,
              user: reward.user,
              amount: `$${(parseInt(reward.rewardAmount) / 1e18).toFixed(2)}`, // Assuming reward is in wei
              details: 'Reward Claimed',
              timestamp: parseInt(reward.blockTimestamp),
              transactionHash: reward.transactionHash,
            })
          })
        }
        // Sort by timestamp (newest first)
        return allTransactions.sort((a, b) => b.timestamp - a.timestamp)
      } catch (error) {
        console.error('❌ Error fetching investor transactions:', error)
 
        // If there's a network error, try to provide more context
        if (error instanceof Error) {
          console.error('Error message:', error.message)
          console.error('Error stack:', error.stack)
        }
        
        // Return empty array instead of throwing to prevent UI crashes
        return []
      }
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    enabled: !!(challengeId && walletAddress), // Only run if both parameters are provided
  })
} 