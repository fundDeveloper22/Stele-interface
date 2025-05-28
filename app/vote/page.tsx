'use client'

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Clock, XCircle, Plus, FileText, Vote as VoteIcon, Loader2 } from "lucide-react"
import { useProposalsData, useActiveProposalsData, useCompletedProposalsData, useMultipleProposalVoteResults, useProposalsByStatus } from "@/app/subgraph/Proposals"
import { STELE_DECIMALS } from "@/lib/constants"
import { ethers } from "ethers"

// Interface for proposal data
interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
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
  
  // Fetch all proposals from subgraph
  const { data: proposalsData, isLoading, error, refetch } = useProposalsData()
  // Fetch active proposals from subgraph
  const { data: activeProposalsData, isLoading: isLoadingActive, error: errorActive, refetch: refetchActive } = useActiveProposalsData()
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
        
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const currentBlock = await provider.getBlock('latest')
      
      if (currentBlock) {
        setCurrentBlockInfo({
          blockNumber: currentBlock.number,
          timestamp: currentBlock.timestamp
        })
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
    
    // Map old status logic to new status types with time-based validation
    const mapOldStatus = (voteStart: string, voteEnd: string): 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated' => {
      if (!currentBlockInfo) {
        // If no block info, use simple time-based logic
        const now = Date.now() / 1000
        const startTime = Number(voteStart)
        const endTime = Number(voteEnd)
        
        if (now < startTime) {
          return 'pending'
        } else if (now >= startTime && now <= endTime) {
          return 'active'
        } else {
          return 'executed' // Default for ended proposals
        }
      }
      
      // Use block-based calculation for more accuracy
      const now = Date.now() / 1000
      const voteStartTimestamp = calculateBlockTimestamp(voteStart)
      const voteEndTimestamp = calculateBlockTimestamp(voteEnd)
      
      if (now < voteStartTimestamp) {
        return 'pending'
      } else if (now >= voteStartTimestamp && now <= voteEndTimestamp) {
        return 'active'
      } else {
        // Voting period has ended - check vote results
        const decisiveVotes = votesFor + votesAgainst
        const forPercentageOfDecisive = decisiveVotes > 0 ? (votesFor / decisiveVotes) * 100 : 0
        
        if (forPercentageOfDecisive > 50 && votesFor > votesAgainst) {
          console.log(`✅ Proposal ${proposalData.proposalId}: PASSED! (${forPercentageOfDecisive.toFixed(1)}% for vs against) -> PENDING_QUEUE`)
          return 'pending_queue' // Vote passed, waiting for queue
        } else {
          console.log(`❌ Proposal ${proposalData.proposalId}: DEFEATED! (${forPercentageOfDecisive.toFixed(1)}% for vs against) -> DEFEATED`)
          return 'defeated' // Vote failed
        }
      }
    }
    
    const status = forceStatus || mapOldStatus(proposalData.voteStart, proposalData.voteEnd)
    
    // Calculate timestamps based on current block info
    const startTimestamp = calculateBlockTimestamp(proposalData.voteStart)
    const endTimestamp = calculateBlockTimestamp(proposalData.voteEnd)

    return {
      id: proposalData.proposalId,
      proposalId: proposalData.proposalId,
      title: details.title || `Proposal #${proposalData.proposalId}`,
      description: details.description,
      proposer: `${proposalData.proposer.slice(0, 6)}...${proposalData.proposer.slice(-4)}`,
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

    // Validate ACTIVE status with time-based logic and vote results
    const validateActiveStatus = (status: string, proposalData: any): string => {
      const upperStatus = status.toUpperCase()
      
      // Keep QUEUED, EXECUTED, CANCELED, and DEFEATED statuses as-is from subgraph
      if (upperStatus === 'QUEUED' || upperStatus === 'EXECUTED' || upperStatus === 'CANCELED' || upperStatus === 'DEFEATED') {
        return upperStatus
      }
      
      // For PENDING and ACTIVE, validate with time-based logic
      if (upperStatus === 'PENDING' || upperStatus === 'ACTIVE') {
        const now = Date.now() / 1000 // Current time in seconds
        
        // Use actual voteStart and voteEnd if available
        if (proposalData.voteStart && proposalData.voteEnd && currentBlockInfo) {
          const voteStartTimestamp = calculateBlockTimestamp(proposalData.voteStart)
          const voteEndTimestamp = calculateBlockTimestamp(proposalData.voteEnd)
          
          if (now < voteStartTimestamp) {
            // Voting hasn't started yet
            console.log(`⏳ Proposal ${proposalData.proposalId}: Voting hasn't started yet`)
            return 'PENDING'
          } else if (now >= voteStartTimestamp && now <= voteEndTimestamp) {
            // Currently in voting period
            console.log(`🗳️ Proposal ${proposalData.proposalId}: Currently in voting period`)
            return 'ACTIVE'
          } else {
            // Voting period has ended - check vote results
            const totalVotes = votesFor + votesAgainst + abstain
            const decisiveVotes = votesFor + votesAgainst
            const forPercentageOfDecisive = decisiveVotes > 0 ? (votesFor / decisiveVotes) * 100 : 0
            
            if (forPercentageOfDecisive > 50 && votesFor > votesAgainst) {
              console.log(`✅ Proposal ${proposalData.proposalId}: PASSED! (${forPercentageOfDecisive.toFixed(1)}% for vs against) -> PENDING_QUEUE`)
              return 'PENDING_QUEUE' // Vote passed, waiting for queue
            } else {
              console.log(`❌ Proposal ${proposalData.proposalId}: DEFEATED! (${forPercentageOfDecisive.toFixed(1)}% for vs against) -> DEFEATED`)
              return 'DEFEATED' // Vote failed
            }
          }
        } else {
          // Fallback: if no voting period info, trust the subgraph status
          console.warn(`⚠️ Proposal ${proposalData.proposalId}: No voting period info, trusting subgraph status: ${upperStatus}`)
          return upperStatus
        }
      }
      
      // For any other status, validate it's a known enum value
      const validStatuses = ['PENDING', 'ACTIVE', 'QUEUED', 'EXECUTED', 'CANCELED', 'DEFEATED']
      if (validStatuses.includes(upperStatus)) {
        return upperStatus
      } else {
        console.warn(`Invalid status from subgraph: ${status}, defaulting to PENDING`)
        return 'PENDING'
      }
    }

    // Map subgraph status to UI status with validation
    const mapStatus = (status: string): 'pending' | 'active' | 'pending_queue' | 'queued' | 'executed' | 'canceled' | 'defeated' => {
      const validatedStatus = validateActiveStatus(status, proposalData)
      
      switch (validatedStatus.toUpperCase()) {
        case 'PENDING':
          return 'pending'
        case 'ACTIVE':
          return 'active'
        case 'PENDING_QUEUE':
          return 'pending_queue' // Proposals that passed voting but not yet queued
        case 'QUEUED':
          return 'queued'
        case 'EXECUTED':
          return 'executed'
        case 'CANCELED':
          return 'canceled'
        case 'DEFEATED':
          return 'defeated' // Proposals that failed the vote
        default:
          console.warn(`Unknown proposal status: ${validatedStatus}`)
          return 'pending' // Default to pending for unknown statuses
      }
    }

    // Calculate more accurate start and end times
    let startTime = createdAt
    let endTime = createdAt // Default to creation time
    
    // Use actual voting period if available (most accurate)
    if (proposalData.voteStart && proposalData.voteEnd && currentBlockInfo) {
      const voteStartTimestamp = calculateBlockTimestamp(proposalData.voteStart)
      const voteEndTimestamp = calculateBlockTimestamp(proposalData.voteEnd)
      startTime = new Date(voteStartTimestamp * 1000)
      endTime = new Date(voteEndTimestamp * 1000)
    } else {
      // Use actual timestamps if available
      if (queuedAt) {
        endTime = queuedAt
      } else if (executedAt) {
        endTime = executedAt
      } else {
        // Only use 7-day fallback as last resort
        endTime = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    }

    return {
      id: proposalData.proposalId,
      proposalId: proposalData.proposalId,
      title: details.title || `Proposal #${proposalData.proposalId}`,
      description: details.description,
      proposer: `${proposalData.proposer.slice(0, 6)}...${proposalData.proposer.slice(-4)}`,
      status: mapStatus(proposalData.status),
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
          // Only show actionable proposals: pending, active, pending_queue, queued, executed
          // Defeated and canceled proposals are not actionable
          const actionableStatuses = ['pending', 'active', 'pending_queue', 'queued', 'executed']
          return actionableStatuses.includes(proposal.status)
        })
        .sort((a: any, b: any) => b.startTime.getTime() - a.startTime.getTime())
      
      console.log('🎯 Processed actionable proposals for Active tab:', processed.length)
      return processed
    }
    
    // Fallback to original data processing
    console.log('📋 Using fallback data (original proposals)')
    if (!activeProposalsData?.proposalCreateds || !currentBlockInfo) return []
    
    return activeProposalsData.proposalCreateds
      .map((proposal) => processProposalData(proposal, 'active'))
      .filter((proposal) => {
        // Only show actionable proposals: pending, active, pending_queue, queued, executed
        // Defeated and canceled proposals are not actionable
        const actionableStatuses = ['pending', 'active', 'pending_queue', 'queued', 'executed']
        return actionableStatuses.includes(proposal.status)
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

  // Status badge component with detailed status display
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏳ Pending
          </div>
        )
      case 'ACTIVE':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            🗳️ Voting
          </div>
        )
      case 'PENDING_QUEUE':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            ⏳ Pending Queue
          </div>
        )
      case 'QUEUED':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            🔄 Queued
          </div>
        )
      case 'EXECUTED':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✨ Executed
          </div>
        )
      case 'DEFEATED':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ❌ Defeated
          </div>
        )
      case 'CANCELED':
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            🚫 Canceled
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </div>
        )
    }
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
      proposer: proposal.proposer,
      status: proposal.status,
      startTime: proposal.startTime.toISOString(),
      endTime: proposal.endTime.toISOString(),
      votesFor: proposal.votesFor.toString(),
      votesAgainst: proposal.votesAgainst.toString(),
      abstain: proposal.abstain.toString(),
      blockTimestamp: proposal.blockTimestamp,
      blockNumber: proposal.blockNumber,
      values: JSON.stringify(proposal.values),
      transactionHash: proposal.transactionHash || ''
    })
    
    return `/vote/${proposal.id}?${params.toString()}`
  }

  if (isLoading || isLoadingActive || isLoadingActionable || isLoadingCompletedByStatus || isLoadingAllByStatus || isLoadingVoteResults || isLoadingBlockInfo) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {isLoadingBlockInfo ? 'Loading block information...' : 'Loading proposals and vote results...'}
        </p>
      </div>
    )
  }

  if ((error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus) && proposals.length === 0 && activeProposals.length === 0 && completedProposals.length === 0) {
    const displayError = error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="font-medium">Error loading proposals</p>
          <p className="text-sm">{displayError?.message || 'Failed to load proposals'}</p>
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

      {(error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md mb-6">
          <p>Warning: {(error || errorActive || errorActionable || errorCompletedByStatus || errorAllByStatus)?.message || 'Failed to load proposals'}</p>
          <p className="text-sm">Showing cached or example data.</p>
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
            📋 Actionable proposals only: ⏳ PENDING • 🗳️ ACTIVE • ⏳ PENDING QUEUE • 🔄 QUEUED • ✨ EXECUTED
            <br />
            🚫 Defeated and canceled proposals are excluded from this view
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeProposals.length > 0 ? (
              activeProposals.map((proposal) => (
                <Card key={proposal.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <StatusBadge status={proposal.status} />
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
                      <Button className="w-full">
                        <VoteIcon className="mr-2 h-4 w-4" />
                        Cast Vote
                      </Button>
                    </Link>
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
                      <StatusBadge status={proposal.status} />
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
                      <StatusBadge status={proposal.status} />
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
                    {proposal.status === 'active' ? (
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