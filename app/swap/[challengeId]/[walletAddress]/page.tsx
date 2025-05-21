'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
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

// Token Icon Component
const TokenIcon = ({ symbol }: { symbol: string }) => {
  // Create icon from the first letter of token symbol
  const firstChar = symbol.charAt(0)
  
  // Generate unique color for each token (hash-based)
  const getColorForToken = (symbol: string) => {
    // Simple hash function to convert string to number
    let hash = 0
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    // Predefined array of colors
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-red-500', 'bg-yellow-500', 'bg-indigo-500',
      'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
    ]
    
    // Convert hash to color index
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }
  
  const colorClass = getColorForToken(symbol)
  
  return (
    <div className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center mr-2`}>
      <span className="text-xs font-bold text-white">{firstChar}</span>
    </div>
  )
}

interface TokenBalance {
  token: string;
  amount: string;
}

export default function SwapPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { challengeId, walletAddress } = params
  
  // Get token data from URL query params
  const tokensParam = searchParams.get('tokens') || ''
  const tokensAmountParam = searchParams.get('tokensAmount') || ''
  
  // Parse tokens and amounts into usable format
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [availableTokens, setAvailableTokens] = useState<string[]>([])
  
  // State for swap values
  const [fromToken, setFromToken] = useState<string>('')
  const [toToken, setToToken] = useState<string>('')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)
  
  useEffect(() => {
    if (tokensParam && tokensAmountParam) {
      const tokens = tokensParam.split(',')
      const amounts = tokensAmountParam.split(',')
      
      const balances: TokenBalance[] = []
      tokens.forEach((token, index) => {
        if (token && amounts[index]) {
          balances.push({
            token: token,
            amount: amounts[index]
          })
        }
      })
      
      setTokenBalances(balances)
      setAvailableTokens(tokens)
      
      // Set initial fromToken to first token in the list if available
      if (balances.length > 0) {
        setFromToken(balances[0].token)
        // Set initial toToken to second token or first token if only one exists
        if (balances.length > 1) {
          setToToken(balances[1].token)
        } else if (balances.length === 1) {
          setToToken(balances[0].token)
        }
        setFromAmount('') // Reset amount when changing tokens
      }
    }
  }, [tokensParam, tokensAmountParam])
  
  // Get token balance for a specific token
  const getTokenBalance = (token: string): string => {
    const balance = tokenBalances.find(tb => tb.token === token)
    return balance ? balance.amount : '0'
  }
  
  // Generate all possible token pairs
  const generateExchangeRates = () => {
    const rates: Record<string, number> = {}
    
    availableTokens.forEach(from => {
      availableTokens.forEach(to => {
        if (from !== to) {
          // 랜덤 환율 생성 (실제 구현에서는 오라클이나 실제 시장 데이터를 사용해야 함)
          let rate
          if (from === 'USDC' && to === 'ETH') {
            rate = 0.00056
          } else if (from === 'ETH' && to === 'USDC') {
            rate = 1786.45
          } else {
            // 랜덤 환율 사용 (0.001 ~ 100)
            rate = 0.001 + Math.random() * 100
          }
          rates[`${from}-${to}`] = rate
        }
      })
    })
    
    return rates
  }
  
  // 동적 환율 정보
  const exchangeRates = generateExchangeRates()
  
  // Calculate estimated amount on input change
  const handleAmountChange = (amount: string) => {
    setFromAmount(amount)
    
    if (amount && !isNaN(Number(amount))) {
      const pairKey = `${fromToken}-${toToken}`
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(amount) * rate).toFixed(6))
    } else {
      setToAmount('')
    }
  }
  
  // Set max amount based on token balance
  const handleSetMaxAmount = () => {
    const balance = getTokenBalance(fromToken)
    setFromAmount(balance)
    
    if (balance && !isNaN(Number(balance))) {
      const pairKey = `${fromToken}-${toToken}`
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(balance) * rate).toFixed(6))
    }
  }

  // Handle swap token positions
  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    
    // Recalculate amount if needed
    if (fromAmount) {
      const pairKey = `${toToken}-${temp}`
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(fromAmount) * rate).toFixed(6))
    }
  }
  
  // Handle token selection
  const handleFromTokenChange = (value: string) => {
    setFromToken(value)
    if (value === toToken && availableTokens.length > 1) {
      // Find another token to use as toToken
      const newToToken = availableTokens.find(t => t !== value) || availableTokens[0]
      setToToken(newToToken)
    }
    
    // Reset amount when changing tokens
    setFromAmount('')
    setToAmount('')
  }
  
  const handleToTokenChange = (value: string) => {
    setToToken(value)
    if (value === fromToken && availableTokens.length > 1) {
      // Find another token to use as fromToken
      const newFromToken = availableTokens.find(t => t !== value) || availableTokens[0]
      setFromToken(newFromToken)
    }
    
    // Recalculate amounts if we have a from amount
    if (fromAmount && !isNaN(Number(fromAmount))) {
      const pairKey = `${fromToken}-${value}`
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
  
  // Show loading if tokens are not yet loaded
  if (availableTokens.length === 0) {
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
        <Card className="p-6 flex justify-center items-center">
          <p>Loading token information...</p>
        </Card>
      </div>
    )
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
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  Balance: {getTokenBalance(fromToken)}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs text-blue-500 hover:text-blue-700"
                  onClick={handleSetMaxAmount}
                >
                  MAX
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
              <Select value={fromToken} onValueChange={(value: string) => handleFromTokenChange(value)}>
                <SelectTrigger className="w-[120px]">
                  <div className="flex items-center">
                    <SelectValue placeholder="Select token" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {tokenBalances.map((tb) => (
                    <SelectItem key={tb.token} value={tb.token}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center">
                          <TokenIcon symbol={tb.token} />
                          <span className="mr-2">{tb.token}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Number(tb.amount).toFixed(4)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
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
                Balance: {getTokenBalance(toToken)}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                />
              </div>
              <Select value={toToken} onValueChange={(value: string) => handleToTokenChange(value)}>
                <SelectTrigger className="w-[120px]">
                  <div className="flex items-center">
                    <SelectValue placeholder="Select token" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {/* Show all available tokens for the destination */}
                  {availableTokens.map(token => (
                    <SelectItem key={token} value={token}>
                      <div className="flex items-center">
                        <TokenIcon symbol={token} />
                        {token}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Exchange rate info */}
          <div className="p-3 bg-muted rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate</span>
              <div className="flex items-center gap-1">
                <span>1 {fromToken} = {exchangeRates[`${fromToken}-${toToken}`]?.toFixed(6) || '0'} {toToken}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50" onClick={() => {}}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            size="lg"
            disabled={!fromAmount || isSwapping || Number(fromAmount) <= 0 || Number(fromAmount) > Number(getTokenBalance(fromToken))}
            onClick={handleSwap}
          >
            {isSwapping ? 'Processing...' : 'Swap'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}