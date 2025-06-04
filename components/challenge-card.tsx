import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Trophy, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { 
  BASE_CHAIN_ID, 
  BASE_CHAIN_CONFIG, 
  STELE_CONTRACT_ADDRESS
} from "@/lib/constants"
import SteleABI from "@/app/abis/Stele.json"

interface ChallengeCardProps {
  id?: string
  title: string
  type: string
  participants: number
  timeLeft: string
  prize: string
  progress: number
  status: "active" | "pending" | "completed"
  startTime: string
  walletAddress?: string
  challengeId: string
}

export function ChallengeCard({ title, type, participants, timeLeft, prize, progress, status, id, startTime, walletAddress, challengeId }: ChallengeCardProps) {
  // If no ID is provided, convert the title to kebab-case and use it as ID
  const displayId = id || title.toLowerCase().replace(/\s+/g, '-');
  
  const [startDate, setStartDate] = useState<string>("Not started yet");
  const [isCreating, setIsCreating] = useState(false);
  
  useEffect(() => {
    // Handle display for challenges that haven't started yet
    const hasStarted = startTime && startTime !== "0";
    if (hasStarted) {
      // Detect user's browser locale only on client side
      const userLocale = navigator.language;
      const formattedDate = new Date(Number(startTime) * 1000).toLocaleDateString(userLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setStartDate(formattedDate);
    } else {
      setStartDate("Not started yet");
    }
  }, [startTime]);

  // Function to map challenge type string to number for contract call
  const getChallengeTypeNumber = (type: string): number => {
    switch (type.toLowerCase()) {
      case "1 week challenge":
        return 0;
      case "1 month challenge":
        return 1;
      case "3 months challenge":
        return 2;
      case "6 months challenge":
        return 3;
      case "1 year challenge":
        return 4;
      default:
        return 0; // Default to 1 week challenge
    }
  };

  // Handle Create Challenge
  const handleCreateChallenge = async () => {
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

      // Get the challenge type number
      const challengeTypeNumber = getChallengeTypeNumber(type);

      // Call createChallenge with the challenge type
      const tx = await steleContract.createChallenge(challengeTypeNumber);
      
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
        description: `Your ${type} has been created successfully!`,
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
      
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge
            variant={status === "active" ? "default" : status === "pending" ? "outline" : "secondary"}
            className={status === "active" ? "bg-emerald-500" : ""}
          >
            {status === "active" ? "Active" : status === "pending" ? "Pending" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <div className="flex items-center mr-4">
            <Clock className="mr-1 h-4 w-4" />
            {startDate}
          </div>
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {participants} participants
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">
              {timeLeft.toLowerCase() === "completed" ? timeLeft : `${timeLeft} left`}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Total Prize</div>
          <div className="text-xl font-bold mt-1">{prize}</div>
        </div>
      </CardContent>
      <CardFooter>
        {status === "active" ? (
          <Link href={`/challenge/${challengeId}`} className="w-full">
            <Button className="w-full">
              <Trophy className="mr-2 h-4 w-4" />
              Join Challenge
            </Button>
          </Link>
        ) : (
          <Button 
            className="w-full" 
            onClick={handleCreateChallenge}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Trophy className="mr-2 h-4 w-4" />
                Create Challenge
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
