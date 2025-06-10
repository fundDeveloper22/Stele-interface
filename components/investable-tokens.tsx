'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useInvestableTokens } from "@/app/hooks/useInvestableTokens"

export function InvestableTokens() {
  const { data: tokensData, isLoading, error } = useInvestableTokens()

  // Format token address for display
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

  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-gray-100">Investable Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading tokens...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-900/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-gray-100">Investable Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400">Error loading tokens</p>
            <p className="text-sm text-gray-500 mt-1">
              {error instanceof Error ? error.message : 'Failed to load data'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tokens = tokensData?.investableTokens || []

  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-100">
          Investable Tokens
          <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300">
            {tokens.length} tokens
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No investable tokens found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700 hover:bg-gray-800/50">
                  <TableHead className="text-gray-300">Symbol</TableHead>
                  <TableHead className="text-gray-300">Token Address</TableHead>
                  <TableHead className="text-gray-300">Decimals</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id} className="border-b border-gray-700 hover:bg-gray-800/30">
                    <TableCell className="font-medium text-gray-100">
                      {token.symbol}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                        {formatAddress(token.tokenAddress)}
                      </code>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {token.decimals}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={token.isInvestable ? "default" : "secondary"}
                        className={token.isInvestable ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300"}
                      >
                        {token.isInvestable ? "✓ Investable" : "Not Investable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {formatDate(token.updatedTimestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 