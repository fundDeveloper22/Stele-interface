'use client'

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { ArrowLeft, Check, Clock, Calendar, User, FileText, Vote as VoteIcon, Loader2, CheckCircle } from "lucide-react"
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
import { useProposalVoteResult, useProposalDetails } from "@/app/subgraph/Proposals"
import { useQueryClient } from "@tanstack/react-query"
import { useBlockNumber } from "@/app/hooks/useBlockNumber"

interface ProposalDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = use(params)
  
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
  const [isQueuing, setIsQueuing] = useState(false)
  const [proposalState, setProposalState] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [isExecuting, setIsExecuting] = useState(false)
  
  // Fetch vote results from subgraph
  const { data: voteResultData, isLoading: isLoadingVoteResult } = useProposalVoteResult(id)
  // Fetch proposal details for queue function
  const { data: proposalDetailsData, isLoading: isLoadingProposalDetails } = useProposalDetails(id)
  // Get current block number with global caching
  const { data: blockInfo, isLoading: isLoadingBlockNumber } = useBlockNumber()
  const queryClient = useQueryClient()
  
  // Get vote result data or use defaults
  const voteResult = voteResultData?.proposalVoteResult
  
  // Extract proposal data from URL parameters
  const getProposalFromParams = () => {
    const title = searchParams.get('title') || 'Increase reward for 1 week challenge'
    const description = searchParams.get('description') || 'This proposal aims to increase the reward for the 1 week challenge from 100 USDC to 150 USDC to attract more participants.'
    const proposer = searchParams.get('proposer') || '0x1234...5678'
    const status = searchParams.get('status') || 'active'
    const startTimeStr = searchParams.get('startTime')
    const endTimeStr = searchParams.get('endTime')
    const votesForStr = searchParams.get('votesFor')
    const votesAgainstStr = searchParams.get('votesAgainst')
    const abstainStr = searchParams.get('abstain')
    const blockTimestamp = searchParams.get('blockTimestamp') || ''
    const blockNumber = searchParams.get('blockNumber') || ''
    const valuesStr = searchParams.get('values')
    const transactionHash = searchParams.get('transactionHash') || ''
    // Get cached token info from URL parameters
    const cachedTokenBalance = searchParams.get('tokenBalance') || '0'
    const cachedDelegatedTo = searchParams.get('delegatedTo') || ''

    // Parse dates
    const startTime = startTimeStr ? new Date(startTimeStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const endTime = endTimeStr ? new Date(endTimeStr) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    // Parse vote counts (use subgraph data if available, otherwise use URL params)
    const votesFor = voteResult ? parseFloat(ethers.formatUnits(voteResult.forVotes, STELE_DECIMALS)) : 
                    (votesForStr ? parseFloat(votesForStr) : 0)
    const votesAgainst = voteResult ? parseFloat(ethers.formatUnits(voteResult.againstVotes, STELE_DECIMALS)) : 
                        (votesAgainstStr ? parseFloat(votesAgainstStr) : 0)
    const abstain = voteResult ? parseFloat(ethers.formatUnits(voteResult.abstainVotes, STELE_DECIMALS)) : 
                   (abstainStr ? parseFloat(abstainStr) : 0)

    // Parse values array
    let values: string[] = []
    try {
      values = valuesStr ? JSON.parse(valuesStr) : []
    } catch (error) {
      console.error('Error parsing values:', error)
      values = []
    }

    // Determine if proposer is full address or abbreviated
    const isFullAddress = proposer.length === 42 && proposer.startsWith('0x')
    const fullProposer = isFullAddress ? proposer : '0x1234567890abcdef1234567890abcdef12345678' // fallback for abbreviated
    const displayProposer = isFullAddress ? `${proposer.slice(0, 6)}...${proposer.slice(-4)}` : proposer

    return {
      id: id,
      title,
      description,
      proposer: displayProposer,
      fullProposer: fullProposer,
      status,
      votesFor,
      votesAgainst,
      abstain,
      startTime,
      endTime,
      blockTimestamp,
      blockNumber,
      values,
      transactionHash,
      details: description, // Use description as details for now
      hasVoted: hasVoted,
      // Cached token info from parent page
      cachedTokenBalance,
      cachedDelegatedTo,
    }
  }

  // Get proposal data (from URL params or defaults)
  const proposal = getProposalFromParams()

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
      checkProposalState()
    }
  }, [walletAddress, id])

  // Set current time on client side only
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString())
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

      // Use cached block number from global hook, fallback to RPC call if not available
      let currentBlock: number
      if (blockInfo && !isLoadingBlockNumber) {
        currentBlock = blockInfo.blockNumber
      } else {
        currentBlock = await provider.getBlockNumber()
      }
      
      // Check if user has already voted
      const hasUserVoted = await governanceContract.hasVoted(id, walletAddress)
      setHasVoted(hasUserVoted)

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

  // Check proposal state
  const checkProposalState = async () => {
    if (!id) return

    try {
      // Try multiple RPC providers for better reliability
      let provider
      try {
        // Primary: Base public RPC
        provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
        await provider.getBlockNumber() // Test connection
      } catch (primaryError) {
        // Fallback: Infura
        const infuraUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
          ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
          : null
        if (infuraUrl) {
          provider = new ethers.JsonRpcProvider(infuraUrl)
        } else {
          throw new Error('No working RPC provider available')
        }
      }
      
      const governanceContract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, provider)

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
      
      const state = await Promise.race([
        governanceContract.state(id),
        timeoutPromise
      ])
      
      // Convert BigInt to number to ensure proper comparison
      setProposalState(Number(state))
    } catch (error) {
      console.error('Error checking proposal state:', error)
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
        tx = await contract.castVote(id, support)
      }

      toast({
        title: "Transaction Submitted",
        description: "Your vote is being processed...",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
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

  // Handle queue operation
  const handleQueue = async () => {
    if (!walletAddress || !proposalDetailsData?.proposalCreateds?.[0]) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Wallet not connected or proposal data not available.",
      })
      return
    }

    const proposalDetails = proposalDetailsData.proposalCreateds[0]
    
    setIsQueuing(true)
    try {
      // Check if Phantom wallet is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Phantom wallet is not installed')
      }

      // Connect to provider with signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const governanceContract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, signer)

      // Prepare queue parameters
      const targets = proposalDetails.targets || []
      const values = proposalDetails.values || []
      const calldatas = proposalDetails.calldatas || []
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(proposalDetails.description))

      // Call queue function
      const tx = await governanceContract.queue(targets, values, calldatas, descriptionHash)
      
      toast({
        title: "Transaction Submitted",
        description: "Your queue transaction has been submitted. Please wait for confirmation.",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        toast({
          title: "Proposal Queued Successfully",
          description: `Proposal #${id} has been queued for execution.`,
          action: (
            <ToastAction altText="View transaction">
              <a 
                href={`https://basescan.org/tx/${receipt.hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View Transaction
              </a>
            </ToastAction>
          ),
        })
        
        // Refresh proposal state
        await checkProposalState()
      } else {
        throw new Error('Transaction failed')
      }

    } catch (error: any) {
      console.error("Queue error:", error)
      
      let errorMessage = "There was an error queuing the proposal. Please try again."
      
      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees"
      } else if (error.message?.includes("Phantom wallet is not installed")) {
        errorMessage = "Phantom wallet is not installed or Ethereum support is not enabled"
      } else if (error.message?.includes("Governor: proposal not successful")) {
        errorMessage = "Proposal has not succeeded yet and cannot be queued"
      }

      toast({
        variant: "destructive",
        title: "Queue Failed",
        description: errorMessage,
      })
    } finally {
      setIsQueuing(false)
    }
  }

  // Handle execute operation
  const handleExecute = async () => {
    if (!walletAddress || !proposalDetailsData?.proposalCreateds?.[0]) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Wallet not connected or proposal data not available.",
      })
      return
    }

    const proposalDetails = proposalDetailsData.proposalCreateds[0]
    
    setIsExecuting(true)
    try {
      // Check if wallet is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Wallet is not installed')
      }

      // Connect to provider with signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const governanceContract = new ethers.Contract(GOVERNANCE_CONTRACT_ADDRESS, GovernorABI.abi, signer)

      // Double-check proposal state before executing
      let currentState
      try {
        currentState = await governanceContract.state(id)
      } catch (stateError) {
        console.error('Error checking proposal state:', stateError)
        throw new Error('Unable to verify proposal state. Please try again.')
      }
      
      const numericState = Number(currentState)
      if (numericState !== 5) {
        throw new Error(`Proposal is not in queued state. Current state: ${numericState}`)
      }

      // Prepare execute parameters
      const targets = proposalDetails.targets || []
      const values = proposalDetails.values || []
      const calldatas = proposalDetails.calldatas || []
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(proposalDetails.description))

      // Try to estimate gas first to catch potential issues
      try {
        await governanceContract.execute.estimateGas(targets, values, calldatas, descriptionHash)
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError)
        throw new Error('Transaction would fail. The proposal may not be ready for execution or the timelock period has not expired.')
      }

      // Call execute function
      const tx = await governanceContract.execute(targets, values, calldatas, descriptionHash)
      
      toast({
        title: "Transaction Submitted",
        description: "Your execute transaction has been submitted. Please wait for confirmation.",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        toast({
          title: "Proposal Executed Successfully",
          description: `Proposal #${id} has been executed successfully!`,
          action: (
            <ToastAction altText="View transaction">
              <a 
                href={`https://basescan.org/tx/${receipt.hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View Transaction
              </a>
            </ToastAction>
          ),
        })
        
        // Refresh proposal state
        await checkProposalState()
      } else {
        throw new Error('Transaction failed')
      }

    } catch (error: any) {
      console.error("Execute error:", error)
      
      let errorMessage = "There was an error executing the proposal. Please try again."
      
      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees"
      } else if (error.message?.includes("not in queued state")) {
        errorMessage = "Proposal is not in queued state"
      } else if (error.message?.includes("timelock")) {
        errorMessage = "Timelock period has not expired yet. Please wait before executing."
      } else if (error.message?.includes("would fail")) {
        errorMessage = error.message
      } else if (error.code === "CALL_EXCEPTION") {
        errorMessage = "Transaction would fail. The proposal may not be ready for execution or the timelock period hasn't expired."
      } else if (error.message?.includes("Unable to verify")) {
        errorMessage = error.message
      }

      toast({
        variant: "destructive",
        title: "Execute Failed",
        description: errorMessage,
      })
    } finally {
      setIsExecuting(false)
    }
  }

  // Check if proposal is ready for queue (pending queue status)
  const isReadyForQueue = () => {
    const now = new Date()
    const voteEndTime = proposal.endTime
    
    // Check if voting period has ended
    const votingEnded = now > voteEndTime
    
    // Check if majority voted for (more than 50% of votes cast)
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.abstain
    const hasMajority = totalVotes > 0 && proposal.votesFor > proposal.votesAgainst
    
    // Check if there are enough votes (at least some participation)
    const hasMinimumParticipation = totalVotes > 0
    
    // Also check if proposal state is succeeded (4) if available - this is the most reliable check
    const isSucceeded = proposalState === 4
    
    // If we have proposal state, use it as the primary check
    if (proposalState !== null) {
      return isSucceeded
    }
    
    // Fallback to manual calculation if proposal state is not available
    return votingEnded && hasMajority && hasMinimumParticipation
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
    // Check if proposal is ready for queue but not yet queued
    if (isReadyForQueue() && proposalState !== 5) {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending Queue
        </div>
      )
    }

    // Show proposal state if available
    if (proposalState !== null) {
      switch (proposalState) {
        case 0: // Pending
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </div>
          )
        case 1: // Active
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Clock className="w-3 h-3 mr-1" />
              Active
            </div>
          )
        case 2: // Canceled
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <FileText className="w-3 h-3 mr-1" />
              Canceled
            </div>
          )
        case 3: // Defeated
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <FileText className="w-3 h-3 mr-1" />
              Defeated
            </div>
          )
        case 4: // Succeeded
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Check className="w-3 h-3 mr-1" />
              Succeeded
            </div>
          )
        case 5: // Queued
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Clock className="w-3 h-3 mr-1" />
              Queued
            </div>
          )
        case 6: // Expired
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <FileText className="w-3 h-3 mr-1" />
              Expired
            </div>
          )
        case 7: // Executed
          return (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Executed
            </div>
          )
        default:
          break
      }
    }

    // Fallback to original status logic
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
                  <span>Vote Start: {formatDate(proposal.startTime)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Vote End: {formatDate(proposal.endTime)}</span>
                </div>
                {proposal.blockNumber && (
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Block: {proposal.blockNumber}</span>
                  </div>
                )}
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
              
              {/* Debug Information */}
              <div className="text-sm bg-gray-100 border border-gray-300 p-4 rounded-md space-y-2 text-gray-800">
                <div className="font-bold text-gray-900">🔍 Debug Information:</div>
                <div className="text-gray-700">⏰ Current Time: <span className="font-semibold">{currentTime}</span></div>
                <div className="text-gray-700">📅 Vote End Time: <span className="font-semibold">{proposal.endTime.toLocaleString()}</span></div>
                <div className="text-gray-700">✅ Voting Ended: <span className={`font-semibold ${currentTime ? (new Date() > proposal.endTime ? "text-green-600" : "text-red-600") : "text-yellow-600"}`}>
                  {currentTime ? (new Date() > proposal.endTime ? "Yes" : "No") : "Checking..."}
                </span></div>
                <div className="text-gray-700">👍 Votes For: <span className="font-semibold text-green-600">{proposal.votesFor.toLocaleString()}</span></div>
                <div className="text-gray-700">👎 Votes Against: <span className="font-semibold text-red-600">{proposal.votesAgainst.toLocaleString()}</span></div>
                <div className="text-gray-700">🤷 Abstain: <span className="font-semibold text-gray-600">{proposal.abstain.toLocaleString()}</span></div>
                <div className="text-gray-700">📊 Total Votes: <span className="font-semibold">{(proposal.votesFor + proposal.votesAgainst + proposal.abstain).toLocaleString()}</span></div>
                <div className="text-gray-700">🏆 Has Majority (For &gt; Against): <span className={`font-semibold ${proposal.votesFor > proposal.votesAgainst ? "text-green-600" : "text-red-600"}`}>
                  {proposal.votesFor > proposal.votesAgainst ? "Yes" : "No"}
                </span></div>
                <div className="text-gray-700">📈 Has Minimum Participation: <span className={`font-semibold ${(proposal.votesFor + proposal.votesAgainst + proposal.abstain) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {(proposal.votesFor + proposal.votesAgainst + proposal.abstain) > 0 ? "Yes" : "No"}
                </span></div>
                <div className="text-gray-700">🏛️ Proposal State: <span className="font-semibold text-blue-600">{proposalState !== null ? `${proposalState} (${typeof proposalState})` : "Loading..."}</span></div>
                <div className="text-gray-700">✨ Proposal State is Succeeded (4): <span className={`font-semibold ${proposalState === 4 ? "text-green-600" : "text-red-600"}`}>
                  {proposalState === 4 ? "Yes" : "No"}
                </span></div>
                <div className="text-gray-700">🔗 Is Connected: <span className={`font-semibold ${isConnected ? "text-green-600" : "text-red-600"}`}>
                  {isConnected ? "Yes" : "No"}
                </span></div>
                <div className="text-gray-700">🚀 Is Ready for Queue: <span className={`font-semibold ${currentTime ? (isReadyForQueue() ? "text-green-600" : "text-red-600") : "text-yellow-600"}`}>
                  {currentTime ? (isReadyForQueue() ? "Yes" : "No") : "Checking..."}
                </span></div>
                <div className="text-gray-700">🎯 Queue Button Should Show: <span className={`font-semibold ${currentTime ? (isConnected && isReadyForQueue() ? "text-green-600" : "text-red-600") : "text-yellow-600"}`}>
                  {currentTime ? (isConnected && isReadyForQueue() ? "Yes" : "No") : "Checking..."}
                </span></div>
                <div className="text-gray-700">⚡ Execute Button Should Show: <span className={`font-semibold ${isConnected && proposalState === 5 ? "text-green-600" : "text-red-600"}`}>
                  {isConnected && proposalState === 5 ? "Yes" : "No"}
                </span></div>
                
                <div className="border-t border-gray-300 pt-2 mt-3">
                  <div className="font-bold text-gray-900">⚙️ Queue Logic:</div>
                  <div className="text-gray-700 ml-2">📍 Using Proposal State: <span className={`font-semibold ${proposalState !== null ? "text-green-600" : "text-red-600"}`}>
                    {proposalState !== null ? "Yes" : "No"}
                  </span></div>
                  {proposalState !== null ? (
                    <div className="text-gray-700 ml-2">🎯 State Check Result: <span className={`font-semibold ${proposalState === 4 ? "text-green-600" : "text-red-600"}`}>
                      {proposalState === 4 ? "Succeeded (Ready)" : `Not Succeeded (State: ${proposalState})`}
                    </span></div>
                  ) : (
                    <div className="ml-2">
                      <div className="text-gray-700">🔄 Fallback to Manual Check:</div>
                      <div className="text-gray-700 ml-4">• Voting Ended: <span className={`font-semibold ${currentTime ? (new Date() > proposal.endTime ? "text-green-600" : "text-red-600") : "text-yellow-600"}`}>
                        {currentTime ? (new Date() > proposal.endTime ? "✓" : "✗") : "?"}
                      </span></div>
                      <div className="text-gray-700 ml-4">• Has Majority: <span className={`font-semibold ${proposal.votesFor > proposal.votesAgainst ? "text-green-600" : "text-red-600"}`}>
                        {proposal.votesFor > proposal.votesAgainst ? "✓" : "✗"}
                      </span></div>
                      <div className="text-gray-700 ml-4">• Has Participation: <span className={`font-semibold ${(proposal.votesFor + proposal.votesAgainst + proposal.abstain) > 0 ? "text-green-600" : "text-red-600"}`}>
                        {(proposal.votesFor + proposal.votesAgainst + proposal.abstain) > 0 ? "✓" : "✗"}
                      </span></div>
                    </div>
                  )}
                </div>
              </div>

              {isConnected && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {isLoadingVotingPower ? (
                    <div className="flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Loading voting power...
                    </div>
                  ) : (
                    <>
                      <div>Token balance: {Number(proposal.cachedTokenBalance).toLocaleString()} STELE</div>
                      <div>Your voting power: {Number(votingPower).toLocaleString()}</div>
                      {proposal.cachedDelegatedTo && (
                        <div>Delegated to: {
                          proposal.cachedDelegatedTo === "0x0000000000000000000000000000000000000000" 
                            ? "Not delegated" 
                            : proposal.cachedDelegatedTo === walletAddress 
                              ? "Self" 
                              : `${proposal.cachedDelegatedTo.slice(0, 6)}...${proposal.cachedDelegatedTo.slice(-4)}`
                        }</div>
                      )}
                      {proposalState !== null && (
                        <div>Proposal state: {
                          isReadyForQueue() && proposalState !== 5 ? "Pending Queue" :
                          proposalState === 0 ? "Pending" :
                          proposalState === 1 ? "Active" :
                          proposalState === 2 ? "Canceled" :
                          proposalState === 3 ? "Defeated" :
                          proposalState === 4 ? "Succeeded" :
                          proposalState === 5 ? "Queued" :
                          proposalState === 6 ? "Expired" :
                          proposalState === 7 ? "Executed" :
                          "Unknown"
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
              {isConnected && !isLoadingVotingPower && parseFloat(proposal.cachedTokenBalance) > 0 && Number(votingPower) === 0 && (
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

              {/* Queue Button - Show when proposal is ready for queue (voting ended + majority for) */}
              {currentTime && isConnected && isReadyForQueue() && (
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={handleQueue}
                  disabled={isQueuing || isLoadingProposalDetails}
                >
                  {isQueuing ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Queuing Proposal...
                    </div>
                  ) : isLoadingProposalDetails ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Proposal Data...
                    </div>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Queue for Execution
                    </>
                  )}
                </Button>
              )}

              {/* Execute Button - Show when proposal is queued (state 5) */}
              {isConnected && proposalState === 5 && (
                <Button 
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={handleExecute}
                  disabled={isExecuting || isLoadingProposalDetails}
                >
                  {isExecuting ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing Proposal...
                    </div>
                  ) : isLoadingProposalDetails ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Proposal Data...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Execute Proposal
                    </>
                  )}
                </Button>
              )}
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