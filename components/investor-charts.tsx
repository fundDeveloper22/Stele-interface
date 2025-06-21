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
  dateLabel: string
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
      .map((snapshot) => {
        const date = new Date(Number(snapshot.timestamp) * 1000)
        
        return {
          id: snapshot.id,
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
          dateLabel: date.toISOString().split('T')[0] // YYYY-MM-DD 형식
        }
      })
      .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel)) // Sort by date (ascending)

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
    // Format both currentUSD and seedMoneyUSD using USDC_DECIMALS
    const currentValue = formatUSDValue(investor.currentUSD)
    const formattedSeedMoney = formatUSDValue(investor.seedMoneyUSD)
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
        <CardTitle className="text-4xl font-bold text-gray-100">
          ${currentPortfolioValue.toFixed(2)}
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
              dataKey="dateLabel" 
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
  )
} 