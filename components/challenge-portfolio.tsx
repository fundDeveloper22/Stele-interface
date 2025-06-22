"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, BarChart3, LineChart, PieChart, Loader2, User, Receipt, ArrowLeftRight, Trophy, Medal, Crown, DollarSign, UserPlus } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ChallengeCharts } from "@/components/challenge-charts"
import { useRouter } from "next/navigation"
import { 
  ETHEREUM_CHAIN_ID, 
  ETHEREUM_CHAIN_CONFIG, 
  STELE_CONTRACT_ADDRESS,
  USDC_TOKEN_ADDRESS,
  USDC_DECIMALS
} from "@/lib/constants"
import { useEntryFee } from "@/lib/hooks/use-entry-fee"
import SteleABI from "@/app/abis/Stele.json"
import ERC20ABI from "@/app/abis/ERC20.json"
import { useChallenge } from "@/app/hooks/useChallenge"
import { useTransactions } from "@/app/hooks/useTransactions"
import { useRanking } from "@/app/hooks/useRanking"
import { useInvestorData } from "@/app/subgraph/Account"

interface ChallengePortfolioProps {
  challengeId: string
}

// Ranking Section Component
function RankingSection({ challengeId }: { challengeId: string }) {
  const { data: rankingData, isLoading: isLoadingRanking, error: rankingError } = useRanking(challengeId);

  const formatAddress = (address: string) => {
    // Check if address is empty or zero address
    if (!address || address === '0x0000000000000000000000000000000000000000' || address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      return '';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatScore = (score: string) => {
    // Convert BigInt score to a readable format
    const scoreValue = parseFloat(score) / 1e18; // Assuming 18 decimals
    return scoreValue.toFixed(2);
  };

  const formatProfitRatio = (profitRatio: string, userAddress: string) => {
    // Check if address is empty or zero address
    if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000' || userAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      return '0.0%';
    }
    
    // Convert profit ratio to percentage
    const ratioValue = parseFloat(profitRatio);
    return `${ratioValue.toFixed(4)}%`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border-yellow-700/50 text-yellow-100';
      case 2:
        return 'bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-gray-600/50 text-gray-100';
      case 3:
        return 'bg-gradient-to-r from-amber-900/20 to-amber-800/20 border-amber-700/50 text-amber-100';
      default:
        return 'bg-gray-800/50 border-gray-700/50 text-gray-100';
    }
  };

  return (
    <div>
      <h2 className="text-3xl text-gray-100 mb-6">Ranking</h2>
      <Card className="bg-transparent border border-gray-700/50">
        <CardContent className="p-6">
          <div className="space-y-3">
            {isLoadingRanking ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading rankings...</span>
              </div>
            ) : rankingError ? (
              <div className="text-center py-8 text-red-400">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Error loading rankings</p>
                <p className="text-sm text-gray-500 mt-2">{rankingError.message}</p>
              </div>
            ) : rankingData && rankingData.topUsers.length > 0 ? (
              rankingData.topUsers.map((user, index) => {
                const rank = index + 1;
                const profitRatio = rankingData.profitRatios[index];
                const formattedAddress = formatAddress(user);
                const isEmptySlot = !formattedAddress;

                return (
                  <div 
                    key={`${user}-${rank}`} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${getRankColor(rank)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getRankIcon(rank)}
                      <div>
                        <div className="font-medium">
                          {isEmptySlot ? (
                            <span className="text-gray-500 italic">Empty</span>
                          ) : (
                            formattedAddress
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          Rank #{rank}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatProfitRatio(profitRatio, user)}</div>
                      <div className="text-xs text-gray-400">Profit Ratio</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No ranking data available</p>
                <p className="text-sm mt-1">Rankings will appear once users start trading</p>
              </div>
            )}
          </div>
          {rankingData && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 text-center">
                Last updated: {new Date(parseInt(rankingData.updatedAtTimestamp) * 1000).toLocaleString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ChallengePortfolio({ challengeId }: ChallengePortfolioProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isGettingRewards, setIsGettingRewards] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasJoinedLocally, setHasJoinedLocally] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { entryFee, isLoading: isLoadingEntryFee } = useEntryFee();

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
  const { data: challengeData, isLoading: isLoadingChallenge, error: challengeError } = useChallenge(challengeId);
  const { data: transactions = [], isLoading: isLoadingTransactions, error: transactionsError } = useTransactions(challengeId);
  const { data: rankingData, isLoading: isLoadingRanking, error: rankingError } = useRanking(challengeId);
  
  // Check if current user has joined this challenge
  const { data: investorData, isLoading: isLoadingInvestor, refetch: refetchInvestorData } = useInvestorData(
    challengeId, 
    walletAddress || ""
  );

  // Check if user has joined the challenge (combining local state with subgraph data)
  const hasJoinedFromSubgraph = investorData?.investor !== undefined && investorData?.investor !== null;
  const hasJoinedChallenge = hasJoinedLocally || hasJoinedFromSubgraph;

  // Check if current wallet is in top 5 ranking
  const isInTop5Ranking = () => {
    if (!walletAddress || !rankingData?.topUsers || rankingData.topUsers.length === 0) {
      return false;
    }
    
    // Check if current wallet address is in the top 5 users
    const top5Users = rankingData.topUsers.slice(0, 5);
    const isInTop5 = top5Users.some(user => user.toLowerCase() === walletAddress.toLowerCase());  
    return isInTop5;
  };

  // Check if challenge has ended
  const isChallengeEnded = () => {
    if (!isClient || !challengeData?.challenge) return false;
    const challenge = challengeData.challenge;
    const endTime = new Date(parseInt(challenge.endTime) * 1000);
    const hasEnded = endTime <= currentTime;
    return hasEnded;
  };

  // Check if Get Rewards button should be shown
  const shouldShowGetRewards = () => {
    const challengeEnded = isChallengeEnded();
    const inTop5 = isInTop5Ranking();
    const isActive = challengeData?.challenge?.isActive === true;
    const shouldShow = challengeEnded && inTop5 && isActive;
    return shouldShow;
  };

  // Check if USDC balance is insufficient
  const isInsufficientBalance = () => {
    if (!entryFee || !usdcBalance || isLoadingBalance || isLoadingEntryFee) return false;
    
    const balance = parseFloat(usdcBalance);
    const fee = parseFloat(entryFee);
    
    return balance < fee;
  };

  // Check USDC balance
  const checkUSDCBalance = async (address: string) => {
    if (!address || !isClient) return;
    
    setIsLoadingBalance(true);
    try {
      // Check if Phantom wallet is available
      if (typeof window.phantom === 'undefined' || !window.phantom?.ethereum) {
        setUsdcBalance('0');
        return;
      }

      // Create a Web3Provider using the Phantom ethereum provider
      const provider = new ethers.BrowserProvider(window.phantom.ethereum);
      
      // Create USDC contract instance
      const usdcContract = new ethers.Contract(
        USDC_TOKEN_ADDRESS,
        ERC20ABI.abi,
        provider
      );

      // Get USDC balance
      const balance = await usdcContract.balanceOf(address);
      const formattedBalance = ethers.formatUnits(balance, USDC_DECIMALS);
      setUsdcBalance(formattedBalance);
    } catch (error) {
      console.error('Error checking USDC balance:', error);
      setUsdcBalance('0');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    // Get wallet address from localStorage
    const storedAddress = localStorage.getItem('walletAddress');
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
    // Set client-side flag
    setIsClient(true);
  }, []);

  // Check USDC balance when wallet address changes
  useEffect(() => {
    if (walletAddress && isClient) {
      checkUSDCBalance(walletAddress);
    }
  }, [walletAddress, isClient]);

  // Update time every second for accurate countdown
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isClient]);

  // Handle navigation to account page
  const handleNavigateToAccount = async () => {
    try {
      // If wallet address is not in state, try to get it from Phantom wallet
      if (!walletAddress) {
        if (typeof window.phantom === 'undefined') {
          throw new Error("Phantom wallet is not installed. Please install it from https://phantom.app/");
        }

        if (!window.phantom?.ethereum) {
          throw new Error("Ethereum provider not found in Phantom wallet");
        }

        const accounts = await window.phantom.ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts found. Please connect to Phantom wallet first.");
        }

        // Save address to state and localStorage
        const address = accounts[0];
        setWalletAddress(address);
        localStorage.setItem('walletAddress', address);
        
        // Navigate to account page
        router.push(`/challenge/${challengeId}/${address}`);
      } else {
        // Use the existing wallet address
        router.push(`/challenge/${challengeId}/${walletAddress}`);
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        variant: "destructive",
        title: "Error Connecting Wallet",
        description: error.message || "An unknown error occurred",
      });
    }
  };

  // Get challenge title and info from real data
  const getChallengeTitle = () => {
    if (challengeData?.challenge) {
      const challengeType = challengeData.challenge.challengeType;
      let baseTitle = '';
      switch(challengeType) {
        case 0:
          baseTitle = '1 Week Challenge';
          break;
        case 1:
          baseTitle = '1 Month Challenge';
          break;
        case 2:
          baseTitle = '3 Month Challenge';
          break;
        case 3:
          baseTitle = '6 Month Challenge';
          break;
        case 4:
          baseTitle = '1 Year Challenge';
          break;
        default:
          baseTitle = `Challenge Type ${challengeType}`;
      }
      return `${baseTitle} ( ID: ${challengeId} )`;
    }
    
    // Fallback to old logic if no data
    let baseTitle = '';
    switch(challengeId) {
      case 'one-week-challenge':
        baseTitle = 'One Week Challenge';
        break;
      case 'one-month-challenge':
        baseTitle = 'One Month Challenge';
        break;
      case 'three-month-challenge':
        baseTitle = 'Three Month Challenge';
        break;
      case 'six-month-challenge':
        baseTitle = 'Six Month Challenge';
        break;
      case 'one-year-challenge':
        baseTitle = 'One Year Challenge';
        break;
      default:
        baseTitle = 'One Week Challenge';
    }
    return `${baseTitle} (ID: ${challengeId})`;
  };

  // Get challenge details from real data
  const getChallengeDetails = () => {
    if (!isClient || !challengeData?.challenge) {
      // Return fallback values for SSR and when data is not available
      return {
        participants: 0,
        prize: '$0.00',
        entryFee: '$10.00',
        seedMoney: '$1000.00',
        isActive: false,
        startTime: new Date(),
        endTime: new Date(),
      };
    }
    
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
  };

  const challengeDetails = getChallengeDetails();

  // Handle Join Challenge
  const handleJoinChallenge = async () => {
    setIsJoining(true);
    
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

      const userAddress = accounts[0];

      // Get current network information
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      console.log('Current network chain ID:', chainId);
      
      // Use current network without switching
      // No automatic network switching - use whatever network user is currently on

      if (!entryFee) {
        throw new Error("Entry fee not loaded yet. Please try again later.");
      }

      // Create a Web3Provider using the Phantom ethereum provider
      const provider = new ethers.BrowserProvider(window.phantom.ethereum);
      
      // Get the signer
      const signer = await provider.getSigner();
      
      // Create contract instances
      const steleContract = new ethers.Contract(
        STELE_CONTRACT_ADDRESS,
        SteleABI.abi,
        signer
      );

      const usdcContract = new ethers.Contract(
        USDC_TOKEN_ADDRESS,
        ERC20ABI.abi,
        signer
      );
      // Convert entryFee from string to the proper format for the contract
      const discountedEntryFeeAmount = ethers.parseUnits(entryFee, USDC_DECIMALS);

      // Check current USDC balance
      try {
        const usdcBalance = await usdcContract.balanceOf(userAddress);        
        if (usdcBalance < discountedEntryFeeAmount) {
          const balanceFormatted = ethers.formatUnits(usdcBalance, USDC_DECIMALS);
          throw new Error(`❌ Insufficient USDC balance. You have ${balanceFormatted} USDC but need ${entryFee} USDC.`);
        }
      } catch (balanceError: any) {
        console.error("❌ Error checking USDC balance:", balanceError);
        throw balanceError;
      }

      // Check current allowance
      try {
        const currentAllowance = await usdcContract.allowance(userAddress, STELE_CONTRACT_ADDRESS);
        if (currentAllowance < discountedEntryFeeAmount) {
          
          // Estimate gas for approval
          try {
            const approveGasEstimate = await usdcContract.approve.estimateGas(STELE_CONTRACT_ADDRESS, discountedEntryFeeAmount);
            const approveTx = await usdcContract.approve(STELE_CONTRACT_ADDRESS, discountedEntryFeeAmount, {
              gasLimit: approveGasEstimate + BigInt(10000) // Add 10k gas buffer
            });
                        
            // Show toast notification for approve transaction submitted
            const explorerName = getExplorerName(chainId);
            const explorerUrl = getExplorerUrl(chainId, approveTx.hash);
            
            toast({
              title: "Approval Submitted",
              description: "Your USDC approval transaction has been sent to the network.",
              action: (
                <ToastAction altText={`View on ${explorerName}`} onClick={() => window.open(explorerUrl, '_blank')}>
                  View on {explorerName}
                </ToastAction>
              ),
            });
            
            // Wait for approve transaction to be mined
            await approveTx.wait();
            
            // Show toast notification for approve transaction confirmed
            toast({
              title: "Approval Confirmed",
              description: `You have successfully approved ${entryFee} USDC for Stele contract.`,
              action: (
                <ToastAction altText={`View on ${explorerName}`} onClick={() => window.open(explorerUrl, '_blank')}>
                  View on {explorerName}
                </ToastAction>
              ),
            });
          } catch (approveError: any) {
            console.error("❌ Approval failed:", approveError);
            throw new Error(`Failed to approve USDC: ${approveError.message}`);
          }
        } else {

        }
      } catch (allowanceError: any) {
        console.error("❌ Error checking allowance:", allowanceError);
        throw allowanceError;
      }

      // Now try to join the challenge
      try {
        // Estimate gas for joinChallenge
        const joinGasEstimate = await steleContract.joinChallenge.estimateGas(challengeId);

        const tx = await steleContract.joinChallenge(challengeId, {
          gasLimit: joinGasEstimate + BigInt(20000) // Add 20k gas buffer
        });
                
        // Show toast notification for transaction submitted
        const joinExplorerName = getExplorerName(chainId);
        const joinExplorerUrl = getExplorerUrl(chainId, tx.hash);
        
        toast({
          title: "Transaction Submitted",
          description: "Your join challenge transaction has been sent to the network.",
          action: (
            <ToastAction altText={`View on ${joinExplorerName}`} onClick={() => window.open(joinExplorerUrl, '_blank')}>
              View on {joinExplorerName}
            </ToastAction>
          ),
        });
        
        // Wait for transaction to be mined
        await tx.wait();
        
        // Show toast notification for transaction confirmed
        toast({
          title: "Challenge Joined",
          description: "You have successfully joined the challenge!",
          action: (
            <ToastAction altText={`View on ${joinExplorerName}`} onClick={() => window.open(joinExplorerUrl, '_blank')}>
              View on {joinExplorerName}
            </ToastAction>
          ),
        });

        // Update local state immediately for instant UI feedback
        setHasJoinedLocally(true);
        
        // Start refetching investor data to check for subgraph updates
        let attempts = 0;
        const maxAttempts = 10; // Try for 5 minutes (30s * 10)
        const checkInterval = setInterval(async () => {
          attempts++;
          try {
            const result = await refetchInvestorData();
            if (result.data?.investor) {
              // Subgraph has been updated, clear interval and refresh page
              clearInterval(checkInterval);
              window.location.reload();
            }
          } catch (error) {
            console.log('Refetch attempt', attempts, 'failed:', error);
          }
          
          // Stop trying after max attempts
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
          }
        }, 30000); // Check every 30 seconds
      } catch (joinError: any) {
        console.error("❌ Join challenge failed:", joinError);
        
        // More specific error handling for join challenge
        if (joinError.message.includes("insufficient funds")) {
          throw new Error("Insufficient ETH for gas fees. Please add ETH to your wallet.");
        } else if (joinError.message.includes("user rejected")) {
          throw new Error("Transaction was rejected by user.");
        } else if (joinError.message.includes("already joined") || joinError.message.includes("AlreadyJoined")) {
          throw new Error("You have already joined this challenge.");
        } else if (joinError.message.includes("missing revert data")) {
          throw new Error(`Contract execution failed. This might be due to:\n- Insufficient USDC balance\n- Challenge not active\n- Already joined\n- Invalid challenge ID\n\nPlease check the console for detailed logs.`);
        } else {
          throw new Error(`Failed to join challenge: ${joinError.message}`);
        }
      }
      
    } catch (error: any) {
      console.error("❌ Error joining challenge:", error);
      
      // Show toast notification for error
      toast({
        variant: "destructive",
        title: "Error Joining Challenge",
        description: error.message || "An unknown error occurred",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Handle Get Rewards
  const handleGetRewards = async () => {
    setIsGettingRewards(true);
    
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

      // Get current network information
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      console.log('Current network chain ID for get rewards:', chainId);
      
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

      // Call getRewards function
      const tx = await steleContract.getRewards(challengeId);
      
      // Show toast notification for transaction submitted
      const rewardExplorerName = getExplorerName(chainId);
      const rewardExplorerUrl = getExplorerUrl(chainId, tx.hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Your reward claim transaction has been sent to the network.",
        action: (
          <ToastAction altText={`View on ${rewardExplorerName}`} onClick={() => window.open(rewardExplorerUrl, '_blank')}>
            View on {rewardExplorerName}
          </ToastAction>
        ),
      });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Show toast notification for transaction confirmed
      toast({
        title: "Rewards Claimed!",
        description: "Your challenge rewards have been successfully claimed!",
        action: (
          <ToastAction altText={`View on ${rewardExplorerName}`} onClick={() => window.open(rewardExplorerUrl, '_blank')}>
            View on {rewardExplorerName}
          </ToastAction>
        ),
      });
      
    } catch (error: any) {
      console.error("Error claiming rewards:", error);
      
      // Show toast notification for error
      toast({
        variant: "destructive",
        title: "Error Claiming Rewards",
        description: error.message || "An unknown error occurred",
      });
      
    } finally {
      setIsGettingRewards(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {isLoadingChallenge ? (
          <div className="flex items-center gap-2">
            <div className="h-8 bg-gray-700 rounded w-48 animate-pulse"></div>
            <div className="h-8 bg-gray-700 rounded w-16 animate-pulse"></div>
          </div>
        ) : (
          <h2 className="text-2xl">
            <span className="text-gray-400">
              {getChallengeTitle().split(' ( ID: ')[0]}
            </span>
            <span className="text-gray-100">
              {getChallengeTitle().includes('( ID: ') ? ' ( ID: ' + getChallengeTitle().split('( ID: ')[1] : ''}
            </span>
          </h2>
        )}
        <div className="flex items-center gap-2">
          {/* Get Rewards Button - Show when challenge is ended AND current wallet is in top 5 */}
          {isClient && shouldShowGetRewards() && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleGetRewards}
              disabled={isGettingRewards}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {isGettingRewards ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Get Rewards
                </>
              )}
            </Button>
          )}
          
          {/* Entry Fee Display - only show when join button is visible */}
          {!hasJoinedChallenge && !isChallengeEnded() && entryFee && (
            <div className={`flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium border ${
              isInsufficientBalance() 
                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                : "bg-primary/10 text-primary border-primary/20"
            }`}>
              Entry Fee : {isLoadingEntryFee ? 'Loading...' : `$${entryFee}`}
              {isInsufficientBalance() && !isLoadingBalance && (
                <span className="ml-2 text-xs">
                  (Balance: ${parseFloat(usdcBalance).toFixed(2)})
                </span>
              )}
            </div>
          )}
          
          {hasJoinedChallenge ? (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleNavigateToAccount}
              className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white border-gray-500 hover:border-gray-400 font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
            >
              <User className="mr-3 h-5 w-5" />
              My Account
            </Button>
          ) : !isChallengeEnded() && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleJoinChallenge} 
              disabled={isJoining || isLoadingEntryFee || isLoadingBalance || isInsufficientBalance()}
              className={`font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg ${
                isInsufficientBalance() 
                  ? "bg-gray-600 hover:bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
              }`}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : isLoadingEntryFee || isLoadingBalance ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : isInsufficientBalance() ? (
                <>
                  <UserPlus className="mr-3 h-5 w-5" />
                  Insufficient USDC
                </>
              ) : (
                <>
                  <UserPlus className="mr-3 h-5 w-5" />
                  Join
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Challenge Charts */}
      <ChallengeCharts challengeId={challengeId} />

      {/* Transactions and Ranking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div>
          <h2 className="text-3xl text-gray-100 mb-6">Recent Transactions</h2>
          <Card className="bg-transparent border border-gray-700/50">
            <CardContent className="p-6">
              <div className="space-y-4">
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading transactions...</span>
                  </div>
                ) : transactionsError ? (
                  <div className="text-center py-8 text-red-400">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Error loading transactions</p>
                    <p className="text-sm text-gray-500 mt-2">{transactionsError.message}</p>
                    <p className="text-xs text-gray-500 mt-1">Check console for more details</p>
                  </div>
                ) : transactions.length > 0 ? (
                  transactions.slice(0, 10).map((transaction) => {
                    const getTransactionIcon = (type: string) => {
                      switch (type) {
                        case 'create':
                          return <Trophy className="h-4 w-4 text-white" />
                        case 'join':
                          return <User className="h-4 w-4 text-white" />
                        case 'swap':
                          return <ArrowLeftRight className="h-4 w-4 text-white" />
                        case 'register':
                          return <BarChart3 className="h-4 w-4 text-white" />
                        case 'reward':
                          return <Trophy className="h-4 w-4 text-white" />
                        default:
                          return <Receipt className="h-4 w-4 text-white" />
                      }
                    }

                    const getIconColor = (type: string) => {
                      switch (type) {
                        case 'create':
                          return 'bg-purple-500'
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

                    const formatUserAddress = (address?: string) => {
                      if (!address) return ''
                      return `${address.slice(0, 6)}...${address.slice(-4)}`
                    }

                    return (
                      <div 
                        key={transaction.id} 
                        className="flex items-center justify-between py-3 px-3 last:border-b-0 mb-2 cursor-pointer hover:bg-gray-800/50 rounded-lg transition-colors"
                        onClick={() => window.open(`https://etherscan.io/tx/${transaction.transactionHash}`, '_blank')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${getIconColor(transaction.type)} flex items-center justify-center`}>
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-100">{transaction.details}</div>
                            <div className="text-sm text-gray-400">
                              {formatTimestamp(transaction.timestamp)}
                              {transaction.user && ` • ${formatUserAddress(transaction.user)}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-100">{transaction.amount || '-'}</div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found for this challenge</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Section */}
        <RankingSection challengeId={challengeId} />
      </div>

    </div>
  )
}
