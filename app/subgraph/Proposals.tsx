'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers, BASE_CHAIN_CONFIG } from '@/lib/constants'
import { ethers } from 'ethers'

// New query structure by status with voteResult and voting period info
export const getProposalsByStatusQuery = () => gql`
  query GetProposalsByStatus($statuses: [ProposalStatus!]!) {
    proposals(
      where: { status_in: $statuses }
      orderBy: createdAt
      orderDirection: desc
      first: 50
    ) {
      id
      proposalId
      description
      proposer
      status
      createdAt
      queuedAt
      executedAt
      voteStart
      voteEnd
      values
      voteResult {
        forVotes
        againstVotes
        abstainVotes
        totalVotes
        forPercentage
        againstPercentage
        abstainPercentage
      }
    }
  }
`

export const getProposalsQuery = () => gql`{
  proposalCreateds(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
    id
    proposalId
    proposer
    description
    voteStart
    voteEnd
    values
    blockTimestamp
    blockNumber
    transactionHash
  }
}`

export const getActiveProposalsQuery = (currentBlockNumber: string) => {
  return gql`{
    proposalCreateds(
      where: {
        voteEnd_gt: "${currentBlockNumber}"
      }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      proposalId
      proposer
      description
      voteStart
      voteEnd
      values
      blockTimestamp
      blockNumber
      transactionHash
    }
  }`
}

export const getCompletedProposalsQuery = (currentBlockNumber: string) => {
  return gql`{
    proposalCreateds(
      where: {
        voteEnd_lte: "${currentBlockNumber}"
      }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      proposalId
      proposer
      description
      voteStart
      voteEnd
      values
      blockTimestamp
      blockNumber
      transactionHash
    }
  }`
}

export const getProposalVoteResultQuery = (proposalId: string) => {
  return gql`{
    proposalVoteResult(id: "${proposalId}") {
      forVotes
      againstVotes
      abstainVotes
      forPercentage
      againstPercentage
      abstainPercentage
      totalVotes
      voterCount
      isFinalized
    }
  }`
}

export const getMultipleProposalVoteResultsQuery = (proposalIds: string[]) => {
  const idsFilter = proposalIds.map(id => `"${id}"`).join(', ')
  return gql`{
    proposalVoteResults(where: { id_in: [${idsFilter}] }) {
      id
      forVotes
      againstVotes
      abstainVotes
      forPercentage
      againstPercentage
      abstainPercentage
      totalVotes
      voterCount
      isFinalized
    }
  }`
}

export const getProposalDetailsQuery = (proposalId: string) => {
  return gql`{
    proposalCreateds(where: { proposalId: "${proposalId}" }) {
      id
      proposalId
      proposer
      description
      voteStart
      voteEnd
      values
      targets
      calldatas
      blockTimestamp
      blockNumber
      transactionHash
    }
  }`
}

export interface ProposalCreatedData {
  id: string
  proposalId: string
  proposer: string
  description: string
  voteStart: string
  voteEnd: string
  values: string[]
  blockTimestamp: string
  blockNumber: string
  transactionHash: string
}

export interface ProposalDetailsData {
  id: string
  proposalId: string
  proposer: string
  description: string
  voteStart: string
  voteEnd: string
  values: string[]
  targets: string[]
  calldatas: string[]
  blockTimestamp: string
  blockNumber: string
  transactionHash: string
}

export interface ProposalDetailsResponse {
  proposalCreateds: ProposalDetailsData[]
}

export interface ProposalsData {
  proposalCreateds: ProposalCreatedData[]
}

export interface ProposalVoteResultData {
  id?: string
  forVotes: string
  againstVotes: string
  abstainVotes: string
  forPercentage: string
  againstPercentage: string
  abstainPercentage: string
  totalVotes: string
  voterCount: string
  isFinalized: boolean
}

export interface ProposalVoteResultResponse {
  proposalVoteResult: ProposalVoteResultData | null
}

export interface MultipleProposalVoteResultsResponse {
  proposalVoteResults: ProposalVoteResultData[]
}

// New interfaces for the status-based query
export interface VoteResultData {
  forVotes: string
  againstVotes: string
  abstainVotes: string
  totalVotes: string
  forPercentage: string
  againstPercentage: string
  abstainPercentage: string
}

export interface ProposalWithVoteResult {
  id: string
  proposalId: string
  description: string
  proposer: string
  status: string
  createdAt: string
  queuedAt?: string
  executedAt?: string
  voteStart?: string
  voteEnd?: string
  values?: string[]
  blockNumber?: string
  transactionHash?: string
  voteResult: VoteResultData
}

