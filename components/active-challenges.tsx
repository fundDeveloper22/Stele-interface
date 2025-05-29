'use client'

import { ChallengeCard } from "@/components/challenge-card"
import { ChallengeTypeModal } from "@/components/challenge-type-modal"
import { useQuery } from '@tanstack/react-query'
import { query } from '@/app/subgraph/DashBoard'
import { url, headers } from '@/lib/constants'
import { request } from 'graphql-request'
import { useState } from "react"
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
  challengeId: string
}

interface ActiveChallengesData {
  activeChallenges: {
    id: string
    one_week_id: string
    one_week_startTime: string
    one_week_investorCounter: string
    one_week_rewardAmountUSD: string
    one_week_isCompleted: boolean
    one_month_id: string
    one_month_startTime: string
    one_month_investorCounter: string
    one_month_rewardAmountUSD: string
    one_month_isCompleted: boolean
    three_month_id: string
    three_month_startTime: string
    three_month_investorCounter: string
    three_month_rewardAmountUSD: string
    three_month_isCompleted: boolean
    six_month_id: string
    six_month_startTime: string
    six_month_investorCounter: string
    six_month_rewardAmountUSD: string
    six_month_isCompleted: boolean
    one_year_id: string
    one_year_startTime: string
    one_year_investorCounter: string
    one_year_rewardAmountUSD: string
    one_year_isCompleted: boolean
  }
}

function calculateTimeLeft(startTime: string, type: string): string {
  const start = new Date(Number(startTime) * 1000)
  const now = new Date()
  
  // Total duration for each challenge type (in milliseconds)
  const totalDuration = {
    "1 week challenge": 7 * 24 * 60 * 60 * 1000, // 1 week
    "1 month challenge": 30 * 24 * 60 * 60 * 1000, // 1 month
    "3 months challenge": 90 * 24 * 60 * 60 * 1000, // 3 months
    "6 months challenge": 180 * 24 * 60 * 60 * 1000, // 6 months
    "1 year challenge": 365 * 24 * 60 * 60 * 1000 // 1 year
  }[type] || 7 * 24 * 60 * 60 * 1000 // Default: 1 week
  
  const endTime = new Date(start.getTime() + totalDuration)
  const diff = endTime.getTime() - now.getTime()
  
  if (diff <= 0) return "Completed"
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 30) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    return `${months} months ${remainingDays} days`
  }
  
  return `${days} days ${hours} hours`
}

function calculateProgress(startTime: string, isCompleted: boolean, type: string): number {
  if (isCompleted) return 100
  
  const start = new Date(Number(startTime) * 1000)
  const now = new Date()
  
  // Total duration for each challenge type (in milliseconds)
  const totalDuration = {
    "1 week challenge": 7 * 24 * 60 * 60 * 1000, // 1 week
    "1 month challenge": 30 * 24 * 60 * 60 * 1000, // 1 month
    "3 months challenge": 90 * 24 * 60 * 60 * 1000, // 3 months
    "6 months challenge": 180 * 24 * 60 * 60 * 1000, // 6 months
    "1 year challenge": 365 * 24 * 60 * 60 * 1000 // 1 year
  }[type] || 7 * 24 * 60 * 60 * 1000 // Default: 1 week
  
  const endTime = new Date(start.getTime() + totalDuration)
  const diff = endTime.getTime() - now.getTime()
  
  if (diff <= 0) return 100
  
  const progress = ((totalDuration - diff) / totalDuration) * 100
  
  return Math.min(Math.max(progress, 0), 100)
}

