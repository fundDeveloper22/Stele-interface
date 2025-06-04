'use client'
import { useBlockNumber } from '@/app/hooks/useBlockNumber'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export function BlockNumberDisplay() {
  const { data: blockInfo, isLoading, error } = useBlockNumber()
  const [timeAgo, setTimeAgo] = useState<string>('')

  // Update time ago every 10 seconds
  useEffect(() => {
    if (!blockInfo) return

    const updateTimeAgo = () => {
      const now = Date.now()
      const diff = now - blockInfo.timestamp
      const seconds = Math.floor(diff / 1000)
      
      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`)
      } else {
        const minutes = Math.floor(seconds / 60)
        setTimeAgo(`${minutes}m ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 10000)
    return () => clearInterval(interval)
  }, [blockInfo])

  if (error) {
    return (
      <div className="flex items-center space-x-1 text-xs text-red-500">
        <span>Block: Error</span>
      </div>
    )
  }

  if (isLoading || !blockInfo) {
    return (
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading block...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>Block: {blockInfo.formattedNumber}</span>
      <span className="text-gray-400">({timeAgo})</span>
    </div>
  )
} 