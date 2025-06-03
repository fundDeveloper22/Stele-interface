import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers, BYTE_ZERO } from '@/lib/constants'

// GraphQL query for active challenges
export const ACTIVE_CHALLENGES_QUERY = gql`{
  activeChallenges(id: "${BYTE_ZERO}") {
    id
    one_week_id
    one_week_startTime
    one_week_investorCounter
    one_week_rewardAmountUSD
    one_week_isCompleted
    one_month_id
    one_month_startTime
    one_month_investorCounter
    one_month_rewardAmountUSD
    one_month_isCompleted
    three_month_id
    three_month_startTime
    three_month_investorCounter
    three_month_rewardAmountUSD
    three_month_isCompleted
    six_month_id
    six_month_startTime
    six_month_investorCounter
    six_month_rewardAmountUSD
    six_month_isCompleted
    one_year_id
    one_year_startTime
    one_year_investorCounter
    one_year_rewardAmountUSD
    one_year_isCompleted
  }
}`

export interface ActiveChallengesData {
  activeChallenges: {
    id: string
    one_week_id: string
    one_week_startTime: string
    one_week_investorCounter: string
    one_week_rewardAmountUSD: string
    one_week_isCompleted: boolean
    one_month_id: string
    one_month_startTime: string
    one_month_investorCounter: string
    one_month_rewardAmountUSD: string
    one_month_isCompleted: boolean
    three_month_id: string
    three_month_startTime: string
    three_month_investorCounter: string
    three_month_rewardAmountUSD: string
    three_month_isCompleted: boolean
    six_month_id: string
    six_month_startTime: string
    six_month_investorCounter: string
    six_month_rewardAmountUSD: string
    six_month_isCompleted: boolean
    one_year_id: string
    one_year_startTime: string
    one_year_investorCounter: string
    one_year_rewardAmountUSD: string
    one_year_isCompleted: boolean
  }
}

export function useActiveChallenges() {
  return useQuery<ActiveChallengesData>({
    queryKey: ['activeChallenges'],
    queryFn: async () => {
      return await request(url, ACTIVE_CHALLENGES_QUERY, {}, headers)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })
} 