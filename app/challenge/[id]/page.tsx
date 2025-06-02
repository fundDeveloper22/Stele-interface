"use client"

import { use } from "react"
import { ChallengePortfolio } from "@/components/challenge-portfolio"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChallengePageProps {
  params: Promise<{
    id: string
  }>
}

export default function ChallengePage({ params }: ChallengePageProps) {
  const { id } = use(params)
  
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