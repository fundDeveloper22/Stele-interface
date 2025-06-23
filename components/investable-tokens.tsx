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

  // Handle row click to open Etherscan
  const handleRowClick = (tokenAddress: string) => {
    window.open(`https://etherscan.io/token/${tokenAddress}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl text-gray-100">Investable Tokens</h2>
        <Card className="bg-transparent border border-gray-700/50">
          <CardContent className="p-0">
            <div className="flex items-center justify-center py-8 px-6">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading tokens...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl text-gray-100">Investable Tokens</h2>
        <Card className="bg-transparent border border-gray-700/50">
          <CardContent className="p-0">
            <div className="text-center py-8 px-6">
              <p className="text-red-400">Error loading tokens</p>
              <p className="text-sm text-gray-500 mt-1">
                {error instanceof Error ? error.message : 'Failed to load data'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tokens = tokensData?.investableTokens || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-3xl text-gray-100">Investable Tokens</h2>
        <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-base px-3 py-1.5">
          {tokens.length} tokens
        </Badge>
      </div>
      <Card className="bg-transparent border border-gray-700/50">
        <CardContent className="p-0">
        {tokens.length === 0 ? (
          <div className="text-center py-8 px-6">
            <p className="text-gray-400">No investable tokens found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-700 bg-gray-900/80 hover:bg-gray-800/50">
                  <TableHead className="text-gray-300 pl-6 text-base">Symbol</TableHead>
                  <TableHead className="text-gray-300 text-base">Token Address</TableHead>
                  <TableHead className="text-gray-300 pr-6 text-base">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow 
                    key={token.id} 
                    className="border-0 hover:bg-gray-800/30 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(token.tokenAddress)}
                  >
                    <TableCell className="font-medium text-gray-100 pl-6 py-6 text-base">
                      {token.symbol}
                    </TableCell>
                    <TableCell className="py-6">
                      <code className="text-sm bg-gray-800 text-gray-300 px-2 py-1 rounded">
                        {formatAddress(token.tokenAddress)}
                      </code>
                    </TableCell>
                    <TableCell className="text-gray-400 pr-6 py-6 text-base">
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
    </div>
  )
} 