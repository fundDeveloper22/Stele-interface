"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, RefreshCw, TrendingUp, TrendingDown, Loader2, XCircle } from "lucide-react"
import { HTMLAttributes, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useUniswapBatchPrices, TokenInfo } from "@/app/hooks/useUniswapBatchPrices"
import { Badge } from "@/components/ui/badge"
import { UserTokenInfo } from "@/app/hooks/useUserTokens"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { STELE_CONTRACT_ADDRESS, ETHEREUM_CHAIN_ID, ETHEREUM_CHAIN_CONFIG } from "@/lib/constants"
import SteleABI from "@/app/abis/Stele.json"
import { useParams } from "next/navigation"
import { useInvestableTokensForSwap, getTokenAddressBySymbol, getTokenDecimalsBySymbol } from "@/app/hooks/useInvestableTokens"
import { ethers } from "ethers"

interface AssetSwapProps extends HTMLAttributes<HTMLDivElement> {
  userTokens?: UserTokenInfo[];
}

export function AssetSwap({ className, userTokens = [], ...props }: AssetSwapProps) {
  // Convert userTokens to TokenInfo format for uniswap price fetching
  const tokenInfos: TokenInfo[] = userTokens.map(token => ({
    symbol: token.symbol,
    address: token.address,
    decimals: parseInt(token.decimals) || 18
  }))
  
  const { data: priceData, isLoading, error, refetch } = useUniswapBatchPrices(tokenInfos);
  const { tokens: investableTokens, isLoading: isLoadingInvestableTokens, error: investableTokensError } = useInvestableTokensForSwap();
  const [fromAmount, setFromAmount] = useState<string>("")
  const [fromToken, setFromToken] = useState<string>("")
  const [toToken, setToToken] = useState<string>("WETH")
  const [isSwapping, setIsSwapping] = useState(false)
  const [isHoveringFromToken, setIsHoveringFromToken] = useState(false)

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

  // Initialize toToken when investable tokens are available (keep WETH if available)
  useEffect(() => {
    if (investableTokens.length > 0 && toToken === "WETH") {
      // Check if WETH is available in investable tokens, otherwise keep the initial WETH value
      const wethToken = investableTokens.find(token => token.symbol === "WETH");
      if (!wethToken) {
        // If WETH is not available, fallback to first available token
        setToToken(investableTokens[0].symbol);
      }
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

  // Calculate swap quote using Uniswap V3 pricing data
  const calculateUniswapSwapQuote = (
    fromTokenSymbol: string,
    toTokenSymbol: string,
    fromAmountValue: number,
    uniswapPriceData: any
  ) => {
    if (!uniswapPriceData || !fromTokenSymbol || !toTokenSymbol || fromAmountValue <= 0) return null;

    const fromPrice = uniswapPriceData.tokens?.[fromTokenSymbol]?.priceUSD;
    const toPrice = uniswapPriceData.tokens?.[toTokenSymbol]?.priceUSD;

    if (!fromPrice || !toPrice) return null;

    // Base exchange rate (without fees and slippage)
    const baseExchangeRate = fromPrice / toPrice;
    
    // Calculate value in USD
    const fromValueUSD = fromAmountValue * fromPrice;
    
    // Simulate DEX price impact based on trade size
    // Larger trades have higher price impact
    const tradeImpactMultiplier = Math.min(fromValueUSD / 10000, 0.05); // Max 5% impact
    const priceImpact = tradeImpactMultiplier * 100;
    
    // Apply price impact to exchange rate
    const impactAdjustedRate = baseExchangeRate * (1 - tradeImpactMultiplier);
    
    // Calculate output amount
    const toAmountBase = fromAmountValue * impactAdjustedRate;
    
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
      fromToken: fromTokenSymbol,
      toToken: toTokenSymbol,
      fromAmount: fromAmountValue,
      toAmount: toAmountAfterFees,
      exchangeRate: impactAdjustedRate,
      priceImpact,
      minimumReceived,
      fees: {
        network: networkFee,
        protocol: protocolFee * toPrice, // Convert to USD
      }
    };
  };

  const swapQuote = calculateUniswapSwapQuote(
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

      // Smart balance detection
      if (rawBalance.includes('.')) {
        // Already formatted (contains decimal point)
        formattedBalance = parseFloat(rawBalance);
      } else {
        // Check if this looks like a reasonable formatted balance or raw wei amount
        const rawValue = parseFloat(rawBalance);
        const decimals = parseInt(userToken.decimals);
        
        // For USDC (6 decimals), if raw value is reasonable (e.g., 100), 
        // it's likely already formatted. Raw USDC would be much larger (e.g., 100000000)
        if (fromToken === 'USDC' && rawValue < 1000000) {
          // Likely already formatted USDC
          formattedBalance = rawValue;
        } else if (rawValue < Math.pow(10, decimals)) {
          // Value is too small to be raw wei amount, likely already formatted
          formattedBalance = rawValue;
        } else {
          // Raw amount, format it
          formattedBalance = parseFloat(ethers.formatUnits(rawBalance, decimals));
        }
      }
      
      const exceedsBalance = parseFloat(fromAmount) > formattedBalance;      
      return exceedsBalance;
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
      // Limit decimal places to 4
      if (value.includes('.')) {
        const parts = value.split('.');
        if (parts[1] && parts[1].length > 4) {
          return; // Don't update if more than 4 decimal places
        }
      }
      setFromAmount(value)
    }
  }

  // Get formatted balance as number for calculations
  const getFormattedBalanceNumber = (tokenSymbol: string): number => {
    if (!tokenSymbol) return 0;
    
    const rawBalance = getFromTokenBalance(tokenSymbol);
    const userToken = userTokens.find(token => token.symbol === tokenSymbol);
    
    if (!userToken || rawBalance === '0') return 0;
    
    try {
      let formattedBalance = 0;

      // Smart balance detection (same logic as isAmountExceedsBalance)
      if (rawBalance.includes('.')) {
        // Already formatted (contains decimal point)
        formattedBalance = parseFloat(rawBalance);
      } else {
        // Check if this looks like a reasonable formatted balance or raw wei amount
        const rawValue = parseFloat(rawBalance);
        const decimals = parseInt(userToken.decimals);
        
        // For USDC (6 decimals), if raw value is reasonable (e.g., 100), 
        // it's likely already formatted. Raw USDC would be much larger (e.g., 100000000)
        if (tokenSymbol === 'USDC' && rawValue < 1000000) {
          // Likely already formatted USDC
          formattedBalance = rawValue;
        } else if (rawValue < Math.pow(10, decimals)) {
          // Value is too small to be raw wei amount, likely already formatted
          formattedBalance = rawValue;
        } else {
          // Raw amount, format it
          formattedBalance = parseFloat(ethers.formatUnits(rawBalance, decimals));
        }
      }
      
      return formattedBalance;
      
    } catch (error) {
      console.error('Error getting formatted balance:', error);
      return 0;
    }
  };

  // Handle percentage button click
  const handlePercentageClick = (percentage: number) => {
    if (!fromToken) return;
    
    const balance = getFormattedBalanceNumber(fromToken);
    if (balance <= 0) return;
    
    const amount = balance * (percentage / 100);
    setFromAmount(amount.toString());
  }

  // Get available tokens
  const availableFromTokens = userTokens.length > 0 ? userTokens.map(token => token.symbol) : (priceData?.tokens ? Object.keys(priceData.tokens) : ['ETH', 'USDC', 'USDT', 'WETH', 'WBTC']);
  const availableToTokens = investableTokens.length > 0 
    ? investableTokens.map(token => token.symbol).filter(symbol => symbol !== fromToken)
    : ['WETH', 'USDC', 'ETH', 'USDT', 'WBTC'].filter(symbol => symbol !== fromToken); // Default tokens if investable tokens not loaded

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
        return userToken.amount;
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

    // Check if user has sufficient balance - use same logic as isAmountExceedsBalance
    if (isAmountExceedsBalance()) {
      const rawBalance = getFromTokenBalance(fromToken);
      const userToken = userTokens.find(token => token.symbol === fromToken);
      
      let formattedBalance = 0;
      try {
        if (rawBalance.includes('.')) {
          formattedBalance = parseFloat(rawBalance);
        } else if (userToken) {
          const rawValue = parseFloat(rawBalance);
          const decimals = parseInt(userToken.decimals);
          
          // Use same smart detection logic
          if (fromToken === 'USDC' && rawValue < 1000000) {
            formattedBalance = rawValue;
          } else if (rawValue < Math.pow(10, decimals)) {
            formattedBalance = rawValue;
          } else {
            formattedBalance = parseFloat(ethers.formatUnits(rawBalance, decimals));
          }
        } else {
          formattedBalance = parseFloat(rawBalance);
        }
      } catch (error) {
        console.error('Error formatting balance for toast:', error);
        formattedBalance = parseFloat(rawBalance);
      }
      
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

      if (chainId !== ETHEREUM_CHAIN_ID) {
        // Switch to Ethereum network
        try {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ETHEREUM_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.phantom.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [ETHEREUM_CHAIN_CONFIG],
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
          <ToastAction altText="View on Etherscan" onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank')}>
            View on Etherscan
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
          <ToastAction altText="View on Etherscan" onClick={() => window.open(`https://etherscan.io/tx/${receipt.hash}`, '_blank')}>
            View on Etherscan
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
  const outputAmount = fromAmount && parseFloat(fromAmount) > 0 && swapQuote 
    ? (parseFloat(fromAmount) * swapQuote.exchangeRate).toFixed(6)
    : "0";
  
  const minimumReceived = fromAmount && swapQuote
    ? (parseFloat(fromAmount) * swapQuote.exchangeRate * 0.99).toFixed(4)
    : swapQuote?.minimumReceived.toFixed(4) || "0";

  // Remove loading and error states - show swap interface immediately

  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card className="bg-transparent border-0">
        <CardContent className="p-0 space-y-3">
          {/* From Token */}
          <div className="space-y-2">
            <div 
              className="p-4 bg-transparent border border-gray-600 rounded-2xl relative"
              onMouseEnter={() => setIsHoveringFromToken(true)}
              onMouseLeave={() => setIsHoveringFromToken(false)}
            >
              <div className="text-sm text-gray-400 mb-3">Sell</div>
              <div className="flex items-center justify-between min-h-[60px]">
                <div className="flex-1 min-w-0 pr-4">
                  <Input
                    placeholder="0"
                    value={fromAmount}
                    onChange={handleFromAmountChange}
                    className={`bg-transparent border-0 p-1 h-12 focus-visible:ring-0 w-full overflow-hidden text-ellipsis rounded-none outline-none ${
                      fromAmount && (isBelowMinimumSwapAmount() || isAmountExceedsBalance()) 
                        ? 'text-red-400' 
                        : 'text-white'
                    }`}
                    style={{ 
                      fontSize: fromAmount && fromAmount.length > 15 ? '1.25rem' : 
                               fromAmount && fromAmount.length > 12 ? '1.5rem' : '1.75rem', 
                      lineHeight: '1',
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    ${getSwapAmountUSD().toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 relative">
                  {/* Percentage Badges - Show on hover */}
                  {isHoveringFromToken && fromToken && getFormattedTokenBalance(fromToken) !== '0' && (
                    <div className="absolute -top-10 right-0 flex gap-1 z-10">
                      <Button
                        onClick={() => handlePercentageClick(25)}
                        className="bg-transparent border border-gray-600 hover:bg-gray-600/20 text-white text-xs px-2 py-1 h-6 rounded-full transition-all duration-200"
                        size="sm"
                      >
                        25%
                      </Button>
                      <Button
                        onClick={() => handlePercentageClick(50)}
                        className="bg-transparent border border-gray-600 hover:bg-gray-600/20 text-white text-xs px-2 py-1 h-6 rounded-full transition-all duration-200"
                        size="sm"
                      >
                        50%
                      </Button>
                      <Button
                        onClick={() => handlePercentageClick(75)}
                        className="bg-transparent border border-gray-600 hover:bg-gray-600/20 text-white text-xs px-2 py-1 h-6 rounded-full transition-all duration-200"
                        size="sm"
                      >
                        75%
                      </Button>
                      <Button
                        onClick={() => handlePercentageClick(100)}
                        className="bg-transparent border border-gray-600 hover:bg-gray-600/20 text-white text-xs px-2 py-1 h-6 rounded-full transition-all duration-200"
                        size="sm"
                      >
                        Max
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col items-end">
                    <select
                      value={fromToken}
                      onChange={(e) => setFromToken(e.target.value)}
                      className="bg-transparent hover:bg-gray-600/20 border border-gray-600 text-white rounded-full px-4 py-2 text-sm font-medium appearance-none transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0 focus:border-gray-600"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">Select</option>
                      {availableFromTokens.map((token) => (
                        <option key={token} value={token}>{token}</option>
                      ))}
                    </select>
                    <div className={`text-xs mt-1 ${
                      fromAmount && isAmountExceedsBalance() 
                        ? 'text-red-400' 
                        : 'text-gray-400'
                    }`}>
                      {getFormattedTokenBalance(fromToken)} {fromToken}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center -my-2 relative z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTokenSwap}
              className="p-2 rounded-full bg-gray-700 border-0 hover:bg-gray-600"
            >
              <ArrowDown className="h-4 w-4 text-white" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <div className="p-4 bg-transparent border border-gray-600 rounded-2xl">
              <div className="text-sm text-gray-400 mb-3">Buy</div>
              <div className="flex items-center justify-between min-h-[60px]">
                <div className="flex-1 min-w-0 pr-4">
                  <div 
                    className="text-white overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ 
                      fontSize: outputAmount && outputAmount.length > 15 ? '1.25rem' : 
                               outputAmount && outputAmount.length > 12 ? '1.5rem' : '1.75rem'
                    }}
                  >
                    {(() => {
                      if (!outputAmount || outputAmount === "0") return "0";
                      const num = parseFloat(outputAmount);
                      if (num % 1 === 0) return num.toString();
                      return num.toFixed(4).replace(/\.?0+$/, '');
                    })()}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    ${outputAmount && toToken && priceData?.tokens?.[toToken] ? 
                      (parseFloat(outputAmount) * priceData.tokens[toToken].priceUSD).toFixed(2) : "0.00"}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="bg-transparent hover:bg-gray-600/20 border border-gray-600 text-white rounded-full px-4 py-2 text-sm font-medium appearance-none transition-all duration-200 cursor-pointer focus:outline-none focus:ring-0 focus:border-gray-600"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    {availableToTokens.map((token) => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate - Simple Display */}
          {isDataReady && fromToken && toToken && swapQuote && (
            <div className="text-center text-sm text-gray-400">
              1 {fromToken} = {swapQuote.exchangeRate.toFixed(6)} {toToken}
            </div>
          )}
          <Button 
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold h-14 rounded-2xl mt-4" 
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
              'Loading Data...'
            ) : !fromAmount || parseFloat(fromAmount) <= 0 || !fromToken || !toToken ? (
              'Enter Amount'
            ) : isAmountExceedsBalance() ? (
              'Insufficient Balance'
            ) : isBelowMinimumSwapAmount() ? (
              'Minimum Amount Required'
            ) : (
              'Swap'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
