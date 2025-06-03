"use client"

import { 
  createContext, 
  useContext, 
  ReactNode 
} from "react"
import { useQuery } from '@tanstack/react-query'
import { ethers } from "ethers"
import { 
  STELE_CONTRACT_ADDRESS, 
  USDC_DECIMALS,
  BASE_CHAIN_ID
} from "@/lib/constants"
import SteleABI from "@/app/abis/Stele.json"

type EntryFeeContextType = {
  entryFee: string | null
  isLoading: boolean
  error: Error | null
  refresh: () => void
}

const EntryFeeContext = createContext<EntryFeeContextType | undefined>(undefined)

function useEntryFeeQuery() {
  return useQuery<string>({
    queryKey: ['entryFee'],
    queryFn: async () => {
      // Add delay to prevent overwhelming RPC
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
      
      // Create a read-only provider for Base
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
      
      // Create contract instance
      const steleContract = new ethers.Contract(
        STELE_CONTRACT_ADDRESS,
        SteleABI.abi,
        provider
      )
      
      // Call entryFee view function
      const fee = await steleContract.entryFee()
      
      //TODO : remove BigInt(100)
      // Format with appropriate decimals
      const entryFeeInUsd = ethers.parseUnits(fee.toString(), USDC_DECIMALS) / BigInt(100);
      const formattedFee = ethers.formatUnits(entryFeeInUsd, USDC_DECIMALS);

      return formattedFee
    },
    staleTime: 15 * 60 * 1000, // Entry fee rarely changes - keep fresh for 15 minutes
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    retry: 1, // Reduce retry attempts
    retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 60000), // Longer delay between retries
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export function EntryFeeProvider({ children }: { children: ReactNode }) {
  const { data: entryFee, isLoading, error, refetch } = useEntryFeeQuery()

  return (
    <EntryFeeContext.Provider
      value={{
        entryFee: entryFee || null,
        isLoading,
        error: error instanceof Error ? error : null,
        refresh: refetch
      }}
    >
      {children}
    </EntryFeeContext.Provider>
  )
}

export function useEntryFee() {
  const context = useContext(EntryFeeContext)
  
  if (context === undefined) {
    throw new Error("useEntryFee must be used within an EntryFeeProvider")
  }
  
  return context
} 