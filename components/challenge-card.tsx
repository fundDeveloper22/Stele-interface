import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Trophy, Users } from "lucide-react"
import Link from "next/link"

interface ChallengeCardProps {
  id?: string
  title: string
  type: string
  participants: number
  timeLeft: string
  prize: string
  progress: number
  status: "active" | "pending" | "completed"
}

export function ChallengeCard({ title, type, participants, timeLeft, prize, progress, status, id }: ChallengeCardProps) {
  // If no ID is provided, convert the title to kebab-case and use it as ID
  const challengeId = id || title.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge
            variant={status === "active" ? "default" : status === "pending" ? "outline" : "secondary"}
            className={status === "active" ? "bg-emerald-500" : ""}
          >
            {status === "active" ? "Active" : status === "pending" ? "Pending" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <div className="flex items-center mr-4">
            <Clock className="mr-1 h-4 w-4" />
            {type}
          </div>
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {participants} participants
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{timeLeft} remaining</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Total Prize</div>
          <div className="text-xl font-bold mt-1">{prize}</div>
        </div>
      </CardContent>
      <CardFooter>
        {status === "active" ? (
          <Link href={`/challenge/${challengeId}`} className="w-full">
            <Button className="w-full">
              <Trophy className="mr-2 h-4 w-4" />
              Join Challenge
            </Button>
          </Link>
        ) : (
          <Button className="w-full">
            <Trophy className="mr-2 h-4 w-4" />
            Create Challenge          
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
