"use client"

import { useQuery } from "@tanstack/react-query";

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

interface UseDexPriceParams {
  fromToken: string;
  toToken: string;
  amount: string;
  enabled?: boolean;
}

export function useDexPrice({ fromToken, toToken, amount, enabled = true }: UseDexPriceParams) {
  return useQuery<DexPrice>({
    queryKey: ['dex-price', fromToken, toToken, amount],
    queryFn: async () => {
      const params = new URLSearchParams({
        fromToken,
        toToken,
        amount,
      });
      
      const response = await fetch(`/api/dex-prices?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch DEX price');
      }
      return response.json();
    },
    enabled: enabled && !!fromToken && !!toToken && !!amount && parseFloat(amount) > 0,
    refetchInterval: 15000, // Update every 15 seconds for more real-time data
    staleTime: 10000, // Keep cache for 10 seconds
  });
}

// Hook for getting multiple token prices from different DEXs
export function useMultipleDexPrices(tokenPairs: Array<{from: string, to: string, amount: string}>) {
  return useQuery({
    queryKey: ['multiple-dex-prices', tokenPairs],
    queryFn: async () => {
      const promises = tokenPairs.map(async ({from, to, amount}) => {
        const params = new URLSearchParams({
          fromToken: from,
          toToken: to,
          amount,
        });
        
        const response = await fetch(`/api/dex-prices?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch price for ${from}/${to}`);
        }
        return response.json();
      });
      
      const results = await Promise.all(promises);
      return results;
    },
    enabled: tokenPairs.length > 0,
    refetchInterval: 20000,
    staleTime: 15000,
  });
}

// Uniswap V3 specific hook using The Graph
export function useUniswapV3Price(tokenA: string, tokenB: string, fee: number = 3000) {
  return useQuery({
    queryKey: ['uniswap-v3-price', tokenA, tokenB, fee],
    queryFn: async () => {
      const query = `
        query GetPool($token0: String!, $token1: String!, $fee: Int!) {
          pools(where: {
            token0: $token0,
            token1: $token1,
            feeTier: $fee
          }) {
            id
            token0Price
            token1Price
            liquidity
            sqrtPrice
            tick
            volumeUSD
            feeTier
          }
        }
      `;
      
      const response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            token0: tokenA.toLowerCase(),
            token1: tokenB.toLowerCase(),
            fee,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Uniswap V3 data');
      }
      
      const data = await response.json();
      return data.data.pools[0] || null;
    },
    enabled: !!tokenA && !!tokenB,
    refetchInterval: 30000,
    staleTime: 25000,
  });
} 