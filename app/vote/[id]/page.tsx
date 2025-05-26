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
import { ArrowLeft, Check, Clock, Calendar, User, FileText, Vote as VoteIcon, Loader2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ethers } from "ethers"
import { GOVERNANCE_CONTRACT_ADDRESS, STELE_TOKEN_ADDRESS, STELE_DECIMALS, STELE_TOTAL_SUPPLY } from "@/lib/constants"
import GovernorABI from "@/app/abis/SteleGovernor.json"
import ERC20VotesABI from "@/app/abis/ERC20Votes.json"
import ERC20ABI from "@/app/abis/ERC20.json"
import { useProposalVoteResult } from "@/app/subgraph/Proposals"
import { useQueryClient } from "@tanstack/react-query"

export default function ProposalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [voteOption, setVoteOption] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [isVoting, setIsVoting] = useState(false)
  const [votingPower, setVotingPower] = useState<string>("0")
  const [hasVoted, setHasVoted] = useState(false)
  const [isLoadingVotingPower, setIsLoadingVotingPower] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<string>("0")
  const [delegatedTo, setDelegatedTo] = useState<string>("")
  const [isDelegating, setIsDelegating] = useState(false)
  
  // Fetch vote results from subgraph
  const { data: voteResultData, isLoading: isLoadingVoteResult } = useProposalVoteResult(id)
  const queryClient = useQueryClient()
  
  // Get vote result data or use defaults
  const voteResult = voteResultData?.proposalVoteResult
  
  // Example proposal data (in a real implementation, this would come from an API or contract)
  const proposal = {
    id: id,
    title: 'Increase reward for 1 week challenge',
    description: 'This proposal aims to increase the reward for the 1 week challenge from 100 USDC to 150 USDC to attract more participants.',
    proposer: '0x1234...5678',
    fullProposer: '0x1234567890abcdef1234567890abcdef12345678',
    status: 'active',
    votesFor: voteResult ? parseFloat(ethers.formatUnits(voteResult.forVotes, STELE_DECIMALS)) : 0,
    votesAgainst: voteResult ? parseFloat(ethers.formatUnits(voteResult.againstVotes, STELE_DECIMALS)) : 0,
    abstain: voteResult ? parseFloat(ethers.formatUnits(voteResult.abstainVotes, STELE_DECIMALS)) : 0,
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    details: 'The current reward for the 1 week challenge is 100 USDC, which is relatively low compared to other DeFi platforms. By increasing the reward to 150 USDC, we can attract more participants and create a more competitive environment. The additional funds will come from the treasury, which currently has sufficient reserves to support this increase for at least the next 6 months. After this period, we can reassess the impact of the increased rewards on participation rates and platform growth.\n\nThis proposal would require updating the smart contract to adjust the reward calculation formula. The implementation would take effect immediately after passing and would apply to all new challenges created after that date.',
    hasVoted: hasVoted,
  }

  // Load wallet address when page loads
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setIsConnected(true)
    }
  }, [])

  // Check voting power and voting status when wallet is connected
  useEffect(() => {
    if (walletAddress && id) {
      checkVotingPowerAndStatus()
    }
  }, [walletAddress, id])

  // Get voting power and check if user has already voted
  const checkVotingPowerAndStatus = async () => {
    if (!walletAddress || !id) return

    setIsLoadingVotingPower(true)
    try {
      // Connect to provider
      const rpcUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
        ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
        : 'https://mainnet.base.org'
        
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const governanceContract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, provider)
      const tokenContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20ABI.abi, provider)
      const votesContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20VotesABI.abi, provider)

      // Get current block number for voting power calculation
      const currentBlock = await provider.getBlockNumber()
      
      // Check if user has already voted
      const hasUserVoted = await governanceContract.hasVoted(id, walletAddress)
      setHasVoted(hasUserVoted)

      // Get token balance
      let balance = "0"
      try {
        const tokenBalance = await tokenContract.balanceOf(walletAddress)
        balance = ethers.formatUnits(tokenBalance, STELE_DECIMALS)
        setTokenBalance(balance)
      } catch (balanceError) {
        console.error('Error getting token balance:', balanceError)
        setTokenBalance("0")
      }

      // Check who the user has delegated to
      let delegatee = ""
      try {
        const delegateAddress = await votesContract.delegates(walletAddress)
        delegatee = delegateAddress
        setDelegatedTo(delegatee)
      } catch (delegateError) {
        console.error('Error getting delegate info:', delegateError)
        setDelegatedTo("")
      }

      // Get voting power at proposal start block
      // For simplicity, we'll use current block - 1 as timepoint
      const timepoint = currentBlock - 1
      const userVotingPower = await governanceContract.getVotes(walletAddress, timepoint)
      setVotingPower(ethers.formatUnits(userVotingPower, STELE_DECIMALS))

    } catch (error) {
      console.error('Error checking voting power and status:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check voting power. Please try again.",
      })
    } finally {
      setIsLoadingVotingPower(false)
    }
  }

  // Calculate vote percentage based on total supply (1 billion STELE)
  const calculatePercentage = () => {
    // Convert STELE_TOTAL_SUPPLY from wei to STELE tokens
    const totalSupplyInStele = parseFloat(ethers.formatUnits(STELE_TOTAL_SUPPLY, STELE_DECIMALS))
    
    // Calculate percentage based on total supply
    return {
      for: ((proposal.votesFor / totalSupplyInStele) * 100).toFixed(2),
      against: ((proposal.votesAgainst / totalSupplyInStele) * 100).toFixed(2),
      abstain: ((proposal.abstain / totalSupplyInStele) * 100).toFixed(2),
    }
  }

  const percentages = calculatePercentage()

  // Delegate tokens to self
  const handleDelegate = async () => {
    if (!walletAddress) {
      toast({
        variant: "destructive",
        title: "Phantom Wallet Not Connected",
        description: "Please connect your Phantom wallet to delegate",
      })
      return
    }

    setIsDelegating(true)

    try {
      // Check if Phantom wallet is available
      if (!window.phantom?.ethereum) {
        throw new Error("Phantom wallet is not installed or Ethereum support is not enabled")
      }

      // Request wallet connection
      await window.phantom.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Connect to provider with signer using Phantom's ethereum provider
      const provider = new ethers.BrowserProvider(window.phantom.ethereum)
      const signer = await provider.getSigner()
      const votesContract = new ethers.Contract(STELE_TOKEN_ADDRESS, ERC20VotesABI.abi, signer)

      // Delegate to self
      const tx = await votesContract.delegate(walletAddress)

      toast({
        title: "Transaction Submitted",
        description: "Your delegation is being processed...",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()

      toast({
        title: "Delegation Successful",
        description: "You have successfully delegated your tokens to yourself. Your voting power should now be available.",
        action: (
          <ToastAction 
            altText="View on BaseScan"
            onClick={() => window.open(`https://basescan.org/tx/${receipt.hash}`, '_blank')}
          >
            View on BaseScan
          </ToastAction>
        ),
      })

      // Refresh voting power after delegation
      setTimeout(() => {
        checkVotingPowerAndStatus()
      }, 3000)

    } catch (error: any) {
      console.error("Delegation error:", error)
      
      let errorMessage = "There was an error delegating your tokens. Please try again."
      
      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees"
      } else if (error.message?.includes("Phantom wallet is not installed")) {
        errorMessage = "Phantom wallet is not installed or Ethereum support is not enabled"
      }

      toast({
        variant: "destructive",
        title: "Delegation Failed",
        description: errorMessage,
      })
    } finally {
      setIsDelegating(false)
    }
  }

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
        title: "Phantom Wallet Not Connected",
        description: "Please connect your Phantom wallet to vote",
      })
      return
    }

    // Check if user has voting power
    if (Number(votingPower) === 0) {
      toast({
        variant: "destructive",
        title: "No Voting Power",
        description: "You don't have any voting power for this proposal",
      })
      return
    }

    setIsVoting(true)

    try {
      // Check if Phantom wallet is available
      if (!window.phantom?.ethereum) {
        throw new Error("Phantom wallet is not installed or Ethereum support is not enabled")
      }

      // Request wallet connection
      await window.phantom.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Connect to provider with signer using Phantom's ethereum provider
      const provider = new ethers.BrowserProvider(window.phantom.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, signer)

      // Convert vote option to support value
      // 0 = Against, 1 = For, 2 = Abstain
      let support: number
      switch (voteOption) {
        case 'for':
          support = 1
          break
        case 'against':
          support = 0
          break
        case 'abstain':
          support = 2
          break
        default:
          throw new Error("Invalid vote option")
      }

      let tx
      if (reason.trim()) {
        // Cast vote with reason
        tx = await contract.castVoteWithReason(id, support, reason.trim())
      } else {
              // Cast vote without reason
      console.log('Casting vote with:', { proposalId: id, support, votingPower })
      tx = await contract.castVote(id, support)
      }

      toast({
        title: "Transaction Submitted",
        description: "Your vote is being processed...",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      console.log('Vote transaction confirmed:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      })

      // Vote success message
      toast({
        title: "Vote Cast Successfully",
        description: `You have voted ${voteOption} on proposal ${id} with ${Number(votingPower).toLocaleString()} voting power`,
        action: (
          <ToastAction 
            altText="View on BaseScan"
            onClick={() => window.open(`https://basescan.org/tx/${receipt.hash}`, '_blank')}
          >
            View on BaseScan
          </ToastAction>
        ),
      })

      // Update voting status
      setHasVoted(true)
      
      // Invalidate and refetch vote result data
      queryClient.invalidateQueries({ queryKey: ['proposalVoteResult', id] })
      
      // Refresh voting power and status
      setTimeout(() => {
        checkVotingPowerAndStatus()
      }, 3000)

    } catch (error: any) {
      console.error("Voting error:", error)
      
      let errorMessage = "There was an error casting your vote. Please try again."
      
      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees"
      } else if (error.message?.includes("already voted")) {
        errorMessage = "You have already voted on this proposal"
      } else if (error.message?.includes("Phantom wallet is not installed")) {
        errorMessage = "Phantom wallet is not installed or Ethereum support is not enabled"
      }

      toast({
        variant: "destructive",
        title: "Voting Failed",
        description: errorMessage,
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
              {isConnected && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {isLoadingVotingPower ? (
                    <div className="flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading voting power...
                    </div>
                  ) : (
                    <>
                      <div>Token balance: {Number(tokenBalance).toLocaleString()} STELE</div>
                      <div>Your voting power: {Number(votingPower).toLocaleString()}</div>
                      {delegatedTo && (
                        <div>Delegated to: {
                          delegatedTo === "0x0000000000000000000000000000000000000000" 
                            ? "Not delegated" 
                            : delegatedTo === walletAddress 
                              ? "Self" 
                              : `${delegatedTo.slice(0, 6)}...${delegatedTo.slice(-4)}`
                        }</div>
                      )}
                    </>
                  )}
                </div>
              )}
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
            <CardFooter className="flex flex-col space-y-3">
              {/* Delegate Button - Show when user has tokens but no voting power */}
              {isConnected && !isLoadingVotingPower && Number(tokenBalance) > 0 && Number(votingPower) === 0 && (
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={handleDelegate}
                  disabled={isDelegating}
                >
                  {isDelegating ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Delegating...
                    </div>
                  ) : (
                    <>
                      <VoteIcon className="mr-2 h-4 w-4" />
                      Delegate Tokens to Enable Voting
                    </>
                  )}
                </Button>
              )}
              
              {/* Vote Button */}
              <Button 
                className="w-full" 
                onClick={handleVote}
                disabled={proposal.hasVoted || !voteOption || isVoting || !isConnected || Number(votingPower) === 0 || isLoadingVotingPower}
              >
                {isVoting ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Vote...
                  </div>
                ) : proposal.hasVoted ? (
                  "Already Voted"
                ) : !isConnected ? (
                  "Connect Phantom Wallet to Vote"
                                  ) : Number(votingPower) === 0 ? (
                    "Insufficient Voting Power"
                ) : isLoadingVotingPower ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Voting Power...
                  </div>
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
              <CardDescription>
                {voteResult ? (
                  <>
                    Total votes: {parseFloat(ethers.formatUnits(voteResult.totalVotes || "0", STELE_DECIMALS)).toLocaleString()} STELE • 
                    Voters: {parseInt(voteResult.voterCount || "0").toLocaleString()}
                  </>
                ) : (
                  <>
                    Total votes: {(proposal.votesFor + proposal.votesAgainst + proposal.abstain).toLocaleString()} STELE
                  </>
                )}
                <br />
                <span className="text-xs">
                  Participation: {((proposal.votesFor + proposal.votesAgainst + proposal.abstain) / parseFloat(ethers.formatUnits(STELE_TOTAL_SUPPLY, STELE_DECIMALS)) * 100).toFixed(2)}% of total supply
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVoteResult ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading vote results...
                </div>
              ) : !voteResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No vote data available yet.</p>
                  <p className="text-sm mt-2">Votes may take a few minutes to appear after casting.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* For */}
                                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">For</span>
                      <span className="text-sm text-green-500">{percentages.for}% of total supply</span>
                    </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${percentages.for}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {proposal.votesFor.toLocaleString()} STELE
                  </div>
                </div>
                
                {/* Against */}
                                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Against</span>
                      <span className="text-sm text-red-500">{percentages.against}% of total supply</span>
                    </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${percentages.against}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {proposal.votesAgainst.toLocaleString()} STELE
                  </div>
                </div>
                
                {/* Abstain */}
                                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Abstain</span>
                      <span className="text-sm text-slate-500">{percentages.abstain}% of total supply</span>
                    </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-400 h-full" 
                      style={{ width: `${percentages.abstain}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {proposal.abstain.toLocaleString()} STELE
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 