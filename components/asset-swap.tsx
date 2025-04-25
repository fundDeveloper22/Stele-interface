import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDown, ChevronDown } from "lucide-react"
import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface AssetSwapProps extends HTMLAttributes<HTMLDivElement> {}

export function AssetSwap({ className, ...props }: AssetSwapProps) {
  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card className="border-border bg-background">
        <CardHeader>
          <CardTitle>Swap Assets</CardTitle>
          <CardDescription>Exchange assets within the challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              <span className="text-sm text-muted-foreground">Balance: 1.245 ETH</span>
            </div>
            <div className="flex items-center">
              <Input
                type="number"
                placeholder="0.0"
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 gap-1">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold">ETH</span>
                  </div>
                  <span>ETH</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <Button variant="outline" size="icon" className="rounded-full bg-background h-10 w-10">
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              <span className="text-sm text-muted-foreground">Balance: 2,500 USDC</span>
            </div>
            <div className="flex items-center">
              <Input
                type="number"
                placeholder="0.0"
                className="border-0 bg-transparent text-xl p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 gap-1">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold">USD</span>
                  </div>
                  <span>USDC</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground">Exchange Rate</span>
            <span>1 ETH = 1,780.45 USDC</span>
          </div>

          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground">Minimum Received</span>
            <span>1,762.65 USDC</span>
          </div>

          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground">Price Impact</span>
            <span className="text-emerald-500">0.1%</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full bg-primary hover:bg-primary/90">Swap</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
