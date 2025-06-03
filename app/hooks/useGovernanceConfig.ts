import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { GOVERNANCE_CONTRACT_ADDRESS } from '@/lib/constants'
import GovernorABI from '@/app/abis/SteleGovernor.json'

interface GovernanceConfig {
  votingPeriod: number // in blocks
  votingDelay: number // in blocks
  proposalThreshold: string // in wei
  quorumNumerator: number
  quorumDenominator: number
}

export const useGovernanceConfig = () => {
  const { data: config, isLoading, error, refetch } = useQuery<GovernanceConfig>({
    queryKey: ['governanceConfig'],
    queryFn: async () => {
      // Add delay to prevent overwhelming RPC
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 1000))

      const rpcUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
        ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
        : 'https://mainnet.base.org'
        
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const governanceContract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, provider)

      // Fetch all governance parameters in parallel
      const [
        votingPeriod,
        votingDelay,
        proposalThreshold,
        quorumNumerator,
        quorumDenominator
      ] = await Promise.all([
        governanceContract.votingPeriod(),
        governanceContract.votingDelay(),
        governanceContract.proposalThreshold(),
        governanceContract.quorumNumerator(),
        governanceContract.quorumDenominator()
      ])

      const governanceConfig: GovernanceConfig = {
        votingPeriod: Number(votingPeriod),
        votingDelay: Number(votingDelay),
        proposalThreshold: proposalThreshold.toString(),
        quorumNumerator: Number(quorumNumerator),
        quorumDenominator: Number(quorumDenominator)
      }

      return governanceConfig
    },
    staleTime: 15 * 60 * 1000, // Governance config rarely changes - keep fresh for 15 minutes
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
    retry: 1, // Reduce retry attempts
    retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 60000), // Longer delay between retries
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: false, // Only refetch if data is stale
  })

  return {
    config,
    isLoading,
    error: error?.message || null,
    refetch
  }
} 