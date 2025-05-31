"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { HTMLAttributes, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTokenPrices, calculateSwapQuote } from "@/app/hooks/useTokenPrices"
import { Badge } from "@/components/ui/badge"
import { UserTokenInfo } from "@/app/hooks/useUserTokens"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { STELE_CONTRACT_ADDRESS, BASE_CHAIN_ID, BASE_CHAIN_CONFIG } from "@/lib/constants"
import SteleABI from "@/app/abis/Stele.json"
import { useParams } from "next/navigation"
import { useInvestableTokensForSwap, getTokenAddressBySymbol, getTokenDecimalsBySymbol } from "@/app/hooks/useInvestableTokens"

interface AssetSwapProps extends HTMLAttributes<HTMLDivElement> {
  userTokens?: UserTokenInfo[];
}

export function AssetSwap({ className, userTokens = [], ...props }: AssetSwapProps) {
  const { data: priceData, isLoading, error, refetch } = useTokenPrices();
  const { tokens: investableTokens, isLoading: isLoadingInvestableTokens, error: investableTokensError } = useInvestableTokensForSwap();
  const [fromAmount, setFromAmount] = useState<string>("")
  const [fromToken, setFromToken] = useState<string>("")
  const [toToken, setToToken] = useState<string>("USDC")
  const [isSwapping, setIsSwapping] = useState(false)

  // Get challengeId from URL params for contract call
  const params = useParams()
  const challengeId = params?.id || params?.challengeId || "1"

  // Initialize fromToken when userTokens are available
  useEffect(() => {
    if (userTokens.length > 0 && !fromToken) {
      setFromToken(userTokens[0].symbol);
    }
  }, [userTokens, fromToken]);

  // Initialize toToken when investable tokens are available
  useEffect(() => {
    if (investableTokens.length > 0 && (!toToken || toToken === "USDC")) {
      // Try to find USDC first, otherwise use the first available token
      const usdcToken = investableTokens.find(token => token.symbol === "USDC");
      setToToken(usdcToken?.symbol || investableTokens[0].symbol);
    }
  }, [investableTokens, toToken]);

  // Calculate swap quote using the CoinGecko pricing function
  const swapQuote = calculateSwapQuote(
    fromToken,
    toToken,
    parseFloat(fromAmount) || 0,
    priceData
  );

  const isDataReady = !isLoading && !error && priceData && !isLoadingInvestableTokens && !investableTokensError;

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value)
    }
  }

  // Get available tokens
  const availableFromTokens = userTokens.length > 0 ? userTokens.map(token => token.symbol) : (priceData?.tokens ? Object.keys(priceData.tokens) : ['ETH', 'USDC', 'USDT', 'WETH', 'BTC', 'cbBTC', 'WBTC']);
  const availableToTokens = investableTokens.map(token => token.symbol);

  // Get balance for fromToken
  const getFromTokenBalance = (tokenSymbol: string): string => {
    if (userTokens.length > 0) {
      const userToken = userTokens.find(token => token.symbol === tokenSymbol);
      return userToken?.formattedAmount || '0';
    }
    return '1.245'; // Default balance if no user tokens
  };

  // Get token address by symbol - enhanced with investable tokens
  const getTokenAddress = (tokenSymbol: string): string => {
    // First check user tokens (for from token)
    if (userTokens.length > 0) {
      const userToken = userTokens.find(token => token.symbol === tokenSymbol);
      if (userToken?.address) return userToken.address;
    }
    
    // Then check investable tokens (for to token)
    const investableTokenAddress = getTokenAddressBySymbol(investableTokens, tokenSymbol);
    if (investableTokenAddress) return investableTokenAddress;
    
    // Fallback for common tokens
    const tokenAddresses: Record<string, string> = {
      'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
      'ETH': '0x4200000000000000000000000000000000000006', // Base ETH (WETH)
      'WETH': '0x4200000000000000000000000000000000000006', // Base WETH
    };
    return tokenAddresses[tokenSymbol] || '';
  };

  // Get token decimals by symbol - enhanced with investable tokens
  const getTokenDecimals = (tokenSymbol: string): number => {
    // First check user tokens (for from token)
    if (userTokens.length > 0) {
      const userToken = userTokens.find(token => token.symbol === tokenSymbol);
      if (userToken?.decimals) return parseInt(userToken.decimals);
    }
    
    // Then check investable tokens (for to token)
    const investableTokenDecimals = getTokenDecimalsBySymbol(investableTokens, tokenSymbol);
    if (investableTokenDecimals !== 18) return investableTokenDecimals; // 18 is default, so if different, use it
    
    // Common token decimals fallback
    const tokenDecimals: Record<string, number> = {
      'USDC': 6,
      'ETH': 18,
      'WETH': 18,
      'BTC': 8,
      'WBTC': 8,
    };
    return tokenDecimals[tokenSymbol] || 18;
  };

  const handleTokenSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Execute swap on blockchain - using dynamic import for ethers
  const handleSwapTransaction = async () => {
    if (!fromAmount || !fromToken || !toToken) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select tokens and enter an amount.",
      });
      return;
    }

    if (parseFloat(fromAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount to swap.",
      });
      return;
    }

    // Check if user has sufficient balance
    const userBalance = parseFloat(getFromTokenBalance(fromToken));
    if (parseFloat(fromAmount) > userBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You don't have enough ${fromToken}. Available: ${userBalance}`,
      });
      return;
    }

    setIsSwapping(true);

    try {
      // Dynamic import of ethers to avoid SSR issues
      const { ethers } = await import('ethers');

      // Check if Phantom wallet is installed
      if (typeof window.phantom === 'undefined') {
        throw new Error("Phantom wallet is not installed. Please install it from https://phantom.app/");
      }

      if (!window.phantom?.ethereum) {
        throw new Error("Ethereum provider not found in Phantom wallet");
      }

      // Request account access
      const accounts = await window.phantom.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect to Phantom wallet first.");
      }

      // Check if we are on Base network
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== BASE_CHAIN_ID) {
        // Switch to Base network
        try {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.phantom.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_CHAIN_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.phantom.ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instance
      const steleContract = new ethers.Contract(
        STELE_CONTRACT_ADDRESS,
        SteleABI.abi,
        signer
      );

      // Get token addresses
      const fromTokenAddress = getTokenAddress(fromToken);
      const toTokenAddress = getTokenAddress(toToken);

      if (!fromTokenAddress || !toTokenAddress) {
        throw new Error(`Could not find token addresses. From: ${fromToken} (${fromTokenAddress}), To: ${toToken} (${toTokenAddress}). Please make sure the tokens are supported.`);
      }

      // Convert amount to wei format based on token decimals
      const fromTokenDecimals = getTokenDecimals(fromToken);
      const amountInWei = ethers.parseUnits(fromAmount, fromTokenDecimals);

      console.log('Swap parameters:', {
        challengeId: challengeId,
        from: fromTokenAddress,
        to: toTokenAddress,
        amount: amountInWei.toString(),
        fromToken,
        toToken,
        fromAmount,
        fromTokenDecimals,
        toTokenDecimals: getTokenDecimals(toToken)
      });

      // Call the swap function
      const tx = await steleContract.swap(
        challengeId,
        fromTokenAddress,
        toTokenAddress,
        amountInWei
      );

      toast({
        title: "Transaction Submitted",
        description: "Your swap transaction has been sent to the network.",
        action: (
          <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}>
            View on BaseScan
          </ToastAction>
        ),
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast({
          title: "Swap Successful",
          description: `Successfully swapped ${fromAmount} ${fromToken} for ${toToken}!`,
          action: (
            <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${receipt.hash}`, '_blank')}>
              View on BaseScan
            </ToastAction>
          ),
        });

        // Clear the form
        setFromAmount("");
        
        // Refresh price data
        refetch();
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error("Swap error:", error);
      
      let errorMessage = "An error occurred while swapping. Please try again.";
      
      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message?.includes("Phantom wallet is not installed")) {
        errorMessage = "Phantom wallet is not installed or Ethereum support is not enabled";
      } else if (error.message?.includes("Could not find token addresses")) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Swap Failed", 
        description: errorMessage,
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Calculate actual output amount based on user input
  const outputAmount = fromAmount && swapQuote 
    ? (parseFloat(fromAmount) * swapQuote.exchangeRate).toFixed(6)
    : swapQuote?.toAmount.toFixed(6) || "0";
  
  const minimumReceived = fromAmount && swapQuote
    ? (parseFloat(fromAmount) * swapQuote.exchangeRate * 0.99).toFixed(4)
    : swapQuote?.minimumReceived.toFixed(4) || "0";

  // Show loading state for investable tokens
  if (isLoadingInvestableTokens) {
    return (
      <div className={cn("max-w-md mx-auto", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Swap Assets</CardTitle>
            <CardDescription>Loading investable tokens...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state for investable tokens
  if (investableTokensError) {
    return (
      <div className={cn("max-w-md mx-auto", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Swap Assets</CardTitle>
            <CardDescription>Error loading investable tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load investable tokens</p>
              <p className="text-sm text-muted-foreground mt-1">
                {investableTokensError instanceof Error ? investableTokensError.message : 'Please try again later'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Swap Assets</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          <CardDescription>
            Exchange your tokens with live pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>From</span>
              <span className="text-muted-foreground">
                Balance: {getFromTokenBalance(fromToken)}
              </span>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="px-3 py-2 border rounded bg-background"
                >
                  <option value="">Select token</option>
                  {availableFromTokens.map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
                <div className="flex-1">
                  <Input
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={handleFromAmountChange}
                    className="text-right text-lg"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFromAmount(getFromTokenBalance(fromToken))}
                >
                  MAX
                </Button>
              </div>
              
              {fromToken && priceData?.tokens?.[fromToken] && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Price: ${priceData.tokens[fromToken].priceUSD}</span>
                  <span className={cn(
                    "flex items-center gap-1",
                    priceData.tokens[fromToken].priceChange24h && priceData.tokens[fromToken].priceChange24h! >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {priceData.tokens[fromToken].priceChange24h && priceData.tokens[fromToken].priceChange24h! >= 0 ? 
                      <TrendingUp className="h-3 w-3" /> : 
                      <TrendingDown className="h-3 w-3" />
                    }
                    {priceData.tokens[fromToken].priceChange24h?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTokenSwap}
              className="rounded-full p-2"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>To</span>
              <span className="text-muted-foreground">
                Estimated
              </span>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="px-3 py-2 border rounded bg-background"
                >
                  {availableToTokens.map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
                <div className="flex-1">
                  <Input
                    placeholder="0.0"
                    value={outputAmount}
                    readOnly
                    className="text-right text-lg"
                  />
                </div>
              </div>
              
              {toToken && priceData?.tokens?.[toToken] && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Price: ${priceData.tokens[toToken].priceUSD}</span>
                  <span className={cn(
                    "flex items-center gap-1",
                    priceData.tokens[toToken].priceChange24h && priceData.tokens[toToken].priceChange24h! >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {priceData.tokens[toToken].priceChange24h && priceData.tokens[toToken].priceChange24h! >= 0 ? 
                      <TrendingUp className="h-3 w-3" /> : 
                      <TrendingDown className="h-3 w-3" />
                    }
                    {priceData.tokens[toToken].priceChange24h?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Swap Details */}
          {isDataReady && fromToken && toToken && swapQuote && (
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Exchange Rate</span>
                <span>1 {fromToken} = {swapQuote.exchangeRate.toFixed(6)} {toToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Price Impact</span>
                <Badge variant={swapQuote.priceImpact < 1 ? "default" : "destructive"}>
                  {swapQuote.priceImpact.toFixed(2)}%
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Minimum Received</span>
                <span>{minimumReceived} {toToken}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSwapTransaction}
            disabled={!fromAmount || !fromToken || !toToken || !isDataReady || isSwapping}
          >
            {isSwapping ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </div>
            ) : (
              'Swap Tokens'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
