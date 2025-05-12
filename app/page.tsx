import { Dashboard } from "@/components/dashboard"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import Data from '@/components/Data'

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

export default async function Home() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })
  return (
    // Neat! Serialization is now as easy as passing props.
    // HydrationBoundary is a Client Component, so hydration will happen there.
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Data />
      <Dashboard />
    </HydrationBoundary>
  )
}