"use client"

import { notFound } from "next/navigation"
import { useState, useMemo, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowLeft,
  Loader2,
  ExternalLink,
  Trophy,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  UserCheck
} from "lucide-react"
import { useInvestorPortfolio } from "@/app/hooks/useInvestorPortfolio"
import { useChallenge } from "@/app/hooks/useChallenge"
import Link from "next/link"
import { ethers } from "ethers"
import { USDC_DECIMALS } from "@/lib/constants"

interface PortfolioPageProps {
  params: Promise<{
    walletAddress: string
  }>
}

export default function PortfolioPage({ params }: PortfolioPageProps) {
  const { walletAddress } = use(params)
  
  // Use hooks - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { data: portfolioData, isLoading, error } = useInvestorPortfolio(walletAddress)

  // Calculate derived state with useMemo
  const investors = portfolioData?.investors || []

  // Helper function to safely format USD values
  const safeFormatUSD = (value: string): number => {
    try {
      // Check if the value is already a decimal (contains '.')
      if (value.includes('.')) {
        return parseFloat(value)
      }
      // Otherwise, treat as raw amount and format with USDC_DECIMALS
      return parseFloat(ethers.formatUnits(value, USDC_DECIMALS))
    } catch (error) {
      console.warn('Error formatting USD value:', value, error)
      return parseFloat(value) || 0
    }
  }
  
  // We'll categorize challenges based on individual challenge data from useChallenge hook
  // This will be calculated per row in the ChallengeRow component

  // Calculate portfolio summary
  const portfolioSummary = useMemo(() => {
    if (!investors.length) {
      return {
        totalChallenges: 0,
        totalInvestment: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        totalProfitRatio: 0,
        activeChallenges: 0,
        completedChallenges: 0
      }
    }

    const totalInvestment = investors.reduce((sum, inv) => sum + safeFormatUSD(inv.seedMoneyUSD), 0)
    const totalCurrentValue = investors.reduce((sum, inv) => sum + safeFormatUSD(inv.currentUSD), 0)
    const totalProfit = investors.reduce((sum, inv) => sum + safeFormatUSD(inv.profitUSD), 0)
    const totalProfitRatio = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

    return {
      totalChallenges: investors.length,
      totalInvestment,
      totalCurrentValue,
      totalProfit,
      totalProfitRatio,
      activeChallenges: 0, // Will be calculated dynamically
      completedChallenges: 0 // Will be calculated dynamically
    }
  }, [investors])

  // Utility functions
  const getChallengeTitle = (challengeType: number) => {
    switch(challengeType) {
      case 0:
        return '1 Week Challenge'
      case 1:
        return '1 Month Challenge'
      case 2:
        return '3 Months Challenge'
      case 3:
        return '6 Months Challenge'
      case 4:
        return '1 Year Challenge'
      default:
        return `Challenge Type ${challengeType}`
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Challenge Table Row Component
  const ChallengeRow = ({ investor }: { investor: any }) => {
    const { data: challengeData } = useChallenge(investor.challengeId)
    const profit = safeFormatUSD(investor.profitUSD)
    const profitRatio = parseFloat(investor.profitRatio)
    const isPositive = profit >= 0

    // Check if challenge is active based on challenge data
    const isActive = useMemo(() => {
      if (!challengeData?.challenge?.endTime) return false
      const currentTime = Math.floor(Date.now() / 1000)
      const endTime = parseInt(challengeData.challenge.endTime)
      return currentTime < endTime
    }, [challengeData])

    const challengeType = challengeData?.challenge?.challengeType ?? parseInt(investor.challengeId) % 5
    const challengeTitle = getChallengeTitle(challengeType)

    const handleRowClick = () => {
      window.location.href = `/challenge/${investor.challengeId}/${walletAddress}`
    }

    return (
      <tr 
        className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors cursor-pointer" 
        onClick={handleRowClick}
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-medium text-gray-100">
                {challengeTitle}
              </div>
              <div className="text-sm text-gray-400">
                ID: {investor.challengeId}
              </div>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <span className="font-medium text-gray-100">
            {formatCurrency(safeFormatUSD(investor.seedMoneyUSD))}
          </span>
        </td>
        <td className="py-4 px-4">
          <span className="font-medium text-gray-100">
            {formatCurrency(safeFormatUSD(investor.currentUSD))}
          </span>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-1">
            {isPositive ? 
              <TrendingUp className="h-3 w-3 text-emerald-400" /> : 
              <TrendingDown className="h-3 w-3 text-red-400" />
            }
            <span className={cn(
              "font-medium",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}>
              {formatPercentage(profitRatio)}
            </span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-gray-400">
            {challengeData?.challenge?.endTime ? formatDate(challengeData.challenge.endTime) : 'Loading...'}
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-row items-center gap-2">
            {/* Challenge Status */}
            {/* Registration Status */}
            {investor.isClosed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline"
                      className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs w-fit"
                    >
                      <UserCheck className="h-3 w-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Registered</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isActive ? (
              <Badge 
                variant="default"
                className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge 
                variant="secondary"
                className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </td>
      </tr>
    )
  }

  // Challenge Section Component - simplified to show all challenges in one table
  const ChallengeTable = ({ challenges, title }: { challenges: any[], title: string }) => {
    if (challenges.length === 0) return null

    return (
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-gray-100 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gray-400" />
            {title} ({challenges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Challenge</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Initial Investment</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Current Value</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">P&L</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">End Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">State</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((investor) => (
                  <ChallengeRow key={investor.id} investor={investor} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // CONDITIONAL RENDERING AFTER ALL HOOKS
  // Handle loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    console.error('Portfolio error:', error)
    return notFound()
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Link 
              href="/portfolio"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Portfolio
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Portfolio Overview</h1>
              <p className="text-gray-400 font-mono">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-400">
                  {portfolioSummary.totalChallenges} Total Challenges
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Sections */}
        {investors.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-100 mb-2">No Challenges Found</h3>
              <p className="text-gray-400 mb-4">
                This wallet address hasn't participated in any challenges yet.
              </p>
              <Link href="/challenges">
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  Browse Challenges
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ChallengeTable 
            challenges={investors}
            title="All Challenges"
          />
        )}
      </div>
    </div>
  )
} 