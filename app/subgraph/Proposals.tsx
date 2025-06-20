'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers, BASE_CHAIN_CONFIG } from '@/lib/constants'
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
      // Add small delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))
      return await request(SUBGRAPH_URL, getProposalsQuery(), {}, headers)
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 1 minute
    retry: 1,
  })
}

export function useActiveProposalsData(currentBlockNumber?: number) {
  return useQuery<ProposalsData>({
    queryKey: ['activeProposals', currentBlockNumber],
    queryFn: async () => {
      try {
        let blockNumberToUse: string
        
        if (currentBlockNumber) {
          // Use provided block number from global hook
          blockNumberToUse = currentBlockNumber.toString()
        } else {
          // Fallback: fetch block number
          const rpcUrl = process.env.NEXT_PUBLIC_INFURA_API_KEY 
            ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
            : BASE_CHAIN_CONFIG.rpcUrls[0]
            
          const provider = new ethers.JsonRpcProvider(rpcUrl)
          const fetchedBlockNumber = await provider.getBlockNumber()
          blockNumberToUse = fetchedBlockNumber.toString()
        }
        
        // Add delay to prevent overwhelming requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
              
        return await request(SUBGRAPH_URL, getActiveProposalsQuery(blockNumberToUse), {}, headers)
      } catch (error) {
        console.error('Error fetching active proposals:', error)
        // Fallback: use a very high block number to ensure we get all potentially active proposals
        const fallbackBlockNumber = "999999999"
        return await request(SUBGRAPH_URL, getActiveProposalsQuery(fallbackBlockNumber), {}, headers)
      }
    },
    enabled: !!currentBlockNumber, // Only run when we have block number
    refetchInterval: 60 * 1000, // Refetch every 1 minute
    staleTime: 30 * 1000, // 30 seconds
    retry: 1, // Reduce retry attempts
  })
}

export function useProposalVoteResult(proposalId: string) {
  return useQuery<ProposalVoteResultResponse>({
    queryKey: ['proposalVoteResult', proposalId],
    queryFn: async () => {
      // Add delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 300))
      const result = await request(SUBGRAPH_URL, getProposalVoteResultQuery(proposalId), {}, headers) as ProposalVoteResultResponse
      return result
    },
    enabled: !!proposalId, // Only run query if proposalId is provided
    refetchInterval: 2 * 60 * 1000, // Increase to 2 minutes
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })
}

export function useMultipleProposalVoteResults(proposalIds: string[]) {
  return useQuery<MultipleProposalVoteResultsResponse>({
    queryKey: ['multipleProposalVoteResults', proposalIds],
    queryFn: async () => {
      if (proposalIds.length === 0) {
        return { proposalVoteResults: [] }
      }
      // Add delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1200 + 600))
      const result = await request(SUBGRAPH_URL, getMultipleProposalVoteResultsQuery(proposalIds), {}, headers) as MultipleProposalVoteResultsResponse
      return result
    },
    enabled: proposalIds.length > 0, // Only run query if there are proposal IDs
    refetchInterval: 3 * 60 * 1000, // Increase to 3 minutes
    staleTime: 90 * 1000, // 1.5 minutes
    retry: 1,
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
      
      // Add delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 400))
      
      const result = await request(
        SUBGRAPH_URL, 
        getProposalsByStatusQuery(),
        variables,
        headers
      ) as ProposalsByStatusResponse
      
      return result
    },
    refetchInterval: 60 * 1000, // Refetch every 1 minute
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  })
}

// Paginated version of proposals by status
export const getProposalsByStatusPaginatedQuery = () => gql`
  query GetProposalsByStatusPaginated($statuses: [ProposalStatus!]!, $first: Int!, $skip: Int!) {
    proposals(
      where: { status_in: $statuses }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
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

// Hook for paginated proposals by status
export function useProposalsByStatusPaginated(
  statuses: string[] = ['ACTIVE'],
  page: number = 1,
  pageSize: number = 10
) {
  const skip = (page - 1) * pageSize
  
  return useQuery<ProposalsByStatusResponse>({
    queryKey: ['proposalsByStatusPaginated', statuses, page, pageSize],
    queryFn: async () => {
      const variables = {
        statuses,
        first: pageSize,
        skip: skip
      }
      
      // Add delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))
      
      const result = await request(
        SUBGRAPH_URL, 
        getProposalsByStatusPaginatedQuery(),
        variables,
        headers
      ) as ProposalsByStatusResponse
      
      return result
    },
    refetchInterval: 60 * 1000, // Refetch every 1 minute
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  })
}

// Query to get total count of proposals by status
export const getProposalsCountByStatusQuery = () => gql`
  query GetProposalsCountByStatus($statuses: [ProposalStatus!]!) {
    proposals(
      where: { status_in: $statuses }
    ) {
      id
    }
  }
`

export interface ProposalsCountResponse {
  proposals: Array<{ id: string }>
}

// Hook to get total count of proposals by status
export function useProposalsCountByStatus(statuses: string[] = ['ACTIVE']) {
  return useQuery<ProposalsCountResponse>({
    queryKey: ['proposalsCountByStatus', statuses],
    queryFn: async () => {
      const variables = { statuses }
      
      // Add delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100))
      
      const result = await request(
        SUBGRAPH_URL, 
        getProposalsCountByStatusQuery(),
        variables,
        headers
      ) as ProposalsCountResponse
      
      return result
    },
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes (less frequent)
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  })
}

// New hook for proposal details
export function useProposalDetails(proposalId: string) {
  return useQuery<ProposalDetailsResponse>({
    queryKey: ['proposalDetails', proposalId],
    queryFn: async () => {
      // Add delay to prevent overwhelming requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 600 + 200))
      const result = await request(SUBGRAPH_URL, getProposalDetailsQuery(proposalId), {}, headers) as ProposalDetailsResponse
      return result
    },
    enabled: !!proposalId, // Only run query if proposalId is provided
    staleTime: 15 * 60 * 1000, // 15 minutes (proposal details rarely change)
    refetchInterval: false, // Disable automatic refetch
    retry: 1,
  })
} 