import { NextRequest } from 'next/server';

// Token addresses on Base chain
const TOKEN_ADDRESSES = {
  'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH
  'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  'USDT': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // USDT on Base
  'WETH': '0x4200000000000000000000000000000000000006', // Wrapped ETH on Base
  'cbBTC': '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // Coinbase Wrapped Bitcoin on Base
} as const;

const BASE_CHAIN_ID = 8453;

interface OneInchQuoteResponse {
  dstAmount: string;
  srcAmount: string;
  dstToken: {
    symbol: string;
    decimals: number;
    address: string;
  };
  srcToken: {
    symbol: string;
    decimals: number;
    address: string;
  };
  protocols: any[];
  estimatedGas: number;
}

interface DexPrice {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  exchangeRate: number;
  priceImpact: number;
  estimatedGas: number;
  route: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromToken = searchParams.get('fromToken') || 'ETH';
    const toToken = searchParams.get('toToken') || 'USDC';
    const amount = searchParams.get('amount') || '1';
    
    const fromTokenAddress = TOKEN_ADDRESSES[fromToken as keyof typeof TOKEN_ADDRESSES];
    const toTokenAddress = TOKEN_ADDRESSES[toToken as keyof typeof TOKEN_ADDRESSES];
    
    if (!fromTokenAddress || !toTokenAddress) {
      return Response.json({ error: 'Unsupported token pair' }, { status: 400 });
    }

    // Convert amount to wei (assuming 18 decimals for simplicity)
    const amountInWei = (parseFloat(amount) * 1e18).toString();

    // 1inch API quote request
    const oneInchUrl = new URL(`https://api.1inch.dev/swap/v5.2/${BASE_CHAIN_ID}/quote`);
    oneInchUrl.searchParams.set('src', fromTokenAddress);
    oneInchUrl.searchParams.set('dst', toTokenAddress);
    oneInchUrl.searchParams.set('amount', amountInWei);

    const response = await fetch(oneInchUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback to mock data if 1inch API fails
      console.warn('1inch API failed, using fallback');
      return getFallbackPrice(fromToken, toToken, amount);
    }

    const data: OneInchQuoteResponse = await response.json();
    
    // Convert amounts back to human readable
    const fromAmountDecimal = parseFloat(data.srcAmount) / Math.pow(10, data.srcToken.decimals);
    const toAmountDecimal = parseFloat(data.dstAmount) / Math.pow(10, data.dstToken.decimals);
    
    const exchangeRate = toAmountDecimal / fromAmountDecimal;
    
    // Calculate price impact (simplified)
    const marketRate = await getMarketRate(fromToken, toToken);
    const priceImpact = marketRate ? Math.abs((exchangeRate - marketRate) / marketRate * 100) : 0;

    const dexPrice: DexPrice = {
      fromToken,
      toToken,
      fromAmount: fromAmountDecimal.toString(),
      toAmount: toAmountDecimal.toString(),
      exchangeRate,
      priceImpact,
      estimatedGas: data.estimatedGas,
      route: data.protocols?.map(p => p.name || 'Unknown') || ['1inch']
    };

    return Response.json(dexPrice);

  } catch (error) {
    console.error('DEX price fetch error:', error);
    
    // Fallback to mock data
    const fromToken = request.nextUrl.searchParams.get('fromToken') || 'ETH';
    const toToken = request.nextUrl.searchParams.get('toToken') || 'USDC';
    const amount = request.nextUrl.searchParams.get('amount') || '1';
    
    return getFallbackPrice(fromToken, toToken, amount);
  }
}

// Fallback function for when APIs are unavailable
async function getFallbackPrice(fromToken: string, toToken: string, amount: string) {
  // Use CoinGecko as fallback
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,coinbase-wrapped-btc,bitcoin&vs_currencies=usd'
    );
    const data = await response.json();
    
    // Map tokens to CoinGecko prices
    const tokenPrices: Record<string, number> = {
      'ETH': data.ethereum?.usd || 3000,
      'USDC': data['usd-coin']?.usd || 1,
      'USDT': 1, // USDT assumed to be $1
      'WETH': data.ethereum?.usd || 3000,
      'cbBTC': data['coinbase-wrapped-btc']?.usd || data.bitcoin?.usd || 60000,
    };
    
    const fromPrice = tokenPrices[fromToken] || 1;
    const toPrice = tokenPrices[toToken] || 1;
    const exchangeRate = fromPrice / toPrice;
    const toAmount = parseFloat(amount) * exchangeRate;

    return Response.json({
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: toAmount.toString(),
      exchangeRate,
      priceImpact: 0.1,
      estimatedGas: 150000,
      route: ['CoinGecko Fallback']
    });
  } catch {
    // Final fallback with mock data
    const mockPrices: Record<string, number> = {
      'ETH': 3000,
      'USDC': 1,
      'USDT': 1,
      'WETH': 3000,
      'cbBTC': 60000,
    };
    
    const fromPrice = mockPrices[fromToken] || 1;
    const toPrice = mockPrices[toToken] || 1;
    const exchangeRate = fromPrice / toPrice;
    
    return Response.json({
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: (parseFloat(amount) * exchangeRate).toString(),
      exchangeRate,
      priceImpact: 0.1,
      estimatedGas: 150000,
      route: ['Mock Data']
    });
  }
}

// Get market rate for price impact calculation
async function getMarketRate(fromToken: string, toToken: string): Promise<number | null> {
  try {
    // Handle ETH/USDC pair
    if (fromToken === 'ETH' && toToken === 'USDC') {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      const data = await response.json();
      return data.ethereum?.usd || null;
    }
    
    // Handle cbBTC pairs
    if (fromToken === 'cbBTC' || toToken === 'cbBTC') {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=coinbase-wrapped-btc,bitcoin,ethereum,usd-coin&vs_currencies=usd'
      );
      const data = await response.json();
      
      const prices: Record<string, number> = {
        'cbBTC': data['coinbase-wrapped-btc']?.usd || data.bitcoin?.usd || 60000,
        'ETH': data.ethereum?.usd || 3000,
        'USDC': data['usd-coin']?.usd || 1,
        'USDT': 1,
        'WETH': data.ethereum?.usd || 3000,
      };
      
      const fromPrice = prices[fromToken];
      const toPrice = prices[toToken];
      
      if (fromPrice && toPrice) {
        return fromPrice / toPrice;
      }
    }
    
    return null;
  } catch {
    return null;
  }
} 