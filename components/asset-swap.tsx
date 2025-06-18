"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, RefreshCw, TrendingUp, TrendingDown, Loader2, XCircle } from "lucide-react"
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
import { ethers } from "ethers"

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

  // Minimum swap amount in USD (greater than or equal to)
  const MINIMUM_SWAP_USD = 10.0;

  // Get challengeId from URL params for contract call
  const params = useParams()
  const challengeId = params?.id || params?.challengeId || "1"

  // Helper function to format token amounts for display
  const formatTokenAmount = (rawAmount: string, decimals: string): string => {
    try {
      const formatted = ethers.formatUnits(rawAmount, parseInt(decimals))
      const num = parseFloat(formatted)
      
      // Format for better readability without K/M abbreviations
      if (num >= 1) {
        return num.toFixed(4)
      } else {
        return num.toFixed(6)
      }
    } catch (error) {
      return rawAmount // Fallback to raw amount if formatting fails
    }
  }

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

  // Auto-change toToken if it becomes the same as fromToken
  useEffect(() => {
    if (fromToken && toToken && fromToken === toToken) {
      // Find the first available token that's different from fromToken
      const differentToken = investableTokens
        .map(token => token.symbol)
        .find(symbol => symbol !== fromToken);
      
      if (differentToken) {
        setToToken(differentToken);
      }
    }
  }, [fromToken, toToken, investableTokens]);

  // Calculate swap quote using the CoinGecko pricing function
  const swapQuote = calculateSwapQuote(
    fromToken,
    toToken,
    parseFloat(fromAmount) || 0,
    priceData
  );

  // Check if selected tokens have price data available
  const hasFromTokenData = fromToken ? priceData?.tokens?.[fromToken] !== undefined : true;
  const hasToTokenData = toToken ? priceData?.tokens?.[toToken] !== undefined : true;

  const isDataReady = !isLoading && !error && priceData && !isLoadingInvestableTokens && !investableTokensError && hasFromTokenData && hasToTokenData;

  // Get the reason why data is not ready
  const getDisabledReason = (): string => {
    if (isLoading) return "Loading price data...";
    if (error) return "Failed to load price data";
    if (!priceData) return "No price data available";
    if (isLoadingInvestableTokens) return "Loading investable tokens...";
    if (investableTokensError) return "Failed to load investable tokens";
    if (fromToken && !hasFromTokenData) return `Price data not available for ${fromToken}`;
    if (toToken && !hasToTokenData) return `Price data not available for ${toToken}`;
    return "";
  };

  const disabledReason = getDisabledReason();

  // Helper function to check if input amount exceeds available balance
  const isAmountExceedsBalance = (): boolean => {
    if (!fromAmount || !fromToken || parseFloat(fromAmount) <= 0) return false;
    
    const rawBalance = getFromTokenBalance(fromToken);
    const userToken = userTokens.find(token => token.symbol === fromToken);
    
    if (!userToken || rawBalance === '0') return false;
    
    try {
      let formattedBalance = 0;
      if (rawBalance.includes('.')) {
        // Already formatted
        formattedBalance = parseFloat(rawBalance);
      } else {
        // Raw amount, format it
        formattedBalance = parseFloat(ethers.formatUnits(rawBalance, parseInt(userToken.decimals)));
      }
      
      return parseFloat(fromAmount) > formattedBalance;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  };

  // Helper function to check if input amount is below minimum swap amount ($10 USD)
  const isBelowMinimumSwapAmount = (): boolean => {
    if (!fromAmount || !fromToken || parseFloat(fromAmount) <= 0) return false;
    
    const tokenPrice = priceData?.tokens?.[fromToken]?.priceUSD;
    if (!tokenPrice) return false;
    
    const usdValue = parseFloat(fromAmount) * tokenPrice;
    
    // Use a small epsilon to handle floating point precision issues
    const epsilon = 0.001; // $0.001 tolerance
    const isBelowMin = usdValue < (MINIMUM_SWAP_USD - epsilon);
    
    return isBelowMin; // Must be $10.00 or higher with tolerance
  };

  // Get USD value of the current input amount
  const getSwapAmountUSD = (): number => {
    if (!fromAmount || !fromToken || parseFloat(fromAmount) <= 0) return 0;
    
    const tokenPrice = priceData?.tokens?.[fromToken]?.priceUSD;
    if (!tokenPrice) return 0;
    
    return parseFloat(fromAmount) * tokenPrice;
  };

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value)
    }
  }

  // Get available tokens
  const availableFromTokens = userTokens.length > 0 ? userTokens.map(token => token.symbol) : (priceData?.tokens ? Object.keys(priceData.tokens) : ['ETH', 'USDC', 'USDT', 'WETH', 'BTC', 'cbBTC', 'WBTC']);
  const availableToTokens = investableTokens
    .map(token => token.symbol)
    .filter(symbol => symbol !== fromToken); // Filter out the selected fromToken

  // Get balance for fromToken (raw amount)
  const getFromTokenBalance = (tokenSymbol: string): string => {
    if (userTokens.length > 0) {
      const userToken = userTokens.find(token => token.symbol === tokenSymbol);
      return userToken?.amount || '0';
    }
    return '0'; // Default balance if no user tokens
  };

  // Get formatted balance for display
  const getFormattedTokenBalance = (tokenSymbol: string): string => {
    if (userTokens.length > 0) {
      const userToken = userTokens.find(token => token.symbol === tokenSymbol);
      if (userToken) {
        return formatTokenAmount(userToken.amount, userToken.decimals);
      }
    }
    return '0'; // Default balance if no user tokens
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
    const rawBalance = getFromTokenBalance(fromToken);
    const userToken = userTokens.find(token => token.symbol === fromToken);
    
    // Safe format function for balance comparison
    let formattedBalance = 0;
    try {
      if (rawBalance.includes('.')) {
        // Already formatted
        formattedBalance = parseFloat(rawBalance);
      } else if (userToken) {
        // Raw amount, format it
        formattedBalance = parseFloat(ethers.formatUnits(rawBalance, parseInt(userToken.decimals)));
      } else {
        formattedBalance = parseFloat(rawBalance);
      }
    } catch (error) {
      console.error('Error formatting balance for comparison:', error);
      formattedBalance = parseFloat(rawBalance);
    }
    
    if (parseFloat(fromAmount) > formattedBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You don't have enough ${fromToken}. Available: ${formattedBalance.toFixed(6)}`,
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
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-100">Swap Assets</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-100 hover:bg-gray-800"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          <CardDescription className="text-gray-400">
            Exchange your tokens with live pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">From</span>
              <span className="text-gray-400">
                Balance: {getFormattedTokenBalance(fromToken)}
              </span>
            </div>
            <div className="p-4 border border-gray-700 bg-gray-800/30 rounded-lg space-y-2">
              <div className="flex gap-2">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100"
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
                    className={cn(
                      "text-right text-lg bg-gray-800 text-gray-100 placeholder:text-gray-500",
                      (isAmountExceedsBalance() || isBelowMinimumSwapAmount()) 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-gray-600"
                    )}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rawBalance = getFromTokenBalance(fromToken);
                    const userToken = userTokens.find(token => token.symbol === fromToken);
                    if (userToken && rawBalance !== '0') {
                      // Safe format function to handle both raw and formatted amounts
                      try {
                        // Check if rawBalance is already formatted (contains decimal point)
                        if (rawBalance.includes('.')) {
                          // Already formatted, use directly
                          setFromAmount(rawBalance);
                        } else {
                          // Raw amount, format it
                          const formattedBalance = ethers.formatUnits(rawBalance, parseInt(userToken.decimals));
                          setFromAmount(formattedBalance);
                        }
                      } catch (error) {
                        console.error('Error formatting balance for MAX button:', error);
                        // Fallback: use raw amount directly
                        setFromAmount(rawBalance);
                      }
                    }
                  }}
                  className="bg-gray-800 text-gray-100 border-gray-600 hover:bg-gray-700"
                >
                  MAX
                </Button>
              </div>
              
              {fromToken && priceData?.tokens?.[fromToken] && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Price: ${priceData.tokens[fromToken].priceUSD}</span>
                    <span className={cn(
                      "flex items-center gap-1",
                      priceData.tokens[fromToken].priceChange24h && priceData.tokens[fromToken].priceChange24h! >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {priceData.tokens[fromToken].priceChange24h && priceData.tokens[fromToken].priceChange24h! >= 0 ? 
                        <TrendingUp className="h-3 w-3" /> : 
                        <TrendingDown className="h-3 w-3" />
                      }
                      {priceData.tokens[fromToken].priceChange24h?.toFixed(2) || 'N/A'}%
                    </span>
                  </div>
                  {fromAmount && parseFloat(fromAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">USD Value:</span>
                                            <span className={cn(
                        "font-medium",
                        isBelowMinimumSwapAmount() ? "text-red-400" : "text-gray-300"
                      )}>
                         ${getSwapAmountUSD().toFixed(2)}
                          {isBelowMinimumSwapAmount() && ` (Min: $${MINIMUM_SWAP_USD.toFixed(2)})`}
                       </span>
                    </div>
                  )}
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
              className="rounded-full p-2 bg-gray-800 border-gray-600 hover:bg-gray-700 text-gray-100"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">To</span>
              <span className="text-gray-400">
                Estimated
              </span>
            </div>
            <div className="p-4 border border-gray-700 bg-gray-800/30 rounded-lg space-y-2">
              <div className="flex gap-2">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100"
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
                    className="text-right text-lg bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500"
                  />
                </div>
              </div>
              
              {toToken && priceData?.tokens?.[toToken] && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Price: ${priceData.tokens[toToken].priceUSD}</span>
                  <span className={cn(
                    "flex items-center gap-1",
                    priceData.tokens[toToken].priceChange24h && priceData.tokens[toToken].priceChange24h! >= 0 ? "text-green-400" : "text-red-400"
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

          {/* Insufficient Balance Warning */}
          {isAmountExceedsBalance() && (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-300">
                    Insufficient Balance
                  </h4>
                  <p className="text-sm text-red-400 mt-1">
                    You don't have enough {fromToken}. Available: {getFormattedTokenBalance(fromToken)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Minimum Swap Amount Warning */}
          {isBelowMinimumSwapAmount() && !isAmountExceedsBalance() && (
            <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-300">
                    Minimum Swap Amount Required
                  </h4>
                  <p className="text-sm text-amber-400 mt-1">
                    Current value: ${getSwapAmountUSD().toFixed(2)} USD. Minimum required: ${MINIMUM_SWAP_USD.toFixed(2)} USD.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Ready Status Warning */}
          {!isDataReady && (
            <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-300">
                    Swap Currently Unavailable
                  </h4>
                  <p className="text-sm text-amber-400 mt-1">
                    {disabledReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Swap Details */}
          {isDataReady && fromToken && toToken && swapQuote && (
            <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Exchange Rate</span>
                <span>1 {fromToken} = {swapQuote.exchangeRate.toFixed(6)} {toToken}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Estimated Received</span>
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
            disabled={(() => {
              const conditions = {
                noFromAmount: !fromAmount,
                invalidAmount: parseFloat(fromAmount) <= 0,
                noFromToken: !fromToken,
                noToToken: !toToken,
                dataNotReady: !isDataReady,
                isSwapping: isSwapping,
                exceedsBalance: isAmountExceedsBalance(),
                belowMinimum: isBelowMinimumSwapAmount()
              };
              
              const isDisabled = Object.values(conditions).some(condition => condition);  
              return isDisabled;
            })()}
          >
            {isSwapping ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </div>
            ) : !isDataReady ? (
              <div className="flex items-center">
                <XCircle className="mr-2 h-4 w-4" />
                Data Loading...
              </div>
            ) : !fromAmount || parseFloat(fromAmount) <= 0 || !fromToken || !toToken ? (
              'Enter Amount to Swap'
            ) : isAmountExceedsBalance() ? (
              <div className="flex items-center">
                <XCircle className="mr-2 h-4 w-4" />
                Insufficient Balance
              </div>
            ) : isBelowMinimumSwapAmount() ? (
              <div className="flex items-center">
                <XCircle className="mr-2 h-4 w-4" />
                Minimum $${MINIMUM_SWAP_USD.toFixed(0)} Required (Current: ${getSwapAmountUSD().toFixed(2)})
              </div>
            ) : (
              `Swap Tokens ($${getSwapAmountUSD().toFixed(2)})`
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
