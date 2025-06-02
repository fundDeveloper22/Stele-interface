'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useInvestorData } from "@/app/subgraph/Account"
import { useTokenPrices } from "@/app/hooks/useTokenPrices"
import { useUserTokens } from "@/app/hooks/useUserTokens"

interface InvestorPortfolioProps {
  challengeId: string
  walletAddress: string
}

export function InvestorPortfolio({ challengeId, walletAddress }: InvestorPortfolioProps) {
  const { data: investorData, isLoading: isLoadingInvestor, error: investorError } = useInvestorData(challengeId, walletAddress)
  const { data: priceData } = useTokenPrices()
  const { data: userTokens = [], isLoading: isLoadingTokens, error: tokensError } = useUserTokens(challengeId, walletAddress)

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const isLoading = isLoadingInvestor || isLoadingTokens
  const error = investorError || tokensError

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading portfolio...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !investorData?.investor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Error loading portfolio</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Failed to load data'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const investor = investorData.investor

  // Calculate portfolio summary
  const portfolioValue = parseFloat(investor.currentUSD) || 0
  const seedMoney = parseFloat(investor.seedMoneyUSD) || 0
  const profitLoss = portfolioValue - seedMoney
  const profitRatio = parseFloat(investor.profitRatio) || 0

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolioValue.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Current USD value</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Initial Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${seedMoney.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Seed money</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              {profitRatio >= 0 ? '+' : ''}{(profitRatio * 100).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userTokens.length}</div>
            <div className="text-sm text-muted-foreground">Different tokens</div>
          </CardContent>
        </Card>
      </div>

      {/* Token Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Token Holdings
            <Badge variant="secondary">
              {userTokens.length} tokens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userTokens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No token holdings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Decimals</TableHead>
                    <TableHead>Token Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTokens.map((token, index) => (
                    <TableRow key={`${token.address}-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {token.symbol?.slice(0, 2) || '??'}
                            </span>
                          </div>
                          {token.symbol || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {token.symbol || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {token.amount}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {token.decimals || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {formatAddress(token.address)}
                        </code>
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