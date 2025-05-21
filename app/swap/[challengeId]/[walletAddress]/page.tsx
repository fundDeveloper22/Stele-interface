'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowDown, ArrowLeft, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type TokenPair = 'USDC-ETH' | 'ETH-USDC' | 'USDC-SOL' | 'SOL-USDC' | 'ETH-SOL' | 'SOL-ETH'
type Token = 'USDC' | 'ETH' | 'SOL'

// Token icons and info
const tokenInfo = {
  'USDC': {
    icon: '/assets/icons/usdc.svg',
    color: 'bg-green-500',
    symbol: 'USDC'
  },
  'ETH': {
    icon: '/assets/icons/eth.svg',
    color: 'bg-blue-500',
    symbol: 'ETH'
  },
  'SOL': {
    icon: '/assets/icons/sol.svg',
    color: 'bg-purple-500',
    symbol: 'SOL'
  }
}

// Token Icon Component
const TokenIcon = ({ token }: { token: Token }) => (
  <div className={`w-6 h-6 rounded-full ${tokenInfo[token].color} flex items-center justify-center mr-2`}>
    <span className="text-xs font-bold text-white">{token.slice(0, 1)}</span>
  </div>
)

export default function SwapPage() {
  const params = useParams()
  const router = useRouter()
  const { challengeId, walletAddress } = params
  
  // State for swap values
  const [fromToken, setFromToken] = useState<Token>('USDC')
  const [toToken, setToToken] = useState<Token>('ETH')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)
  
  // Mock exchange rates
  const exchangeRates: Record<TokenPair, number> = {
    'USDC-ETH': 0.00056,
    'ETH-USDC': 1786.45,
    'USDC-SOL': 0.0743,
    'SOL-USDC': 13.46,
    'ETH-SOL': 132.42,
    'SOL-ETH': 0.00755
  }
  
  // Calculate estimated amount on input change
  const handleAmountChange = (amount: string) => {
    setFromAmount(amount)
    
    if (amount && !isNaN(Number(amount))) {
      const pairKey = `${fromToken}-${toToken}` as TokenPair
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(amount) * rate).toFixed(6))
    } else {
      setToAmount('')
    }
  }
  
  // Swap tokens position
  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp as Token)
    
    // Recalculate amounts
    if (fromAmount && !isNaN(Number(fromAmount))) {
      const pairKey = `${toToken}-${fromToken}` as TokenPair
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(fromAmount) * rate).toFixed(6))
    }
  }
  
  // Handle token selection
  const handleFromTokenChange = (value: Token) => {
    setFromToken(value)
    if (value === toToken) {
      setToToken(fromToken)
    }
    
    // Recalculate amounts
    if (fromAmount && !isNaN(Number(fromAmount))) {
      const newToToken = value === toToken ? fromToken : toToken
      const pairKey = `${value}-${newToToken}` as TokenPair
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(fromAmount) * rate).toFixed(6))
    }
  }
  
  const handleToTokenChange = (value: Token) => {
    setToToken(value)
    if (value === fromToken) {
      setFromToken(toToken)
    }
    
    // Recalculate amounts
    if (fromAmount && !isNaN(Number(fromAmount))) {
      const newFromToken = value === fromToken ? toToken : fromToken
      const pairKey = `${newFromToken}-${value}` as TokenPair
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(fromAmount) * rate).toFixed(6))
    }
  }
  
  // Process swap
  const handleSwap = async () => {
    setIsSwapping(true)
    
    try {
      // Here would be the actual swap logic connecting to smart contract
      // For now just mock a success
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Success - redirect back to portfolio
      router.push(`/challenge/${challengeId}/${walletAddress}`)
    } catch (error) {
      console.error('Swap failed:', error)
    } finally {
      setIsSwapping(false)
    }
  }
  
  return (
    <div className="container mx-auto py-6 max-w-md">
      <div className="mb-6">
        <Link href={`/challenge/${challengeId}/${walletAddress}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolio
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Swap Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">From</label>
              <span className="text-sm text-muted-foreground">
                Balance: {fromToken === 'USDC' ? '622.22 USDC' : fromToken === 'ETH' ? '0.35 ETH' : '0.00 SOL'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
              <Select value={fromToken} onValueChange={(value: Token) => handleFromTokenChange(value)}>
                <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">
                    <div className="flex items-center">
                      <TokenIcon token="USDC" />
                      USDC
                    </div>
                  </SelectItem>
                  <SelectItem value="ETH">
                    <div className="flex items-center">
                      <TokenIcon token="ETH" />
                      ETH
                    </div>
                  </SelectItem>
                  <SelectItem value="SOL">
                    <div className="flex items-center">
                      <TokenIcon token="SOL" />
                      SOL
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Swap direction button */}
          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSwapTokens}
              className="rounded-full h-8 w-8 bg-muted"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          
          {/* To */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">To (estimated)</label>
              <span className="text-sm text-muted-foreground">
                Balance: {toToken === 'USDC' ? '622.22 USDC' : toToken === 'ETH' ? '0.35 ETH' : '0.00 SOL'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                />
              </div>
              <Select value={toToken} onValueChange={(value: Token) => handleToTokenChange(value)}>
                <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">
                    <div className="flex items-center">
                      <TokenIcon token="USDC" />
                      USDC
                    </div>
                  </SelectItem>
                  <SelectItem value="ETH">
                    <div className="flex items-center">
                      <TokenIcon token="ETH" />
                      ETH
                    </div>
                  </SelectItem>
                  <SelectItem value="SOL">
                    <div className="flex items-center">
                      <TokenIcon token="SOL" />
                      SOL
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Exchange rate info */}
          <div className="p-3 bg-muted rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleSwap}
            disabled={!fromAmount || Number(fromAmount) <= 0 || isSwapping}
          >
            {isSwapping ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </>
            ) : (
              'Swap Assets'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 