export interface ProposalsByStatusResponse {
  proposals: ProposalWithVoteResult[]
}

export function useProposalsData() {
  return useQuery<ProposalsData>({
    queryKey: ['proposals'],
    queryFn: async () => {
      return await request(url, getProposalsQuery(), {}, headers)
    }
  })
}

export function useActiveProposalsData() {
  return useQuery<ProposalsData>({
    queryKey: ['activeProposals'],
    queryFn: async () => {
      try {
        // Get current block number from Base RPC
        // Try Infura first if available, then fallback to public RPC
        const rpcUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
          ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
          : BASE_CHAIN_CONFIG.rpcUrls[0]
          
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const currentBlockNumber = await provider.getBlockNumber()
        const currentBlockNumberString = currentBlockNumber.toString()
              
        return await request(url, getActiveProposalsQuery(currentBlockNumberString), {}, headers)
      } catch (error) {
        console.error('Error fetching current block number for active proposals:', error)
        // Fallback: use a very high block number to ensure we get all potentially active proposals
        // This way we don't miss any proposals due to estimation errors
        const fallbackBlockNumber = "999999999"
        return await request(url, getActiveProposalsQuery(fallbackBlockNumber), {}, headers)
      }
    },
    refetchInterval: 60000, // Refetch every minute to keep active status updated
  })
}

export function useCompletedProposalsData() {
  return useQuery<ProposalsData>({
    queryKey: ['completedProposals'],
    queryFn: async () => {
      try {
        // Get current block number from Base RPC
        // Try Infura first if available, then fallback to public RPC
        const rpcUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
          ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
          : BASE_CHAIN_CONFIG.rpcUrls[0]
          
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const currentBlockNumber = await provider.getBlockNumber()
        const currentBlockNumberString = currentBlockNumber.toString()
        
        return await request(url, getCompletedProposalsQuery(currentBlockNumberString), {}, headers)
      } catch (error) {
        console.error('Error fetching current block number for completed proposals:', error)
        // Fallback: use block number 0 to get all proposals (they would all be completed)
        const fallbackBlockNumber = "0"
        return await request(url, getCompletedProposalsQuery(fallbackBlockNumber), {}, headers)
      }
    },
    refetchInterval: 60000, // Refetch every minute to keep status updated
  })
}

export function useProposalVoteResult(proposalId: string) {
  return useQuery<ProposalVoteResultResponse>({
    queryKey: ['proposalVoteResult', proposalId],
    queryFn: async () => {
      const result = await request(url, getProposalVoteResultQuery(proposalId), {}, headers) as ProposalVoteResultResponse
      return result
    },
    enabled: !!proposalId, // Only run query if proposalId is provided
    refetchInterval: 30000, // Refetch every 30 seconds to keep vote counts updated
  })
}

export function useMultipleProposalVoteResults(proposalIds: string[]) {
  return useQuery<MultipleProposalVoteResultsResponse>({
    queryKey: ['multipleProposalVoteResults', proposalIds],
    queryFn: async () => {
      if (proposalIds.length === 0) {
        return { proposalVoteResults: [] }
      }
      const result = await request(url, getMultipleProposalVoteResultsQuery(proposalIds), {}, headers) as MultipleProposalVoteResultsResponse
      return result
    },
    enabled: proposalIds.length > 0, // Only run query if there are proposal IDs
    refetchInterval: 60000, // Refetch every minute to keep vote counts updated
  })
}

// New hook for proposals by status with vote results
export function useProposalsByStatus(
  statuses: string[] = ['ACTIVE']
) {
  return useQuery<ProposalsByStatusResponse>({
    queryKey: ['proposalsByStatus', statuses],
    queryFn: async () => {
      const variables = {
        statuses
      }
      
      const result = await request(
        url, 
        getProposalsByStatusQuery(),
        variables,
        headers
      ) as ProposalsByStatusResponse
      
      return result
    },
    refetchInterval: 60000, // Refetch every minute to keep data updated
  })
}

// New hook for proposal details
export function useProposalDetails(proposalId: string) {
  return useQuery<ProposalDetailsResponse>({
    queryKey: ['proposalDetails', proposalId],
    queryFn: async () => {
      const result = await request(url, getProposalDetailsQuery(proposalId), {}, headers) as ProposalDetailsResponse
      return result
    },
    enabled: !!proposalId, // Only run query if proposalId is provided
  })
} 