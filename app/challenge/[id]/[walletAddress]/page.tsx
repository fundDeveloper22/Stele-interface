'use client'

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Clock, Trophy, BarChart3, LineChart, PieChart, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useInvestorData } from "@/app/subgraph/Account"

export default function AccountPage() {
  const params = useParams()
  const challengeId = params?.id as string
  const walletAddress = params?.walletAddress as string

  const { data, isLoading, error } = useInvestorData(challengeId, walletAddress)

  if (isLoading) return <div className="container mx-auto py-6">Loading...</div>
  if (error) return <div className="container mx-auto py-6">Error loading investor data</div>
  if (!data?.investor) return <div className="container mx-auto py-6">No data found</div>

  const investor = data.investor
  
  // Calculate profit and format values
  const seedMoney = Number(investor.seedMoneyUSD) || 0
  const currentValue = Number(investor.currentUSD) || 0
  const profitUSD = Number(investor.profitUSD) || 0
  const profitRatio = Number(investor.profitRatio) || 0
  
  // Format timestamp
  const startDate = new Date(Number(investor.createdAtTimestamp) * 1000)
  const startDateFormatted = startDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Get tokens and their amounts
  const tokens = investor.tokens || []
  const tokensAmount = investor.tokensAmount || []
  
  // Get challenge title
  const getChallengeTitle = () => {
    switch(challengeId) {
      case '1':
        return 'One Week Challenge';
      case '2':
        return 'One Month Challenge';
      case '3':
        return 'Three Month Challenge';
      case '4':
        return 'Six Month Challenge';
      case '5':
        return 'One Year Challenge';
      default:
        return 'Challenge';
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href={`/challenge/${challengeId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Challenge
          </Button>
        </Link>
      </div>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Investor Account: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Trophy className="mr-2 h-4 w-4" />
              Share Results
            </Button>
            
            <Link href={`/swap/${challengeId}/${walletAddress}`}>
              <Button variant="outline" size="sm">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Swap Assets
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Seed Money</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${seedMoney.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Joined on {startDateFormatted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${currentValue.toFixed(2)}</div>
              <div className="text-sm text-emerald-500">+${profitUSD.toFixed(2)} profit</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Challenge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getChallengeTitle()}</div>
              <div className="text-sm text-muted-foreground">Return: {profitRatio.toFixed(2)}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tokens.map((token, index) => {
                    const amount = tokensAmount[index] || "0"
                    const tokenValue = (Number(amount) / tokens.length) * currentValue
                    const percentage = (tokenValue / currentValue) * 100
                    
                    return (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-border">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                            <span className="text-xs font-bold">{token.slice(0, 3)}</span>
                          </div>
                          <div>
                            <div className="font-medium">{token}</div>
                            <div className="text-sm text-muted-foreground">{amount}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${tokenValue.toFixed(2)}</div>
                          <div className="text-sm text-emerald-500">{percentage.toFixed(0)}% of portfolio</div>
                        </div>
                      </div>
                    )
                  })}

                  {tokens.length === 0 && (
                    <div className="py-3 text-center text-muted-foreground">
                      No tokens in portfolio yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <div className="font-medium">Initial Investment</div>
                      <div className="text-sm text-muted-foreground">{startDateFormatted}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${seedMoney.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Seed Money</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <div className="font-medium">Current Value</div>
                      <div className="text-sm text-muted-foreground">Last updated: {new Date(Number(investor.updatedAtTimestamp) * 1000).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${currentValue.toFixed(2)}</div>
                      <div className="text-sm text-emerald-500">+${profitUSD.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Performance Metrics</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Total Return</span>
                    <span className="font-medium text-emerald-500">+{profitRatio.toFixed(2)}%</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Challenge Entry Date</span>
                    <span className="font-medium">{startDateFormatted}</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Current Profit</span>
                    <span className="font-medium text-emerald-500">+${profitUSD.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Number of Assets</span>
                    <span className="font-medium">{tokens.length}</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Last Updated</span>
                    <span className="font-medium">{new Date(Number(investor.updatedAtTimestamp) * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <PieChart className="mr-2 h-4 w-4" />
                  View Detailed Analytics
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 