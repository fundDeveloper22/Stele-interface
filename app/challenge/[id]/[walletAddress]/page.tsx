"use client"

import { notFound } from "next/navigation"
import { useState, useMemo, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Clock, 
  CheckCircle2,
  XCircle,
  Star,
  BarChart3,
  Wallet,
  Repeat,
  Activity
} from "lucide-react"
import { AssetSwap } from "@/components/asset-swap"
import { useInvestorData } from "@/app/subgraph/Account"
import { useUserTokens } from "@/app/hooks/useUserTokens"

interface InvestorPageProps {
  params: Promise<{
    id: string
    walletAddress: string
  }>
}

export default function InvestorPage({ params }: InvestorPageProps) {
  const { id: challengeId, walletAddress } = use(params)
  
  // Use hooks
  const { data: investorData, isLoading: isLoadingInvestor, error: investorError } = useInvestorData(challengeId, walletAddress)
  const { data: userTokens = [], isLoading: isLoadingTokens, error: tokensError } = useUserTokens(challengeId, walletAddress)

  const [activeTab, setActiveTab] = useState("portfolio")

  // Handle loading and error states
  if (isLoadingInvestor || isLoadingTokens) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (investorError || tokensError) {
    console.error('Page errors:', { investorError, tokensError })
    return notFound()
  }

  if (!investorData?.investor) {
    return notFound()
  }

  const investor = investorData.investor

  // Calculate portfolio metrics using the actual data structure
  const currentValue = parseFloat(investor.currentUSD || "0")
  const initialValue = parseFloat(investor.seedMoneyUSD || "0")
  const gainLoss = currentValue - initialValue
  const gainLossPercentage = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0
  const isPositive = gainLoss >= 0

  // Simple challenge progress based on profit
  const challengeProgress = Math.min(Math.max(gainLossPercentage, 0), 100)

  // Get challenge title
  const getChallengeTitle = () => {
    switch(challengeId) {
      case '1':
        return 'One Week Challenge';
      case '2':
        return 'One Month Challenge';
      case '3':
        return 'Three Month Challenge';
      case '4':
        return 'Six Month Challenge';
      case '5':
        return 'One Year Challenge';
      default:
        return 'Challenge';
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Investor Account</h1>
            <p className="text-muted-foreground">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              Active
            </Badge>
            <Badge variant="outline">
              {getChallengeTitle()}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${currentValue.toFixed(2)}</div>
              <div className={cn(
                "text-xs flex items-center gap-1",
                isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? "+" : ""}{gainLossPercentage.toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gain/Loss</CardTitle>
              {isPositive ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {isPositive ? "+" : ""}${gainLoss.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From ${initialValue.toFixed(2)} initial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Challenge Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{challengeProgress.toFixed(1)}%</div>
              <div className="mt-2">
                <Progress value={challengeProgress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Profit ratio: {parseFloat(investor.profitRatio).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userTokens.length}</div>
              <p className="text-xs text-muted-foreground">
                Token types held
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="swap" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Swap
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Token Holdings</CardTitle>
                <CardDescription>Your current cryptocurrency portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTokens.map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{token.symbol}</p>
                          <p className="text-sm text-muted-foreground">{token.address.slice(0, 8)}...{token.address.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{token.formattedAmount}</p>
                        <p className="text-sm text-muted-foreground">{token.symbol}</p>
                      </div>
                    </div>
                  ))}
                  
                  {userTokens.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tokens found in this portfolio</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swap" className="space-y-4">
            <AssetSwap userTokens={userTokens} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your trading and activity history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample transaction data */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Repeat className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">ETH → USDC</p>
                        <p className="text-sm text-muted-foreground">Apr 24, 2025 • 14:32</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">0.15 ETH</p>
                      <p className="text-sm text-green-600">+$267.35</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">USDC → ETH</p>
                        <p className="text-sm text-muted-foreground">Apr 22, 2025 • 09:15</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">500 USDC</p>
                      <p className="text-sm text-blue-600">$500.00</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">Challenge Joined</p>
                        <p className="text-sm text-muted-foreground">Apr 20, 2025 • 16:45</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{getChallengeTitle()}</p>
                      <p className="text-sm text-muted-foreground">Entry confirmed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Return</span>
                    <span className="font-medium">{parseFloat(investor.profitRatio).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Profit</span>
                    <span className="font-medium text-green-600">${parseFloat(investor.profitUSD).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Initial Investment</span>
                    <span className="font-medium">${parseFloat(investor.seedMoneyUSD).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Assets</span>
                    <span className="font-medium">{userTokens.length}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Challenge Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Challenge</span>
                    <span className="font-medium">{getChallengeTitle()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Start Date</span>
                    <span className="font-medium">{new Date(Number(investor.createdAtTimestamp) * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Update</span>
                    <span className="font-medium">{new Date(Number(investor.updatedAtTimestamp) * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 