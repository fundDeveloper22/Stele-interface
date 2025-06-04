import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardClientComponents } from "@/components/DashboardClientComponents"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { SUBGRAPH_URL, headers } from '@/lib/constants'
import { ACTIVE_CHALLENGES_QUERY, type ActiveChallengesData } from '@/app/hooks/useActiveChallenges'

// Import the new investable tokens query
const INVESTABLE_TOKENS_QUERY = gql`{
  investableTokens(first: 50, orderBy: symbol, orderDirection: asc, where: { isInvestable: true }, subgraphError: allow) {
    id
    tokenAddress
    decimals
    symbol
    isInvestable
    updatedTimestamp
  }
}`

// Utility function for exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced request function with retry and backoff
const requestWithRetry = async (url: string, query: string, variables: any = {}, requestHeaders: any = {}, maxRetries = 3) => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between attempts (exponential backoff)
      if (attempt > 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 2), 10000); // Cap at 10 seconds
        console.log(`Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`);
        await delay(delayMs);
      }
      
      const result = await request(url, query, variables, requestHeaders);
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Request attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('400') || error.message.includes('404')) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries} attempts failed. Last error:`, error);
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Unknown error during retry attempts');
};

export function DashboardStats({ data }: { data: any }) {
  if (!data?.activeChallenges) return null;
  
  const activeChallenges = data.activeChallenges;
  
  // Calculate number of active challenges
  const activeChallengesCount = [
    { isCompleted: activeChallenges.one_week_isCompleted, startTime: activeChallenges.one_week_startTime },
    { isCompleted: activeChallenges.one_month_isCompleted, startTime: activeChallenges.one_month_startTime },
    { isCompleted: activeChallenges.three_month_isCompleted, startTime: activeChallenges.three_month_startTime },
    { isCompleted: activeChallenges.six_month_isCompleted, startTime: activeChallenges.six_month_startTime },
    { isCompleted: activeChallenges.one_year_isCompleted, startTime: activeChallenges.one_year_startTime }
  ].filter(challenge => 
    !challenge.isCompleted && challenge.startTime && challenge.startTime !== "0"
  ).length;

  // Calculate total number of participants
  const totalParticipants = 
    Number(activeChallenges.one_week_investorCounter || 0) +
    Number(activeChallenges.one_month_investorCounter || 0) +
    Number(activeChallenges.three_month_investorCounter || 0) +
    Number(activeChallenges.six_month_investorCounter || 0) +
    Number(activeChallenges.one_year_investorCounter || 0);

  // Calculate total reward amount (USD)
  const totalRewards = 
    Number(activeChallenges.one_week_rewardAmountUSD || 0) +
    Number(activeChallenges.one_month_rewardAmountUSD || 0) +
    Number(activeChallenges.three_month_rewardAmountUSD || 0) +
    Number(activeChallenges.six_month_rewardAmountUSD || 0) +
    Number(activeChallenges.one_year_rewardAmountUSD || 0);

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-2xl font-bold">{activeChallengesCount}</div>
            <div className="flex items-center mt-1 text-sm">
            <span className="text-muted-foreground">Currently active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-2xl font-bold">{totalParticipants}</div>
            <div className="flex items-center mt-1 text-sm">
            <span className="text-muted-foreground">Across all challenges</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Earned Rewards</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-2xl font-bold">${totalRewards.toFixed(2)}</div>
            <div className="flex items-center mt-1 text-sm">
            <span className="text-muted-foreground">From all challenges</span>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

export default async function Dashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1 minute - reduce frequency of background refetches
        gcTime: 300000, // 5 minutes - keep data in cache longer
        retry: 3, // Retry failed requests 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      },
    },
  })
  let activeChallengesData: ActiveChallengesData | null = null
  
  try {
    // Add delay before making requests to avoid overwhelming the server
    console.log('Starting data prefetch with delay...');
    
    // Prefetch active challenges data using the hook's query with retry
    await queryClient.prefetchQuery({
      queryKey: ['activeChallenges'],
      queryFn: async () => {
        return await requestWithRetry(SUBGRAPH_URL, ACTIVE_CHALLENGES_QUERY, {}, headers, 3)
      },
      staleTime: 60000, // 1 minute
      gcTime: 300000, // 5 minutes
    })
    
    // Add delay between requests
    await delay(500);
    
    // Prefetch investable tokens data using the new query with retry
    await queryClient.prefetchQuery({
      queryKey: ['investable-tokens'],
      queryFn: async () => {
        return await requestWithRetry(SUBGRAPH_URL, INVESTABLE_TOKENS_QUERY, {}, headers, 3)
      },
      staleTime: 300000, // 5 minutes for less frequently changing data
      gcTime: 600000, // 10 minutes
    })

    // Add delay before final request
    await delay(300);

    // Get the data for server-side rendering with retry
    activeChallengesData = await requestWithRetry(
      SUBGRAPH_URL, 
      ACTIVE_CHALLENGES_QUERY, 
      {}, 
      headers, 
      3
    ) as ActiveChallengesData
    
    console.log('Data prefetch completed successfully');
  } catch (error) {
    console.error('Failed to prefetch data after retries:', error)
    // Continue rendering even if prefetch fails
  }
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        
        {/* Render DashboardStats directly on the server */}
        {activeChallengesData && activeChallengesData.activeChallenges && (
          <DashboardStats data={activeChallengesData} />
        )}
        
        <DashboardClientComponents />
      </div>
    </HydrationBoundary>
  )
} 