import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, ArrowUpRight, Clock, Trophy } from "lucide-react"
import { AssetSwap } from "@/components/asset-swap"
import { ActiveChallenges } from "@/components/active-challenges"

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Recent Challenges
          </Button>
          <Button variant="default" size="sm">
            <Trophy className="mr-2 h-4 w-4" />
            Join New Challenge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,345.67</div>
            <div className="flex items-center mt-1 text-sm">
              <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                +5.23%
              </Badge>
              <span className="text-muted-foreground">Last 24 hours</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <div className="flex items-center mt-1 text-sm">
              <span className="text-muted-foreground">Total participants: 156</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Earned Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$890.50</div>
            <div className="flex items-center mt-1 text-sm">
              <span className="text-muted-foreground">From 5 challenges</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <>
        <ActiveChallenges />

        <Card>
          <CardHeader>
            <CardTitle>My Portfolio</CardTitle>
            <CardDescription>Challenges you are currently participating in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold">1W</span>
                  </div>
                  <div>
                    <div className="font-medium">Short-term Investment Master</div>
                    <div className="text-sm text-muted-foreground">1 Week Challenge</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">$1,245.67</div>
                  <div className="text-sm text-emerald-500">+24.57%</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold">1M</span>
                  </div>
                  <div>
                    <div className="font-medium">Mid-term Investment Strategy</div>
                    <div className="text-sm text-muted-foreground">1 Month Challenge</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">$2,890.45</div>
                  <div className="text-sm text-emerald-500">+8.90%</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold">3M</span>
                  </div>
                  <div>
                    <div className="font-medium">Long-term Investment Portfolio</div>
                    <div className="text-sm text-muted-foreground">3 Month Challenge</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">$5,432.10</div>
                  <div className="text-sm text-red-500">-2.15%</div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                View Challenge Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <AssetSwap />
      </>
    </div>
  )
}
