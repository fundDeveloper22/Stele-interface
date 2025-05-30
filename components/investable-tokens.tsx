'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useTokensData } from "@/app/subgraph/WhiteListTokens"

export function InvestableTokens() {
  const { data: tokensData, isLoading, error } = useTokensData()

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
      <Card>
        <CardHeader>
          <CardTitle>Investable Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading tokens...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investable Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Error loading tokens</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Failed to load data'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tokens = tokensData?.tokens || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Investable Tokens
          <Badge variant="secondary" className="ml-2">
            {tokens.length} tokens
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No investable tokens found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Token Address</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">
                      {token.symbol}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {formatAddress(token.tokenAddress)}
                      </code>
                    </TableCell>
                    <TableCell>
                      {token.decimals}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={token.isInvestable ? "default" : "secondary"}
                        className={token.isInvestable ? "bg-green-100 text-green-800" : ""}
                      >
                        {token.isInvestable ? "✓ Investable" : "Not Investable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
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