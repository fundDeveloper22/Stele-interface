"use client"

import { AssetSwap } from "@/components/asset-swap"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function SwapPage() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challenge');
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href={challengeId ? `/challenge/${challengeId}` : "/"}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {challengeId ? "Back to Challenge" : "Back to Dashboard"}
          </Button>
        </Link>
      </div>
      
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {challengeId 
            ? `Swap Assets - ${challengeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}` 
            : "Swap Assets"}
        </h1>
        <AssetSwap />
      </div>
    </div>
  )
} 