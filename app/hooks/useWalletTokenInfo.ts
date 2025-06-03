'use client'
import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { STELE_TOKEN_ADDRESS, STELE_DECIMALS } from '@/lib/constants'
import ERC20ABI from '@/app/abis/ERC20.json'
import ERC20VotesABI from '@/app/abis/ERC20Votes.json'

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
        const rpcUrl = 'https://mainnet.base.org'
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        
        // First check if the contract exists at the given address
        const contractCode = await provider.getCode(STELE_TOKEN_ADDRESS)
        if (contractCode === '0x') {
          console.warn(`No contract found at token address: ${STELE_TOKEN_ADDRESS}`)
          return {
            tokenBalance: "0",
            delegatedTo: "0x0000000000000000000000000000000000000000",
            formattedBalance: "0"
          }
        }
        
        // Create contracts
        const tokenContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20ABI.abi, provider)
        const votesContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20VotesABI.abi, provider)

        // Batch both requests together with timeout
        const [tokenBalanceResult, delegateAddressResult] = await Promise.allSettled([
          Promise.race([
            tokenContract.balanceOf(walletAddress),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Token balance call timeout')), 10000))
          ]),
          Promise.race([
            votesContract.delegates(walletAddress),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Delegate call timeout')), 10000))
          ])
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
        let delegatedTo = "0x0000000000000000000000000000000000000000"
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
        // Return default values instead of throwing
        return {
          tokenBalance: "0",
          delegatedTo: "0x0000000000000000000000000000000000000000",
          formattedBalance: "0"
        }
      }
    },
    enabled: !!walletAddress, // Only run if wallet address is provided
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes (token balance doesn't change frequently)
    retry: false, // Disable retry to prevent spam
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Interface for the returned data
export interface WalletTokenInfo {
  tokenBalance: string
  delegatedTo: string
  formattedBalance: string
} 