"use client"

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react"
import { ethers } from "ethers"
import { 
  STELE_CONTRACT_ADDRESS, 
  USDC_DECIMALS,
  BASE_CHAIN_ID
} from "@/lib/constants"

type EntryFeeContextType = {
  entryFee: string | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const EntryFeeContext = createContext<EntryFeeContextType | undefined>(undefined)

export function EntryFeeProvider({ children }: { children: ReactNode }) {
  const [entryFee, setEntryFee] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntryFee = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Create a read-only provider for Base
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
      
      // Dynamically import the ABI to avoid issues with SSR
      const SteleABI = await import("@/app/abis/Stele.json")
      
      // Create contract instance
      const steleContract = new ethers.Contract(
        STELE_CONTRACT_ADDRESS,
        SteleABI.default.abi,
        provider
      )
      
      // Call entryFee view function
      const fee = await steleContract.entryFee()
      
      //TODO : remove BigInt(100)
      // Format with appropriate decimals
      const entryFeeInUsd = ethers.parseUnits(fee.toString(), USDC_DECIMALS) / BigInt(100);
      const formattedFee = ethers.formatUnits(entryFeeInUsd, USDC_DECIMALS);

      setEntryFee(formattedFee)
    } catch (err) {
      console.error("Error fetching entry fee:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setEntryFee(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch entry fee on initial load
  useEffect(() => {
    fetchEntryFee()
  }, [])

  // Refresh function to manually trigger a reload
  const refresh = async () => {
    await fetchEntryFee()
  }

  return (
    <EntryFeeContext.Provider
      value={{
        entryFee,
        isLoading,
        error,
        refresh
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