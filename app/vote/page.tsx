'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Clock, XCircle, Plus, FileText, Vote as VoteIcon, Loader2 } from "lucide-react"
import { useProposalsData } from "@/app/subgraph/Proposals"

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
}

export default function VotePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  
  // Fetch proposals from subgraph
  const { data: proposalsData, isLoading, error, refetch } = useProposalsData()
  // Load wallet address when page loads
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setIsConnected(true)
    }
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

  // Determine proposal status based on timestamps
  const getProposalStatus = (voteStart: string, voteEnd: string): 'active' | 'completed' | 'rejected' => {
    const now = Date.now() / 1000 // Current time in seconds
    const startTime = Number(voteStart)
    const endTime = Number(voteEnd)
    
    if (now < startTime) {
      return 'active' // Pending/upcoming
    } else if (now >= startTime && now <= endTime) {
      return 'active' // Currently active
    } else {
      return 'completed' // Ended (we'll assume completed for now)
    }
  }

  // Process subgraph data into proposals
  useEffect(() => {
    if (proposalsData?.proposalCreateds) {
      const processedProposals: Proposal[] = proposalsData.proposalCreateds.map((proposal) => {
        const details = parseProposalDetails(proposal.description)
        const status = getProposalStatus(proposal.voteStart, proposal.voteEnd)
        
        return {
          id: proposal.proposalId,
          proposalId: proposal.proposalId,
          title: details.title || `Proposal #${proposal.proposalId}`,
          description: details.description,
          proposer: `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`,
          status,
          votesFor: 0, // These would need to be fetched separately or included in subgraph
          votesAgainst: 0,
          abstain: 0,
          startTime: new Date(Number(proposal.voteStart) * 1000),
          endTime: new Date(Number(proposal.voteEnd) * 1000),
          blockTimestamp: proposal.blockTimestamp,
          blockNumber: proposal.blockNumber,
          values: proposal.values
        }
      }).sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
      
      setProposals(processedProposals)
    }
  }, [proposalsData])

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
          <p className="text-sm">{error.message || 'Failed to load proposals'}</p>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Governance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
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
          <p>Warning: {error.message || 'Failed to load proposals'}</p>
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