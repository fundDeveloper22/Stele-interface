'use client'
import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'

// Hook for getting current block number with global caching
export function useBlockNumber() {
  return useQuery({
    queryKey: ['currentBlockNumber'],
    queryFn: async () => {
      try {
        // Add delay to prevent overwhelming RPC
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 300))
        
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
    staleTime: 2 * 60 * 1000, // Increase to 2 minutes
    refetchInterval: 3 * 60 * 1000, // Increase to 3 minutes
    retry: 1, // Reduce retries
    retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 60000), // Longer delay
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

// Interface for the returned data
export interface BlockNumberInfo {
  blockNumber: number
  timestamp: number
  formattedNumber: string
} 