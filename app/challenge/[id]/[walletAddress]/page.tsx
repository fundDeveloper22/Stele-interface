"use client"

import { notFound } from "next/navigation"
import { useState, useMemo, use, useEffect } from "react"
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
  Activity,
  User,
  Trophy,
  ArrowLeft,
  Loader2,
  Receipt
} from "lucide-react"
import { AssetSwap } from "@/components/asset-swap"
import { useInvestorData } from "@/app/subgraph/Account"
import { useUserTokens } from "@/app/hooks/useUserTokens"
import { useChallenge } from "@/app/hooks/useChallenge"
import { useInvestorTransactions } from "@/app/hooks/useInvestorTransactions"
import Link from "next/link"

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
  const { data: challengeData, isLoading: isLoadingChallenge, error: challengeError } = useChallenge(challengeId)
  const { data: investorTransactions = [], isLoading: isLoadingTransactions, error: transactionsError } = useInvestorTransactions(challengeId, walletAddress)

  const [activeTab, setActiveTab] = useState("portfolio")
  const [isClient, setIsClient] = useState(false)

  // Ensure client-side rendering for time calculations
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle loading and error states
  if (isLoadingInvestor || isLoadingTokens || isLoadingChallenge || isLoadingTransactions) {
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

  if (investorError || tokensError || challengeError || transactionsError) {
    console.error('Page errors:', { investorError, tokensError, challengeError, transactionsError })
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
  const challengeProgress = isClient ? Math.min(Math.max(gainLossPercentage, 0), 100) : 0;

  // Get challenge title from real data
  const getChallengeTitle = () => {
    if (challengeData?.challenge) {
      const challengeType = challengeData.challenge.challengeType;
      switch(challengeType) {
        case 0:
          return 'One Week Challenge';
        case 1:
          return 'One Month Challenge';
        case 2:
          return 'Three Month Challenge';
        case 3:
          return 'Six Month Challenge';
        case 4:
          return 'One Year Challenge';
        default:
          return `Challenge Type ${challengeType}`;
      }
    }
    
    // Fallback logic using challengeId
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

  // Get challenge details from real data
  const getChallengeDetails = () => {
    if (challengeData?.challenge) {
      const challenge = challengeData.challenge;
      return {
        participants: parseInt(challenge.investorCounter),
        prize: `$${(parseInt(challenge.rewardAmountUSD) / 1e18).toFixed(2)}`, // Convert from wei to USD
        entryFee: `$${(parseInt(challenge.entryFee) / 1e6).toFixed(2)}`, // USDC has 6 decimals
        seedMoney: `$${(parseInt(challenge.seedMoney) / 1e6).toFixed(2)}`, // USDC has 6 decimals
        isActive: challenge.isActive,
        startTime: new Date(parseInt(challenge.startTime) * 1000),
        endTime: new Date(parseInt(challenge.endTime) * 1000),
      };
    }
    
    return null;
  };

  const challengeDetails = getChallengeDetails();

  // Calculate time remaining from real challenge data
  const getTimeRemaining = () => {
    if (!isClient) {
      return { text: "Loading...", subText: "Calculating time..." };
    }
    
    if (challengeDetails) {
      const now = new Date();
      const endTime = challengeDetails.endTime;
      const diff = endTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        return { text: "Challenge Ended", subText: `Ended on ${endTime.toLocaleDateString()}` };
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return { 
        text: `${days} days ${hours} hours`, 
        subText: `Ends on ${endTime.toLocaleDateString()}` 
      };
    }
    
    // Fallback
    return { text: "Loading...", subText: "Calculating time..." };
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Link 
              href={`/challenge/${challengeId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Challenge
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Investor Account</h1>
              <p className="text-muted-foreground">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={challengeData?.challenge?.isActive ? "default" : "secondary"}>
              {challengeData?.challenge?.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">
              {getChallengeTitle()}
            </Badge>
            {challengeDetails && (
              <Badge variant="outline">
                {challengeDetails.participants} participants
              </Badge>
            )}
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
              <CardTitle className="text-sm font-medium">Ranking</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{challengeDetails?.participants || 0}</div>
              <p className="text-xs text-muted-foreground">
                Current estimated ranking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{challengeDetails?.prize || '$0.00'}</div>
              <p className="text-xs text-muted-foreground">
                Current estimated ranking
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
                        <p className="font-medium">{token.amount}</p>
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
                  {isLoadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2 text-muted-foreground">Loading transactions...</span>
                    </div>
                  ) : transactionsError ? (
                    <div className="text-center py-8 text-red-600">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Error loading transactions</p>
                      <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
                    </div>
                  ) : investorTransactions.length > 0 ? (
                    investorTransactions.map((transaction) => {
                      const getTransactionIcon = (type: string) => {
                        switch (type) {
                          case 'join':
                            return <User className="h-4 w-4 text-white" />
                          case 'swap':
                            return <Repeat className="h-4 w-4 text-white" />
                          case 'register':
                            return <BarChart3 className="h-4 w-4 text-white" />
                          case 'reward':
                            return <Trophy className="h-4 w-4 text-white" />
                          default:
                            return <Activity className="h-4 w-4 text-white" />
                        }
                      }

                      const getIconColor = (type: string) => {
                        switch (type) {
                          case 'join':
                            return 'bg-blue-500'
                          case 'swap':
                            return 'bg-green-500'
                          case 'register':
                            return 'bg-orange-500'
                          case 'reward':
                            return 'bg-yellow-500'
                          default:
                            return 'bg-gray-500'
                        }
                      }

                      const formatTimestamp = (timestamp: number) => {
                        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      }

                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full ${getIconColor(transaction.type)} flex items-center justify-center`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.details}</p>
                              <p className="text-sm text-muted-foreground">{formatTimestamp(transaction.timestamp)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{transaction.amount || '-'}</p>
                            <button
                              onClick={() => window.open(`https://basescan.org/tx/${transaction.transactionHash}`, '_blank')}
                              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View on BaseScan
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transactions found for this investor</p>
                      <p className="text-sm mt-2">Transaction history will appear here once you start trading</p>
                    </div>
                  )}
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
                    <span className="text-sm text-muted-foreground">Challenge ID</span>
                    <span className="font-medium">{challengeData?.challenge?.challengeId || challengeId}</span>
                  </div>
                  {challengeDetails && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Start Date</span>
                        <span className="font-medium">{challengeDetails.startTime.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">End Date</span>
                        <span className="font-medium">{challengeDetails.endTime.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Prize Pool</span>
                        <span className="font-medium">{challengeDetails.prize}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Participants</span>
                        <span className="font-medium">{challengeDetails.participants}</span>
                      </div>
                    </>
                  )}
                  {!challengeDetails && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Start Date</span>
                        <span className="font-medium">{new Date(Number(investor.createdAtTimestamp) * 1000).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last Update</span>
                        <span className="font-medium">{new Date(Number(investor.updatedAtTimestamp) * 1000).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={challengeData?.challenge?.isActive ? "default" : "secondary"}>
                      {challengeData?.challenge?.isActive ? "Active" : "Inactive"}
                    </Badge>
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