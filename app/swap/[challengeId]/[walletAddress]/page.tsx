'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Zap } from 'lucide-react'
import { AssetSwap } from '@/components/asset-swap'
import { useUserTokens } from '@/app/hooks/useUserTokens'
import { Loader2 } from 'lucide-react'
import { use } from 'react'

interface SwapPageProps {
  params: Promise<{
    challengeId: string
    walletAddress: string
  }>
}

export default function SwapPage({ params }: SwapPageProps) {
  const { challengeId, walletAddress } = use(params)
  
  // Use the new hook to get user tokens
  const { data: userTokens = [], isLoading, error } = useUserTokens(
    challengeId, 
    walletAddress
  )
  
  let title = 'Swap Assets';

  if (challengeId) {
    const formattedTitle = challengeId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    title = `Swap Assets - ${formattedTitle}`;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link href={`/challenge/${challengeId}/${walletAddress}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portfolio
            </Button>
          </Link>
        </div>
        
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
          
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading user tokens...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link href={`/challenge/${challengeId}/${walletAddress}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portfolio
            </Button>
          </Link>
        </div>
        
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
          
          <div className="text-center py-8">
            <p className="text-red-600">Error loading user tokens</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Failed to load data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href={`/challenge/${challengeId}/${walletAddress}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolio
          </Button>
        </Link>
      </div>
      
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
        
        <div className="text-center text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
          <Zap className="h-4 w-4" />
          Live pricing from Uniswap V3
        </div>
        
        <AssetSwap userTokens={userTokens} />
      </div>
    </div>
  );
}