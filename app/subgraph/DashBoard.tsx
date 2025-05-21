'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers, STELE_CONTRACT_ADDRESS } from '@/lib/constants'
import { DashboardStats } from '@/components/dashboard'

export const query = gql`{
  activeChallenges(id: "${STELE_CONTRACT_ADDRESS}") {
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

export default function DashBoardQuery() {
  // the data is already pre-fetched on the server and immediately available here,
  // without an additional network call
  const { data } = useQuery({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })
  return <DashboardStats data={data} />
}
      