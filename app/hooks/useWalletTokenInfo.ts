'use client'
import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { STELE_TOKEN_ADDRESS, STELE_DECIMALS } from '@/lib/constants'
import ERC20ABI from '@/app/abis/ERC20.json'
import ERC20VotesABI from '@/app/abis/ERC20Votes.json'
import { RPC_URL } from '@/lib/constants'

// Hook for getting wallet token balance and delegation info
export function useWalletTokenInfo(walletAddress: string | null) {
  return useQuery({
    queryKey: ['walletTokenInfo', walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        return {
          tokenBalance: "0",
          delegatedTo: "",
          formattedBalance: "0"
        }
      }

      try {
        // Use Base public RPC to avoid rate limits
        const rpcUrl = RPC_URL
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        
        // Create contracts
        const tokenContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20ABI.abi, provider)
        const votesContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20VotesABI.abi, provider)

        // Add delay to prevent overwhelming RPC
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

        // Batch both requests together
        const [tokenBalanceResult, delegateAddressResult] = await Promise.allSettled([
          tokenContract.balanceOf(walletAddress),
          votesContract.delegates(walletAddress)
        ])

        // Process token balance
        let tokenBalance = "0"
        let formattedBalance = "0"
        if (tokenBalanceResult.status === 'fulfilled') {
          tokenBalance = tokenBalanceResult.value.toString()
          formattedBalance = ethers.formatUnits(tokenBalanceResult.value, STELE_DECIMALS)
        } else {
          console.error('Error getting token balance:', tokenBalanceResult.reason)
        }

        // Process delegate address
        let delegatedTo = ""
        if (delegateAddressResult.status === 'fulfilled') {
          delegatedTo = delegateAddressResult.value
        } else {
          console.error('Error getting delegate info:', delegateAddressResult.reason)
        }

        return {
          tokenBalance,
          delegatedTo,
          formattedBalance
        }
      } catch (error) {
        console.error('Error fetching wallet token info:', error)
        throw error
      }
    },
    enabled: !!walletAddress, // Only run if wallet address is provided
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (increased from 1 minute)
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes (increased from 5 minutes)
    retry: 1, // Reduce retry attempts from 2 to 1
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 30000), // Longer delay between retries
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: false, // Only refetch if data is stale
  })
}

// Interface for the returned data
export interface WalletTokenInfo {
  tokenBalance: string
  delegatedTo: string
  formattedBalance: string
} 