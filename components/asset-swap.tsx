"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, ChevronDown, RefreshCw } from "lucide-react"
import { HTMLAttributes, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTokenPrices, calculateSwapQuote } from "@/app/hooks/useTokenPrices"

interface AssetSwapProps extends HTMLAttributes<HTMLDivElement> {}

export function AssetSwap({ className, ...props }: AssetSwapProps) {
  const { data: priceData, isLoading, error } = useTokenPrices();
  const [fromAmount, setFromAmount] = useState<string>("")
  const [fromToken, setFromToken] = useState<string>("ETH")
  const [toToken, setToToken] = useState<string>("USDC")

  // Calculate swap quote using the new pricing function
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

  // Get available tokens
  const availableTokens = priceData?.tokens ? Object.keys(priceData.tokens).concat(['cbBTC']) : ['ETH', 'USDC', 'USDT', 'WETH', 'cbBTC'];

  const handleTokenSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card className="border-border bg-background">
        <CardHeader>
          <CardTitle>Swap Assets</CardTitle>
          <CardDescription>Exchange assets within the challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">Balance: 1.245 {fromToken}</span>
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
                className="bg-transparent border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {availableTokens.map(token => (
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
                value={swapQuote ? swapQuote.toAmount.toFixed(6) : ""}
                readOnly
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground flex-1"
              />
              <select 
                value={toToken} 
                onChange={(e) => setToToken(e.target.value)}
                className="bg-transparent border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {availableTokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transaction information section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Exchange Rate</span>
              <div className="flex items-center gap-1">
                <span className={isDataReady ? "" : "animate-pulse"}>
                  {swapQuote ? 
                    `1 ${fromToken} = ${swapQuote.exchangeRate.toFixed(6)} ${toToken}` : 
                    "Loading..."
                  }
                </span>
                <RefreshCw className="h-3 w-3 opacity-50" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Minimum Received</span>
              <span>
                {swapQuote ? `${swapQuote.minimumReceived.toFixed(4)} ${toToken}` : "0.00"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Price Impact</span>
              <span className={
                !swapQuote ? "text-muted-foreground" :
                swapQuote.priceImpact < 0.1 ? "text-emerald-500" : 
                swapQuote.priceImpact < 1 ? "text-yellow-500" : "text-red-500"
              }>
                {swapQuote ? `${swapQuote.priceImpact.toFixed(3)}%` : "0.00%"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Protocol Fee</span>
              <span className="text-muted-foreground">
                {swapQuote ? `$${swapQuote.fees.protocol.toFixed(2)}` : "$0.00"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="text-muted-foreground">
                ~${swapQuote?.fees.network.toFixed(2) || "2.50"}
              </span>
            </div>

            {/* Price change indicator */}
            {priceData?.tokens[fromToken]?.priceChange24h && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">24h Change ({fromToken})</span>
                <span className={
                  priceData.tokens[fromToken].priceChange24h! >= 0 
                    ? "text-emerald-500" 
                    : "text-red-500"
                }>
                  {priceData.tokens[fromToken].priceChange24h! >= 0 ? "+" : ""}
                  {priceData.tokens[fromToken].priceChange24h!.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!fromAmount || !isDataReady || parseFloat(fromAmount) <= 0 || !swapQuote}
          >
            {!isDataReady ? "Loading..." : 
             !fromAmount ? "Enter amount" : 
             !swapQuote ? "Invalid pair" : "Swap"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
