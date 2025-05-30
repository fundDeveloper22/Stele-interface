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
import { useTokensData } from '@/app/subgraph/WhiteListTokens'
import { useInvestorData } from '@/app/subgraph/Account'

// Format token amount with proper decimals
const formatTokenAmount = (amount: string, decimals: string | number) => {
  if (!amount || !decimals) return '0'
  
  const decimalPlaces = typeof decimals === 'string' ? parseInt(decimals) : decimals
  const amountBN = BigInt(amount)
  const divisor = BigInt(10 ** decimalPlaces)
  const quotient = amountBN / divisor
  const remainder = amountBN % divisor
  
  if (remainder === BigInt(0)) {
    return quotient.toString()
  }
  
  const fractionalPart = remainder.toString().padStart(decimalPlaces, '0')
  return `${quotient}.${fractionalPart.replace(/0+$/, '')}`
}

// Token Icon Component with symbol support
const TokenIcon = ({ symbol, address }: { symbol?: string; address?: string }) => {
  // Use symbol if available, otherwise use first chars of address
  const displayText = symbol ? symbol.slice(0, 2) : (address ? address.slice(2, 4) : '??')
  
  // Generate unique color for each token (hash-based)
  const getColorForToken = (input: string) => {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-red-500', 'bg-yellow-500', 'bg-indigo-500',
      'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
    ]
    
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }
  
  const colorClass = getColorForToken(symbol || address || 'default')
  
  return (
    <div className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center mr-2`}>
      <span className="text-xs font-bold text-white">{displayText}</span>
    </div>
  )
}

interface TokenInfo {
  address: string;
  symbol: string;
  amount: string;
  decimals: string;
  formattedAmount: string;
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
  
  // Get investor data with actual token symbols and decimals
  const { data: investorData, isLoading: isLoadingInvestor } = useInvestorData(
    challengeId as string, 
    walletAddress as string
  )
  
  // Get whitelisted tokens from the subgraph
  const { data: whitelistedTokensData, isLoading: isLoadingTokens } = useTokensData()
  
  // State for token information
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([])
  const [whitelistedTokens, setWhitelistedTokens] = useState<TokenInfo[]>([])
  
  // State for swap values
  const [fromToken, setFromToken] = useState<string>('')
  const [toToken, setToToken] = useState<string>('')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)
  
  // Process investor token data
  useEffect(() => {
    if (investorData?.investor) {
      const investor = investorData.investor
      const tokens = investor.tokens || []
      const tokensAmount = investor.tokensAmount || []
      const tokensSymbols = investor.tokensSymbols || []
      const tokensDecimals = investor.tokensDecimals || []
      
      const tokenInfos: TokenInfo[] = tokens.map((address, index) => ({
        address,
        symbol: tokensSymbols[index] || `TOKEN_${index}`,
        amount: tokensAmount[index] || '0',
        decimals: tokensDecimals[index] || '18',
        formattedAmount: formatTokenAmount(tokensAmount[index] || '0', tokensDecimals[index] || '18')
      }))
      
      setUserTokens(tokenInfos)
      
      // Set initial fromToken if available
      if (tokenInfos.length > 0) {
        setFromToken(tokenInfos[0].address)
      }
    }
  }, [investorData])

  // Process whitelisted tokens data
  useEffect(() => {
    if (whitelistedTokensData?.tokens && Array.isArray(whitelistedTokensData.tokens)) {
      const whitelistedTokenInfos: TokenInfo[] = whitelistedTokensData.tokens.map(token => ({
        address: token.tokenAddress,
        symbol: token.symbol,
        amount: '0', // Whitelisted tokens don't have user amounts
        decimals: token.decimals,
        formattedAmount: '0'
      }))
      
      setWhitelistedTokens(whitelistedTokenInfos)
      
      // Set initial toToken to first whitelisted token that's different from fromToken
      if (whitelistedTokenInfos.length > 0 && !toToken) {
        const initialToToken = whitelistedTokenInfos.find(token => 
          token.address !== fromToken
        ) || whitelistedTokenInfos[0]
        setToToken(initialToToken.address)
      }
    }
  }, [whitelistedTokensData, fromToken, toToken])

  // Get token info by address
  const getTokenInfo = (address: string): TokenInfo | null => {
    const userToken = userTokens.find(t => t.address === address)
    if (userToken) return userToken
    
    const whitelistedToken = whitelistedTokens.find(t => t.address === address)
    return whitelistedToken || null
  }

  // Get formatted balance for display
  const getFormattedBalance = (address: string): string => {
    const tokenInfo = getTokenInfo(address)
    return tokenInfo?.formattedAmount || '0'
  }

  // Generate exchange rates (simplified)
  const generateExchangeRates = () => {
    const rates: Record<string, number> = {}
    const allTokens = [...userTokens, ...whitelistedTokens]
    
    allTokens.forEach(from => {
      allTokens.forEach(to => {
        if (from.address !== to.address) {
          // Simple rate generation based on symbols
          let rate = 1
          if (from.symbol === 'ETH' && to.symbol === 'USDC') {
            rate = 1786.45
          } else if (from.symbol === 'USDC' && to.symbol === 'ETH') {
            rate = 0.00056
          } else {
            rate = 0.5 + Math.random() * 2 // Random rate between 0.5 and 2.5
          }
          rates[`${from.address}-${to.address}`] = rate
        }
      })
    })
    
    return rates
  }

  const exchangeRates = generateExchangeRates()

  // Calculate estimated amount on input change
  const handleAmountChange = (amount: string) => {
    setFromAmount(amount)
    
    if (amount && !isNaN(Number(amount)) && fromToken && toToken) {
      const pairKey = `${fromToken}-${toToken}`
      const rate = exchangeRates[pairKey] || 0
      setToAmount((Number(amount) * rate).toFixed(6))
    } else {
      setToAmount('')
    }
  }

  // Set max amount based on token balance
  const handleSetMaxAmount = () => {
    const balance = getFormattedBalance(fromToken)
    setFromAmount(balance)
    handleAmountChange(balance)
  }

  // Handle swap token positions
  const handleSwapTokens = () => {
    if (fromToken && toToken) {
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
  }

  // Handle token selection
  const handleFromTokenChange = (value: string) => {
    setFromToken(value)
    if (value === toToken) {
      // Find another token to use as toToken
      const availableTokens = [...userTokens, ...whitelistedTokens]
      const newToToken = availableTokens.find(t => t.address !== value)
      setToToken(newToToken?.address || '')
    }
    
    // Reset amounts when changing tokens
    setFromAmount('')
    setToAmount('')
  }

  const handleToTokenChange = (value: string) => {
    setToToken(value)
    if (value === fromToken) {
      // Find another token to use as fromToken
      const newFromToken = userTokens.find(t => t.address !== value)
      setFromToken(newFromToken?.address || '')
    }
    
    // Reset amounts when changing tokens
    setFromAmount('')
    setToAmount('')
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
  if (userTokens.length === 0 || isLoadingInvestor || isLoadingTokens) {
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
                  Balance: {getFormattedBalance(fromToken)}
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
                    {fromToken && getTokenInfo(fromToken) && (
                      <>
                        <TokenIcon symbol={getTokenInfo(fromToken)?.symbol} address={fromToken} />
                        <span>{getTokenInfo(fromToken)?.symbol}</span>
                      </>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {userTokens.map((tb) => (
                    <SelectItem key={tb.address} value={tb.address}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center">
                          <TokenIcon symbol={tb.symbol} address={tb.address} />
                          <span className="mr-2">{tb.symbol}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {tb.formattedAmount}
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
                Balance: {getFormattedBalance(toToken)}
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
                    {toToken && getTokenInfo(toToken) && (
                      <>
                        <TokenIcon symbol={getTokenInfo(toToken)?.symbol} address={toToken} />
                        <span>{getTokenInfo(toToken)?.symbol}</span>
                      </>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {whitelistedTokens.map((tb) => (
                    <SelectItem key={tb.address} value={tb.address}>
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center">
                          <TokenIcon symbol={tb.symbol} address={tb.address} />
                          <span className="mr-2">{tb.symbol}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Available
                        </span>
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
                <span>
                  1 {getTokenInfo(fromToken)?.symbol || 'TOKEN'} = {' '}
                  {exchangeRates[`${fromToken}-${toToken}`]?.toFixed(6) || '0'} {' '}
                  {getTokenInfo(toToken)?.symbol || 'TOKEN'}
                </span>
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
            disabled={!fromAmount || isSwapping || Number(fromAmount) <= 0 || Number(fromAmount) > Number(getFormattedBalance(fromToken))}
            onClick={handleSwap}
          >
            {isSwapping ? 'Processing...' : 'Swap'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}