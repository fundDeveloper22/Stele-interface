"use client"

import { useQuery } from "@tanstack/react-query";
import { useInvestorData } from "@/app/subgraph/Account";

export interface UserTokenInfo {
  address: string;
  symbol: string;
  amount: string;
  decimals: string;
  formattedAmount: string;
}

// Format token amount with proper decimals
const formatTokenAmount = (amount: string, decimals: string | number) => {
  if (!amount || !decimals) return '0'
  
  try {
    const decimalPlaces = typeof decimals === 'string' ? parseInt(decimals) : decimals
    const amountBN = BigInt(amount)
    const divisor = BigInt(10 ** decimalPlaces)
    const quotient = amountBN / divisor
    const remainder = amountBN % divisor
    
    if (remainder === BigInt(0)) {
      return quotient.toString()
    }
    
    const fractionalPart = remainder.toString().padStart(decimalPlaces, '0')
    return `${quotient}.${fractionalPart.replace(/0+$/, '')}`
  } catch (error) {
    console.error('Error formatting token amount:', error)
    return '0'
  }
}

export function useUserTokens(challengeId: string, walletAddress: string) {
  // Get investor data
  const { data: investorData, isLoading: isLoadingInvestor, error: investorError } = useInvestorData(
    challengeId, 
    walletAddress
  );

  // Process and cache the token data
  return useQuery<UserTokenInfo[]>({
    queryKey: ['userTokens', challengeId, walletAddress],
    queryFn: () => {
      if (!investorData?.investor) {
        return [];
      }

      const investor = investorData.investor;
      const tokens = investor.tokens || [];
      const tokensAmount = investor.tokensAmount || [];
      const tokensSymbols = investor.tokensSymbols || [];
      const tokensDecimals = investor.tokensDecimals || [];

      // Create formatted token info array
      const userTokens: UserTokenInfo[] = tokens.map((address, index) => ({
        address,
        symbol: tokensSymbols[index] || `TOKEN_${index}`,
        amount: tokensAmount[index] || '0',
        decimals: tokensDecimals[index] || '18',
        formattedAmount: formatTokenAmount(tokensAmount[index] || '0', tokensDecimals[index] || '18')
      }));

      return userTokens;
    },
    enabled: !!investorData?.investor,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

// Additional helper hooks for specific use cases
export function useUserTokenBalance(challengeId: string, walletAddress: string, tokenSymbol: string) {
  const { data: userTokens } = useUserTokens(challengeId, walletAddress);
  
  const token = userTokens?.find(token => token.symbol === tokenSymbol);
  return {
    balance: token?.formattedAmount || '0',
    rawAmount: token?.amount || '0',
    decimals: token?.decimals || '18',
    address: token?.address || ''
  };
}

export function useUserTokenBySymbol(challengeId: string, walletAddress: string, tokenSymbol: string) {
  const { data: userTokens } = useUserTokens(challengeId, walletAddress);
  return userTokens?.find(token => token.symbol === tokenSymbol) || null;
} 