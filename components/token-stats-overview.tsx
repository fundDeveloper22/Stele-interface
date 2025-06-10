'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Coins, Users } from "lucide-react"

interface TokenStats {
  symbol: string
  totalInvestors: number
  totalValue: number
  avgHolding: number
}

interface TokenStatsOverviewProps {
  className?: string
}

export function TokenStatsOverview({ className }: TokenStatsOverviewProps) {
  // In a real implementation, this would come from aggregated subgraph data
  // For now, we'll use mock data that demonstrates the concept
  const tokenStats: TokenStats[] = [
    {
      symbol: "ETH",
      totalInvestors: 45,
      totalValue: 892156.78,
      avgHolding: 19.83
    },
    {
      symbol: "USDC", 
      totalInvestors: 38,
      totalValue: 567234.12,
      avgHolding: 14928.79
    },
    {
      symbol: "USDT",
      totalInvestors: 23,
      totalValue: 234567.89,
      avgHolding: 10198.60
    },
    {
      symbol: "BTC",
      totalInvestors: 12,
      totalValue: 1234567.90,
      avgHolding: 2.89
    }
  ]

  // Sort by total value descending
  const sortedStats = tokenStats.sort((a, b) => b.totalValue - a.totalValue)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num)
  }

  const getTokenIcon = (symbol: string) => {
    const colorMap: Record<string, string> = {
      'ETH': 'bg-blue-500',
      'USDC': 'bg-green-500', 
      'USDT': 'bg-yellow-500',
      'BTC': 'bg-orange-500'
    }
    
    return (
      <div className={`w-8 h-8 rounded-full ${colorMap[symbol] || 'bg-gray-500'} flex items-center justify-center mr-3`}>
        <span className="text-xs font-bold text-white">{symbol.slice(0, 2)}</span>
      </div>
    )
  }

  return (
    <Card className={`${className} bg-gray-900/50 border-gray-700/50`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Coins className="h-5 w-5" />
          Token Holdings Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedStats.map((stat, index) => (
            <div key={stat.symbol} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
              <div className="flex items-center">
                {getTokenIcon(stat.symbol)}
                <div>
                  <div className="font-medium flex items-center gap-2 text-gray-100">
                    {stat.symbol}
                    <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {stat.totalInvestors} investors
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatNumber(stat.avgHolding)} avg
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-100">{formatCurrency(stat.totalValue)}</div>
                <div className="text-sm text-gray-400">Total Value</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 border border-gray-700 rounded-lg bg-gradient-to-r from-blue-900/20 to-indigo-900/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {sortedStats.reduce((sum, stat) => sum + stat.totalInvestors, 0)}
              </div>
              <div className="text-xs text-gray-400">Total Positions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(sortedStats.reduce((sum, stat) => sum + stat.totalValue, 0))}
              </div>
              <div className="text-xs text-gray-400">Total Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {sortedStats.length}
              </div>
              <div className="text-xs text-gray-400">Unique Tokens</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 