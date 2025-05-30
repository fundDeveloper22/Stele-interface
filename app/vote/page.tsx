'use client'

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Clock, XCircle, Plus, FileText, Vote as VoteIcon, Loader2 } from "lucide-react"
import { useProposalsData, useActiveProposalsData, useMultipleProposalVoteResults, useProposalsByStatus } from "@/app/subgraph/Proposals"
import { BASE_BLOCK_TIME_MS, STELE_DECIMALS } from "@/lib/constants"
import { ethers } from "ethers"
import { useGovernanceConfig } from "@/app/hooks/useGovernanceConfig"
import { useBlockNumber } from "@/app/hooks/useBlockNumber"
import { useWalletTokenInfo } from "@/app/hooks/useWalletTokenInfo"

// Interface for proposal data
interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  fullProposer?: string;
  status: 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated';
  votesFor: number;
  votesAgainst: number;
  abstain: number;
  startTime: Date;
  endTime: Date;
  proposalId: string;
  blockTimestamp: string;
  blockNumber: string;
  values: string[];
  transactionHash: string;
}

export default function VotePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([])
  const [completedProposals, setCompletedProposals] = useState<Proposal[]>([])
  
  // Fetch governance configuration from smart contract
  const { config: governanceConfig, isLoading: isLoadingGovernanceConfig, error: governanceConfigError } = useGovernanceConfig()
  
  // Get current block number with global caching
  const { data: blockInfo, isLoading: isLoadingBlockNumber } = useBlockNumber()

  // Get wallet token info with global caching
  const { data: walletTokenInfo, isLoading: isLoadingWalletTokenInfo } = useWalletTokenInfo(walletAddress)

  // Fetch all proposals from subgraph
  const { data: proposalsData, isLoading, error, refetch } = useProposalsData()
  // Fetch active proposals from subgraph with cached block number
  const { data: activeProposalsData, isLoading: isLoadingActive, error: errorActive, refetch: refetchActive } = useActiveProposalsData(blockInfo?.blockNumber)
  // Fetch actionable proposals for Active tab (PENDING, ACTIVE, QUEUED, EXECUTED)
  const { data: actionableProposals, isLoading: isLoadingActionable, error: errorActionable, refetch: refetchActionable } = useProposalsByStatus(['PENDING', 'ACTIVE', 'QUEUED', 'EXECUTED'])
  // Fetch completed proposals for Completed tab (EXECUTED only)
  const { data: completedProposalsByStatus, isLoading: isLoadingCompletedByStatus, error: errorCompletedByStatus, refetch: refetchCompletedByStatus } = useProposalsByStatus(['EXECUTED'])
  // Fetch all proposals for All Proposals tab (all valid statuses)
  const { data: allProposalsByStatus, isLoading: isLoadingAllByStatus, error: errorAllByStatus, refetch: refetchAllByStatus } = useProposalsByStatus(['PENDING', 'ACTIVE', 'QUEUED', 'EXECUTED', 'CANCELED'])
  
  // Get all proposal IDs for fetching vote results
  const allProposalIds = [
    ...(proposalsData?.proposalCreateds?.map(p => p.proposalId) || []),
    ...(activeProposalsData?.proposalCreateds?.map(p => p.proposalId) || [])
  ].filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
  
  // Fetch vote results for all proposals
  const { data: voteResultsData, isLoading: isLoadingVoteResults } = useMultipleProposalVoteResults(allProposalIds)
  
  // State for current block info (for timestamp calculation)
  const [currentBlockInfo, setCurrentBlockInfo] = useState<{blockNumber: number, timestamp: number} | null>(null)
  const [isLoadingBlockInfo, setIsLoadingBlockInfo] = useState(false)

  // Get current block info from RPC (called only once)
  const getCurrentBlockInfo = async () => {
    if (currentBlockInfo || isLoadingBlockInfo) return // Prevent multiple calls
    
    setIsLoadingBlockInfo(true)
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
        ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
        : 'https://mainnet.base.org'
        
      console.log(`🌐 Fetching current block info from: ${rpcUrl}`)
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const currentBlock = await provider.getBlock('latest')
      
      if (currentBlock) {
        const blockInfo = {
          blockNumber: currentBlock.number,
          timestamp: currentBlock.timestamp
        }
        console.log(`📦 Current Block Info:`, {
          blockNumber: blockInfo.blockNumber,
          timestamp: blockInfo.timestamp,
          currentTime: new Date(blockInfo.timestamp * 1000).toLocaleString(),
          rpcUrl: rpcUrl.includes('infura') ? 'Infura' : 'Base RPC'
        })
        setCurrentBlockInfo(blockInfo)
      }
    } catch (error) {
      console.error('Error getting current block info:', error)
    } finally {
      setIsLoadingBlockInfo(false)
    }
  }

  // Calculate timestamp for any block number based on current block info
  const calculateBlockTimestamp = (targetBlockNumber: string): number => {
    if (!currentBlockInfo) return 0
    
    const targetBlock = parseInt(targetBlockNumber)
    const blockDifference = targetBlock - currentBlockInfo.blockNumber
    
    // Base mainnet has ~2 second block time
    const BLOCK_TIME_SECONDS = 2
    const estimatedTimestamp = currentBlockInfo.timestamp + (blockDifference * BLOCK_TIME_SECONDS)
    
    // Debug logging for setToken - cbBTC proposal
    if (targetBlockNumber === '30728178' || Math.abs(blockDifference) > 1000000) {
      console.log(`🔍 Block Timestamp Calculation Debug:`, {
        targetBlockNumber,
        targetBlock,
        currentBlockNumber: currentBlockInfo.blockNumber,
        currentTimestamp: currentBlockInfo.timestamp,
        currentTime: new Date(currentBlockInfo.timestamp * 1000).toLocaleString(),
        blockDifference,
        blockDifferenceHours: (blockDifference * BLOCK_TIME_SECONDS / 3600).toFixed(1),
        estimatedTimestamp,
        estimatedTime: new Date(estimatedTimestamp * 1000).toLocaleString(),
        isReasonable: Math.abs(blockDifference) < 1000000 // Less than ~23 days worth of blocks
      })
    }
    
    return estimatedTimestamp
  }

  // Load wallet address when page loads
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setIsConnected(true)
    }
  }, [])

  // Get current block info on page load (only once)
  useEffect(() => {
    getCurrentBlockInfo()
  }, [])

  // Parse proposal details from description
  const parseProposalDetails = (description: string) => {
    // Usually descriptions are in format "Title: Description"
    const parts = description.split(':')
    let title = ''
    let desc = description

    if (parts.length > 1) {
      title = parts[0].trim()
      desc = parts.slice(1).join(':').trim()
    }

    return { title, description: desc }
  }

  // Simple status determination - since active proposals are filtered by subgraph,
  // we just need basic logic for all proposals view
  const getProposalStatus = (voteStart: string, voteEnd: string): 'active' | 'completed' | 'rejected' => {
    // For simplicity, we'll use timestamp-based logic here
    // The accurate filtering is done in the subgraph for active proposals
    const now = Date.now() / 1000
    const startTime = Number(voteStart)
    const endTime = Number(voteEnd)
    
    if (now < startTime) {
      return 'active' // Pending/upcoming
    } else if (now >= startTime && now <= endTime) {
      return 'active' // Currently active
    } else {
      return 'completed' // Ended
    }
  }

  // Helper function to process proposal data
  const processProposalData = (proposalData: any, forceStatus?: 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated') => {
    const details = parseProposalDetails(proposalData.description)
    
    // Find vote result for this proposal first
    const voteResult = voteResultsData?.proposalVoteResults?.find(
      result => result.id === proposalData.proposalId
    )
    
    // Convert vote counts from wei to STELE tokens
    const votesFor = voteResult ? parseFloat(ethers.formatUnits(voteResult.forVotes, STELE_DECIMALS)) : 0
    const votesAgainst = voteResult ? parseFloat(ethers.formatUnits(voteResult.againstVotes, STELE_DECIMALS)) : 0
    const abstain = voteResult ? parseFloat(ethers.formatUnits(voteResult.abstainVotes, STELE_DECIMALS)) : 0
    
    // Log data availability for debugging
    console.log(`📊 Proposal ${proposalData.proposalId} data:`, {
      hasAbstainVotes: !!voteResult?.abstainVotes,
      hasValues: !!proposalData.values,
      hasBlockNumber: !!proposalData.blockNumber,
      hasTransactionHash: !!proposalData.transactionHash,
      hasVotingPeriod: !!(proposalData.voteStart && proposalData.voteEnd),
      note: 'blockNumber and transactionHash available in ProposalCreated type',
      availableFields: Object.keys(proposalData),
      voteResultFields: voteResult ? Object.keys(voteResult) : 'no voteResult'
    })
    
    // Calculate timestamps based on current block info
    const startTimestamp = calculateBlockTimestamp(proposalData.voteStart)
    const endTimestamp = calculateBlockTimestamp(proposalData.voteEnd)
    
    // Determine status based on time and vote results
    let status: 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated'
    if (forceStatus) {
      status = forceStatus
    } else if (!currentBlockInfo) {
      // Fallback if no block info available
      status = 'pending'
    } else {
      const now = Date.now() / 1000 // Current time in seconds
      
      if (now < startTimestamp) {
        // Voting hasn't started yet
        status = 'pending'
        console.log(`⏳ Proposal ${proposalData.proposalId}: Voting hasn't started yet (now: ${new Date(now * 1000).toLocaleString()}, start: ${new Date(startTimestamp * 1000).toLocaleString()})`)
      } else if (now >= startTimestamp && now <= endTimestamp) {
        // Currently in voting period
        status = 'active'
        console.log(`🗳️ Proposal ${proposalData.proposalId}: Currently in voting period (now: ${new Date(now * 1000).toLocaleString()}, end: ${new Date(endTimestamp * 1000).toLocaleString()})`)
        
        // Special debug for setToken - cbBTC proposal
        if (proposalData.description?.includes('setToken') || proposalData.description?.includes('cbBTC')) {
          console.log(`🔍 DEBUG setToken-cbBTC Proposal:`, {
            proposalId: proposalData.proposalId,
            now: new Date(now * 1000).toLocaleString(),
            startTime: new Date(startTimestamp * 1000).toLocaleString(),
            endTime: new Date(endTimestamp * 1000).toLocaleString(),
            votesFor,
            votesAgainst,
            abstain,
            timeRemaining: `${((endTimestamp - now) / 3600).toFixed(1)} hours`,
            voteStartBlock: proposalData.voteStart,
            voteEndBlock: proposalData.voteEnd
          })
        }
      } else {
        // Voting period has ended - check vote results
        const totalDecisiveVotes = votesFor + votesAgainst
        
        if (totalDecisiveVotes === 0) {
          // No votes cast - consider defeated
          status = 'defeated'
          console.log(`❌ Proposal ${proposalData.proposalId}: No votes cast -> DEFEATED`)
        } else if (votesFor > votesAgainst) {
          // More votes for than against - passed
          status = 'pending_queue'
          console.log(`✅ Proposal ${proposalData.proposalId}: PASSED! (${votesFor.toLocaleString()} for vs ${votesAgainst.toLocaleString()} against) -> PENDING_QUEUE`)
        } else {
          // More votes against or tied - defeated
          status = 'defeated'
          console.log(`❌ Proposal ${proposalData.proposalId}: DEFEATED! (${votesFor.toLocaleString()} for vs ${votesAgainst.toLocaleString()} against) -> DEFEATED`)
        }
      }
    }

    return {
      id: proposalData.proposalId,
      proposalId: proposalData.proposalId,
      title: details.title || `Proposal #${proposalData.proposalId}`,
      description: details.description,
      proposer: `${proposalData.proposer.slice(0, 6)}...${proposalData.proposer.slice(-4)}`,
      fullProposer: proposalData.proposer, // Store full proposer address
      status,
      votesFor,
      votesAgainst,
      abstain,
      startTime: new Date(startTimestamp * 1000),
      endTime: new Date(endTimestamp * 1000),
      blockTimestamp: proposalData.blockTimestamp,
      blockNumber: proposalData.blockNumber,
      values: proposalData.values,
      transactionHash: proposalData.transactionHash
    }
  }

  // Helper function to process status-based proposal data (new format with voteResult)
  const processStatusBasedProposalData = (proposalData: any) => {
    const details = parseProposalDetails(proposalData.description)
    
    // Convert vote counts from wei to STELE tokens
    const votesFor = proposalData.voteResult ? parseFloat(ethers.formatUnits(proposalData.voteResult.forVotes, STELE_DECIMALS)) : 0
    const votesAgainst = proposalData.voteResult ? parseFloat(ethers.formatUnits(proposalData.voteResult.againstVotes, STELE_DECIMALS)) : 0
    const abstain = proposalData.voteResult?.abstainVotes ? parseFloat(ethers.formatUnits(proposalData.voteResult.abstainVotes, STELE_DECIMALS)) : 0
    
    // Log data availability for debugging
    console.log(`📊 Proposal ${proposalData.proposalId} data:`, {
      hasAbstainVotes: !!proposalData.voteResult?.abstainVotes,
      hasValues: !!proposalData.values,
      hasBlockNumber: !!proposalData.blockNumber,
      hasTransactionHash: !!proposalData.transactionHash,
      hasVotingPeriod: !!(proposalData.voteStart && proposalData.voteEnd),
      note: 'blockNumber and transactionHash not available in Proposal type',
      availableFields: Object.keys(proposalData),
      voteResultFields: proposalData.voteResult ? Object.keys(proposalData.voteResult) : 'no voteResult'
    })
    
    // Parse timestamps from the createdAt field
    const createdAt = new Date(parseInt(proposalData.createdAt) * 1000)
    const queuedAt = proposalData.queuedAt ? new Date(parseInt(proposalData.queuedAt) * 1000) : null
    const executedAt = proposalData.executedAt ? new Date(parseInt(proposalData.executedAt) * 1000) : null
    const canceledAt = proposalData.canceledAt ? new Date(parseInt(proposalData.canceledAt) * 1000) : null
    
    // Calculate voting period - prioritize actual voteStart/voteEnd blocks if available
    let startTime: Date
    let endTime: Date
    
    if (proposalData.voteStart && proposalData.voteEnd && currentBlockInfo) {
      // Use actual voting period from blockchain data
      const startTimestamp = calculateBlockTimestamp(proposalData.voteStart)
      const endTimestamp = calculateBlockTimestamp(proposalData.voteEnd)
      startTime = new Date(startTimestamp * 1000)
      endTime = new Date(endTimestamp * 1000)
      console.log(`🎯 Proposal ${proposalData.proposalId}: Using actual voting period from blocks ${proposalData.voteStart} to ${proposalData.voteEnd}`)
    } else {
      // Fallback to estimated periods based on status and timestamps
      // Use actual governance config if available, otherwise use default estimates
      const votingPeriodBlocks = governanceConfig?.votingPeriod || 21600 // Default: ~3 days at 2 sec/block
      const votingDelayBlocks = governanceConfig?.votingDelay || 7200 // Default: ~1 day at 2 sec/block
      
      // Convert blocks to milliseconds (Base mainnet: ~2 seconds per block)
      const votingPeriodMs = votingPeriodBlocks * BASE_BLOCK_TIME_MS
      const votingDelayMs = votingDelayBlocks * BASE_BLOCK_TIME_MS
      
      if (proposalData.status === 'PENDING') {
        // For pending proposals, voting hasn't started yet
        startTime = new Date(createdAt.getTime() + votingDelayMs)
        endTime = new Date(startTime.getTime() + votingPeriodMs)
      } else if (proposalData.status === 'ACTIVE') {
        // For active proposals, voting is ongoing
        startTime = new Date(createdAt.getTime() + votingDelayMs)
        endTime = new Date(startTime.getTime() + votingPeriodMs)
      } else if (proposalData.status === 'QUEUED' && queuedAt) {
        // For queued proposals, voting has ended
        startTime = new Date(createdAt.getTime() + votingDelayMs)
        endTime = new Date(queuedAt.getTime() - 24 * 60 * 60 * 1000) // Assume queued 1 day after voting ended
      } else if (proposalData.status === 'EXECUTED' && executedAt) {
        // For executed proposals, use execution time to work backwards
        const totalProcessTime = votingDelayMs + votingPeriodMs + (3 * 24 * 60 * 60 * 1000) // voting delay + voting period + 3 days processing
        startTime = new Date(executedAt.getTime() - totalProcessTime)
        endTime = new Date(executedAt.getTime() - (3 * 24 * 60 * 60 * 1000)) // 3 days from vote end to execution
      } else if (proposalData.status === 'CANCELED' && canceledAt) {
        // For canceled proposals
        startTime = new Date(createdAt.getTime() + votingDelayMs)
        endTime = new Date(canceledAt.getTime())
      } else {
        // Default fallback
        startTime = new Date(createdAt.getTime() + votingDelayMs)
        endTime = new Date(startTime.getTime() + votingPeriodMs)
      }
      
      const configSource = governanceConfig ? 'smart contract' : 'default estimates'
      console.log(`⚠️ Proposal ${proposalData.proposalId}: Using estimated voting period from ${configSource} (${votingPeriodBlocks} blocks = ${(votingPeriodMs / (24 * 60 * 60 * 1000)).toFixed(1)} days)`)
    }
    
    // Validate and correct status based on current time and vote results
    const validateStatus = (subgraphStatus: string): 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated' => {
      // For final states (EXECUTED, CANCELED), trust the subgraph
      if (subgraphStatus === 'EXECUTED') return 'executed'
      if (subgraphStatus === 'CANCELED') return 'canceled'
      if (subgraphStatus === 'QUEUED') return 'queued'
      
      // For other states, validate with time-based logic
      const now = Date.now() / 1000 // Current time in seconds
      const startTimestamp = startTime.getTime() / 1000
      const endTimestamp = endTime.getTime() / 1000
      
      if (now < startTimestamp) {
        // Voting hasn't started yet
        console.log(`⏳ Proposal ${proposalData.proposalId}: Voting hasn't started yet (subgraph: ${subgraphStatus}) -> PENDING`)
        return 'pending'
      } else if (now >= startTimestamp && now <= endTimestamp) {
        // Currently in voting period
        console.log(`🗳️ Proposal ${proposalData.proposalId}: Currently in voting period (subgraph: ${subgraphStatus}) -> ACTIVE`)
        
        // Special debug for setToken - cbBTC proposal
        if (proposalData.description?.includes('setToken') || proposalData.description?.includes('cbBTC')) {
          console.log(`🔍 DEBUG setToken-cbBTC Proposal (Status-based):`, {
            proposalId: proposalData.proposalId,
            subgraphStatus,
            now: new Date(now * 1000).toLocaleString(),
            startTime: new Date(startTimestamp * 1000).toLocaleString(),
            endTime: new Date(endTimestamp * 1000).toLocaleString(),
            votesFor,
            votesAgainst,
            abstain,
            timeRemaining: `${((endTimestamp - now) / 3600).toFixed(1)} hours`,
            hasVoteStartEnd: !!(proposalData.voteStart && proposalData.voteEnd),
            voteStartBlock: proposalData.voteStart,
            voteEndBlock: proposalData.voteEnd
          })
        }
        
        return 'active'
      } else {
        // Voting period has ended - check vote results
        const totalDecisiveVotes = votesFor + votesAgainst
        
        if (totalDecisiveVotes === 0) {
          // No votes cast - consider defeated
          console.log(`❌ Proposal ${proposalData.proposalId}: No votes cast (subgraph: ${subgraphStatus}) -> DEFEATED`)
          return 'defeated'
        } else if (votesFor > votesAgainst) {
          // More votes for than against - should be pending queue or higher
          if (subgraphStatus === 'DEFEATED') {
            console.log(`✅ Proposal ${proposalData.proposalId}: Vote passed but subgraph shows DEFEATED, correcting to PENDING_QUEUE`)
            return 'pending_queue'
          }
          // If subgraph shows PENDING_QUEUE or higher, trust it
          const mappedStatus = mapStatus(subgraphStatus)
          console.log(`✅ Proposal ${proposalData.proposalId}: Vote passed (${votesFor.toLocaleString()} for vs ${votesAgainst.toLocaleString()} against), subgraph: ${subgraphStatus} -> ${mappedStatus.toUpperCase()}`)
          return mappedStatus
        } else {
          // More votes against or tied - defeated
          console.log(`❌ Proposal ${proposalData.proposalId}: Vote failed (${votesFor.toLocaleString()} for vs ${votesAgainst.toLocaleString()} against), subgraph: ${subgraphStatus} -> DEFEATED`)
          return 'defeated'
        }
      }
    }
    
    // Map status from subgraph to our internal status
    const mapStatus = (status: string): 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated' => {
      switch (status) {
        case 'PENDING': return 'pending'
        case 'ACTIVE': return 'active'
        case 'PENDING_QUEUE': return 'pending_queue'
        case 'QUEUED': return 'queued'
        case 'EXECUTED': return 'executed'
        case 'CANCELED': return 'canceled'
        case 'DEFEATED': return 'defeated'
        default: return 'pending'
      }
    }

    const validatedStatus = validateStatus(proposalData.status)

    return {
      id: proposalData.proposalId,
      proposalId: proposalData.proposalId,
      title: details.title || `Proposal #${proposalData.proposalId}`,
      description: details.description,
      proposer: `${proposalData.proposer.slice(0, 6)}...${proposalData.proposer.slice(-4)}`,
      fullProposer: proposalData.proposer, // Store full proposer address
      status: validatedStatus,
      votesFor,
      votesAgainst,
      abstain,
      startTime,
      endTime,
      blockTimestamp: proposalData.createdAt,
      blockNumber: proposalData.blockNumber || proposalData.voteStart || proposalData.createdAt || '',
      values: proposalData.values || [],
      transactionHash: proposalData.transactionHash || `proposal-${proposalData.proposalId}`
    }
  }

  // Process all proposals data using useMemo
  const processedProposals = useMemo(() => {
    // Use status-based data if available, otherwise fall back to original data
    if (allProposalsByStatus?.proposals && allProposalsByStatus.proposals.length > 0) {
      const processed = allProposalsByStatus.proposals
        .map((proposal: any) => processStatusBasedProposalData(proposal))
        .sort((a: any, b: any) => b.startTime.getTime() - a.startTime.getTime())
      
      console.log('🎯 Processed all proposals with accurate statuses:', processed.length)
      return processed
    }
    
    // Fallback to original data processing (with time-based status estimation)
    console.log('📋 Using fallback data for all proposals (time-based status)')
    if (!proposalsData?.proposalCreateds || !currentBlockInfo) return []
    
    return proposalsData.proposalCreateds
      .map((proposal) => processProposalData(proposal))
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
  }, [allProposalsByStatus?.proposals, proposalsData?.proposalCreateds, voteResultsData?.proposalVoteResults, currentBlockInfo])

  // Process active proposals data using useMemo (prioritize status-based data if available)
  const processedActiveProposals = useMemo(() => {
    // Use actionable proposals data if available, otherwise fall back to original data
    if (actionableProposals?.proposals && actionableProposals.proposals.length > 0) {
      const processed = actionableProposals.proposals
        .map((proposal: any) => processStatusBasedProposalData(proposal))
        .filter((proposal: any) => {
          // Show actionable proposals and defeated proposals (so users can see vote results)
          // Only exclude canceled proposals
          const visibleStatuses = ['pending', 'active', 'pending_queue', 'queued', 'executed', 'defeated']
          return visibleStatuses.includes(proposal.status)
        })
        .sort((a: any, b: any) => b.startTime.getTime() - a.startTime.getTime())
      
      console.log('🎯 Processed actionable proposals for Active tab:', processed.length)
      return processed
    }
    
    // Fallback to original data processing
    console.log('📋 Using fallback data (original proposals)')
    if (!activeProposalsData?.proposalCreateds || !currentBlockInfo) return []
    
    return activeProposalsData.proposalCreateds
      .map((proposal) => processProposalData(proposal))
      .filter((proposal: any) => {
        // Show actionable proposals and defeated proposals (so users can see vote results)
        // Only exclude canceled proposals
        const visibleStatuses = ['pending', 'active', 'pending_queue', 'queued', 'executed', 'defeated']
        return visibleStatuses.includes(proposal.status)
      })
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
  }, [actionableProposals?.proposals, activeProposalsData?.proposalCreateds, voteResultsData?.proposalVoteResults, currentBlockInfo])

  // Process completed proposals data using useMemo
  const processedCompletedProposals = useMemo(() => {
    // Only use status-based data that contains actual EXECUTED proposals from subgraph
    if (completedProposalsByStatus?.proposals && completedProposalsByStatus.proposals.length > 0) {
      const processed = completedProposalsByStatus.proposals
        .map((proposal: any) => processStatusBasedProposalData(proposal))
        .filter((proposal: any) => proposal.status === 'executed') // Only show executed proposals
        .sort((a: any, b: any) => b.startTime.getTime() - a.startTime.getTime())
      
      console.log('🎯 Processed executed proposals for Completed tab:', processed.length)
      return processed
    }
    
    // No fallback - only show proposals that are actually EXECUTED in subgraph
    console.log('📋 No executed proposals found in subgraph')
    return []
  }, [completedProposalsByStatus?.proposals, currentBlockInfo])

  // Update state when processed data changes
  useEffect(() => {
    setProposals(processedProposals)
  }, [processedProposals])

  useEffect(() => {
    setActiveProposals(processedActiveProposals)
  }, [processedActiveProposals])

  useEffect(() => {
    setCompletedProposals(processedCompletedProposals)
  }, [processedCompletedProposals])

  // Helper function to determine if voting is currently active
  const isVotingActive = (proposal: Proposal): boolean => {
    const now = Date.now()
    const startTime = proposal.startTime.getTime()
    const endTime = proposal.endTime.getTime()
    
    // Voting is active if current time is between start and end time
    return now >= startTime && now <= endTime
  }

  // Status badge component with real-time status calculation
  const StatusBadge = ({ proposal }: { proposal: Proposal }) => {
    // Calculate real-time status based on current time and vote results
    const now = Date.now()
    const startTime = proposal.startTime.getTime()
    const endTime = proposal.endTime.getTime()
    const votesFor = proposal.votesFor
    const votesAgainst = proposal.votesAgainst
    
    let realTimeStatus: string
    let statusColor: string
    let statusIcon: string
    let statusText: string
    
    // For final states (EXECUTED, CANCELED, QUEUED), trust the stored status
    if (proposal.status === 'executed') {
      realTimeStatus = 'EXECUTED'
      statusColor = 'bg-green-100 text-green-800'
      statusIcon = '✨'
      statusText = 'Executed'
    } else if (proposal.status === 'canceled') {
      realTimeStatus = 'CANCELED'
      statusColor = 'bg-gray-100 text-gray-800'
      statusIcon = '🚫'
      statusText = 'Canceled'
    } else if (proposal.status === 'queued') {
      realTimeStatus = 'QUEUED'
      statusColor = 'bg-blue-100 text-blue-800'
      statusIcon = '🔄'
      statusText = 'Queued'
    } else {
      // Calculate status based on time and vote results
      if (now < startTime) {
        // Voting hasn't started yet
        realTimeStatus = 'PENDING'
        statusColor = 'bg-yellow-100 text-yellow-800'
        statusIcon = '⏳'
        statusText = 'Pending'
      } else if (now >= startTime && now <= endTime) {
        // Currently in voting period
        realTimeStatus = 'ACTIVE'
        statusColor = 'bg-green-100 text-green-800'
        statusIcon = '🗳️'
        statusText = 'Voting'
      } else {
        // Voting period has ended - check vote results
        const totalDecisiveVotes = votesFor + votesAgainst
        
        if (totalDecisiveVotes === 0) {
          // No votes cast - consider defeated
          realTimeStatus = 'DEFEATED'
          statusColor = 'bg-red-100 text-red-800'
          statusIcon = '❌'
          statusText = 'Defeated'
        } else if (votesFor > votesAgainst) {
          // More votes for than against - passed, pending queue
          realTimeStatus = 'PENDING_QUEUE'
          statusColor = 'bg-orange-100 text-orange-800'
          statusIcon = '⏳'
          statusText = 'Pending Queue'
        } else {
          // More votes against or tied - defeated
          realTimeStatus = 'DEFEATED'
          statusColor = 'bg-red-100 text-red-800'
          statusIcon = '❌'
          statusText = 'Defeated'
        }
      }
    }
    
    // Debug logging for setToken - cbBTC proposal
    if (proposal.description?.includes('setToken') || proposal.description?.includes('cbBTC')) {
      console.log(`🔍 StatusBadge Real-time Calculation:`, {
        proposalId: proposal.id,
        now: new Date(now).toLocaleString(),
        startTime: new Date(startTime).toLocaleString(),
        endTime: new Date(endTime).toLocaleString(),
        votesFor,
        votesAgainst,
        storedStatus: proposal.status,
        calculatedStatus: realTimeStatus,
        timeUntilStart: startTime > now ? `${((startTime - now) / (1000 * 60 * 60)).toFixed(1)} hours` : 'started',
        timeUntilEnd: endTime > now ? `${((endTime - now) / (1000 * 60 * 60)).toFixed(1)} hours` : 'ended',
        timeSinceEnd: endTime < now ? `${((now - endTime) / (1000 * 60 * 60)).toFixed(1)} hours ago` : 'not ended'
      })
    }

    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
        {statusIcon} {statusText}
      </div>
    )
  }

  // Progress bar component
  const ProgressBar = ({ votesFor, votesAgainst, abstain }: { votesFor: number, votesAgainst: number, abstain: number }) => {
    const total = votesFor + votesAgainst + abstain
    
    // Avoid division by zero
    if (total === 0) {
      return (
        <div className="w-full mt-2">
          <div className="flex w-full h-2 bg-gray-200 rounded-full overflow-hidden"></div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-green-600">0% For</span>
            <span className="text-red-600">0% Against</span>
            <span className="text-gray-500">0% Abstain</span>
          </div>
        </div>
      )
    }
    
    const forPercentage = (votesFor / total) * 100
    const againstPercentage = (votesAgainst / total) * 100
    const abstainPercentage = (abstain / total) * 100

    return (
      <div className="w-full mt-2">
        <div className="flex w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="bg-green-500" style={{ width: `${forPercentage}%` }}></div>
          <div className="bg-red-500" style={{ width: `${againstPercentage}%` }}></div>
          <div className="bg-gray-400" style={{ width: `${abstainPercentage}%` }}></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-green-600">{Math.round(forPercentage)}% For</span>
          <span className="text-red-600">{Math.round(againstPercentage)}% Against</span>
          <span className="text-gray-500">{Math.round(abstainPercentage)}% Abstain</span>
        </div>
      </div>
    )
  }
  
  // Format date in a readable way
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Create URL with proposal data as query parameters
  const createProposalUrl = (proposal: Proposal) => {
    const params = new URLSearchParams({
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.fullProposer || proposal.proposer, // Use full proposer address if available
      status: proposal.status,
      startTime: proposal.startTime.toISOString(),
      endTime: proposal.endTime.toISOString(),
      votesFor: proposal.votesFor.toString(),
      votesAgainst: proposal.votesAgainst.toString(),
      abstain: proposal.abstain.toString(),
      blockTimestamp: proposal.blockTimestamp,
      blockNumber: proposal.blockNumber,
      values: JSON.stringify(proposal.values),
      transactionHash: proposal.transactionHash || '',
      // Add cached token info to avoid RPC requests in detail page
      tokenBalance: walletTokenInfo?.formattedBalance || '0',
      delegatedTo: walletTokenInfo?.delegatedTo || ''
    })
    
    return `/vote/${proposal.id}?${params.toString()}`
  }

  if (isLoading || isLoadingActive || isLoadingActionable || isLoadingCompletedByStatus || isLoadingAllByStatus || isLoadingVoteResults || isLoadingBlockNumber || isLoadingGovernanceConfig || isLoadingWalletTokenInfo) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {isLoadingBlockNumber ? 'Loading block information...' : 
           isLoadingGovernanceConfig ? 'Loading governance configuration...' :
           isLoadingWalletTokenInfo ? 'Loading wallet token information...' :
           'Loading proposals and vote results...'}
        </p>
      </div>
    )
  }

  if ((error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus || governanceConfigError) && proposals.length === 0 && activeProposals.length === 0 && completedProposals.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error?.message || 'Failed to load data'}</p>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => {
            refetch()
            refetchActive()
            refetchActionable()
            refetchCompletedByStatus()
            refetchAllByStatus()
          }}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Governance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            refetch()
            refetchActive()
            refetchActionable()
            refetchCompletedByStatus()
            refetchAllByStatus()
          }} disabled={isLoading || isLoadingActive || isLoadingActionable || isLoadingCompletedByStatus || isLoadingAllByStatus}>
            <Clock className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/vote/create">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Proposal
            </Button>
          </Link>
        </div>
      </div>

      {/* Wallet Token Info Card */}
      {isConnected && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Connected Wallet</h3>
                <p className="text-sm font-mono">{walletAddress}</p>
              </div>
              
              {isLoadingWalletTokenInfo ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading token info...</span>
                </div>
              ) : walletTokenInfo ? (
                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Balance: </span>
                    <span className="font-mono">{Number(walletTokenInfo.formattedBalance).toLocaleString()} STELE</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>Delegated to: </span>
                    {walletTokenInfo.delegatedTo === "0x0000000000000000000000000000000000000000" ? (
                      <span className="text-orange-600">Not delegated</span>
                    ) : walletTokenInfo.delegatedTo === walletAddress ? (
                      <span className="text-green-600">Self</span>
                    ) : (
                      <span className="font-mono">{walletTokenInfo.delegatedTo.slice(0, 6)}...{walletTokenInfo.delegatedTo.slice(-4)}</span>
                    )}
                  </div>
                  {/* Voting Power Status */}
                  <div className="text-xs">
                    {walletTokenInfo.delegatedTo === "0x0000000000000000000000000000000000000000" ? (
                      <span className="text-orange-600">⚠️ Delegate tokens to vote</span>
                    ) : Number(walletTokenInfo.formattedBalance) > 0 ? (
                      <span className="text-green-600">✅ Ready to vote</span>
                    ) : (
                      <span className="text-gray-500">No STELE tokens</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Token info unavailable</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Connection Prompt */}
      {!isConnected && (
        <Card className="mb-6 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Wallet Not Connected</h3>
                <p className="text-xs text-muted-foreground">Connect your wallet to view token balance and vote on proposals</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-orange-600">🔗 Please connect your wallet</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus || governanceConfigError) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md mb-6">
          <p>Warning: {(() => {
            const displayError = error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus || governanceConfigError
            return typeof displayError === 'string' ? displayError : displayError?.message || 'Failed to load data'
          })()}</p>
          <p className="text-sm">
            {governanceConfigError ? 'Using default governance parameters. ' : ''}
            Showing cached or example data.
          </p>
        </div>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Proposals</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="mb-4 text-sm text-muted-foreground">
            📋 Active and recent proposals: ⏳ PENDING • 🗳️ VOTING • ⏳ PENDING QUEUE • 🔄 QUEUED • ✨ EXECUTED • ❌ DEFEATED
            <br />
            🚫 Only canceled proposals are excluded from this view
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeProposals.length > 0 ? (
              activeProposals.map((proposal) => (
                <Card key={proposal.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <StatusBadge proposal={proposal} />
                    </div>
                    <CardDescription className="line-clamp-2">{proposal.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ProgressBar 
                      votesFor={proposal.votesFor} 
                      votesAgainst={proposal.votesAgainst} 
                      abstain={proposal.abstain}
                    />
                    <div className="mt-4 text-sm space-y-1">
                      <p>Proposer: {proposal.proposer}</p>
                      <p>Vote Start: {formatDate(proposal.startTime)}</p>
                      <p>Vote End: {formatDate(proposal.endTime)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {isVotingActive(proposal) ? (
                      <Link href={createProposalUrl(proposal)} className="w-full">
                        <Button className="w-full">
                          <VoteIcon className="mr-2 h-4 w-4" />
                          Cast Vote
                        </Button>
                      </Link>
                    ) : (
                      <Link href={createProposalUrl(proposal)} className="w-full">
                        <Button variant="outline" className="w-full">
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                No active proposals found.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="mb-4 text-sm text-muted-foreground">
            ✨ Successfully executed proposals only
            <br />
            📋 These proposals have passed voting and been fully implemented
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedProposals.length > 0 ? (
              completedProposals.map((proposal) => (
                <Card key={proposal.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <StatusBadge proposal={proposal} />
                    </div>
                    <CardDescription className="line-clamp-2">{proposal.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ProgressBar 
                      votesFor={proposal.votesFor} 
                      votesAgainst={proposal.votesAgainst} 
                      abstain={proposal.abstain}
                    />
                    <div className="mt-4 text-sm space-y-1">
                      <p>Proposer: {proposal.proposer}</p>
                      <p>Vote Start: {formatDate(proposal.startTime)}</p>
                      <p>Vote End: {formatDate(proposal.endTime)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={createProposalUrl(proposal)} className="w-full">
                      <Button variant="outline" className="w-full">
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                No completed proposals found.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="mb-4 text-sm text-muted-foreground">
            📋 All proposals with accurate statuses: ⏳ PENDING • 🗳️ ACTIVE • ⏳ PENDING QUEUE • 🔄 QUEUED • ✨ EXECUTED • ❌ DEFEATED • 🚫 CANCELED
            <br />
            🎯 Status reflects actual governance state with time-based validation
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {proposals.length > 0 ? (
              proposals.map((proposal) => (
                <Card key={proposal.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <StatusBadge proposal={proposal} />
                    </div>
                    <CardDescription className="line-clamp-2">{proposal.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ProgressBar 
                      votesFor={proposal.votesFor} 
                      votesAgainst={proposal.votesAgainst} 
                      abstain={proposal.abstain}
                    />
                    <div className="mt-4 text-sm space-y-1">
                      <p>Proposer: {proposal.proposer}</p>
                      <p>Vote Start: {formatDate(proposal.startTime)}</p>
                      <p>Vote End: {formatDate(proposal.endTime)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {isVotingActive(proposal) ? (
                      <Link href={createProposalUrl(proposal)} className="w-full">
                        <Button className="w-full">
                          <VoteIcon className="mr-2 h-4 w-4" />
                          Cast Vote
                        </Button>
                      </Link>
                    ) : (
                      <Link href={createProposalUrl(proposal)} className="w-full">
                        <Button variant="outline" className="w-full">
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-muted-foreground">
                No proposals found.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 