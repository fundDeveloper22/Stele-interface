'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useInvestorSnapshots } from '@/app/hooks/useInvestorSnapshots'
import { useChallenge } from '@/app/hooks/useChallenge'
import { DollarSign, TrendingUp, TrendingDown, User, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { USDC_DECIMALS } from '@/lib/constants'

interface ChartDataPoint {
  id: string
  currentUSD: number
  seedMoneyUSD: number
  profitRatio: number
  formattedDate: string
  fullDate: string
  timeLabel: string
}

interface InvestorChartsProps {
  challengeId: string
  investor: string
  investorData?: any // Add investor data prop for calculations
}

export function InvestorCharts({ challengeId, investor, investorData }: InvestorChartsProps) {
  const { data, isLoading, error } = useInvestorSnapshots(challengeId, investor, 30)
  const { data: challengeData } = useChallenge(challengeId)
  const [activeIndexPortfolio, setActiveIndexPortfolio] = useState<number | null>(null)

  const chartData = useMemo(() => {
    if (!data?.investorSnapshots) return []

    // Convert and sort data by timestamp
    const processedData = data.investorSnapshots
      .map((snapshot) => {
        const date = new Date(Number(snapshot.timestamp) * 1000)
        
        return {
          id: snapshot.id,
          currentUSD: Number(snapshot.currentUSD),
          seedMoneyUSD: Number(snapshot.seedMoneyUSD),
          profitRatio: Number(snapshot.profitRatio),
          formattedDate: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          }),
          fullDate: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          timeLabel: date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }
      })
      .sort((a, b) => a.id.localeCompare(b.id)) // Sort by timestamp (ascending)

    return processedData
  }, [data])

  // Calculate current values for headers (use the most recent snapshot)
  const currentPortfolioValue = useMemo(() => {
    if (!chartData.length) return 0
    return chartData[chartData.length - 1]?.currentUSD || 0
  }, [chartData])

  // Calculate investor metrics
  const getInvestorMetrics = () => {
    if (!investorData?.investor) {
      return {
        portfolioValue: 0,
        gainLoss: 0,
        gainLossPercentage: 0,
        isPositive: false,
        ranking: 0,
        totalRewards: '$0.00'
      }
    }

    const investor = investorData.investor
    const currentValue = parseFloat(investor.currentUSD || "0")
    // Format the raw seedMoney amount using USDC_DECIMALS
    const formattedSeedMoney = parseFloat(ethers.formatUnits(investor.seedMoneyUSD || "0", USDC_DECIMALS))
    const gainLoss = currentValue - formattedSeedMoney
    const gainLossPercentage = formattedSeedMoney > 0 ? (gainLoss / formattedSeedMoney) * 100 : 0
    const isPositive = gainLoss >= 0

    // Get challenge details for total rewards
    const totalRewards = challengeData?.challenge 
      ? `$${(parseInt(challengeData.challenge.rewardAmountUSD) / 1e18).toFixed(2)}`
      : '$0.00'

    // Get participant count for ranking estimate
    const participants = challengeData?.challenge 
      ? parseInt(challengeData.challenge.investorCounter)
      : 0

    return {
      portfolioValue: currentValue,
      gainLoss,
      gainLossPercentage,
      isPositive,
      ranking: participants, // This is an estimate - you might want to get actual ranking
      totalRewards
    }
  }

  const metrics = getInvestorMetrics()

  // Get current date for header
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const CustomTooltipPortfolio = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value
      
      return (
        <div className="bg-gray-800/95 border border-gray-600 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
          <p className="text-gray-100 text-sm font-medium">
            Portfolio: ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  const CustomCursor = ({ x, y, width, height }: any) => {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(255, 255, 255, 0.1)"
        rx={8}
        ry={8}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-3">
          <CardHeader>
            <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse mt-2 w-2/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gray-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-1">
          <CardHeader>
            <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse mt-2 w-2/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gray-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data?.investorSnapshots || chartData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-gray-100">$0</CardTitle>
            <p className="text-sm text-gray-400">{currentDate}</p>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-400">No portfolio data available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-100">Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-400">Loading portfolio data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Portfolio Value Chart - Takes 3 columns */}
      <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-3">
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl font-bold text-gray-100">
            ${currentPortfolioValue >= 1000000 ? `${(currentPortfolioValue / 1000000).toFixed(1)}M` : currentPortfolioValue >= 1000 ? `${(currentPortfolioValue / 1000).toFixed(1)}K` : currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </CardTitle>
          <p className="text-sm text-gray-400">{currentDate}</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barCategoryGap="5%"
              maxBarSize={200}
              onMouseMove={(state) => {
                if (state && typeof state.activeTooltipIndex === 'number' && state.activeTooltipIndex >= 0) {
                  setActiveIndexPortfolio(state.activeTooltipIndex)
                }
              }}
              onMouseLeave={() => setActiveIndexPortfolio(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="transparent" vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                orientation="right"
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString()}`}
              />
              <Tooltip 
                content={<CustomTooltipPortfolio />} 
                cursor={<CustomCursor />}
              />
              <Bar 
                dataKey="currentUSD" 
                radius={[3, 3, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-portfolio-${index}`} 
                    fill={
                      activeIndexPortfolio === null 
                        ? "#EC4899" // All bars pink when no hover
                        : activeIndexPortfolio === index 
                        ? "#EC4899" // Hovered bar stays pink
                        : "#3A1A3BA0" // Other bars become dark maroon purple with less transparency
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Portfolio Summary Card */}
      <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-1">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg font-bold text-gray-100">Portfolio Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Portfolio Value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Portfolio Value</span>
            </div>
            <span className="text-2xl font-bold text-gray-100">
              ${metrics.portfolioValue.toFixed(2)}
            </span>
          </div>

          {/* Gain/Loss */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {metrics.isPositive ? <TrendingUp className="h-5 w-5 text-green-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
              <span className="text-sm text-gray-400">Gain/Loss</span>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${metrics.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.isPositive ? '+' : ''}${metrics.gainLoss.toFixed(2)}
              </div>
              <div className={`text-sm ${metrics.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.isPositive ? '+' : ''}{metrics.gainLossPercentage.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Ranking</span>
            </div>
            <span className="text-xl font-bold text-gray-100">
              #{metrics.ranking}
            </span>
          </div>

          {/* Total Rewards */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Total Rewards</span>
            </div>
            <span className="text-xl font-bold text-yellow-400">
              {metrics.totalRewards}
            </span>
          </div>

          {/* Performance Indicator */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Performance</span>
              <span className={`text-sm font-medium ${metrics.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.isPositive ? 'Profitable' : 'Loss'}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ease-out ${
                  metrics.isPositive ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                style={{ width: `${Math.min(Math.abs(metrics.gainLossPercentage), 100)}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 