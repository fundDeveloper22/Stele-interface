"use client"

import { notFound } from "next/navigation"
import { useState, useMemo, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  BarChart3
} from "lucide-react"
import { useInvestorPortfolio } from "@/app/hooks/useInvestorPortfolio"
import { useChallenge } from "@/app/hooks/useChallenge"
import Link from "next/link"

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
  
  // Calculate portfolio summary
  const portfolioSummary = useMemo(() => {
    if (!investors.length) {
      return {
        totalChallenges: 0,
        totalInvestment: 0,
        totalCurrentValue: 0,
        totalProfit: 0,
        totalProfitRatio: 0,
        activeChallenges: 0
      }
    }

    const totalInvestment = investors.reduce((sum, inv) => sum + parseFloat(inv.seedMoneyUSD), 0)
    const totalCurrentValue = investors.reduce((sum, inv) => sum + parseFloat(inv.currentUSD), 0)
    const totalProfit = investors.reduce((sum, inv) => sum + parseFloat(inv.profitUSD), 0)
    const totalProfitRatio = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

    return {
      totalChallenges: investors.length,
      totalInvestment,
      totalCurrentValue,
      totalProfit,
      totalProfitRatio,
      activeChallenges: investors.length // You might want to check actual status
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
    const profit = parseFloat(investor.profitUSD)
    const profitRatio = parseFloat(investor.profitRatio)
    const isPositive = profit >= 0

    const challengeType = challengeData?.challenge?.challengeType ?? parseInt(investor.challengeId) % 5
    const challengeTitle = getChallengeTitle(challengeType)

    return (
      <tr className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
        <td className="py-4 px-4">
          <div>
            <div className="font-medium text-gray-100">
              {challengeTitle}
            </div>
            <div className="text-sm text-gray-400">
              ID: {investor.challengeId}
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <span className="font-medium text-gray-100">
            {formatCurrency(parseFloat(investor.seedMoneyUSD))}
          </span>
        </td>
        <td className="py-4 px-4">
          <span className="font-medium text-gray-100">
            {formatCurrency(parseFloat(investor.currentUSD))}
          </span>
        </td>
        <td className="py-4 px-4">
          <span className={cn(
            "font-medium",
            isPositive ? "text-emerald-400" : "text-red-400"
          )}>
            {formatCurrency(profit)}
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
          <div className="flex flex-wrap gap-1">
            {investor.tokensSymbols.slice(0, 3).map((symbol: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {symbol}
              </Badge>
            ))}
            {investor.tokensSymbols.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{investor.tokensSymbols.length - 3}
              </Badge>
            )}
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-gray-400">
            {formatDate(investor.updatedAtTimestamp)}
          </div>
        </td>
        <td className="py-4 px-4">
          <Link href={`/challenge/${investor.challengeId}/${walletAddress}`}>
            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
              <ExternalLink className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
        </td>
      </tr>
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
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-100">Total Challenges</CardTitle>
              <Trophy className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-100">{portfolioSummary.totalChallenges}</div>
              <p className="text-xs text-gray-400">
                {portfolioSummary.activeChallenges} active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-100">Total Investment</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-100">
                {formatCurrency(portfolioSummary.totalInvestment)}
              </div>
              <p className="text-xs text-gray-400">
                Initial seed money
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-100">Current Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-100">
                {formatCurrency(portfolioSummary.totalCurrentValue)}
              </div>
              <p className="text-xs text-gray-400">
                Current portfolio value
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-100">Total P&L</CardTitle>
              {portfolioSummary.totalProfit >= 0 ? 
                <TrendingUp className="h-4 w-4 text-emerald-400" /> : 
                <TrendingDown className="h-4 w-4 text-red-400" />
              }
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                portfolioSummary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {formatCurrency(portfolioSummary.totalProfit)}
              </div>
              <p className={cn(
                "text-xs flex items-center gap-1",
                portfolioSummary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {formatPercentage(portfolioSummary.totalProfitRatio)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Challenges Table */}
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-gray-100">Challenge Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {investors.length === 0 ? (
              <div className="text-center py-12">
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
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Challenge</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Initial Investment</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Current Value</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">P&L</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">P&L %</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tokens</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Updated</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((investor) => (
                      <ChallengeRow key={investor.id} investor={investor} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 