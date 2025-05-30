"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, ChevronDown } from "lucide-react"
import { HTMLAttributes, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTokenPrices } from "@/app/hooks/useTokenPrices"

interface AssetSwapProps extends HTMLAttributes<HTMLDivElement> {}

export function AssetSwap({ className, ...props }: AssetSwapProps) {
  const { data: priceData, isLoading, error } = useTokenPrices();
  const [fromAmount, setFromAmount] = useState<string>("")
  const [toAmount, setToAmount] = useState<string>("")

  // Default value or loading display value
  const exchangeRate = priceData?.exchangeRate || 0;
  const isDataReady = !isLoading && !error && priceData;

  // Auto-calculate To amount when From amount changes
  useEffect(() => {
    if (fromAmount && exchangeRate && isDataReady) {
      const calculatedAmount = (parseFloat(fromAmount) * exchangeRate).toFixed(6)
      setToAmount(calculatedAmount)
    } else {
      setToAmount("")
    }
  }, [fromAmount, exchangeRate, isDataReady])

  // Calculate minimum received (1% slippage applied)
  const minReceived = toAmount ? (parseFloat(toAmount) * 0.99).toFixed(2) : "0.00"
  
  // Calculate price impact (simple example)
  const priceImpact = fromAmount ? Math.min(parseFloat(fromAmount) * 0.001, 0.5) : 0

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value)
    }
  }

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
              <span className="text-sm text-muted-foreground">Balance: 1.245 ETH</span>
            </div>
            <div className="flex items-center">
              <Input
                type="text"
                placeholder="0.0"
                value={fromAmount}
                onChange={handleFromAmountChange}
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 gap-1">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">ETH</span>
                  </div>
                  <span>ETH</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <Button variant="outline" size="icon" className="rounded-full bg-background h-10 w-10">
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              <span className="text-sm text-muted-foreground">Balance: 2,500 USDC</span>
            </div>
            <div className="flex items-center">
              <Input
                type="text"
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 gap-1">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">USD</span>
                  </div>
                  <span>USDC</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Transaction information section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className={isDataReady ? "" : "animate-pulse"}>
                {isDataReady ? `1 ETH = ${exchangeRate.toFixed(2)} USDC` : "Loading..."}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Minimum Received</span>
              <span>{minReceived} USDC</span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Price Impact</span>
              <span className={priceImpact < 0.1 ? "text-emerald-500" : priceImpact < 0.3 ? "text-yellow-500" : "text-red-500"}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">Network Fee</span>
              <span className="text-muted-foreground">~$2.50</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!fromAmount || !isDataReady || parseFloat(fromAmount) <= 0}
          >
            {!isDataReady ? "Loading..." : !fromAmount ? "Enter amount" : "Swap"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
