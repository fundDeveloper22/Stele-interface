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
      
      // First check if the governance contract exists
      const contractCode = await provider.getCode(GOVERNANCE_CONTRACT_ADDRESS)
      if (contractCode === '0x') {
        console.warn(`No contract found at governance address: ${GOVERNANCE_CONTRACT_ADDRESS}`)
        // Set default governance config
        const defaultConfig: GovernanceConfig = {
          votingPeriod: 17280, // ~2 days on Base (2 second blocks)
          votingDelay: 7200,   // ~4 hours on Base
          proposalThreshold: ethers.parseEther("1000").toString(), // 1000 tokens
          quorumNumerator: 4,  // 4%
          quorumDenominator: 100
        }
        setConfig(defaultConfig)
        setError('Governance contract not found, using default configuration')
        return
      }
      
      const governanceContract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, provider)

      // Fetch all governance parameters in parallel with timeout
      const timeout = 15000 // 15 second timeout
      const [
        votingPeriod,
        votingDelay,
        proposalThreshold,
        quorumNumerator,
        quorumDenominator
      ] = await Promise.all([
        Promise.race([
          governanceContract.votingPeriod(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('votingPeriod call timeout')), timeout))
        ]),
        Promise.race([
          governanceContract.votingDelay(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('votingDelay call timeout')), timeout))
        ]),
        Promise.race([
          governanceContract.proposalThreshold(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('proposalThreshold call timeout')), timeout))
        ]),
        Promise.race([
          governanceContract.quorumNumerator(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('quorumNumerator call timeout')), timeout))
        ]),
        Promise.race([
          governanceContract.quorumDenominator(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('quorumDenominator call timeout')), timeout))
        ])
      ])

      const governanceConfig: GovernanceConfig = {
        votingPeriod: Number(votingPeriod),
        votingDelay: Number(votingDelay),
        proposalThreshold: proposalThreshold.toString(),
        quorumNumerator: Number(quorumNumerator),
        quorumDenominator: Number(quorumDenominator)
      }

      setConfig(governanceConfig)

    } catch (err: any) {
      console.error('Error fetching governance config:', err)
      setError(err.message || 'Failed to fetch governance configuration')
      
      // Set default config on error
      const defaultConfig: GovernanceConfig = {
        votingPeriod: 17280, // ~2 days on Base (2 second blocks)
        votingDelay: 7200,   // ~4 hours on Base
        proposalThreshold: ethers.parseEther("1000").toString(), // 1000 tokens
        quorumNumerator: 4,  // 4%
        quorumDenominator: 100
      }
      setConfig(defaultConfig)
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