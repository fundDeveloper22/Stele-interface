"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, BarChart3, LineChart, PieChart, Loader2, User } from "lucide-react"
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

interface ChallengePortfolioProps {
  challengeId: string
}

export function ChallengePortfolio({ challengeId }: ChallengePortfolioProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { entryFee, isLoading: isLoadingEntryFee } = useEntryFee();
  
  useEffect(() => {
    // Get wallet address from localStorage
    const storedAddress = localStorage.getItem('walletAddress');
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
  }, []);

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

  // This would typically fetch data based on the challengeId
  
  // Display title based on challenge ID
  const getChallengeTitle = () => {
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

      // First approve the Stele contract to spend USDC
      const approveTx = await usdcContract.approve(STELE_CONTRACT_ADDRESS, discountedEntryFeeAmount);
      
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

      // Now call joinChallenge with challenge ID 1
      const tx = await steleContract.joinChallenge("1");
      
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
      
    } catch (error: any) {
      console.error("Error joining challenge:", error);
      
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{getChallengeTitle()}</h2>
        <div className="flex items-center gap-2">
          <ChallengeTypeModal 
            onCreateChallenge={handleCreateChallenge}
            isCreating={isCreating}
          />
          
          <Button variant="outline" size="sm" onClick={handleNavigateToAccount}>
            <User className="mr-2 h-4 w-4" />
            My Account
          </Button>
          
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,245.67</div>
            <div className="text-sm text-emerald-500">+$245.67 from seed money</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">+24.57%</div>
            <div className="text-sm text-muted-foreground">Rank: 3/42</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 days 12 hours</div>
            <div className="text-sm text-muted-foreground">Ends on May 2, 2025</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                      <span className="text-xs font-bold">ETH</span>
                    </div>
                    <div>
                      <div className="font-medium">Ethereum</div>
                      <div className="text-sm text-muted-foreground">0.35 ETH</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$623.45</div>
                    <div className="text-sm text-emerald-500">50% of portfolio</div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
                      <span className="text-xs font-bold">USD</span>
                    </div>
                    <div>
                      <div className="font-medium">USD Coin</div>
                      <div className="text-sm text-muted-foreground">622.22 USDC</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$622.22</div>
                    <div className="text-sm text-muted-foreground">50% of portfolio</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/swap?challenge=${challengeId}`} className="w-full">
              <Button className="w-full">
                Swap Assets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <div className="font-medium">ETH → USDC</div>
                    <div className="text-sm text-muted-foreground">Apr 24, 2025 • 14:32</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">0.15 ETH</div>
                    <div className="text-sm text-muted-foreground">$267.35</div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <div className="font-medium">USDC → ETH</div>
                    <div className="text-sm text-muted-foreground">Apr 22, 2025 • 09:15</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">500 USDC</div>
                    <div className="text-sm text-muted-foreground">$500.00</div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <div className="font-medium">Challenge Joined</div>
                    <div className="text-sm text-muted-foreground">Apr 20, 2025 • 10:00</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">1,000 USDC</div>
                    <div className="text-sm text-muted-foreground">Seed Money</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Performance Metrics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Total Return</span>
                  <span className="font-medium text-emerald-500">+24.57%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Daily Average</span>
                  <span className="font-medium text-emerald-500">+3.51%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Best Day</span>
                  <span className="font-medium text-emerald-500">+12.3%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Worst Day</span>
                  <span className="font-medium text-red-500">-5.2%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Current Rank</span>
                  <span className="font-medium">3 of 42</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Potential Reward</span>
                  <span className="font-medium">$325.00</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <PieChart className="mr-2 h-4 w-4" />
                View Detailed Analytics
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
