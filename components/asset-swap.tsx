"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, RefreshCw, TrendingUp, TrendingDown } from "lucide-react"
import { HTMLAttributes, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTokenPrices, calculateSwapQuote } from "@/app/hooks/useTokenPrices"
import { Badge } from "@/components/ui/badge"
import { UserTokenInfo } from "@/app/hooks/useUserTokens"

interface AssetSwapProps extends HTMLAttributes<HTMLDivElement> {
  userTokens?: UserTokenInfo[];
}

export function AssetSwap({ className, userTokens = [], ...props }: AssetSwapProps) {
  const { data: priceData, isLoading, error, refetch } = useTokenPrices();
  const [fromAmount, setFromAmount] = useState<string>("")
  const [fromToken, setFromToken] = useState<string>("")
  const [toToken, setToToken] = useState<string>("USDC")

  // Initialize fromToken when userTokens are available
  useEffect(() => {
    if (userTokens.length > 0 && !fromToken) {
      setFromToken(userTokens[0].symbol);
    }
  }, [userTokens, fromToken]);

  // Calculate swap quote using the CoinGecko pricing function
  const swapQuote = calculateSwapQuote(
    fromToken,
    toToken,
    parseFloat(fromAmount) || 0,
    priceData
  );

  const isDataReady = !isLoading && !error && priceData;

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value)
    }
  }

  // Get available tokens - use userTokens for 'from' selection, all tokens for 'to' selection
  const availableFromTokens = userTokens.length > 0 ? userTokens.map(token => token.symbol) : (priceData?.tokens ? Object.keys(priceData.tokens) : ['ETH', 'USDC', 'USDT', 'WETH', 'BTC', 'cbBTC', 'WBTC']);
  const availableToTokens = priceData?.tokens ? Object.keys(priceData.tokens) : ['ETH', 'USDC', 'USDT', 'WETH', 'BTC', 'cbBTC', 'WBTC'];

  // Get balance for fromToken
  const getFromTokenBalance = (tokenSymbol: string): string => {
    if (userTokens.length > 0) {
      const userToken = userTokens.find(token => token.symbol === tokenSymbol);
      return userToken?.formattedAmount || '0';
    }
    return '1.245'; // Default balance if no user tokens
  };

  const handleTokenSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Calculate actual output amount based on user input
  const outputAmount = fromAmount && swapQuote 
    ? (parseFloat(fromAmount) * swapQuote.exchangeRate).toFixed(6)
    : swapQuote?.toAmount.toFixed(6) || "0";
  
  const minimumReceived = fromAmount && swapQuote
    ? (parseFloat(fromAmount) * swapQuote.exchangeRate * 0.99).toFixed(4)
    : swapQuote?.minimumReceived.toFixed(4) || "0";

  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card className="border-border bg-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Swap Assets 
            <Badge variant="secondary" className="text-xs">
              {priceData?.source?.includes('CoinGecko') ? 'CoinGecko' : 'Fallback'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {priceData?.source || 'Live pricing from CoinGecko API'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Balance: {getFromTokenBalance(fromToken)} {fromToken}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-blue-500 hover:text-blue-700"
                  onClick={() => setFromAmount(getFromTokenBalance(fromToken))}
                >
                  MAX
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="0.0"
                value={fromAmount}
                onChange={handleFromAmountChange}
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              />
              <select 
                value={fromToken} 
                onChange={(e) => setFromToken(e.target.value)}
                className="bg-transparent border border-gray-300 rounded px-3 py-2 text-sm font-medium"
              >
                {availableFromTokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full bg-background h-10 w-10"
              onClick={handleTokenSwap}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">To (estimated)</span>
              <span className="text-sm text-muted-foreground">Balance: 2,500 {toToken}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="0.0"
                value={outputAmount}
                readOnly
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground flex-1"
              />
              <select 
                value={toToken} 
                onChange={(e) => setToToken(e.target.value)}
                className="bg-transparent border border-gray-300 rounded px-3 py-2 text-sm font-medium"
              >
                {availableToTokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Enhanced pricing information section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Exchange Rate</span>
              <div className="flex items-center gap-2">
                <span className={isDataReady ? "" : "animate-pulse"}>
                  {swapQuote ? 
                    `1 ${fromToken} = ${swapQuote.exchangeRate.toFixed(6)} ${toToken}` : 
                    "Loading..."
                  }
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 opacity-70 hover:opacity-100" 
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Price Source</span>
              <span className="text-xs">CoinGecko API</span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Minimum Received</span>
              <span>{minimumReceived} {toToken}</span>
            </div>

            {/* 24h Price change indicators for both tokens */}
            {priceData?.tokens[fromToken]?.priceChange24h !== undefined && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">24h Change ({fromToken})</span>
                <div className="flex items-center gap-1">
                  <span className={
                    priceData.tokens[fromToken].priceChange24h! >= 0 
                      ? "text-emerald-500" 
                      : "text-red-500"
                  }>
                    {priceData.tokens[fromToken].priceChange24h! >= 0 ? "+" : ""}
                    {priceData.tokens[fromToken].priceChange24h!.toFixed(2)}%
                  </span>
                  {priceData.tokens[fromToken].priceChange24h! >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
            )}

            {priceData?.tokens[toToken]?.priceChange24h !== undefined && toToken !== fromToken && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">24h Change ({toToken})</span>
                <div className="flex items-center gap-1">
                  <span className={
                    priceData.tokens[toToken].priceChange24h! >= 0 
                      ? "text-emerald-500" 
                      : "text-red-500"
                  }>
                    {priceData.tokens[toToken].priceChange24h! >= 0 ? "+" : ""}
                    {priceData.tokens[toToken].priceChange24h!.toFixed(2)}%
                  </span>
                  {priceData.tokens[toToken].priceChange24h! >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
            )}

            {/* Network status indicator */}
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Network</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Base Mainnet</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Using fallback pricing data. Prices may not be current.
              </p>
            </div>
          )}

          {priceData?.error && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                ℹ️ {priceData.error}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!fromAmount || !isDataReady || parseFloat(fromAmount) <= 0 || !swapQuote}
          >
            {!isDataReady ? "Loading..." : 
             !fromAmount ? "Enter amount" : 
             !swapQuote ? "Invalid pair" : 
             `Swap ${fromAmount} ${fromToken}`}
          </Button>
          
          {swapQuote && priceData && (
            <div className="text-xs text-muted-foreground text-center">
              Updated {new Date(priceData.timestamp).toLocaleTimeString()}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
