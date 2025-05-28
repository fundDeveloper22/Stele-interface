import { useState, useEffect } from 'react'
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
  const [config, setConfig] = useState<GovernanceConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGovernanceConfig = async () => {
    if (config || isLoading) return // Prevent multiple calls

    setIsLoading(true)
    setError(null)

    try {
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

      setConfig(governanceConfig)
      
      console.log('🏛️ Governance Config Loaded:', {
        votingPeriod: `${governanceConfig.votingPeriod} blocks`,
        votingDelay: `${governanceConfig.votingDelay} blocks`,
        proposalThreshold: `${ethers.formatEther(governanceConfig.proposalThreshold)} ETH`,
        quorum: `${governanceConfig.quorumNumerator}/${governanceConfig.quorumDenominator} (${(governanceConfig.quorumNumerator / governanceConfig.quorumDenominator * 100).toFixed(2)}%)`
      })

    } catch (err: any) {
      console.error('Error fetching governance config:', err)
      setError(err.message || 'Failed to fetch governance configuration')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGovernanceConfig()
  }, [])

  return {
    config,
    isLoading,
    error,
    refetch: fetchGovernanceConfig
  }
} 