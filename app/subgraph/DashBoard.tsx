'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { url, headers, STELE_CONTRACT_ADDRESS } from '@/lib/constants'

export const query = gql`{
  creates(first: 1) {
    id
    challengeId
    challengeType
    blockNumber
    blockTimestamp
  }
  activeChallenges(id: "${STELE_CONTRACT_ADDRESS}") {
    id
    one_week_startTime
    one_year_startTime
    one_month_startTime
    one_week_isCompleted
    one_year_isCompleted
    one_week_investorCounter
    one_year_investorCounter
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
  return <div>{JSON.stringify(data ?? {})}</div>
}
      