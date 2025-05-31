"use client"

import { useQuery } from "@tanstack/react-query";

interface TokenPrice {
  symbol: string;
  priceUSD: number;
  priceChange24h?: number;
}

interface PriceData {
  tokens: Record<string, TokenPrice>;
  timestamp: number;
}

interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  priceImpact: number;
  minimumReceived: number;
  fees: {
    network: number;
    protocol: number;
  };
}

export function useTokenPrices() {
  return useQuery<PriceData>({
    queryKey: ['token-prices'],
    queryFn: async () => {
      const response = await fetch('/api/prices');
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
      return response.json();
    },
    refetchInterval: 30000, // Update every 30 seconds
    staleTime: 25000, // Keep cache for 25 seconds
  });
}

// Calculate swap quote with proper DEX-style pricing
export function calculateSwapQuote(
  fromToken: string,
  toToken: string,
  fromAmount: number,
  priceData: PriceData | undefined
): SwapQuote | null {
  if (!priceData || !fromAmount || fromAmount <= 0) return null;

  const fromPrice = priceData.tokens[fromToken]?.priceUSD;
  const toPrice = priceData.tokens[toToken]?.priceUSD;

  if (!fromPrice || !toPrice) return null;

  // Base exchange rate (without fees and slippage)
  const baseExchangeRate = fromPrice / toPrice;
  
  // Calculate value in USD
  const fromValueUSD = fromAmount * fromPrice;
  
  // Simulate DEX price impact based on trade size
  // Larger trades have higher price impact
  const tradeImpactMultiplier = Math.min(fromValueUSD / 10000, 0.05); // Max 5% impact
  const priceImpact = tradeImpactMultiplier * 100;
  
  // Apply price impact to exchange rate
  const impactAdjustedRate = baseExchangeRate * (1 - tradeImpactMultiplier);
  
  // Calculate output amount
  const toAmountBase = fromAmount * impactAdjustedRate;
  
  // Protocol fees (0.3% typical for AMM DEXs)
  const protocolFeeRate = 0.003;
  const protocolFee = toAmountBase * protocolFeeRate;
  
  // Final amount after fees
  const toAmountAfterFees = toAmountBase - protocolFee;
  
  // Slippage tolerance (1%)
  const slippageTolerance = 0.01;
  const minimumReceived = toAmountAfterFees * (1 - slippageTolerance);
  
  // Network fees (estimated)
  const networkFee = 2.5; // USD

  return {
    fromToken,
    toToken,
    fromAmount,
    toAmount: toAmountAfterFees,
    exchangeRate: impactAdjustedRate,
    priceImpact,
    minimumReceived,
    fees: {
      network: networkFee,
      protocol: protocolFee * toPrice, // Convert to USD
    }
  };
} 