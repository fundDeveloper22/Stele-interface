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
    switch (type) {
      case "0": return "1 week challenge"
      case "1": return "1 month challenge"
      case "2": return "3 months challenge"
      case "3": return "6 months challenge"
      case "4": return "1 year challenge"
      default: return "Unknown"
    }
  }

  const getChallengeStatus = (challenge: RecentChallenge) => {
    const startTime = new Date(Number(challenge.startTime) * 1000)
    const endTime = new Date(Number(challenge.endTime) * 1000)
    
    if (currentTime < startTime) {
      return { status: "pending", label: "Pending", variant: "outline" as const }
    }
    
    if (currentTime >= endTime || !challenge.isActive) {
      return { status: "completed", label: "Completed", variant: "secondary" as const }
    }
    
    return { status: "active", label: "Active", variant: "default" as const }
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
      <Card className="bg-gray-900/50 border-gray-700/50">
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
      <Card className="bg-gray-900/50 border-gray-700/50">
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
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Trophy className="h-5 w-5" />
          Recent Challenges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-700 hover:bg-gray-800/50">
                <TableHead className="text-gray-300 pl-8">Challenge</TableHead>
                <TableHead className="text-gray-300 pl-8">Type</TableHead>
                <TableHead className="text-gray-300 text-center">Status</TableHead>
                <TableHead className="text-gray-300 pl-6">Participants</TableHead>
                <TableHead className="text-gray-300 pl-8">Prize</TableHead>
                <TableHead className="text-gray-300 pl-20">Start Date</TableHead>
                <TableHead className="text-gray-300 pl-16">End Date</TableHead>
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
                  const statusInfo = getChallengeStatus(challenge)
                  return (
                    <TableRow 
                      key={challenge.id} 
                      className="border-b border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/challenge/${challenge.challengeId}`}
                    >
                      <TableCell className="font-medium pl-10">
                        <code className="text-sm bg-gray-800 text-gray-300 px-2 py-1 rounded">
                          {challenge.challengeId.slice(0, 8)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {getChallengeTypeName(challenge.challengeType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={statusInfo.variant}
                          className={statusInfo.status === "active" ? "bg-emerald-500" : ""}
                        >
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pl-10">
                        <div className="flex items-center gap-1 text-gray-300">
                          <Users className="h-4 w-4 text-gray-400" />
                          {challenge.investorCounter}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-100 pl-8">
                        {formatUSDAmount(challenge.rewardAmountUSD)}
                      </TableCell>
                      <TableCell className="pl-10">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          {formatDate(challenge.startTime)}
                        </div>
                      </TableCell>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          {formatDate(challenge.endTime)}
                        </div>
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