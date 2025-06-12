'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useActiveChallengesSnapshots } from '@/app/hooks/useActiveChallengesSnapshots'
import { Users, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { useMemo, useState } from 'react'

interface ChartDataPoint {
  id: string
  totalParticipants: number
  totalRewards: number
  formattedDate: string
  fullDate: string
  timeLabel: string
}

export function DashboardCharts() {
  const { data, isLoading, error } = useActiveChallengesSnapshots(30)
  const [activeIndexParticipants, setActiveIndexParticipants] = useState<number | null>(null)
  const [activeIndexRewards, setActiveIndexRewards] = useState<number | null>(null)

  const chartData = useMemo(() => {
    if (!data?.activeChallengesSnapshots) return []

    // Convert and sort data by id (assuming id represents timestamp or sequential order)
    const processedData = data.activeChallengesSnapshots
      .map((snapshot, index) => {
        // Since we don't have date field, we'll use index for time simulation
        // In real implementation, you might want to extract timestamp from id or use another field
        const simulatedDate = new Date(Date.now() - (data.activeChallengesSnapshots.length - index - 1) * 24 * 60 * 60 * 1000)
        
        return {
          id: snapshot.id,
          totalParticipants: Number(snapshot.totalParticipants),
          totalRewards: Number(snapshot.totalRewards),
          formattedDate: simulatedDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          }),
          fullDate: simulatedDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          timeLabel: simulatedDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }
      })
      .reverse() // Most recent first, then reverse for chart display

    return processedData
  }, [data])

  // Calculate total values for headers (use the most recent snapshot)
  const totalParticipants = useMemo(() => {
    if (!chartData.length) return 0
    return chartData[chartData.length - 1]?.totalParticipants || 0
  }, [chartData])

  const totalRewards = useMemo(() => {
    if (!chartData.length) return 0
    return chartData[chartData.length - 1]?.totalRewards || 0
  }, [chartData])

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
      const dataKey = payload[0]?.dataKey
      
      return (
        <div className="bg-gray-800/95 border border-gray-600 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
          <p className="text-gray-100 text-sm font-medium">
            {dataKey === 'totalParticipants' ? `Participants: ${value?.toLocaleString()}` : `Rewards: $${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse mt-2 w-2/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-gray-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700/50">
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

  if (error || !data?.activeChallengesSnapshots || chartData.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-gray-100">-</CardTitle>
            <p className="text-sm text-gray-400">{currentDate}</p>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-400">No data available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700/50">
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
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Participants Chart */}
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl font-bold text-gray-100">
            {totalParticipants >= 1000 ? `${(totalParticipants / 1000).toFixed(1)}K` : totalParticipants.toLocaleString()}
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
                  setActiveIndexParticipants(state.activeTooltipIndex)
                }
              }}
              onMouseLeave={() => setActiveIndexParticipants(null)}
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
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString()}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={<CustomCursor />}
              />
              <Bar 
                dataKey="totalParticipants" 
                radius={[3, 3, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-participants-${index}`} 
                    fill={
                      activeIndexParticipants === null 
                        ? "#EC4899" // All bars pink when no hover
                        : activeIndexParticipants === index 
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

      {/* Total Rewards Chart */}
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader className="pb-6">
          <CardTitle className="text-4xl font-bold text-gray-100">
            ${totalRewards >= 1000000 ? `${(totalRewards / 1000000).toFixed(1)}M` : totalRewards >= 1000 ? `${(totalRewards / 1000).toFixed(1)}K` : totalRewards.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                tickFormatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={<CustomCursor />}
              />
              <Bar 
                dataKey="totalRewards" 
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
    </div>
  )
} 