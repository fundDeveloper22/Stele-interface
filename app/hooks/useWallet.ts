'use client'

import { useState, useEffect, useCallback } from 'react'

interface WalletState {
  address: string | null
  isConnected: boolean
  network: 'solana' | 'ethereum' | 'base' | null
}

// Global wallet state
let globalWalletState: WalletState = {
  address: null,
  isConnected: false,
  network: null
}

// Subscribers for state updates
let subscribers: Array<(state: WalletState) => void> = []

// Subscribe to wallet state changes
const subscribe = (callback: (state: WalletState) => void) => {
  subscribers.push(callback)
  return () => {
    subscribers = subscribers.filter(sub => sub !== callback)
  }
}

// Update global state and notify subscribers
const updateGlobalState = (newState: Partial<WalletState>) => {
  globalWalletState = { ...globalWalletState, ...newState }
  subscribers.forEach(callback => callback(globalWalletState))
}

// Initialize state from localStorage
const initializeWalletState = () => {
  if (typeof window !== 'undefined') {
    const savedAddress = localStorage.getItem('walletAddress')
    const savedNetwork = localStorage.getItem('walletNetwork')
    
    if (savedAddress) {
      updateGlobalState({
        address: savedAddress,
        isConnected: true,
        network: (savedNetwork as 'solana' | 'ethereum' | 'base') || 'base'
      })
    }
  }
}

// Hook for using wallet state
export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>(globalWalletState)

  useEffect(() => {
    // Initialize from localStorage on first load
    if (!globalWalletState.address) {
      initializeWalletState()
    }
    
    // Set initial state
    setWalletState(globalWalletState)
    
    // Subscribe to state changes
    const unsubscribe = subscribe(setWalletState)
    
    return unsubscribe
  }, [])

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    if (typeof window.phantom === 'undefined') {
      throw new Error('Phantom wallet is not installed. Please install it from https://phantom.app/')
    }

    try {
      // Try Ethereum first (for Base network)
      if (window.phantom?.ethereum) {
        const accounts = await window.phantom.ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        
        if (accounts && accounts.length > 0) {
          const address = accounts[0]
          
          // Get current chain ID
          const chainId = await window.phantom.ethereum.request({ 
            method: 'eth_chainId' 
          })
          
          let network: 'base' | 'ethereum' = 'base'
          if (chainId === '0x2105') { // Base mainnet
            network = 'base'
          } else {
            network = 'ethereum'
          }
          
          // Update localStorage
          localStorage.setItem('walletAddress', address)
          localStorage.setItem('walletNetwork', network)
          
          // Update global state
          updateGlobalState({
            address,
            isConnected: true,
            network
          })
          
          return { address, network }
        }
      }
      
      // Fallback to Solana
      const provider = window.phantom?.solana
      
      if (provider?.isPhantom) {
        const response = await provider.connect()
        const address = response.publicKey.toString()
        
        // Update localStorage
        localStorage.setItem('walletAddress', address)
        localStorage.setItem('walletNetwork', 'solana')
        
        // Update global state
        updateGlobalState({
          address,
          isConnected: true,
          network: 'solana'
        })
        
        return { address, network: 'solana' }
      }
      
      throw new Error('No compatible wallet provider found')
    } catch (error) {
      console.error('Wallet connection error:', error)
      throw error
    }
  }, [])

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletNetwork')
    
    // Update global state
    updateGlobalState({
      address: null,
      isConnected: false,
      network: null
    })
  }, [])

  // Switch network function
  const switchNetwork = useCallback(async (targetNetwork: 'solana' | 'ethereum' | 'base') => {
    if (!window.phantom) {
      throw new Error('Phantom wallet not found')
    }

    try {
      disconnectWallet()
      
      if (targetNetwork === 'solana') {
        const provider = window.phantom?.solana
        
        if (provider?.isPhantom) {
          const response = await provider.connect()
          const address = response.publicKey.toString()
          
          localStorage.setItem('walletAddress', address)
          localStorage.setItem('walletNetwork', 'solana')
          
          updateGlobalState({
            address,
            isConnected: true,
            network: 'solana'
          })
        }
      } else if (targetNetwork === 'base') {
        if (window.phantom?.ethereum) {
          try {
            await window.phantom.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2105' }], // Base mainnet
            })
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await window.phantom.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x2105',
                  chainName: 'Base Mainnet',
                  nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org']
                }],
              })
            } else {
              throw switchError
            }
          }
          
          const accounts = await window.phantom.ethereum.request({ 
            method: 'eth_requestAccounts' 
          })
          
          if (accounts && accounts.length > 0) {
            const address = accounts[0]
            
            localStorage.setItem('walletAddress', address)
            localStorage.setItem('walletNetwork', 'base')
            
            updateGlobalState({
              address,
              isConnected: true,
              network: 'base'
            })
          }
        }
      } else if (targetNetwork === 'ethereum') {
        if (window.phantom?.ethereum) {
          await window.phantom.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }], // Ethereum mainnet
          })
          
          const accounts = await window.phantom.ethereum.request({ 
            method: 'eth_requestAccounts' 
          })
          
          if (accounts && accounts.length > 0) {
            const address = accounts[0]
            
            localStorage.setItem('walletAddress', address)
            localStorage.setItem('walletNetwork', 'ethereum')
            
            updateGlobalState({
              address,
              isConnected: true,
              network: 'ethereum'
            })
          }
        }
      }
    } catch (error) {
      console.error('Network switch error:', error)
      throw error
    }
  }, [disconnectWallet])

  return {
    address: walletState.address,
    isConnected: walletState.isConnected,
    network: walletState.network,
    connectWallet,
    disconnectWallet,
    switchNetwork
  }
} 