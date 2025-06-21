'use client'

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Clock } from "lucide-react"
import Link from "next/link"
import { useRecentChallenges, RecentChallenge } from "@/app/hooks/useRecentChallenges"

export function RecentChallengesTable() {
  const { data, isLoading, error } = useRecentChallenges()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second for accurate status calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getChallengeTypeName = (type: string): string => {
    // Convert to string to handle both number and string inputs
    const typeStr = String(type)
    
    switch (typeStr) {
      case "0": return "1 week"
      case "1": return "1 month"
      case "2": return "3 months"
      case "3": return "6 months"
      case "4": return "1 year"
      default: 
        console.log('No match found for type:', typeStr)
        return "Unknown"
    }
  }

  const getChallengeStatus = (challenge: RecentChallenge) => {
    const startTime = new Date(Number(challenge.startTime) * 1000)
    const endTime = new Date(Number(challenge.endTime) * 1000)
    
    if (currentTime < startTime) {
      return "pending"
    }
    
    if (currentTime >= endTime || !challenge.isActive) {
      return "completed"
    }
    
    return "active"
  }

  const getStatusBadge = (status: "active" | "pending" | "completed") => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 rounded-full px-2 py-1 flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            Active
          </Badge>
        )
      case "pending":
        return <Badge variant="outline" className="border-gray-600 text-gray-300">Pending</Badge>
      case "completed":
        return <Badge className="bg-blue-500 text-white">Completed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDate = (timestamp: string): string => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatUSDAmount = (amount: string): string => {
    const num = Number(amount)
    return `$${num.toFixed(2)}`
  }

  if (isLoading) {
    return (
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-gray-100">Recent Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.challenges) {
    return (
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-gray-100">Recent Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-400">Error loading challenges</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-transparent border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Trophy className="h-5 w-5" />
          Total Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-700 bg-gray-900/80 hover:bg-gray-800/50">
                <TableHead className="text-gray-300 pl-12">ID</TableHead>
                <TableHead className="text-gray-300 pl-6">Type</TableHead>
                <TableHead className="text-gray-300 pl-10">Users</TableHead>
                <TableHead className="text-gray-300 pl-8">Prize</TableHead>
                <TableHead className="text-gray-300 pl-20">Start Date</TableHead>
                <TableHead className="text-gray-300 pl-16">End Date</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.challenges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Trophy className="h-8 w-8 text-gray-500" />
                      <p className="text-gray-400">No challenges found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.challenges.map((challenge) => {
                  return (
                    <TableRow 
                      key={challenge.id} 
                      className="border-0 hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/challenge/${challenge.challengeId}`}
                    >
                      <TableCell className="font-medium pl-12 py-6">
                        {challenge.challengeId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="pl-6 py-6">
                        {getChallengeTypeName(challenge.challengeType)}
                      </TableCell>
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-1 text-gray-300">
                          <Users className="h-4 w-4 text-gray-400" />
                          {challenge.investorCounter}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-yellow-400 pl-8 py-6">
                        {formatUSDAmount(challenge.rewardAmountUSD)}
                      </TableCell>
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          {formatDate(challenge.startTime)}
                        </div>
                      </TableCell>
                      <TableCell className="pl-4 py-6">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          {formatDate(challenge.endTime)}
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        {getStatusBadge(getChallengeStatus(challenge))}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 