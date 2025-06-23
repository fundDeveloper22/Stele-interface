'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceDot } from 'recharts'
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
  dateLabel: string
  isRealTime?: boolean
}

interface RealTimePortfolio {
  totalValue: number
  tokensWithPrices: number
  totalTokens: number
  timestamp: number
}

interface InvestorChartsProps {
  challengeId: string
  investor: string
  investorData?: any // Add investor data prop for calculations
  realTimePortfolio?: RealTimePortfolio | null
}

export function InvestorCharts({ challengeId, investor, investorData, realTimePortfolio }: InvestorChartsProps) {
  const { data, isLoading, error } = useInvestorSnapshots(challengeId, investor, 30)
  const { data: challengeData } = useChallenge(challengeId)
  const [activeIndexPortfolio, setActiveIndexPortfolio] = useState<number | null>(null)

  // Helper function to safely format USD values
  const formatUSDValue = (value: string | undefined, decimals: number = USDC_DECIMALS): number => {
    if (!value || value === "0") return 0
    
    // If the value contains a decimal point, it's already formatted
    if (value.includes('.')) {
      return parseFloat(value)
    }
    
    // If no decimal point, it's likely a raw integer amount that needs formatting
    try {
      return parseFloat(ethers.formatUnits(value, decimals))
    } catch (error) {
      // Fallback: treat as already formatted number
      return parseFloat(value)
    }
  }

  const chartData = useMemo(() => {
    if (!data?.investorSnapshots) return []

    // Convert and sort data by timestamp
    const processedData = data.investorSnapshots
      .map((snapshot, index) => {
        const date = new Date(Number(snapshot.timestamp) * 1000)
        
        return {
          id: `${snapshot.id}-${index}`,
          // Format raw currentUSD amount using USDC_DECIMALS
          currentUSD: formatUSDValue(snapshot.currentUSD),
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
          }),
          dateLabel: date.toISOString().split('T')[0], // YYYY-MM-DD format
          isRealTime: false
        }
      })
      .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel)) // Sort by date (ascending)

    // Add real-time data point if available
    if (realTimePortfolio && realTimePortfolio.totalValue > 0) {
      const currentDate = new Date(realTimePortfolio.timestamp)
      const seedMoney = investorData?.investor ? formatUSDValue(investorData.investor.seedMoneyUSD) : 0
      
      const realTimeDataPoint = {
        id: `realtime-${realTimePortfolio.timestamp}-${Date.now()}`,
        currentUSD: realTimePortfolio.totalValue,
        seedMoneyUSD: seedMoney,
        profitRatio: seedMoney > 0 ? ((realTimePortfolio.totalValue - seedMoney) / seedMoney) : 0,
        formattedDate: currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        }),
        fullDate: `${currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })} (Live)`,
        timeLabel: currentDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        dateLabel: currentDate.toISOString().split('T')[0],
        isRealTime: true
      }
      
      // Add real-time point to the end of the chart
      processedData.push(realTimeDataPoint)
    }


    return processedData
  }, [data, realTimePortfolio, investorData])

  // Calculate current values for headers (prefer real-time data if available)
  const currentPortfolioValue = useMemo(() => {
    if (realTimePortfolio && realTimePortfolio.totalValue > 0) {
      return realTimePortfolio.totalValue
    }
    if (!chartData.length) return 0
    return chartData[chartData.length - 1]?.currentUSD || 0
  }, [chartData, realTimePortfolio])

  // Calculate investor metrics (using real-time data when available)
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
    const formattedSeedMoney = formatUSDValue(investor.seedMoneyUSD)
    
    // Use real-time portfolio value if available, otherwise use subgraph data
    const currentValue = realTimePortfolio && realTimePortfolio.totalValue > 0 
      ? realTimePortfolio.totalValue 
      : formatUSDValue(investor.currentUSD)
    
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
      const dataPoint = payload[0]?.payload
      const isRealTime = dataPoint?.isRealTime
      
      return (
        <div className="bg-gray-800/95 border border-gray-600 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
          <p className="text-gray-100 text-sm font-medium">
            Portfolio: ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {isRealTime && (
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <p className="text-green-400 text-xs">Live (Uniswap V3)</p>
            </div>
          )}
          <p className="text-gray-400 text-xs mt-1">
            {dataPoint?.fullDate}
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
      <Card className="bg-transparent border-0">
        <CardHeader>
          <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse mt-2 w-2/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-700 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.investorSnapshots || chartData.length === 0) {
    return (
      <Card className="bg-transparent border-0">
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
    )
  }

  return (
    <Card className="bg-transparent border-0">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-3xl text-gray-100">Portfolio Value</h3>
          {realTimePortfolio && realTimePortfolio.totalValue > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-400">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          <CardTitle className="text-4xl font-bold text-gray-100">
            ${currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${metrics.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.isPositive ? '▲' : '▼'} {Math.abs(metrics.gainLossPercentage).toFixed(2)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
                <ResponsiveContainer width="100%" height={320}>
          <AreaChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            onMouseMove={(state: any) => {
              if (state && typeof state.activeTooltipIndex === 'number' && state.activeTooltipIndex >= 0) {
                setActiveIndexPortfolio(state.activeTooltipIndex)
              }
            }}
            onMouseLeave={() => setActiveIndexPortfolio(null)}
          >
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis 
              dataKey="timeLabel" 
              stroke="#9CA3AF"
              fontSize={11}
              tick={{ fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              orientation="right"
              stroke="#9CA3AF"
              fontSize={11}
              tick={{ fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `$${(value / 1000000).toFixed(1)}M`
                } else if (value >= 1000) {
                  return `$${(value / 1000).toFixed(0)}K`
                } else {
                  return `$${value.toFixed(0)}`
                }
              }}
            />
            <Tooltip 
              content={<CustomTooltipPortfolio />} 
              cursor={{ stroke: '#f97316', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="currentUSD"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
            />
                        {/* 실시간 데이터 포인트를 ReferenceDot으로 표시 */}
            {realTimePortfolio && realTimePortfolio.totalValue > 0 && chartData.length > 0 && (() => {
              const lastDataPoint = chartData[chartData.length - 1]
              if (lastDataPoint && lastDataPoint.isRealTime) {
                const PulsingDot = (props: any) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill="#22c55e"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    <animate
                      attributeName="opacity"
                      values="1;0.3;1"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )
                
                return (
                  <ReferenceDot
                    key={`realtime-ref-dot-${lastDataPoint.id}`}
                    x={lastDataPoint.timeLabel}
                    y={lastDataPoint.currentUSD}
                    shape={<PulsingDot />}
                  />
                )
              }
              return null
            })()}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 