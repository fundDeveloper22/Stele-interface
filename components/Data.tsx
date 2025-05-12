'use client'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'

const query = gql`{
  creates(first: 1) {
    id
    challengeId
    challengeType
    blockNumber
    blockTimestamp
  }
}`
const url = 'https://api.studio.thegraph.com/query/110372/stele_base/version/latest'
const headers = { Authorization: 'Bearer {api-key}' }

export default function Data() {
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
      