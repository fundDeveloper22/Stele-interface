'use client'

import { useState, useEffect, useCallback } from 'react'
import { BASE_CHAIN_CONFIG, ETHEREUM_CHAIN_CONFIG } from '@/lib/constants'

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

// Set up wallet event listeners
const setupWalletEventListeners = () => {
  if (typeof window !== 'undefined' && window.phantom?.ethereum) {
    const phantomEthereum = window.phantom.ethereum
    
    // Listen for account changes
    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('Accounts changed:', accounts)
      
      if (accounts.length === 0) {
        // User disconnected their wallet
        localStorage.removeItem('walletAddress')
        localStorage.removeItem('walletNetwork')
        updateGlobalState({
          address: null,
          isConnected: false,
          network: null
        })
      } else {
        // User switched to a different account
        const newAddress = accounts[0]
        
        // Get current chain to determine network
        try {
          const chainId = await phantomEthereum.request({ 
            method: 'eth_chainId' 
          })
          
          let network: 'base' | 'ethereum' = 'base'
          if (chainId === '0x2105') {
            network = 'base'
          } else if (chainId === '0x1') {
            network = 'ethereum'
          }
          
          // Update localStorage and global state
          localStorage.setItem('walletAddress', newAddress)
          localStorage.setItem('walletNetwork', network)
          
          updateGlobalState({
            address: newAddress,
            isConnected: true,
            network
          })
        } catch (error) {
          console.error('Error getting chain ID:', error)
          // Fallback: just update address
          localStorage.setItem('walletAddress', newAddress)
          updateGlobalState({
            address: newAddress,
            isConnected: true,
            network: globalWalletState.network || 'base'
          })
        }
      }
    }

    // Listen for chain changes
    const handleChainChanged = (chainId: string) => {
      console.log('Chain changed:', chainId)
      
      if (globalWalletState.isConnected) {
        let network: 'base' | 'ethereum' = 'base'
        if (chainId === '0x2105') {
          network = 'base'
        } else if (chainId === '0x1') {
          network = 'ethereum'
        }
        
        // Update localStorage and global state
        localStorage.setItem('walletNetwork', network)
        updateGlobalState({
          network
        })
      }
    }

    // Add event listeners with type assertions
    if (phantomEthereum.on) {
      phantomEthereum.on('accountsChanged', handleAccountsChanged)
      phantomEthereum.on('chainChanged', handleChainChanged)
    }

    // Return cleanup function
    return () => {
      if (window.phantom?.ethereum?.removeListener) {
        window.phantom.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.phantom.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }
  
  return () => {}
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
    
    // Set up wallet event listeners
    const cleanupEventListeners = setupWalletEventListeners()
    
    return () => {
      unsubscribe()
      cleanupEventListeners()
    }
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
          
          // Set up event listeners after successful connection
          setupWalletEventListeners()
          
          return { address, network }
        }
      }
      
      // Fallback to Solana
      const provider = (window as any).phantom?.solana
      
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
                params: [BASE_CHAIN_CONFIG],
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
          try {
            await window.phantom.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x1' }], // Ethereum mainnet
            })
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await window.phantom.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [ETHEREUM_CHAIN_CONFIG],
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