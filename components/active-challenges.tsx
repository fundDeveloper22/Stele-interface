'use client'

import { ChallengeCard } from "@/components/challenge-card"
import { ChallengeTypeModal } from "@/components/challenge-type-modal"
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
import { useActiveChallenges } from "@/app/hooks/useActiveChallenges"

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
  endTime: string
  isCompleted: boolean
  challengeId: string
}

function calculateTimeLeft(startTime: string, endTime: string, currentTime: Date = new Date()): string {
  const start = new Date(Number(startTime) * 1000)
  const end = new Date(Number(endTime) * 1000)
  const now = currentTime
  
  // If challenge hasn't started yet
  if (now < start) {
    return "Not started yet"
  }
  
  // If challenge has ended
  if (now >= end) {
    return "Completed"
  }
  
  const diff = end.getTime() - now.getTime()
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (days > 30) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    return `${months} months ${remainingDays} days`
  }
  
  if (days > 0) {
    return `${days} days ${hours} hours`
  }
  
  if (hours > 0) {
    return `${hours} hours ${minutes} minutes`
  }
  
  if (minutes > 0) {
    return `${minutes} minutes ${seconds} seconds`
  }
  
  return `${seconds} seconds`
}

function calculateProgress(startTime: string, endTime: string, isCompleted: boolean, currentTime: Date = new Date()): number {
  if (isCompleted) return 100
  
  const start = new Date(Number(startTime) * 1000)
  const end = new Date(Number(endTime) * 1000)
  const now = currentTime
  
  // If challenge hasn't started yet
  if (now < start) {
    return 0
  }
  
  // If challenge has ended
  if (now >= end) {
    return 100
  }
  
  const totalDuration = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  
  const progress = (elapsed / totalDuration) * 100
  
  return Math.min(Math.max(progress, 0), 100)
}

interface ActiveChallengesProps {
  showCreateButton?: boolean;
}

