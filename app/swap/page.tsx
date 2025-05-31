import { AssetSwap } from '@/components/asset-swap';
import { AssetSwapDex } from '@/components/asset-swap-dex';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface SwapPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Type as Promise
}

export default async function SwapPage({ searchParams }: SwapPageProps) {
  // Await searchParams to resolve the Promise
  const params = await searchParams;
  const challengeId = (params.challenge as string) || null;
  let title = 'Swap Assets';

  if (challengeId) {
    const formattedTitle = challengeId
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    title = `Swap Assets - ${formattedTitle}`;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href={challengeId ? `/challenge/${challengeId}` : '/'}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {challengeId ? 'Back to Challenge' : 'Back to Dashboard'}
          </Button>
        </Link>
      </div>
      
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">{title}</h1>
        
        <Tabs defaultValue="dex" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="dex" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Real DEX Prices
            </TabsTrigger>
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Basic Swap
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dex" className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Live pricing from Uniswap, 1inch and other DEXs
            </div>
            <AssetSwapDex />
          </TabsContent>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Simplified swap with CoinGecko pricing
            </div>
            <AssetSwap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}