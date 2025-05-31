"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, RefreshCw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react"
import { HTMLAttributes, useState } from "react"
import { cn } from "@/lib/utils"
import { useDexPrice } from "@/app/hooks/useDexPrices"
import { Badge } from "@/components/ui/badge"

interface AssetSwapDexProps extends HTMLAttributes<HTMLDivElement> {}

export function AssetSwapDex({ className, ...props }: AssetSwapDexProps) {
  const [fromAmount, setFromAmount] = useState<string>("")
  const [fromToken, setFromToken] = useState<string>("ETH")
  const [toToken, setToToken] = useState<string>("USDC")

  // Use real DEX pricing
  const { 
    data: dexPrice, 
    isLoading, 
    error,
    refetch 
  } = useDexPrice({
    fromToken,
    toToken,
    amount: fromAmount || "1", // Always get rate for 1 unit if no amount
    enabled: true
  });

  const isDataReady = !isLoading && !error && dexPrice;

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value)
    }
  }

  const availableTokens = ["ETH", "USDC", "USDT", "WETH", "cbBTC"];

  const handleTokenSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Calculate actual output amount based on user input
  const outputAmount = fromAmount && dexPrice 
    ? (parseFloat(fromAmount) * dexPrice.exchangeRate).toFixed(6)
    : dexPrice?.toAmount || "0";

  const minimumReceived = outputAmount 
    ? (parseFloat(outputAmount) * 0.99).toFixed(4)
    : "0";

  // Gas cost in USD (rough estimate)
  const gasCostUSD = dexPrice ? (dexPrice.estimatedGas * 0.000000001 * 3000 * 20).toFixed(2) : "2.50";

  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card className="border-border bg-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Swap Assets 
            <Badge variant="secondary" className="text-xs">
              {dexPrice?.route?.[0] || 'DEX'}
            </Badge>
          </CardTitle>
          <CardDescription>Real-time pricing from decentralized exchanges</CardDescription>
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
                className="bg-transparent border border-gray-300 rounded px-3 py-2 text-sm font-medium"
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
                value={outputAmount}
                readOnly
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground flex-1"
              />
              <select 
                value={toToken} 
                onChange={(e) => setToToken(e.target.value)}
                className="bg-transparent border border-gray-300 rounded px-3 py-2 text-sm font-medium"
              >
                {availableTokens.map(token => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Real DEX information section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Exchange Rate</span>
              <div className="flex items-center gap-2">
                <span className={isDataReady ? "" : "animate-pulse"}>
                  {dexPrice ? 
                    `1 ${fromToken} = ${dexPrice.exchangeRate.toFixed(6)} ${toToken}` : 
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
              <span className="text-muted-foreground">Route</span>
              <div className="flex items-center gap-1">
                <span className="text-xs">
                  {dexPrice?.route?.join(' → ') || 'Direct'}
                </span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Minimum Received</span>
              <span>{minimumReceived} {toToken}</span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Price Impact</span>
              <div className="flex items-center gap-1">
                <span className={
                  !dexPrice ? "text-muted-foreground" :
                  dexPrice.priceImpact < 0.1 ? "text-emerald-500" : 
                  dexPrice.priceImpact < 1 ? "text-yellow-500" : "text-red-500"
                }>
                  {dexPrice ? `${dexPrice.priceImpact.toFixed(3)}%` : "0.00%"}
                </span>
                {dexPrice && dexPrice.priceImpact > 0.1 && (
                  <TrendingUp className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Est. Gas Cost</span>
              <span className="text-muted-foreground">
                ~${gasCostUSD} ({dexPrice?.estimatedGas.toLocaleString() || '150,000'} gas)
              </span>
            </div>

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
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Unable to fetch live prices. Using fallback data.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!fromAmount || !isDataReady || parseFloat(fromAmount) <= 0}
          >
            {!isDataReady ? "Loading..." : 
             !fromAmount ? "Enter amount" : 
             `Swap ${fromAmount} ${fromToken}`}
          </Button>
          
          {dexPrice && (
            <div className="text-xs text-muted-foreground text-center">
              Best price found via {dexPrice.route?.[0] || 'DEX'} • Updated {new Date().toLocaleTimeString()}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
} 