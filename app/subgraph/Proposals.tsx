'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers } from '@/lib/constants'

export const getProposalsQuery = () => gql`{
  proposalCreateds(first: 10) {
    description
    voteEnd
    voteStart
    values
    proposer
    proposalId
    blockTimestamp
    blockNumber
  }
}`

export interface ProposalCreatedData {
  description: string
  voteEnd: string
  voteStart: string
  values: string[]
  proposer: string
  proposalId: string
  blockTimestamp: string
  blockNumber: string
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