export function ActiveChallenges({ showCreateButton = true }: ActiveChallengesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data } = useActiveChallenges()

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

  // Create default challenge structure when data is not available
  const defaultChallenges: ChallengeCardProps[] = [
    {
      id: "one-week-challenge",
      title: "1 week challenge",
      type: "1 week challenge",
      participants: 0,
      timeLeft: "Not started",
      prize: "$0.00",
      progress: 0,
      status: "pending",
      startTime: "0",
      endTime: "0",
      isCompleted: false,
      challengeId: "one-week-challenge"
    },
    {
      id: "one-month-challenge",
      title: "1 month challenge",
      type: "1 month challenge",
      participants: 0,
      timeLeft: "Not started",
      prize: "$0.00",
      progress: 0,
      status: "pending",
      startTime: "0",
      endTime: "0",
      isCompleted: false,
      challengeId: "one-month-challenge"
    },
    {
      id: "three-month-challenge",
      title: "3 months challenge",
      type: "3 months challenge",
      participants: 0,
      timeLeft: "Not started",
      prize: "$0.00",
      progress: 0,
      status: "pending",
      startTime: "0",
      endTime: "0",
      isCompleted: false,
      challengeId: "three-month-challenge"
    },
    {
      id: "six-month-challenge",
      title: "6 months challenge",
      type: "6 months challenge",
      participants: 0,
      timeLeft: "Not started",
      prize: "$0.00",
      progress: 0,
      status: "pending",
      startTime: "0",
      endTime: "0",
      isCompleted: false,
      challengeId: "six-month-challenge"
    },
    {
      id: "one-year-challenge",
      title: "1 year challenge",
      type: "1 year challenge",
      participants: 0,
      timeLeft: "Not started",
      prize: "$0.00",
      progress: 0,
      status: "pending",
      startTime: "0",
      endTime: "0",
      isCompleted: false,
      challengeId: "one-year-challenge"
    }
  ];

  // Use actual data if available, otherwise use default challenges
  const challenges: ChallengeCardProps[] = data?.activeChallenges ? [
    {
      id: "one-week-challenge",
      title: "1 week challenge",
      type: "1 week challenge",
      participants: Number(data.activeChallenges.one_week_investorCounter) || 0,
      timeLeft: isClient ? calculateTimeLeft(data.activeChallenges.one_week_startTime, data.activeChallenges.one_week_endTime, currentTime) : "Loading...",
      prize: `$${Number(data.activeChallenges.one_week_rewardAmountUSD).toFixed(2)}`,
      progress: isClient ? calculateProgress(data.activeChallenges.one_week_startTime, data.activeChallenges.one_week_endTime, data.activeChallenges.one_week_isCompleted, currentTime) : 0,
      status: data.activeChallenges.one_week_isCompleted ? "completed" : 
              (!data.activeChallenges.one_week_startTime || data.activeChallenges.one_week_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.one_week_startTime,
      endTime: data.activeChallenges.one_week_endTime,
      isCompleted: data.activeChallenges.one_week_isCompleted,
      challengeId: data.activeChallenges.one_week_id || "one-week-challenge"
    },
    {
      id: "one-month-challenge",
      title: "1 month challenge",
      type: "1 month challenge",
      participants: Number(data.activeChallenges.one_month_investorCounter) || 0,
      timeLeft: isClient ? calculateTimeLeft(data.activeChallenges.one_month_startTime, data.activeChallenges.one_month_endTime, currentTime) : "Loading...",
      prize: `$${Number(data.activeChallenges.one_month_rewardAmountUSD).toFixed(2)}`,
      progress: isClient ? calculateProgress(data.activeChallenges.one_month_startTime, data.activeChallenges.one_month_endTime, data.activeChallenges.one_month_isCompleted, currentTime) : 0,
      status: data.activeChallenges.one_month_isCompleted ? "completed" : 
              (!data.activeChallenges.one_month_startTime || data.activeChallenges.one_month_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.one_month_startTime,
      endTime: data.activeChallenges.one_month_endTime,
      isCompleted: data.activeChallenges.one_month_isCompleted,
      challengeId: data.activeChallenges.one_month_id || "one-month-challenge"
    },
    {
      id: "three-month-challenge",
      title: "3 months challenge",
      type: "3 months challenge",
      participants: Number(data.activeChallenges.three_month_investorCounter) || 0,
      timeLeft: isClient ? calculateTimeLeft(data.activeChallenges.three_month_startTime, data.activeChallenges.three_month_endTime, currentTime) : "Loading...",
      prize: `$${Number(data.activeChallenges.three_month_rewardAmountUSD).toFixed(2)}`,
      progress: isClient ? calculateProgress(data.activeChallenges.three_month_startTime, data.activeChallenges.three_month_endTime, data.activeChallenges.three_month_isCompleted, currentTime) : 0,
      status: data.activeChallenges.three_month_isCompleted ? "completed" : 
              (!data.activeChallenges.three_month_startTime || data.activeChallenges.three_month_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.three_month_startTime,
      endTime: data.activeChallenges.three_month_endTime,
      isCompleted: data.activeChallenges.three_month_isCompleted,
      challengeId: data.activeChallenges.three_month_id || "three-month-challenge"
    },
    {
      id: "six-month-challenge",
      title: "6 months challenge",
      type: "6 months challenge",
      participants: Number(data.activeChallenges.six_month_investorCounter) || 0,
      timeLeft: isClient ? calculateTimeLeft(data.activeChallenges.six_month_startTime, data.activeChallenges.six_month_endTime, currentTime) : "Loading...",
      prize: `$${Number(data.activeChallenges.six_month_rewardAmountUSD).toFixed(2)}`,
      progress: isClient ? calculateProgress(data.activeChallenges.six_month_startTime, data.activeChallenges.six_month_endTime, data.activeChallenges.six_month_isCompleted, currentTime) : 0,
      status: data.activeChallenges.six_month_isCompleted ? "completed" : 
              (!data.activeChallenges.six_month_startTime || data.activeChallenges.six_month_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.six_month_startTime,
      endTime: data.activeChallenges.six_month_endTime,
      isCompleted: data.activeChallenges.six_month_isCompleted,
      challengeId: data.activeChallenges.six_month_id || "six-month-challenge"
    },
    {
      id: "one-year-challenge",
      title: "1 year challenge",
      type: "1 year challenge",
      participants: Number(data.activeChallenges.one_year_investorCounter) || 0,
      timeLeft: isClient ? calculateTimeLeft(data.activeChallenges.one_year_startTime, data.activeChallenges.one_year_endTime, currentTime) : "Loading...",
      prize: `$${Number(data.activeChallenges.one_year_rewardAmountUSD).toFixed(2)}`,
      progress: isClient ? calculateProgress(data.activeChallenges.one_year_startTime, data.activeChallenges.one_year_endTime, data.activeChallenges.one_year_isCompleted, currentTime) : 0,
      status: data.activeChallenges.one_year_isCompleted ? "completed" : 
              (!data.activeChallenges.one_year_startTime || data.activeChallenges.one_year_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.one_year_startTime,
      endTime: data.activeChallenges.one_year_endTime,
      isCompleted: data.activeChallenges.one_year_isCompleted,
      challengeId: data.activeChallenges.one_year_id || "one-year-challenge"
    }
  ] : defaultChallenges;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100">Active Challenges</h2>
        {showCreateButton && (
          <ChallengeTypeModal 
            onCreateChallenge={handleCreateChallenge}
            isCreating={isCreating}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => (
        <ChallengeCard
            key={challenge.id}
            {...challenge}
          />
        ))}
      </div>
    </div>
  )
}
