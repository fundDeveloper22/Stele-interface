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
  Receipt,
  FileText
} from "lucide-react"
import { AssetSwap } from "@/components/asset-swap"
import { InvestorCharts } from "@/components/investor-charts"
import { useInvestorData } from "@/app/subgraph/Account"
import { useUserTokens } from "@/app/hooks/useUserTokens"
import { useChallenge } from "@/app/hooks/useChallenge"
import { useInvestorTransactions } from "@/app/hooks/useInvestorTransactions"
import Link from "next/link"
import { ethers } from "ethers"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { 
  BASE_CHAIN_ID, 
  BASE_CHAIN_CONFIG, 
  STELE_CONTRACT_ADDRESS,
  USDC_DECIMALS
} from "@/lib/constants"
import SteleABI from "@/app/abis/Stele.json"

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
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isRegistering, setIsRegistering] = useState(false)

  // Ensure client-side rendering for time calculations
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update time every second for accurate countdown
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isClient]);

  // Handle loading and error states
  if (isLoadingInvestor || isLoadingTokens || isLoadingChallenge || isLoadingTransactions) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
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

  // Calculate portfolio metrics using the actual data structure
  const currentValue = parseFloat(investor.currentUSD || "0")
  // Format the raw seedMoney amount using USDC_DECIMALS
  const formattedSeedMoney = formatUSDValue(investor.seedMoneyUSD)
  const gainLoss = currentValue - formattedSeedMoney
  const gainLossPercentage = formattedSeedMoney > 0 ? (gainLoss / formattedSeedMoney) * 100 : 0
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
      const endTime = challengeDetails.endTime;
      const diff = endTime.getTime() - currentTime.getTime();
      
      if (diff <= 0) {
        return { text: "Challenge Ended", subText: `Ended on ${endTime.toLocaleDateString()}` };
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let timeText: string;
      if (days > 0) {
        timeText = `${days} days ${hours} hours`;
      } else if (hours > 0) {
        timeText = `${hours} hours ${minutes} minutes`;
      } else if (minutes > 0) {
        timeText = `${minutes} minutes ${seconds} seconds`;
      } else {
        timeText = `${seconds} seconds`;
      }
      
      return { 
        text: timeText, 
        subText: `Ends on ${endTime.toLocaleDateString()}` 
      };
    }
    
    // Fallback
    return { text: "Loading...", subText: "Calculating time..." };
  };

  const timeRemaining = getTimeRemaining();

  // Handle Register function
  const handleRegister = async () => {
    setIsRegistering(true);
    
    try {
      // Check if Phantom wallet is installed
      if (typeof window.phantom === 'undefined') {
        throw new Error("Phantom wallet is not installed. Please install it from https://phantom.app/");
      }

      // Check if Ethereum provider is available
      if (!window.phantom?.ethereum) {
        throw new Error("Ethereum provider not found in Phantom wallet");
      }

      // Request account access
      const accounts = await window.phantom.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect to Phantom wallet first.");
      }

      // Verify the connected wallet matches the investor address
      const connectedAddress = accounts[0].toLowerCase();
      if (connectedAddress !== walletAddress.toLowerCase()) {
        throw new Error(`Please connect with the correct wallet address: ${walletAddress}`);
      }

      // Check if we are on Base network
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== BASE_CHAIN_ID) {
        // Switch to Base network
        try {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to the wallet
          if (switchError.code === 4902) {
            await window.phantom.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_CHAIN_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Create a Web3Provider using the Phantom ethereum provider
      const provider = new ethers.BrowserProvider(window.phantom.ethereum);
      
      // Get the signer
      const signer = await provider.getSigner();
      
      // Create contract instance
      const steleContract = new ethers.Contract(
        STELE_CONTRACT_ADDRESS,
        SteleABI.abi,
        signer
      );

      // Call register function with challengeId
      const tx = await steleContract.register(challengeId);
      
      // Show toast notification for transaction submitted
      toast({
        title: "Registration Submitted",
        description: "Your investor registration transaction has been sent to the network.",
        action: (
          <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}>
            View on BaseScan
          </ToastAction>
        ),
      });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Show toast notification for transaction confirmed
      toast({
        title: "Registration Complete!",
        description: "Your investor information has been successfully registered!",
        action: (
          <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}>
            View on BaseScan
          </ToastAction>
        ),
      });
      
    } catch (error: any) {
      console.error("Error registering investor:", error);
      
      // Show toast notification for error
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unknown error occurred",
      });
      
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-4">
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
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-100">Investor Account</h1>
                <p className="text-gray-400">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
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
            
            {/* Register Button */}
            <div className="flex justify-end">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleRegister}
                disabled={isRegistering}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Register
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Investor Charts */}
        <InvestorCharts challengeId={challengeId} investor={walletAddress} investorData={investorData} />

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
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-gray-100">Token Holdings</CardTitle>
                <CardDescription className="text-gray-400">Your current cryptocurrency portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTokens.map((token, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-100">{token.symbol}</p>
                          <p className="text-sm text-gray-400">{token.address.slice(0, 8)}...{token.address.slice(-6)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-100">{token.amount}</p>
                        <p className="text-sm text-gray-400">{token.symbol}</p>
                      </div>
                    </div>
                  ))}
                  
                  {userTokens.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
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
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-gray-100">Recent Transactions</CardTitle>
                <CardDescription className="text-gray-400">Your trading and activity history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2 text-gray-400">Loading transactions...</span>
                    </div>
                  ) : transactionsError ? (
                    <div className="text-center py-8 text-red-400">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Error loading transactions</p>
                      <p className="text-sm text-gray-400 mt-2">Please try again later</p>
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
                        <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full ${getIconColor(transaction.type)} flex items-center justify-center`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-100">{transaction.details}</p>
                              <p className="text-sm text-gray-400">{formatTimestamp(transaction.timestamp)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-100">{transaction.amount || '-'}</p>
                            <button
                              onClick={() => window.open(`https://basescan.org/tx/${transaction.transactionHash}`, '_blank')}
                              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              View on BaseScan
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400">
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
            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-gray-900/50 border-gray-700/50">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-bold text-gray-100 flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                    Challenge Statistics
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Overview of challenge details and your participation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Challenge Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-400" />
                        Challenge Info
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Challenge Type
                          </span>
                          <Badge variant="outline" className="font-medium">
                            {getChallengeTitle()}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Challenge ID
                          </span>
                          <span className="font-medium text-gray-100">#{challengeData?.challenge?.challengeId || challengeId}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Participants
                          </span>
                          <span className="font-medium text-gray-100">
                            {challengeDetails ? challengeDetails.participants : 'Loading...'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                          <span className="text-sm text-gray-400 flex items-center gap-2">
                            <Badge 
                              variant={challengeData?.challenge?.isActive ? "default" : "secondary"}
                              className="h-4 w-4 rounded-full p-0"
                            />
                            Status
                          </span>
                          <Badge variant={challengeData?.challenge?.isActive ? "default" : "secondary"}>
                            {challengeData?.challenge?.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Timeline & Rewards */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-400" />
                        Timeline & Rewards
                      </h3>
                      
                      <div className="space-y-3">
                        {challengeDetails ? (
                          <>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Start Date
                              </span>
                              <span className="font-medium text-gray-100">
                                {challengeDetails.startTime.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                End Date
                              </span>
                              <span className="font-medium text-gray-100">
                                {challengeDetails.endTime.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <Trophy className="h-4 w-4" />
                                Prize Pool
                              </span>
                              <span className="font-semibold text-yellow-400 text-lg">
                                {challengeDetails.prize}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Entry Fee
                              </span>
                              <span className="font-medium text-gray-100">
                                {challengeDetails.entryFee}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Start Date
                              </span>
                              <span className="font-medium text-gray-100">
                                {new Date(Number(investor.createdAtTimestamp) * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Last Update
                              </span>
                              <span className="font-medium text-gray-100">
                                {new Date(Number(investor.updatedAtTimestamp) * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
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