import { Dashboard } from "@/components/dashboard"
import {
  dehydrate,
  HydrationBoundary,
  Query,
  QueryClient,
} from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import DashBoardQuery from '@/app/subgraph/DashBoard'
import { query } from './subgraph/DashBoard'
import { url, headers } from '@/lib/constants'
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
      <DashBoardQuery />
      <Dashboard />
    </HydrationBoundary>
  )
}