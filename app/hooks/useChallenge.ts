import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers } from '@/lib/constants'

// GraphQL query for individual challenge
export const getChallengeQuery = (challengeId: string) => gql`{
  challenge(id: "${challengeId}") {
    id
    challengeId
    challengeType
    startTime
    endTime
    investorCounter
    seedMoney
    entryFee
    rewardAmountUSD
    isActive
    topUsers
    score
  }
}`

export interface ChallengeData {
  challenge: {
    id: string
    challengeId: string
    challengeType: number
    startTime: string
    endTime: string
    investorCounter: string
    seedMoney: string
    entryFee: string
    rewardAmountUSD: string
    isActive: boolean
    topUsers: string[]
    score: string[]
  }
}

export function useChallenge(challengeId: string) {
  return useQuery<ChallengeData>({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      return await request(url, getChallengeQuery(challengeId), {}, headers)
    },
    staleTime: 30 * 1000, // 30 seconds (more frequent updates for individual challenges)
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!challengeId, // Only run if challengeId is provided
  })
} 