'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, Clock, Calendar, User, FileText, Vote as VoteIcon } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

export default function ProposalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [voteOption, setVoteOption] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [isVoting, setIsVoting] = useState(false)
  
  // Example proposal data (in a real implementation, this would come from an API or contract)
  const proposal = {
    id: id,
    title: 'Increase reward for 1 week challenge',
    description: 'This proposal aims to increase the reward for the 1 week challenge from 100 USDC to 150 USDC to attract more participants.',
    proposer: '0x1234...5678',
    fullProposer: '0x1234567890abcdef1234567890abcdef12345678',
    status: 'active',
    votesFor: 120000,
    votesAgainst: 45000,
    abstain: 5000,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    details: 'The current reward for the 1 week challenge is 100 USDC, which is relatively low compared to other DeFi platforms. By increasing the reward to 150 USDC, we can attract more participants and create a more competitive environment. The additional funds will come from the treasury, which currently has sufficient reserves to support this increase for at least the next 6 months. After this period, we can reassess the impact of the increased rewards on participation rates and platform growth.\n\nThis proposal would require updating the smart contract to adjust the reward calculation formula. The implementation would take effect immediately after passing and would apply to all new challenges created after that date.',
    hasVoted: false,
  }

  // Load wallet address when page loads
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setIsConnected(true)
    }
  }, [])

  // Calculate vote percentage
  const calculatePercentage = () => {
    const total = proposal.votesFor + proposal.votesAgainst + proposal.abstain
    return {
      for: ((proposal.votesFor / total) * 100).toFixed(2),
      against: ((proposal.votesAgainst / total) * 100).toFixed(2),
      abstain: ((proposal.abstain / total) * 100).toFixed(2),
    }
  }

  const percentages = calculatePercentage()

  // Vote function
  const handleVote = async () => {
    if (!voteOption) {
      toast({
        variant: "destructive",
        title: "Vote Option Required",
        description: "Please select a vote option",
      })
      return
    }

    // Wallet connection check
    if (!walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to vote",
      })
      return
    }

    setIsVoting(true)

    try {
      // In a real implementation, this would call the castVote or castVoteWithReason function of the SteleGovernor contract
      // For example purposes, a timeout is used
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Vote success message
      toast({
        title: "Vote Cast Successfully",
        description: `You have voted ${voteOption} on proposal ${id}`,
        action: (
          <ToastAction altText="View on BaseScan">View on BaseScan</ToastAction>
        ),
      })

      // Update state after voting
      router.push("/vote")
    } catch (error) {
      console.error("Voting error:", error)
      toast({
        variant: "destructive",
        title: "Voting Failed",
        description: "There was an error casting your vote. Please try again.",
      })
    } finally {
      setIsVoting(false)
    }
  }

  // Date formatting function
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          <FileText className="w-3 h-3 mr-1" />
          Rejected
        </div>
      )
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/vote">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposal details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Proposal #{id}</CardTitle>
                  <CardDescription className="mt-2">{proposal.title}</CardDescription>
                </div>
                <StatusBadge status={proposal.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Proposer: {proposal.fullProposer}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Created: {formatDate(proposal.startTime)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Voting Ends: {formatDate(proposal.endTime)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <div className="prose max-w-none dark:prose-invert">
                  <p>{proposal.description}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Proposal Details</h3>
                <div className="prose max-w-none dark:prose-invert whitespace-pre-line">
                  <p>{proposal.details}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Voting component */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Cast Your Vote</CardTitle>
              <CardDescription>
                {proposal.hasVoted 
                  ? "You have already voted on this proposal"
                  : "Select your voting option and submit your vote"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RadioGroup 
                  value={voteOption || ""} 
                  onValueChange={setVoteOption}
                  disabled={proposal.hasVoted || isVoting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="for" id="for" />
                    <Label htmlFor="for">Vote For</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="against" id="against" />
                    <Label htmlFor="against">Vote Against</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="abstain" id="abstain" />
                    <Label htmlFor="abstain">Abstain</Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea 
                    id="reason" 
                    placeholder="Why are you voting this way?" 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={proposal.hasVoted || isVoting}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleVote}
                disabled={proposal.hasVoted || !voteOption || isVoting}
              >
                {isVoting ? (
                  <>Loading...</>
                ) : proposal.hasVoted ? (
                  "Already Voted"
                ) : (
                  <>
                    <VoteIcon className="mr-2 h-4 w-4" />
                    Submit Vote
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Current Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* For */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">For</span>
                    <span className="text-sm text-green-500">{percentages.for}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${percentages.for}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {proposal.votesFor.toLocaleString()} votes
                  </div>
                </div>
                
                {/* Against */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Against</span>
                    <span className="text-sm text-red-500">{percentages.against}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${percentages.against}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {proposal.votesAgainst.toLocaleString()} votes
                  </div>
                </div>
                
                {/* Abstain */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Abstain</span>
                    <span className="text-sm text-slate-500">{percentages.abstain}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-400 h-full" 
                      style={{ width: `${percentages.abstain}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {proposal.abstain.toLocaleString()} votes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 