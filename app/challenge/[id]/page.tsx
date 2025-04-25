"use client"

import { useParams } from "next/navigation"
import { ChallengePortfolio } from "@/components/challenge-portfolio"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ChallengePage() {
  const params = useParams()
  const id = params?.id as string
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <ChallengePortfolio challengeId={id} />
    </div>
  )
} 