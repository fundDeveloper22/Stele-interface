'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useChallengeSnapshots } from '@/app/hooks/useChallengeSnapshots'
import { useChallenge } from '@/app/hooks/useChallenge'
import { Users, DollarSign, Clock, Trophy, Calendar } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'

interface ChartDataPoint {
  id: string
  investorCount: number
  rewardAmountUSD: number
  formattedDate: string
  fullDate: string
  timeLabel: string
  dateLabel: string
}

interface ChallengeChartsProps {
  challengeId: string
}

export function ChallengeCharts({ challengeId }: ChallengeChartsProps) {
  const { data, isLoading, error } = useChallengeSnapshots(challengeId, 30)
  const { data: challengeData } = useChallenge(challengeId)
  const [activeIndexRewards, setActiveIndexRewards] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second for accurate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const chartData = useMemo(() => {
    if (!data?.challengeSnapshots) return []

    // Convert and sort data by timestamp
    const processedData = data.challengeSnapshots
      .map((snapshot) => {
        const date = new Date(Number(snapshot.timestamp) * 1000)
        
        return {
          id: snapshot.id,
          investorCount: Number(snapshot.investorCount),
          rewardAmountUSD: Number(snapshot.rewardAmountUSD), // Convert from wei to USD
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

  // Calculate current values for headers (use the most recent snapshot or challenge data)
  const currentRewardAmount = useMemo(() => {
    // First try to get from the most recent snapshot
    if (chartData.length > 0) {
      const latestSnapshot = chartData[chartData.length - 1]?.rewardAmountUSD || 0
      if (latestSnapshot > 0) {
        return latestSnapshot
      }
    }
    
    // Fallback to challenge data if snapshot data is not available or is 0
    if (challengeData?.challenge) {
      return parseInt(challengeData.challenge.rewardAmountUSD)
    }
    
    return 0
  }, [chartData, challengeData])

  // Get challenge details for the info card
  const getChallengeDetails = () => {
    if (!challengeData?.challenge) {
      return {
        participants: 0,
        startTime: new Date(),
        endTime: new Date(),
        isActive: false,
        totalPrize: 0,
        challengePeriod: '',
      }
    }
    
    const challenge = challengeData.challenge
    const startTime = new Date(parseInt(challenge.startTime) * 1000)
    const endTime = new Date(parseInt(challenge.endTime) * 1000)
    
    // Get challenge period based on challenge type
    const getChallengeTypeLabel = (challengeType: number) => {
      switch(challengeType) {
        case 0:
          return '1 Week'
        case 1:
          return '1 Month'
        case 2:
          return '3 Months'
        case 3:
          return '6 Months'
        case 4:
          return '1 Year'
        default:
          return `Type ${challengeType}`
      }
    }
    
    return {
      participants: parseInt(challenge.investorCounter),
      startTime,
      endTime,
      isActive: challenge.isActive,
      totalPrize: parseInt(challenge.rewardAmountUSD),
      challengePeriod: getChallengeTypeLabel(challenge.challengeType),
    }
  }

  const challengeDetails = getChallengeDetails()

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const { startTime, endTime } = challengeDetails
    const totalDuration = endTime.getTime() - startTime.getTime()
    const elapsed = currentTime.getTime() - startTime.getTime()
    
    if (elapsed <= 0) return 0
    if (elapsed >= totalDuration) return 100
    
    return Math.round((elapsed / totalDuration) * 100)
  }

  const progressPercentage = getProgressPercentage()

  // Get current date for header
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value
      
      return (
        <div className="bg-gray-800/95 border border-gray-600 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
          <p className="text-gray-100 text-sm font-medium">
            Rewards: ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

  if (error || !data?.challengeSnapshots || chartData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-gray-100">$0</CardTitle>
            <p className="text-sm text-gray-400">{currentDate}</p>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-400">No data available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-100">Challenge Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-400">Loading challenge data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Rewards Chart - Takes 3 columns */}
      <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-3">
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl font-bold text-gray-100">
            ${currentRewardAmount >= 1000000 ? `${(currentRewardAmount / 1000000).toFixed(1)}M` : currentRewardAmount >= 1000 ? `${(currentRewardAmount / 1000).toFixed(1)}K` : currentRewardAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                  setActiveIndexRewards(state.activeTooltipIndex)
                }
              }}
              onMouseLeave={() => setActiveIndexRewards(null)}
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
                tickFormatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={<CustomCursor />}
              />
              <Bar 
                dataKey="rewardAmountUSD" 
                radius={[3, 3, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-rewards-${index}`} 
                    fill={
                      activeIndexRewards === null 
                        ? "#EC4899" // All bars pink when no hover
                        : activeIndexRewards === index 
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

      {/* Challenge Info Card */}
      <Card className="bg-gray-900/50 border-gray-700/50 lg:col-span-1">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg font-bold text-gray-100">Challenge Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Challenge ID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Challenge ID</span>
            </div>
            <span className="text-sm font-medium text-gray-100">{challengeId}</span>
          </div>

          {/* Total Prize */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Total Prize</span>
            </div>
            <span className="text-2xl font-bold text-yellow-400">
              ${challengeDetails.totalPrize >= 1000000 
                ? `${(challengeDetails.totalPrize / 1000000).toFixed(1)}M` 
                : challengeDetails.totalPrize >= 1000 
                ? `${(challengeDetails.totalPrize / 1000).toFixed(1)}K` 
                : challengeDetails.totalPrize.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              }
            </span>
          </div>

          {/* Participants */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Participants</span>
            </div>
            <span className="text-2xl font-bold text-gray-100">{challengeDetails.participants.toLocaleString()}</span>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-400">Progress</span>
              </div>
              <span className="text-sm font-medium text-gray-100">{progressPercentage}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            {/* Time Info */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Started: {challengeDetails.startTime.toLocaleDateString()}</span>
              <span>Ends: {challengeDetails.endTime.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <span className="text-sm text-gray-400">Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${challengeDetails.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${challengeDetails.isActive ? 'text-green-400' : 'text-red-400'}`}>
                {challengeDetails.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 