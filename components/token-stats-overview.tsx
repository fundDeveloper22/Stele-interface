'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { useTotalRanking } from "@/app/hooks/useTotalRanking"
import { cn } from "@/lib/utils"

interface TokenStatsOverviewProps {
  className?: string
}

export function TokenStatsOverview({ className }: TokenStatsOverviewProps) {
  const { data: rankingData, isLoading, error } = useTotalRanking()

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Format timestamp to readable date
  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format challenge type
  const getChallengeType = (challengeId: string) => {
    return `Challenge ${challengeId}`
  }

  // Format seed money (convert from BigInt to USD)
  const formatSeedMoney = (seedMoney: string) => {
    // Assuming seedMoney is in USDC (6 decimals)
    const amount = parseFloat(seedMoney) / 1e6
    return `$${amount.toFixed(2)}`
  }

  // Format profit ratio as percentage
  const formatProfitRatio = (profitRatio: string) => {
    const ratio = parseFloat(profitRatio)
    return `${(ratio * 100).toFixed(2)}%`
  }

  // Format score
  const formatScore = (score: string) => {
    const scoreValue = parseFloat(score)
    return scoreValue.toFixed(4)
  }

  if (isLoading) {
    return (
      <Card className={`${className} bg-gray-900/50 border-gray-700/50`}>
        <CardHeader>
          <CardTitle className="text-gray-100">Total Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading rankings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`${className} bg-gray-900/50 border-gray-700/50`}>
        <CardHeader>
          <CardTitle className="text-gray-100">Total Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400">Error loading rankings</p>
            <p className="text-sm text-gray-500 mt-1">
              {error instanceof Error ? error.message : 'Failed to load data'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const rankings = rankingData || []

  return (
    <Card className={`${className} bg-gray-900/50 border-gray-700/50`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Trophy className="h-5 w-5" />
          Total Ranking
          <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300">
            {rankings.length} participants
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No ranking data found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 5 Rankings */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-700 hover:bg-gray-800/50">
                    <TableHead className="text-gray-300">Rank</TableHead>
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Challenge</TableHead>
                    <TableHead className="text-gray-300">Score</TableHead>
                    <TableHead className="text-gray-300">Profit Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.slice(0, 5).map((ranking, index) => {
                    const profitRatio = parseFloat(ranking.profitRatio)
                    const isPositive = profitRatio >= 0
                    
                    return (
                      <TableRow key={ranking.id} className="border-b border-gray-700 hover:bg-gray-800/30">
                        <TableCell className="font-medium text-gray-100">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                            {index === 1 && <Trophy className="h-4 w-4 text-gray-400" />}
                            {index === 2 && <Trophy className="h-4 w-4 text-amber-600" />}
                            <span>#{index + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                            {formatAddress(ranking.user)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
                            {getChallengeType(ranking.challengeId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-gray-100">
                          {formatScore(ranking.score)}
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "flex items-center gap-1 font-medium",
                            isPositive ? "text-green-400" : "text-red-400"
                          )}>
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatProfitRatio(ranking.profitRatio)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 