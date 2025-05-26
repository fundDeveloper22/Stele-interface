'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers, BASE_CHAIN_CONFIG } from '@/lib/constants'
import { ethers } from 'ethers'

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

export interface ProposalsData {
  proposalCreateds: ProposalCreatedData[]
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
        
        console.log('Current block number from RPC (active):', currentBlockNumberString)
        return await request(url, getActiveProposalsQuery(currentBlockNumberString), {}, headers)
      } catch (error) {
        console.error('Error fetching current block number for active proposals:', error)
        // Fallback: use a very high block number to ensure we get all potentially active proposals
        // This way we don't miss any proposals due to estimation errors
        const fallbackBlockNumber = "999999999"
        console.log('Using fallback block number (high value) for active:', fallbackBlockNumber)
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
        
        console.log('Current block number from RPC (completed):', currentBlockNumberString)
        return await request(url, getCompletedProposalsQuery(currentBlockNumberString), {}, headers)
      } catch (error) {
        console.error('Error fetching current block number for completed proposals:', error)
        // Fallback: use block number 0 to get all proposals (they would all be completed)
        const fallbackBlockNumber = "0"
        console.log('Using fallback block number (0) for completed:', fallbackBlockNumber)
        return await request(url, getCompletedProposalsQuery(fallbackBlockNumber), {}, headers)
      }
    },
    refetchInterval: 60000, // Refetch every minute to keep status updated
  })
} 