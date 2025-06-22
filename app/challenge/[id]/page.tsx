"use client"

import { use } from "react"
import { ChallengePortfolio } from "@/components/challenge-portfolio"
import { useChallenge } from '@/app/hooks/useChallenge'

interface ChallengePageProps {
  params: Promise<{
    id: string
  }>
}

function ChallengeContent({ challengeId }: { challengeId: string }) {
  const { data, isLoading, error } = useChallenge(challengeId)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading challenge data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error loading challenge data</h3>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!data?.challenge) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">
          <h3 className="text-lg font-semibold mb-2">Challenge not found</h3>
          <p className="text-sm">The challenge with ID "{challengeId}" could not be found.</p>
        </div>
      </div>
    )
  }

  // For now, we'll just pass challengeId to maintain compatibility with existing ChallengePortfolio
  // Later, we can modify ChallengePortfolio to accept challenge data as props if needed
  return <ChallengePortfolio challengeId={challengeId} />
}

export default function ChallengePage({ params }: ChallengePageProps) {
  const { id } = use(params)
  
  return (
    <div className="container mx-auto p-6 py-20">
      <div className="max-w-6xl mx-auto space-y-4">
        <ChallengeContent challengeId={id} />
      </div>
    </div>
  )
} 