export function ActiveChallenges() {
  const [isCreating, setIsCreating] = useState(false);

  const { data } = useQuery<ActiveChallengesData>({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })

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
      timeLeft: calculateTimeLeft(data.activeChallenges.one_week_startTime, "1 week challenge"),
      prize: `$${Number(data.activeChallenges.one_week_rewardAmountUSD).toFixed(2)}`,
      progress: calculateProgress(data.activeChallenges.one_week_startTime, data.activeChallenges.one_week_isCompleted, "1 week challenge"),
      status: data.activeChallenges.one_week_isCompleted ? "completed" : 
              (!data.activeChallenges.one_week_startTime || data.activeChallenges.one_week_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.one_week_startTime,
      challengeId: data.activeChallenges.one_week_id || "one-week-challenge"
    },
    {
      id: "one-month-challenge",
      title: "1 month challenge",
      type: "1 month challenge",
      participants: Number(data.activeChallenges.one_month_investorCounter) || 0,
      timeLeft: calculateTimeLeft(data.activeChallenges.one_month_startTime, "1 month challenge"),
      prize: `$${Number(data.activeChallenges.one_month_rewardAmountUSD).toFixed(2)}`,
      progress: calculateProgress(data.activeChallenges.one_month_startTime, data.activeChallenges.one_month_isCompleted, "1 month challenge"),
      status: data.activeChallenges.one_month_isCompleted ? "completed" : 
              (!data.activeChallenges.one_month_startTime || data.activeChallenges.one_month_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.one_month_startTime,
      challengeId: data.activeChallenges.one_month_id || "one-month-challenge"
    },
    {
      id: "three-month-challenge",
      title: "3 months challenge",
      type: "3 months challenge",
      participants: Number(data.activeChallenges.three_month_investorCounter) || 0,
      timeLeft: calculateTimeLeft(data.activeChallenges.three_month_startTime, "3 months challenge"),
      prize: `$${Number(data.activeChallenges.three_month_rewardAmountUSD).toFixed(2)}`,
      progress: calculateProgress(data.activeChallenges.three_month_startTime, data.activeChallenges.three_month_isCompleted, "3 months challenge"),
      status: data.activeChallenges.three_month_isCompleted ? "completed" : 
              (!data.activeChallenges.three_month_startTime || data.activeChallenges.three_month_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.three_month_startTime,
      challengeId: data.activeChallenges.three_month_id || "three-month-challenge"
    },
    {
      id: "six-month-challenge",
      title: "6 months challenge",
      type: "6 months challenge",
      participants: Number(data.activeChallenges.six_month_investorCounter) || 0,
      timeLeft: calculateTimeLeft(data.activeChallenges.six_month_startTime, "6 months challenge"),
      prize: `$${Number(data.activeChallenges.six_month_rewardAmountUSD).toFixed(2)}`,
      progress: calculateProgress(data.activeChallenges.six_month_startTime, data.activeChallenges.six_month_isCompleted, "6 months challenge"),
      status: data.activeChallenges.six_month_isCompleted ? "completed" : 
              (!data.activeChallenges.six_month_startTime || data.activeChallenges.six_month_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.six_month_startTime,
      challengeId: data.activeChallenges.six_month_id || "six-month-challenge"
    },
    {
      id: "one-year-challenge",
      title: "1 year challenge",
      type: "1 year challenge",
      participants: Number(data.activeChallenges.one_year_investorCounter) || 0,
      timeLeft: calculateTimeLeft(data.activeChallenges.one_year_startTime, "1 year challenge"),
      prize: `$${Number(data.activeChallenges.one_year_rewardAmountUSD).toFixed(2)}`,
      progress: calculateProgress(data.activeChallenges.one_year_startTime, data.activeChallenges.one_year_isCompleted, "1 year challenge"),
      status: data.activeChallenges.one_year_isCompleted ? "completed" : 
              (!data.activeChallenges.one_year_startTime || data.activeChallenges.one_year_startTime === "0") ? "pending" : "active",
      startTime: data.activeChallenges.one_year_startTime,
      challengeId: data.activeChallenges.one_year_id || "one-year-challenge"
    }
  ] : defaultChallenges;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Active Challenges</h2>
        <ChallengeTypeModal 
          onCreateChallenge={handleCreateChallenge}
          isCreating={isCreating}
        />
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
