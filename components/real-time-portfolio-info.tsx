'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Zap } from "lucide-react"
import { useUserTokenPrices } from "@/app/hooks/useUniswapBatchPrices"
import { UserTokenInfo } from "@/app/hooks/useUserTokens"

interface RealTimePortfolioInfoProps {
  userTokens: UserTokenInfo[]
  seedMoney: number
  className?: string
}

export function RealTimePortfolioInfo({ userTokens, seedMoney, className }: RealTimePortfolioInfoProps) {
  const { data: uniswapPrices, isLoading: isLoadingUniswap, error: uniswapError } = useUserTokenPrices(userTokens)

  // Calculate real-time portfolio value
  const calculateRealTimeValue = () => {
    if (!uniswapPrices?.tokens || userTokens.length === 0) return 0
    
    return userTokens.reduce((total, token) => {
      const tokenPrice = uniswapPrices.tokens[token.symbol]?.priceUSD || 0
      const tokenAmount = parseFloat(token.amount) || 0
      return total + (tokenPrice * tokenAmount)
    }, 0)
  }

  const realTimeValue = calculateRealTimeValue()
  const profitLoss = realTimeValue - seedMoney
  const profitPercentage = seedMoney > 0 ? (profitLoss / seedMoney) * 100 : 0
  const isPositive = profitLoss >= 0

  // Count how many tokens have real-time prices
  const tokensWithPrices = userTokens.filter(token => 
    uniswapPrices?.tokens?.[token.symbol]?.priceUSD && uniswapPrices.tokens[token.symbol].priceUSD > 0
  ).length

  if (isLoadingUniswap) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Real-time Portfolio (Uniswap V3)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading real-time prices...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (uniswapError) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-500" />
            Real-time Portfolio (Error)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 text-sm">Failed to load real-time prices</p>
            <p className="text-xs text-muted-foreground mt-1">
              {uniswapError ? String(uniswapError) : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Real-time Portfolio (Uniswap V3)
          <Badge variant="secondary" className="ml-auto">
            {tokensWithPrices}/{userTokens.length} priced
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value */}
        <div>
          <div className="text-2xl font-bold text-green-600">
            ${realTimeValue.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Live onchain value
          </div>
        </div>

        {/* Profit/Loss */}
        <div>
          <div className={`text-xl font-semibold flex items-center gap-1 ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {isPositive ? '+' : ''}${profitLoss.toFixed(2)}
          </div>
          <div className={`text-sm ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? '+' : ''}{profitPercentage.toFixed(2)}% vs seed money
          </div>
        </div>

        {/* Data Source Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <div className="flex justify-between items-center mb-1">
            <span>Source:</span>
            <span className="font-medium">Uniswap V3 Quoter</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span>Updated:</span>
            <span className="font-medium">
              {uniswapPrices?.timestamp ? 
                new Date(uniswapPrices.timestamp).toLocaleTimeString() : 
                'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Refresh:</span>
            <span className="font-medium">Every 2 minutes</span>
          </div>
        </div>

        {/* Token Breakdown */}
        {tokensWithPrices > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Live Token Prices:
            </div>
            <div className="space-y-1">
              {userTokens.slice(0, 3).map((token, index) => {
                const tokenPrice = uniswapPrices?.tokens?.[token.symbol]?.priceUSD || 0
                const tokenAmount = parseFloat(token.amount) || 0
                const tokenValue = tokenPrice * tokenAmount
                
                if (tokenPrice === 0) return null
                
                return (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {token.symbol}: ${tokenPrice.toFixed(4)}
                    </span>
                    <span className="font-medium">
                      ${tokenValue.toFixed(2)}
                    </span>
                  </div>
                )
              })}
              {userTokens.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{userTokens.length - 3} more tokens...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 