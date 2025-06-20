'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { SUBGRAPH_URL, USDC_DECIMALS } from '@/lib/constants'
import { ethers } from 'ethers'

// Simple test query to check if subgraph is working
const TEST_QUERY = `
  query TestSubgraph {
    creates(first: 1) {
      id
    }
  }
`

const GET_TRANSACTIONS_QUERY = `
  query GetTransactions($challengeId: BigInt!) {
    creates(
      where: { challengeId: $challengeId }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      challengeId
      challengeType
      blockTimestamp
      transactionHash
    }
    joins(
      where: { challengeId: $challengeId }
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
      where: { challengeId: $challengeId }
      orderBy: blockTimestamp
      orderDirection: desc
      first: 50
    ) {
      id
      challengeId
      user
      fromAsset
      fromAssetSymbol
      toAsset
      toAssetSymbol
      fromAmount
      fromPriceUSD
      toPriceUSD
      toAmount
      blockTimestamp
      transactionHash
    }
    registers(
      where: { challengeId: $challengeId }
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
      where: { challengeId: $challengeId }
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

const GET_ALL_TRANSACTIONS_QUERY = `
  query GetAllTransactions {
    creates(
      orderBy: blockTimestamp
      orderDirection: desc
      first: 10
    ) {
      id
      challengeId
      challengeType
      blockTimestamp
      transactionHash
    }
    joins(
      orderBy: blockTimestamp
      orderDirection: desc
      first: 10
    ) {
      id
      challengeId
      user
      seedMoney
      blockTimestamp
      transactionHash
    }
    swaps(
      orderBy: blockTimestamp
      orderDirection: desc
      first: 10
    ) {
      id
      challengeId
      user
      fromAsset
      fromAssetSymbol
      toAsset
      toAssetSymbol
      fromAmount
      fromPriceUSD
      toPriceUSD
      toAmount
      blockTimestamp
      transactionHash
    }
    registers(
      orderBy: blockTimestamp
      orderDirection: desc
      first: 10
    ) {
      id
      challengeId
      user
      performance
      blockTimestamp
      transactionHash
    }
    rewards(
      orderBy: blockTimestamp
      orderDirection: desc
      first: 10
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

export interface TransactionData {
  type: 'create' | 'join' | 'swap' | 'register' | 'reward'
  id: string
  challengeId: string
  user?: string
  amount?: string
  details: string
  timestamp: number
  transactionHash: string
}

interface GraphQLResponse {
  creates?: Array<{
    id: string
    challengeId: string
    challengeType: number
    blockTimestamp: string
    transactionHash: string
  }>
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
    fromAssetSymbol: string
    toAsset: string
    toAssetSymbol: string
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

export function useTransactions(challengeId: string) {
  return useQuery({
    queryKey: ['transactions', challengeId],
    queryFn: async () => {      
      try {
        const data = await request<GraphQLResponse>(SUBGRAPH_URL, GET_TRANSACTIONS_QUERY, {
          challengeId: challengeId
        })

        // Check if data is valid
        if (!data) {
          console.error('❌ GraphQL response is null or undefined')
          return []
        }

        // Combine and sort all transactions by timestamp
        const allTransactions: TransactionData[] = []

        // Process creates
        if (data.creates && Array.isArray(data.creates)) {
          data.creates.forEach((create) => {
            allTransactions.push({
              type: 'create',
              id: create.id,
              challengeId: create.challengeId,
              details: `Challenge Created (Type ${create.challengeType})`,
              timestamp: parseInt(create.blockTimestamp),
              transactionHash: create.transactionHash,
            })
          })
        }

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
            // Use symbol data from subgraph directly, fallback to address parsing if needed
            const fromSymbol = swap.fromAssetSymbol || swap.fromAsset.slice(0, 6) + '...' + swap.fromAsset.slice(-4)
            const toSymbol = swap.toAssetSymbol || swap.toAsset.slice(0, 6) + '...' + swap.toAsset.slice(-4)

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
            
            const performanceValue = parseFloat(ethers.formatUnits(register.performance, USDC_DECIMALS));
            
            allTransactions.push({
              type: 'register',
              id: register.id,
              challengeId: register.challengeId,
              user: register.user,
              amount: performanceValue.toFixed(6), // Show as score value with 6 decimal places
              details: 'Performance Registered',
              timestamp: parseInt(register.blockTimestamp),
              transactionHash: register.transactionHash,
            })
          })
        }

        // Process rewards
        if (data.rewards && Array.isArray(data.rewards)) {
          data.rewards.forEach((reward) => {
            const rewardValue = parseFloat(ethers.formatUnits(reward.rewardAmount, USDC_DECIMALS));
            const userAddress = `${reward.user.slice(0, 6)}...${reward.user.slice(-4)}`;
            
            allTransactions.push({
              type: 'reward',
              id: reward.id,
              challengeId: reward.challengeId,
              user: reward.user,
              amount: `$${rewardValue.toFixed(2)}`, // USDC has 6 decimals
              details: `Reward Claimed → ${userAddress}`,
              timestamp: parseInt(reward.blockTimestamp),
              transactionHash: reward.transactionHash,
            })
          })
        }

        // If no transactions found for this challengeId, let's also try to fetch some general data
        if (allTransactions.length === 0) {          
          try {
            const allData = await request<GraphQLResponse>(SUBGRAPH_URL, GET_ALL_TRANSACTIONS_QUERY) 
            if (allData) {
              // Show what challengeIds are available
              const availableChallengeIds = new Set()
              allData.creates?.forEach(t => availableChallengeIds.add(t.challengeId))
              allData.joins?.forEach(t => availableChallengeIds.add(t.challengeId))
              allData.swaps?.forEach(t => availableChallengeIds.add(t.challengeId))
              allData.registers?.forEach(t => availableChallengeIds.add(t.challengeId))
              allData.rewards?.forEach(t => availableChallengeIds.add(t.challengeId))
            }
          } catch (debugError) {
            console.error('🔍 Could not fetch debug data:', debugError)
          }
        }

        // Sort by timestamp (newest first)
        return allTransactions.sort((a, b) => b.timestamp - a.timestamp)
      } catch (error) {
        console.error('❌ Error fetching transactions:', error)
        
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
    gcTime: 300000, // 5 minutes,
  })
}