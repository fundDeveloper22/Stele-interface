"use client"

import { useQuery } from "@tanstack/react-query";

interface PriceData {
  eth: number;
  usdc: number;
  exchangeRate: number;
  formatted: string;
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