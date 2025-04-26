import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, BarChart3, LineChart, PieChart } from "lucide-react"
import Link from "next/link"

interface ChallengePortfolioProps {
  challengeId: string
}

export function ChallengePortfolio({ challengeId }: ChallengePortfolioProps) {
  // This would typically fetch data based on the challengeId
  
  // Display title based on challenge ID
  const getChallengeTitle = () => {
    switch(challengeId) {
      case 'short-term-investment':
        return 'Short-term Investment Master';
      case 'mid-term-investment':
        return 'Mid-term Investment Strategy';
      case 'long-term-investment':
        return 'Long-term Investment Portfolio';
      case 'crypto-trading':
        return 'Crypto Trading Competition';
      case 'defi-yield':
        return 'DeFi Yield Optimization';
      default:
        return 'Challenge Details';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{getChallengeTitle()}</h2>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm">
            <LineChart className="mr-2 h-4 w-4" />
            Create Challenge
          </Button>
          <Button variant="outline" size="sm">
            <LineChart className="mr-2 h-4 w-4" />
            Join Challenge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,245.67</div>
            <div className="text-sm text-emerald-500">+$245.67 from seed money</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">+24.57%</div>
            <div className="text-sm text-muted-foreground">Rank: 3/42</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 days 12 hours</div>
            <div className="text-sm text-muted-foreground">Ends on May 2, 2025</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                      <span className="text-xs font-bold">ETH</span>
                    </div>
                    <div>
                      <div className="font-medium">Ethereum</div>
                      <div className="text-sm text-muted-foreground">0.35 ETH</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$623.45</div>
                    <div className="text-sm text-emerald-500">50% of portfolio</div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
                      <span className="text-xs font-bold">USD</span>
                    </div>
                    <div>
                      <div className="font-medium">USD Coin</div>
                      <div className="text-sm text-muted-foreground">622.22 USDC</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$622.22</div>
                    <div className="text-sm text-muted-foreground">50% of portfolio</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/swap?challenge=${challengeId}`} className="w-full">
                <Button className="w-full">
                  Swap Assets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <div className="font-medium">ETH → USDC</div>
                    <div className="text-sm text-muted-foreground">Apr 24, 2025 • 14:32</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">0.15 ETH</div>
                    <div className="text-sm text-muted-foreground">$267.35</div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <div className="font-medium">USDC → ETH</div>
                    <div className="text-sm text-muted-foreground">Apr 22, 2025 • 09:15</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">500 USDC</div>
                    <div className="text-sm text-muted-foreground">$500.00</div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <div className="font-medium">Challenge Joined</div>
                    <div className="text-sm text-muted-foreground">Apr 20, 2025 • 10:00</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">1,000 USDC</div>
                    <div className="text-sm text-muted-foreground">Seed Money</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Performance Metrics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Total Return</span>
                  <span className="font-medium text-emerald-500">+24.57%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Daily Average</span>
                  <span className="font-medium text-emerald-500">+3.51%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Best Day</span>
                  <span className="font-medium text-emerald-500">+12.3%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Worst Day</span>
                  <span className="font-medium text-red-500">-5.2%</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Current Rank</span>
                  <span className="font-medium">3 of 42</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Potential Reward</span>
                  <span className="font-medium">$325.00</span>
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
  )
}
