'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Clock, XCircle, Plus, FileText, Vote as VoteIcon, Loader2 } from "lucide-react"
import { ethers } from "ethers"
import { GOVERNANCE_CONTRACT_ADDRESS, BASE_CHAIN_ID, BASE_CHAIN_CONFIG } from "@/lib/constants"
import GovernorABI from "@/app/abis/SteleGovernor.json"

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
  proposalId?: string; // Raw proposal ID from the contract
}

export default function VotePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load wallet address when page loads
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setIsConnected(true)
    }
    
    // Load proposals from smart contract
    fetchProposals()
  }, [])

  // Get state of proposal from the contract
  const getProposalState = async (provider: ethers.Provider, governorContract: ethers.Contract, proposalId: string) => {
    try {
      const state = await governorContract.state(proposalId)
      
      // Convert numeric state to string status
      // 0: Pending, 1: Active, 2: Canceled, 3: Defeated, 4: Succeeded, 5: Queued, 6: Expired, 7: Executed
      switch (Number(state)) {
        case 0: // Pending
        case 1: // Active
        case 5: // Queued
          return 'active'
        case 4: // Succeeded
        case 7: // Executed
          return 'completed'
        case 2: // Canceled
        case 3: // Defeated
        case 6: // Expired
          return 'rejected'
        default:
          return 'active'
      }
    } catch (error) {
      console.error("Error getting proposal state:", error)
      return 'active' // Default to active if error
    }
  }

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

  // Fetch proposals from the contract
  const fetchProposals = async () => {
    setIsLoading(true)
    setError(null)

    // Multiple RPC providers to try
    const rpcProviders = [
      'https://mainnet.base.org',
      'https://base.blockpi.network/v1/rpc/public',
      'https://1rpc.io/base',
      'https://base.meowrpc.com'
    ]

    // Track attempts
    let lastError = null
    
    for (const rpcUrl of rpcProviders) {
      try {
        // Connect to provider (read-only is fine for fetching)
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        
        // Create contract instance
        const governorContract = new ethers.Contract(
          GOVERNANCE_CONTRACT_ADDRESS,
          GovernorABI.abi,
          provider
        )
        
        // Try to get the current block number to check connection
        await provider.getBlockNumber()
        
        // Instead of one big query, use pagination with smaller ranges
        // This helps avoid RPC timeout errors
        const currentBlock = await provider.getBlockNumber()
        const blockRanges = []
        const rangeSize = 10000 // Smaller block ranges
        
        // Create multiple smaller block ranges to query
        for (let i = 0; i < 5; i++) { // Limit to 5 recent ranges
          const fromBlock = Math.max(0, currentBlock - (i + 1) * rangeSize)
          const toBlock = Math.max(0, currentBlock - i * rangeSize)
          blockRanges.push({ fromBlock, toBlock })
        }
        
        let allEvents = []
        
        // Query each block range separately
        for (const range of blockRanges) {
          try {
            // Using try-catch for each range to continue even if one fails
            console.log(`Querying events from block ${range.fromBlock} to ${range.toBlock}`)
            const filter = governorContract.filters.ProposalCreated()
            const events = await governorContract.queryFilter(filter, range.fromBlock, range.toBlock)
            allEvents = [...allEvents, ...events]
            
            // If we got some events, we can break early
            if (allEvents.length > 0) {
              break
            }
          } catch (rangeError) {
            console.warn(`Error querying block range ${range.fromBlock}-${range.toBlock}:`, rangeError)
            // Continue to the next range
          }
        }
        
        // Process each event (with a limit to avoid too many requests)
        const MAX_PROPOSALS = 10 // Limit to 10 most recent proposals
        const proposalPromises = allEvents
          .slice(0, MAX_PROPOSALS)
          .map(async (event: any) => {
            try {
              const eventArgs = event.args
              if (!eventArgs) return null
              
              const proposalId = eventArgs.proposalId.toString()
              const proposer = eventArgs.proposer
              const description = eventArgs.description
              const voteStart = new Date(Number(eventArgs.voteStart) * 1000)
              const voteEnd = new Date(Number(eventArgs.voteEnd) * 1000)
              
              // Get proposal details
              const details = parseProposalDetails(description)
              
              // Get proposal status with retry mechanism
              let status = 'active'
              try {
                status = await getProposalState(provider, governorContract, proposalId)
              } catch (stateError) {
                console.warn(`Error getting state for proposal ${proposalId}:`, stateError)
              }
              
              // Get proposal votes with retry mechanism
              let votesAgainst = 0
              let votesFor = 0
              let abstain = 0
              
              try {
                const votes = await governorContract.proposalVotes(proposalId)
                votesAgainst = Number(ethers.formatUnits(votes.againstVotes, 0))
                votesFor = Number(ethers.formatUnits(votes.forVotes, 0))
                abstain = Number(ethers.formatUnits(votes.abstainVotes, 0))
              } catch (votesError) {
                console.warn(`Error getting votes for proposal ${proposalId}:`, votesError)
              }
              
              return {
                id: proposalId,
                proposalId: proposalId, // Store raw proposalId for contract interactions
                title: details.title || `Proposal #${proposalId}`,
                description: details.description,
                proposer: `${proposer.slice(0, 6)}...${proposer.slice(-4)}`,
                status: status as 'active' | 'completed' | 'rejected',
                votesFor,
                votesAgainst,
                abstain,
                startTime: voteStart,
                endTime: voteEnd
              }
            } catch (error) {
              console.error("Error processing proposal event:", error)
              return null
            }
          })
        
        // Wait for all promises to resolve
        const results = await Promise.all(proposalPromises)
        
        // Filter out null values and sort by end time (newest first)
        const filteredProposals = results
          .filter(Boolean)
          .sort((a, b) => b!.endTime.getTime() - a!.endTime.getTime()) as Proposal[]
        
        // If we successfully got proposals, save them to state and break the retry loop
        if (filteredProposals.length > 0) {
          setProposals(filteredProposals)
          // Save to localStorage as cache
          localStorage.setItem('cachedProposals', JSON.stringify(filteredProposals))
          localStorage.setItem('proposalsCacheTime', Date.now().toString())
          return // Exit the function successfully
        }
        
        // If we didn't get any proposals but didn't error, try the next provider
        console.log(`No proposals found with provider ${rpcUrl}, trying next...`)
      } catch (error: any) {
        console.error(`Error with provider ${rpcUrl}:`, error)
        lastError = error
        // Continue to the next provider
      }
    }
    
    // If we got here, all providers failed or returned no proposals
    if (lastError) {
      console.error("All RPC providers failed:", lastError)
      setError(lastError.message || "Failed to load proposals from all RPC providers")
    } else {
      setError("No proposals found from any RPC provider")
    }
    
    // Try to load from cache if available
    const cachedProposals = localStorage.getItem('cachedProposals')
    const cacheTime = localStorage.getItem('proposalsCacheTime')
    
    if (cachedProposals) {
      try {
        const parsed = JSON.parse(cachedProposals)
        setProposals(parsed)
        
        // Show cache timestamp
        if (cacheTime) {
          const cacheDate = new Date(Number(cacheTime))
          setError(`Using cached proposals from ${cacheDate.toLocaleString()}. ${lastError?.message || 'RPC providers unavailable.'}`)
        }
        return
      } catch (cacheError) {
        console.error("Error loading cached proposals:", cacheError)
      }
    }
    
    // If no cache, use fallback data
    setProposals([
      {
        id: '1',
        title: 'Example Proposal (Fallback Data)',
        description: 'This is example data shown because of an error loading real proposals.',
        proposer: '0x1234...5678',
        status: 'active',
        votesFor: 120000,
        votesAgainst: 45000,
        abstain: 5000,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    ])
  } finally {
    setIsLoading(false)
  }
}

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading proposals...</p>
      </div>
    )
  }

  if (error && proposals.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="font-medium">Error loading proposals</p>
          <p className="text-sm">{error}</p>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={fetchProposals}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Governance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchProposals} disabled={isLoading}>
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

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md mb-6">
          <p>Warning: {error}</p>
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
            {proposals.filter(p => p.status === 'active').length > 0 ? (
              proposals.filter(p => p.status === 'active').map((proposal) => (
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
                    <div className="mt-4 text-sm">
                      <p>Proposer: {proposal.proposer}</p>
                      <p>Ends: {formatDate(proposal.endTime)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/vote/${proposal.id}`} className="w-full">
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
            {proposals.filter(p => p.status === 'completed').length > 0 ? (
              proposals.filter(p => p.status === 'completed').map((proposal) => (
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
                    <div className="mt-4 text-sm">
                      <p>Proposer: {proposal.proposer}</p>
                      <p>Ended: {formatDate(proposal.endTime)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/vote/${proposal.id}`} className="w-full">
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
                    <div className="mt-4 text-sm">
                      <p>Proposer: {proposal.proposer}</p>
                      <p>{proposal.status === 'active' ? 'Ends' : 'Ended'}: {formatDate(proposal.endTime)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {proposal.status === 'active' ? (
                      <Link href={`/vote/${proposal.id}`} className="w-full">
                        <Button className="w-full">
                          <VoteIcon className="mr-2 h-4 w-4" />
                          Cast Vote
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/vote/${proposal.id}`} className="w-full">
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