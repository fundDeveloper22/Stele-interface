'use client'
import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'

// Hook for getting current block number with global caching
export function useBlockNumber() {
  return useQuery({
    queryKey: ['currentBlockNumber'],
    queryFn: async () => {
      try {
        // Try Base public RPC first to avoid rate limits
        const rpcUrl = 'https://mainnet.base.org'
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const blockNumber = await provider.getBlockNumber()
        
        return {
          blockNumber,
          timestamp: Date.now(),
          formattedNumber: blockNumber.toLocaleString()
        }
      } catch (error) {
        console.error('Error fetching block number:', error)
        
        // Fallback to Infura if available
        if (process.env.NEXT_PUBLIC_INFURA_API_KEY) {
          try {
            const infuraUrl = `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
            const fallbackProvider = new ethers.JsonRpcProvider(infuraUrl)
            const blockNumber = await fallbackProvider.getBlockNumber()
            
            return {
              blockNumber,
              timestamp: Date.now(),
              formattedNumber: blockNumber.toLocaleString()
            }
          } catch (fallbackError) {
            console.error('Fallback RPC also failed:', fallbackError)
            throw fallbackError
          }
        }
        throw error
      }
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })
}

// Interface for the returned data
export interface BlockNumberInfo {
  blockNumber: number
  timestamp: number
  formattedNumber: string
} 