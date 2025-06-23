"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ethers } from "ethers"
import { RPC_URL } from "@/lib/constants"

// Uniswap V3 Quoter Contract Address (Ethereum Mainnet)
const QUOTER_CONTRACT_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
// Multicall2 Contract Address (Ethereum Mainnet - stable and widely used)
const MULTICALL_CONTRACT_ADDRESS = "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696"

// Ethereum Mainnet token addresses (correct checksum format)
const TOKEN_ADDRESSES = {
  WETH: "0xC02aaA39b223FE8C0A0e5C4F27eAD9083C756Cc2", // Ethereum WETH
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum USDC (correct checksum)
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Ethereum USDT
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // Ethereum WBTC
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",   // Ethereum UNI
  LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",  // Ethereum LINK
}

// Quoter ABI (simplified)
const QUOTER_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "tokenIn", "type": "address"},
      {"internalType": "address", "name": "tokenOut", "type": "address"},
      {"internalType": "uint24", "name": "fee", "type": "uint24"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160"}
    ],
    "name": "quoteExactInputSingle",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

// Multicall2 ABI (simplified)
const MULTICALL_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "target", "type": "address"},
          {"internalType": "bytes", "name": "callData", "type": "bytes"}
        ],
        "internalType": "struct Multicall2.Call[]",
        "name": "calls",
        "type": "tuple[]"
      }
    ],
    "name": "aggregate",
    "outputs": [
      {"internalType": "uint256", "name": "blockNumber", "type": "uint256"},
      {"internalType": "bytes[]", "name": "returnData", "type": "bytes[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export interface TokenPrice {
  symbol: string
  address: string
  priceUSD: number
  priceChange24h?: number
  lastUpdated: Date
  decimals: number
}

export interface BatchPriceData {
  tokens: Record<string, TokenPrice>
  timestamp: number
  source: string
  error?: string
}

export interface TokenInfo {
  symbol: string
  address: string
  decimals: number
}

export function useUniswapBatchPrices(tokens: TokenInfo[] = []) {
  const [priceData, setPriceData] = useState<BatchPriceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  const getProvider = useCallback(async () => {
    // Try to use user's wallet provider, fallback to configured RPC
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        return new ethers.BrowserProvider((window as any).ethereum)
      } catch (error) {
        console.log('Failed to use wallet provider, using configured RPC')
      }
    }
    
    // Use RPC_URL from constants (Ethereum Mainnet Infura)
    return new ethers.JsonRpcProvider(RPC_URL)
  }, [])

  const createQuoteCallData = useCallback((
    tokenInAddress: string,
    tokenOutAddress: string,
    decimalsIn: number = 18
  ): string => {
    const quoterInterface = new ethers.Interface(QUOTER_ABI)
    const amountIn = ethers.parseUnits("1", decimalsIn)
    
    // Normalize addresses to proper checksum format
    const normalizedTokenIn = ethers.getAddress(tokenInAddress)
    const normalizedTokenOut = ethers.getAddress(tokenOutAddress)
    
    // Try 0.3% fee tier first (most common)
    return quoterInterface.encodeFunctionData("quoteExactInputSingle", [
      normalizedTokenIn,
      normalizedTokenOut,
      3000, // 0.3% fee
      amountIn,
      0 // No price limit
    ])
  }, [])

  const fetchBatchPrices = useCallback(async (forceRefresh: boolean = false) => {
    if (tokens.length === 0) {
      setPriceData({
        tokens: {},
        timestamp: Date.now(),
        source: 'Uniswap V3 Batch (No tokens provided)',
      })
      setIsLoading(false)
      return
    }

    // Prevent too frequent requests (minimum 1 minute between calls)
    const now = Date.now()
    const timeSinceLastFetch = now - lastFetchTime
    const MIN_FETCH_INTERVAL = 60000 // 1 minute
    
    if (!forceRefresh && timeSinceLastFetch < MIN_FETCH_INTERVAL && priceData) {
      return
    }

    try {
      // Only show loading for initial fetch or when no data exists
      if (!priceData) {
        setIsLoading(true)
      }
      setError(null)
      setLastFetchTime(now)
      
      const provider = await getProvider()
      const multicallContract = new ethers.Contract(
        MULTICALL_CONTRACT_ADDRESS,
        MULTICALL_ABI,
        provider
      )

      // Use Ethereum mainnet token addresses
      const usdcAddress = TOKEN_ADDRESSES.USDC
      const wethAddress = TOKEN_ADDRESSES.WETH
      
      // Prepare multicall for all token prices
      const calls: Array<{ target: string; callData: string }> = []
      const tokenCallMap: Array<{ token: TokenInfo; callIndex: number }> = []

      // Add calls for each token against USDC or WETH
      tokens.forEach((token) => {
        try {
          // Skip USDC - we'll set it to $1
          if (token.address.toLowerCase() === usdcAddress.toLowerCase()) {
            return
          }

          // Validate token address format
          const validTokenAddress = ethers.getAddress(token.address)
          const validQuoteAddress = ethers.getAddress(usdcAddress)

          // Try to get price in USDC first, then WETH
          const callData = createQuoteCallData(
            validTokenAddress,
            validQuoteAddress,
            token.decimals
          )

          calls.push({
            target: QUOTER_CONTRACT_ADDRESS,
            callData
          })

          tokenCallMap.push({
            token,
            callIndex: calls.length - 1
          })
        } catch (addressError) {
          console.error(`Invalid address for token ${token.symbol}: ${token.address}`, addressError)
          // Skip this token and continue with others
        }
      })

      if (calls.length === 0) {
        setPriceData({
          tokens: {
            USDC: {
              symbol: 'USDC',
              address: usdcAddress,
              priceUSD: 1.0,
              decimals: 6,
              lastUpdated: new Date()
            }
          },
          timestamp: Date.now(),
          source: 'Uniswap V3 Batch (USDC only)',
        })
        return
      }

      // Execute multicall using aggregate (Multicall2 standard)
      const [blockNumber, returnData] = await multicallContract.aggregate.staticCall(calls)
      console.log(`Batch price fetch at block ${blockNumber.toString()}, got ${returnData.length} results`)

      const processedTokens: Record<string, TokenPrice> = {}

      // Add USDC as base reference
      processedTokens.USDC = {
        symbol: 'USDC',
        address: usdcAddress,
        priceUSD: 1.0,
        decimals: 6,
        lastUpdated: new Date()
      }

      // Process results from aggregate (Multicall2)
      tokenCallMap.forEach(({ token, callIndex }) => {
        try {
          const resultData = returnData[callIndex]
          if (resultData && resultData !== '0x') {
            const quoterInterface = new ethers.Interface(QUOTER_ABI)
            const decodedResult = quoterInterface.decodeFunctionResult(
              "quoteExactInputSingle",
              resultData
            )
            
            const amountOut = decodedResult[0]
            // Assuming quote against USDC (6 decimals)
            const priceUSD = parseFloat(ethers.formatUnits(amountOut, 6))

            processedTokens[token.symbol] = {
              symbol: token.symbol,
              address: token.address,
              priceUSD: priceUSD,
              decimals: token.decimals,
              lastUpdated: new Date()
            }
          } else {
            console.warn(`No price data for ${token.symbol} - empty return data`)
          }
        } catch (decodeError) {
          console.error(`Failed to decode price for ${token.symbol}:`, decodeError)
        }
      })

      setPriceData({
        tokens: processedTokens,
        timestamp: Date.now(),
        source: 'Uniswap V3 + Multicall2 Onchain',
      })

    } catch (fetchError) {
      console.error('Failed to fetch batch prices:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [tokens, getProvider, createQuoteCallData, lastFetchTime, priceData])

  // Create stable token key to prevent unnecessary re-renders
  const tokenKey = useMemo(() => {
    return tokens.map(t => `${t.address}-${t.symbol}-${t.decimals}`).sort().join(',')
  }, [tokens])

  // Initial fetch using stable tokenKey
  useEffect(() => {
    if (tokenKey) {
      fetchBatchPrices()
    } else {
      setIsLoading(false)
    }
  }, [tokenKey, fetchBatchPrices])

  // Auto-refresh every 5 minutes (less frequent to prevent flickering)
  useEffect(() => {
    if (!tokenKey) return
    
    const interval = setInterval(() => {
      fetchBatchPrices(true) // Force refresh for periodic updates
    }, 300000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [fetchBatchPrices, tokenKey])

  return {
    data: priceData,
    isLoading,
    error,
    refetch: () => fetchBatchPrices(true) // Force refresh when manually triggered
  }
}

// Hook for getting prices of user's specific tokens
export function useUserTokenPrices(userTokens: Array<{ symbol: string; address: string; decimals: string }>) {
  const tokenInfos: TokenInfo[] = userTokens.map(token => ({
    symbol: token.symbol,
    address: token.address,
    decimals: parseInt(token.decimals) || 18
  }))

  return useUniswapBatchPrices(tokenInfos)
} 