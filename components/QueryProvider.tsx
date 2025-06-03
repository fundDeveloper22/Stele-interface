'use client';
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Longer stale time to reduce unnecessary refetches
        staleTime: 5 * 60 * 1000, // 5 minutes (increased from 1 minute)
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Only refetch if data is stale
        refetchOnReconnect: false, // Don't refetch on network reconnect
        
        // More conservative retry logic to prevent RPC spam
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number
            if (status >= 400 && status < 500) {
              return false
            }
          }
          
          // Check for RPC-specific errors
          if (error && typeof error === 'object' && 'message' in error) {
            const message = (error.message as string).toLowerCase()
            // Don't retry on rate limit or missing revert data errors
            if (message.includes('rate limit') || 
                message.includes('missing revert data') ||
                message.includes('too many requests') ||
                message.includes('call_exception')) {
              return false
            }
          }
          
          // Reduce max retry attempts from 3 to 1
          return failureCount < 1
        },
        
        // Longer delays between retries with more aggressive backoff
        retryDelay: attemptIndex => Math.min(3000 * 2 ** attemptIndex, 60000), // Start at 3s, max 60s
        
        // Disable automatic refetch intervals globally (individual hooks can override)
        refetchInterval: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export default function QueryProvider({ children }: Readonly<{children: React.ReactNode}>) {
  const queryClient = getQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
