import { AssetSwap } from '@/components/asset-swap';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';
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
          <Button variant="outline" size="sm" className="bg-gray-800 text-gray-100 border-gray-600 hover:bg-gray-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {challengeId ? 'Back to Challenge' : 'Back to Dashboard'}
          </Button>
        </Link>
      </div>
      
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-100">{title}</h1>
        
        <div className="text-center text-sm text-gray-400 mb-4 flex items-center justify-center gap-2">
          <Zap className="h-4 w-4" />
          Live pricing from Uniswap V3
        </div>
        
        <AssetSwap />
      </div>
    </div>
  );
}