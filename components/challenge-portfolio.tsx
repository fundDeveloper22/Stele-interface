"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, BarChart3, LineChart, PieChart, Loader2, User, Receipt, ArrowLeftRight, Trophy } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ChallengeTypeModal } from "@/components/challenge-type-modal"
import { useRouter } from "next/navigation"
import { 
  BASE_CHAIN_ID, 
  BASE_CHAIN_CONFIG, 
  STELE_CONTRACT_ADDRESS,
  USDC_TOKEN_ADDRESS,
  USDC_DECIMALS
} from "@/lib/constants"
import { useEntryFee } from "@/lib/hooks/use-entry-fee"
import SteleABI from "@/app/abis/Stele.json"
import ERC20ABI from "@/app/abis/ERC20.json"
import { useChallenge } from "@/app/hooks/useChallenge"
import { useTransactions } from "@/app/hooks/useTransactions"
import { useInvestorData } from "@/app/subgraph/Account"

interface ChallengePortfolioProps {
  challengeId: string
}

export function ChallengePortfolio({ challengeId }: ChallengePortfolioProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isGettingRewards, setIsGettingRewards] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { entryFee, isLoading: isLoadingEntryFee } = useEntryFee();
  const { data: challengeData, isLoading: isLoadingChallenge, error: challengeError } = useChallenge(challengeId);
  const { data: transactions = [], isLoading: isLoadingTransactions, error: transactionsError } = useTransactions(challengeId);
  
  // Check if current user has joined this challenge
  const { data: investorData, isLoading: isLoadingInvestor } = useInvestorData(
    challengeId, 
    walletAddress || ""
  );

  // Check if user has joined the challenge
  const hasJoinedChallenge = investorData?.investor !== undefined && investorData?.investor !== null;

  useEffect(() => {
    // Get wallet address from localStorage
    const storedAddress = localStorage.getItem('walletAddress');
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
    // Set client-side flag
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
    
    // Fallback to old logic if no data
    switch(challengeId) {
      case 'one-week-challenge':
        return 'One Week Challenge';
      case 'one-month-challenge':
        return 'One Month Challenge';
      case 'three-month-challenge':
        return 'Three Month Challenge';
      case 'six-month-challenge':
        return 'Six Month Challenge';
      case 'one-year-challenge':
        return 'One Year Challenge';
      default:
        return 'One Week Challenge';
    }
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

      // Check if we are on Base network
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== BASE_CHAIN_ID) { // Base Mainnet Chain ID
        // Switch to Base network
        try {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID }], // Base Mainnet
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
            toast({
              title: "Approval Submitted",
              description: "Your USDC approval transaction has been sent to the network.",
              action: (
                <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${approveTx.hash}`, '_blank')}>
                  View on BaseScan
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
                <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${approveTx.hash}`, '_blank')}>
                  View on BaseScan
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
        toast({
          title: "Transaction Submitted",
          description: "Your join challenge transaction has been sent to the network.",
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
          title: "Challenge Joined",
          description: "You have successfully joined the challenge!",
          action: (
            <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}>
              View on BaseScan
            </ToastAction>
          ),
        });
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

  // Handle Create Challenge with selected type
  const handleCreateChallenge = async (challengeType: number) => {
    setIsCreating(true);
    
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

      // Check if we are on Base network
      const chainId = await window.phantom.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== BASE_CHAIN_ID) { // Base Mainnet Chain ID
        // Switch to Base network
        try {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN_ID }], // Base Mainnet
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

      // Call createChallenge with the selected challenge type
      const tx = await steleContract.createChallenge(challengeType);
      
      // Show toast notification for transaction submitted
      toast({
        title: "Transaction Submitted",
        description: "Your challenge creation transaction has been sent to the network.",
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
        title: "Challenge Created",
        description: "Your challenge has been created successfully!",
        action: (
          <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}>
            View on BaseScan
          </ToastAction>
        ),
      });
      
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      
      // Show toast notification for error
      toast({
        variant: "destructive",
        title: "Error Creating Challenge",
        description: error.message || "An unknown error occurred",
      });
      
      // Re-throw the error to be handled by the modal
      throw error;
    } finally {
      setIsCreating(false);
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

      // Call getRewards function
      const tx = await steleContract.getRewards(challengeId);
      
      // Show toast notification for transaction submitted
      toast({
        title: "Transaction Submitted",
        description: "Your reward claim transaction has been sent to the network.",
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
        title: "Rewards Claimed!",
        description: "Your challenge rewards have been successfully claimed!",
        action: (
          <ToastAction altText="View on BaseScan" onClick={() => window.open(`https://basescan.org/tx/${tx.hash}`, '_blank')}>
            View on BaseScan
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{getChallengeTitle()}</h2>
        <div className="flex items-center gap-2">
          {/* Get Rewards 버튼 - Challenge가 끝났을 때만 표시 */}
          {isClient && challengeDetails.endTime <= currentTime && (
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
          
          {hasJoinedChallenge ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNavigateToAccount}
              className="bg-white text-black border-gray-200 hover:bg-gray-50"
            >
              <User className="mr-2 h-4 w-4" />
              My Account
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleJoinChallenge} disabled={isJoining || isLoadingEntryFee}>
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : isLoadingEntryFee ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <LineChart className="mr-2 h-4 w-4" />
                  Join Challenge ({entryFee} USDC)
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challengeDetails.participants}</div>
            <div className="text-sm text-muted-foreground">Total participants</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isClient ? (
                challengeDetails.endTime > currentTime ? 
                  (() => {
                    const diff = challengeDetails.endTime.getTime() - currentTime.getTime()
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                    
                    if (days > 0) {
                      return `${days} days ${hours} hours remaining`
                    } else if (hours > 0) {
                      return `${hours} hours ${minutes} minutes remaining`
                    } else if (minutes > 0) {
                      return `${minutes} minutes ${seconds} seconds remaining`
                    } else {
                      return `${seconds} seconds remaining`
                    }
                  })() :
                  "Challenge Ended"
              ) : "Loading..."}
            </div>
            <div className="text-sm text-muted-foreground">
              {isClient ? `Ends on ${challengeDetails.endTime.toLocaleDateString()}` : "Calculating..."}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prize</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challengeDetails.prize}</div>
            <div className="text-sm text-muted-foreground">Challenge reward</div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
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
                <p className="text-sm text-muted-foreground mt-2">{transactionsError.message}</p>
                <p className="text-xs text-muted-foreground mt-1">Check console for more details</p>
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
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${getIconColor(transaction.type)} flex items-center justify-center`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="font-medium">{transaction.details}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(transaction.timestamp)}
                          {transaction.user && ` • ${formatUserAddress(transaction.user)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{transaction.amount || '-'}</div>
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
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found for this challenge</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
