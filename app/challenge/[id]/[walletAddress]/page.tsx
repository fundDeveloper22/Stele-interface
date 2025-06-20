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
  FileText,
  X
} from "lucide-react"
import { AssetSwap } from "@/components/asset-swap"
import { InvestorCharts } from "@/components/investor-charts"
import { useInvestorData } from "@/app/subgraph/Account"
import { useUserTokens } from "@/app/hooks/useUserTokens"
import { useChallenge } from "@/app/hooks/useChallenge"
import { useInvestorTransactions } from "@/app/hooks/useInvestorTransactions"
import { useWallet } from "@/app/hooks/useWallet"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { 
  ETHEREUM_CHAIN_ID, 
  ETHEREUM_CHAIN_CONFIG, 
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
  const router = useRouter()
  
  // Use hooks
  const { address: connectedAddress, isConnected } = useWallet()
  const { data: investorData, isLoading: isLoadingInvestor, error: investorError } = useInvestorData(challengeId, walletAddress)
  const { data: userTokens = [], isLoading: isLoadingTokens, error: tokensError } = useUserTokens(challengeId, walletAddress)
  const { data: challengeData, isLoading: isLoadingChallenge, error: challengeError } = useChallenge(challengeId)
  const { data: investorTransactions = [], isLoading: isLoadingTransactions, error: transactionsError } = useInvestorTransactions(challengeId, walletAddress)

  const [activeTab, setActiveTab] = useState("portfolio")
  const [isClient, setIsClient] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSwapMode, setIsSwapMode] = useState(false)

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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Loading */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 bg-gray-700 rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-gray-700 rounded w-40 animate-pulse"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-700 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded w-24 animate-pulse"></div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Charts + Tabs */}
            <div className="lg:col-span-2 space-y-4">
              {/* Chart Loading */}
              <div className="h-80 bg-gray-700 rounded-lg animate-pulse"></div>
              
              {/* Tabs Loading */}
              <div className="space-y-4">
                <div className="flex w-full">
                  <div className="h-10 bg-gray-700 rounded-l w-1/2 animate-pulse"></div>
                  <div className="h-10 bg-gray-600 rounded-r w-1/2 animate-pulse"></div>
                </div>
                
                {/* Tab Content Loading */}
                <Card className="bg-transparent border border-gray-700/50">
                  <CardHeader>
                    <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-700 animate-pulse"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                              <div className="h-3 bg-gray-700 rounded w-24 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Right Side - Portfolio Summary */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-900 border-0 rounded-2xl">
                <CardContent className="p-8 space-y-8">
                  {/* Progress Loading */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-10 animate-pulse"></div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 animate-pulse"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-700 rounded w-20 animate-pulse"></div>
                      <div className="h-3 bg-gray-700 rounded w-20 animate-pulse"></div>
                    </div>
                  </div>

                  {/* Portfolio Value Loading */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                    <div className="h-10 bg-gray-700 rounded w-32 animate-pulse"></div>
                  </div>

                  {/* Gain/Loss Loading */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                    <div className="h-10 bg-gray-700 rounded w-28 animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                  </div>

                  {/* Status Loading */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-12 animate-pulse"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-700 animate-pulse"></div>
                      <div className="h-6 bg-gray-700 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
  // Format the raw currentUSD amount using USDC_DECIMALS
  const currentValue = formatUSDValue(investor.currentUSD)
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

  // Get appropriate explorer URL based on chain ID
  const getExplorerUrl = (chainId: string, txHash: string) => {
    switch (chainId) {
      case '0x1': // Ethereum Mainnet
        return `https://etherscan.io/tx/${txHash}`;
      case '0x2105': // Base Mainnet
        return `https://basescan.org/tx/${txHash}`;
      case '0x89': // Polygon
        return `https://polygonscan.com/tx/${txHash}`;
      case '0xa': // Optimism
        return `https://optimistic.etherscan.io/tx/${txHash}`;
      case '0xa4b1': // Arbitrum One
        return `https://arbiscan.io/tx/${txHash}`;
      default:
        return `https://etherscan.io/tx/${txHash}`; // Default to Ethereum
    }
  };

  const getExplorerName = (chainId: string) => {
    switch (chainId) {
      case '0x1': // Ethereum Mainnet
        return 'Etherscan';
      case '0x2105': // Base Mainnet
        return 'BaseScan';
      case '0x89': // Polygon
        return 'PolygonScan';
      case '0xa': // Optimism
        return 'Optimistic Etherscan';
      case '0xa4b1': // Arbitrum One
        return 'Arbiscan';
      default:
        return 'Block Explorer';
    }
  };

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

      // Get current network information
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      console.log('Current network chain ID for registration:', chainId);
      
      // Use current network without switching
      // No automatic network switching - use whatever network user is currently on

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
      const registerExplorerName = getExplorerName(chainId);
      const registerExplorerUrl = getExplorerUrl(chainId, tx.hash);
      
      toast({
        title: "Registration Submitted",
        description: "Your investor registration transaction has been sent to the network.",
        action: (
          <ToastAction altText={`View on ${registerExplorerName}`} onClick={() => window.open(registerExplorerUrl, '_blank')}>
            View on {registerExplorerName}
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
          <ToastAction altText={`View on ${registerExplorerName}`} onClick={() => window.open(registerExplorerUrl, '_blank')}>
            View on {registerExplorerName}
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
        {/* Back Button */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl text-gray-400">Investor</h1>
              <p className="text-2xl">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
          </div>
          <div className="space-y-4">            
            {/* Swap and Register Buttons - Only show if connected wallet matches investor address */}
            {connectedAddress && walletAddress && 
             connectedAddress.toLowerCase() === walletAddress.toLowerCase() && (
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsSwapMode(!isSwapMode)}
                  className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border-pink-500/50"
                >
                  {isSwapMode ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Close
                    </>
                  ) : (
                    <>
                      <Repeat className="mr-2 h-4 w-4" />
                      Swap
                    </>
                  )}
                </Button>
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
            )}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Charts + Tabs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Investor Charts */}
            <InvestorCharts 
              challengeId={challengeId} 
              investor={walletAddress} 
              investorData={investorData}
            />
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="portfolio" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Portfolio
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Transactions
                </TabsTrigger>
              </TabsList>
              <TabsContent value="portfolio" className="space-y-4">
                <Card className="bg-transparent border border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-gray-100">Token Holdings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userTokens.map((token, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-transparent border-0">
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

              <TabsContent value="transactions" className="space-y-4">
                <Card className="bg-transparent border border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-gray-100">Recent Transactions</CardTitle>
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
                            <div 
                              key={transaction.id} 
                              className="flex items-center justify-between p-4 rounded-lg bg-transparent border-0 cursor-pointer hover:bg-gray-800/20 transition-colors"
                              onClick={() => window.open(`https://etherscan.io/tx/${transaction.transactionHash}`, '_blank')}
                            >
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

            </Tabs>
          </div>
          
          {/* Right Side - Portfolio Summary / Swap Assets */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Swap Assets (when swap mode is active) */}
              {isSwapMode && (
                <AssetSwap userTokens={userTokens} />
              )}
              
              {/* Portfolio Summary (always visible) */}
              <Card className="bg-gray-900 border-0 rounded-2xl">
                <CardContent className="p-8 space-y-8">
                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Progress</span>
                      <span className="text-sm font-medium text-gray-300">
                        {(() => {
                          if (!challengeDetails || !isClient) return '0%';
                          
                          const startTime = challengeDetails.startTime.getTime();
                          const endTime = challengeDetails.endTime.getTime();
                          const now = currentTime.getTime();
                          
                          if (now < startTime) return '0%';
                          if (now >= endTime) return '100%';
                          
                          const totalDuration = endTime - startTime;
                          const elapsed = now - startTime;
                          const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
                          
                          return `${progress.toFixed(0)}%`;
                        })()}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ 
                          width: `${(() => {
                            if (!challengeDetails || !isClient) return 0;
                            
                            const startTime = challengeDetails.startTime.getTime();
                            const endTime = challengeDetails.endTime.getTime();
                            const now = currentTime.getTime();
                            
                            if (now < startTime) return 0;
                            if (now >= endTime) return 100;
                            
                            const totalDuration = endTime - startTime;
                            const elapsed = now - startTime;
                            const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
                            
                            return progress;
                          })()}%` 
                        }}
                      ></div>
                    </div>
                    
                    {/* Time Info */}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Started: {challengeDetails?.startTime.toLocaleDateString() || 'N/A'}</span>
                      <span>Ends: {challengeDetails?.endTime.toLocaleDateString() || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Portfolio Value */}
                  <div className="space-y-2">
                    <span className="text-sm text-gray-400">Portfolio Value</span>
                    <div className="text-4xl text-white">
                      ${currentValue.toFixed(2)}
                    </div>
                  </div>

                  {/* Gain/Loss */}
                  <div className="space-y-2">
                    <span className="text-sm text-gray-400">Gain/Loss</span>
                    <div className={`text-4xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}${gainLoss.toFixed(2)}
                    </div>
                    <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{gainLossPercentage.toFixed(2)}%
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <span className="text-sm text-gray-400">Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${challengeData?.challenge?.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className={`text-lg font-medium ${challengeData?.challenge?.isActive ? 'text-green-400' : 'text-gray-400'}`}>
                        {challengeData?.challenge?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 