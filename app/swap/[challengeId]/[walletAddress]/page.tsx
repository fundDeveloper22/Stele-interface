'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Zap } from 'lucide-react'
import { AssetSwap } from '@/components/asset-swap'

export default function SwapPage() {
  const params = useParams()
  const { challengeId, walletAddress } = params
  
  let title = 'Swap Assets';

  if (challengeId) {
    const formattedTitle = (challengeId as string)
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    title = `Swap Assets - ${formattedTitle}`;
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
          Live pricing from CoinGecko API
        </div>
        
        <AssetSwap />
      </div>
    </div>
  );
}