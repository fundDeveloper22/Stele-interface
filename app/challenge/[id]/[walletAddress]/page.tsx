"use client"

import { notFound } from "next/navigation"
import { useState, useMemo, use, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const maxPages = 5

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
  if (isLoadingInvestor || isLoadingChallenge || isLoadingTransactions) {
    return (
      <div className="container mx-auto p-6 py-20">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Back Button Loading */}
          <div className="mb-6">
            <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
          </div>
          
          {/* Challenge Info Loading */}
          <div className="mb-0">
            <div className="flex items-center gap-3">
              <div className="h-8 bg-gray-700 rounded w-24 animate-pulse"></div>
              <div className="h-8 bg-gray-700 rounded w-4 animate-pulse"></div>
            </div>
          </div>
          
          {/* Header Loading */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-8 bg-gray-700 rounded w-20 animate-pulse"></div>
                <div className="h-8 bg-gray-700 rounded w-40 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-end gap-4">
                <div className="h-14 bg-gray-700 rounded-lg w-24 animate-pulse"></div>
                <div className="h-14 bg-gray-700 rounded-lg w-28 animate-pulse"></div>
              </div>
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
              <div className="space-y-4">
                {/* Portfolio Summary Loading */}
                <Card className="bg-gray-900 border-0 rounded-2xl">
                  <CardContent className="p-8 space-y-8">
                    {/* Progress Loading */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                        <div className="h-4 bg-gray-700 rounded w-8 animate-pulse"></div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 animate-pulse"></div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-700 rounded w-36 animate-pulse"></div>
                        <div className="h-3 bg-gray-700 rounded w-32 animate-pulse"></div>
                      </div>
                    </div>

                    {/* Portfolio Value Loading */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-28 animate-pulse"></div>
                      <div className="h-10 bg-gray-700 rounded w-48 animate-pulse"></div>
                    </div>

                    {/* Gain/Loss Loading */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                      <div className="h-10 bg-gray-700 rounded w-44 animate-pulse"></div>
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

                {/* Challenge Info Loading */}
                <Card className="bg-gray-900 border-0 rounded-2xl">
                  <CardContent className="p-8 space-y-8">
                    {/* Challenge Type Loading */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-28 animate-pulse"></div>
                      <div className="h-8 bg-gray-700 rounded w-32 animate-pulse"></div>
                    </div>

                    {/* Challenge ID Loading */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                      <div className="h-8 bg-gray-700 rounded w-4 animate-pulse"></div>
                    </div>

                    {/* Seed Money Loading */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                      <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
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
    <div className="container mx-auto p-6 py-12">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Go to Challenge Button */}
        <div className="mb-4">
          <button 
            onClick={() => router.push(`/challenge/${challengeId}`)}
            className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Go to Challenge {challengeId}
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
              <div className="flex justify-end gap-4">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setIsSwapMode(!isSwapMode)}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white border-0 font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
                >
                  {isSwapMode ? (
                    <>
                      <X className="mr-3 h-5 w-5" />
                      Close
                    </>
                  ) : (
                    <>
                      <Repeat className="mr-3 h-5 w-5" />
                      Swap
                    </>
                  )}
                </Button>
                <Button 
                  variant="default" 
                  size="lg" 
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-3 h-5 w-5" />
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
                        (() => {
                          // Calculate pagination
                          const totalTransactions = Math.min(investorTransactions.length, maxPages * itemsPerPage);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const endIndex = Math.min(startIndex + itemsPerPage, totalTransactions);
                          const paginatedTransactions = investorTransactions.slice(startIndex, endIndex);
                          const totalPages = Math.min(Math.ceil(totalTransactions / itemsPerPage), maxPages);

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
                            <div className="space-y-4">
                              {paginatedTransactions.map((transaction) => (
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
                              ))}
                              
                              {/* Pagination */}
                              {totalPages > 1 && (
                                <div className="flex justify-center mt-6">
                                  <Pagination>
                                    <PaginationContent>
                                      <PaginationItem>
                                        <PaginationPrevious 
                                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                      </PaginationItem>
                                      
                                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={page}>
                                          <PaginationLink
                                            onClick={() => setCurrentPage(page)}
                                            isActive={currentPage === page}
                                            className="cursor-pointer"
                                          >
                                            {page}
                                          </PaginationLink>
                                        </PaginationItem>
                                      ))}
                                      
                                      <PaginationItem>
                                        <PaginationNext 
                                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                      </PaginationItem>
                                    </PaginationContent>
                                  </Pagination>
                                </div>
                              )}
                            </div>
                          )
                        })()
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
                  {/* Status */}
                  <div className="space-y-2">
                    <span className="text-base text-gray-400">Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${challengeData?.challenge?.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className={`text-xl font-medium ${challengeData?.challenge?.isActive ? 'text-green-400' : 'text-gray-400'}`}>
                        {challengeData?.challenge?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Portfolio Value */}
                  <div className="space-y-2">
                    <span className="text-base text-gray-400">Portfolio Value</span>
                    <div className="text-4xl text-white">
                      ${currentValue.toFixed(2)}
                    </div>
                  </div>

                  {/* Gain/Loss */}
                  <div className="space-y-2">
                    <span className="text-base text-gray-400">Gain/Loss</span>
                    <div className="flex items-baseline gap-3">
                      <div className={`text-4xl ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}${gainLoss.toFixed(2)}
                      </div>
                      <div className={`text-base ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        ({isPositive ? '+' : ''}{gainLossPercentage.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base text-gray-400">Progress</span>
                      <span className="text-base font-medium text-gray-300">
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
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
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
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Started: {challengeDetails?.startTime.toLocaleDateString() || 'N/A'}</span>
                      <span>Ends: {challengeDetails?.endTime.toLocaleDateString() || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Challenge Info */}
              <Card className="bg-gray-900 border-0 rounded-2xl">
                <CardContent className="p-8 space-y-8">
                  {/* Challenge Type */}
                  <div className="space-y-2">
                    <span className="text-base text-gray-400">Challenge Type</span>
                    <div className="text-3xl text-white">
                      {(() => {
                        switch (challengeId) {
                          case '1':
                            return '1 Week';
                          case '2':
                            return '1 Month';
                          case '3':
                            return '3 Months';
                          case '4':
                            return '6 Months';
                          case '5':
                            return '1 Year';
                          default:
                            return `Type ${challengeId}`;
                        }
                      })()}
                    </div>
                  </div>

                  {/* Challenge ID */}
                  <div className="space-y-2">
                    <span className="text-base text-gray-400">Challenge ID</span>
                    <div className="text-3xl text-white">
                      {challengeId}
                    </div>
                  </div>

                  {/* Seed Money */}
                  <div className="space-y-2">
                    <span className="text-base text-gray-400">Seed Money</span>
                    <div className="text-3xl text-white">
                      {(() => {
                        // If we have challenge data and seedMoney is available
                        if (challengeData?.challenge?.seedMoney) {
                          const seedMoneyValue = parseInt(challengeData.challenge.seedMoney);
                          return seedMoneyValue > 0 ? `$${seedMoneyValue}` : '$0';
                        }
                        // Default fallback
                        return '$0';
                      })()}
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