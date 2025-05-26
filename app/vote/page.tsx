'use client'

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Clock, XCircle, Plus, FileText, Vote as VoteIcon, Loader2 } from "lucide-react"
import { useProposalsData, useActiveProposalsData, useCompletedProposalsData, useMultipleProposalVoteResults } from "@/app/subgraph/Proposals"
import { STELE_DECIMALS } from "@/lib/constants"
import { ethers } from "ethers"

// Interface for proposal data
interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'completed' | 'rejected';
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
  // Fetch completed proposals from subgraph
  const { data: completedProposalsData, isLoading: isLoadingCompleted, error: errorCompleted, refetch: refetchCompleted } = useCompletedProposalsData()
  
  // Get all proposal IDs for fetching vote results
  const allProposalIds = [
    ...(proposalsData?.proposalCreateds?.map(p => p.proposalId) || []),
    ...(activeProposalsData?.proposalCreateds?.map(p => p.proposalId) || []),
    ...(completedProposalsData?.proposalCreateds?.map(p => p.proposalId) || [])
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
  const processProposalData = (proposalData: any, forceStatus?: 'active' | 'completed' | 'rejected') => {
    const details = parseProposalDetails(proposalData.description)
    const status = forceStatus || getProposalStatus(proposalData.voteStart, proposalData.voteEnd)
    
    // Find vote result for this proposal
    const voteResult = voteResultsData?.proposalVoteResults?.find(
      result => result.id === proposalData.proposalId
    )
    
    // Convert vote counts from wei to STELE tokens
    const votesFor = voteResult ? parseFloat(ethers.formatUnits(voteResult.forVotes, STELE_DECIMALS)) : 0
    const votesAgainst = voteResult ? parseFloat(ethers.formatUnits(voteResult.againstVotes, STELE_DECIMALS)) : 0
    const abstain = voteResult ? parseFloat(ethers.formatUnits(voteResult.abstainVotes, STELE_DECIMALS)) : 0
    
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

  // Process all proposals data using useMemo
  const processedProposals = useMemo(() => {
    if (!proposalsData?.proposalCreateds || !currentBlockInfo) return []
    
    return proposalsData.proposalCreateds
      .map((proposal) => processProposalData(proposal))
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
  }, [proposalsData?.proposalCreateds, voteResultsData?.proposalVoteResults, currentBlockInfo])

  // Process active proposals data using useMemo
  const processedActiveProposals = useMemo(() => {
    if (!activeProposalsData?.proposalCreateds || !currentBlockInfo) return []
    
    return activeProposalsData.proposalCreateds
      .map((proposal) => processProposalData(proposal, 'active'))
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
  }, [activeProposalsData?.proposalCreateds, voteResultsData?.proposalVoteResults, currentBlockInfo])

  // Process completed proposals data using useMemo
  const processedCompletedProposals = useMemo(() => {
    if (!completedProposalsData?.proposalCreateds || !currentBlockInfo) return []
    
    return completedProposalsData.proposalCreateds
      .map((proposal) => processProposalData(proposal, 'completed'))
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
  }, [completedProposalsData?.proposalCreateds, voteResultsData?.proposalVoteResults, currentBlockInfo])

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

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'active') {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Clock className="w-3 h-3 mr-1" />
          Active
        </div>
      )
    } else if (status === 'completed') {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Check className="w-3 h-3 mr-1" />
          Completed
        </div>
      )
    } else {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
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

  if (isLoading || isLoadingActive || isLoadingCompleted || isLoadingVoteResults || isLoadingBlockInfo) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {isLoadingBlockInfo ? 'Loading block information...' : 'Loading proposals and vote results...'}
        </p>
      </div>
    )
  }

  if ((error || errorActive || errorCompleted) && proposals.length === 0 && activeProposals.length === 0 && completedProposals.length === 0) {
    const displayError = error || errorActive || errorCompleted
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
            refetchCompleted()
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
            refetchCompleted()
          }} disabled={isLoading || isLoadingActive || isLoadingCompleted}>
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

      {(error || errorActive || errorCompleted) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md mb-6">
          <p>Warning: {(error || errorActive || errorCompleted)?.message || 'Failed to load proposals'}</p>
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