import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, ArrowUpRight, Clock, Trophy } from "lucide-react"
import { AssetSwap } from "@/components/asset-swap"
import { ActiveChallenges } from "@/components/active-challenges"
import Link from "next/link"

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <div className="flex items-center mt-1 text-sm">
              <span className="text-muted-foreground">3 weekly, 2 monthly</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">243</div>
            <div className="flex items-center mt-1 text-sm">
              <span className="text-muted-foreground">Across all challenges</span>
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
      <ActiveChallenges />
    </div>
  )
}
