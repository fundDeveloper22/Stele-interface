"use client"

import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { Home, Trophy, BarChart3, Vote } from "lucide-react"
import { cn } from "@/lib/utils"
import { Bell, Search, User, Wallet, DollarSign } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { 
  BASE_CHAIN_ID, 
  BASE_CHAIN_CONFIG, 
  STELE_CONTRACT_ADDRESS,
  USDC_DECIMALS
} from "@/lib/constants"
import { useEntryFee } from "@/lib/hooks/use-entry-fee"

export function Header() {
  const pathname = usePathname()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletNetwork, setWalletNetwork] = useState<'solana' | 'ethereum' | 'base'>('solana')
  const [balance, setBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  
  // Get entry fee from context
  const { entryFee, isLoading: isLoadingEntryFee } = useEntryFee()

  // Get symbol and chain name based on network
  const getNetworkInfo = () => {
    switch (walletNetwork) {
      case 'ethereum':
        return { symbol: 'ETH', name: 'Ethereum Mainnet' };
      case 'base':
        return { symbol: 'ETH', name: 'Base Mainnet' };
      case 'solana':
        return { symbol: 'SOL', name: 'Solana' };
      default:
        return { symbol: '', name: '' };
    }
  };

  // Fetch wallet balance
  const fetchBalance = async () => {
    if (!walletAddress || !window.phantom) return;
    
    try {
      setIsLoadingBalance(true);
      
      if (walletNetwork === 'solana') {
        // Get Solana balance
        if (window.phantom?.solana) {
          // For Solana, separate API call is needed (using arbitrary value for simplification)
          // In practice, we would use Solana Web3.js to call getBalance
          setBalance('1.234');
        }
      } else {
        // Get Ethereum/Base balance
        if (window.phantom?.ethereum) {
          const balanceHex = await window.phantom.ethereum.request({
            method: 'eth_getBalance',
            params: [walletAddress, 'latest'],
          });
          
          // Convert from Wei to ETH (1 ETH = 10^18 Wei)
          const balanceInWei = parseInt(balanceHex, 16);
          const balanceInEth = balanceInWei / Math.pow(10, 18);
          
          // Display up to 4 decimal places
          setBalance(balanceInEth.toFixed(4));
        }
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance('?');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window.phantom === 'undefined') {
      alert('Phantom wallet is not installed. Please install it from https://phantom.app/')
      return
    }

    try {
      setIsConnecting(true)

      // Try Ethereum first
      if (window.phantom?.ethereum) {
        const accounts = await window.phantom.ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        
        if (accounts && accounts.length > 0) {
          const address = accounts[0]
          setWalletAddress(address)
          
          // Get current chain ID
          const chainId = await window.phantom.ethereum.request({ 
            method: 'eth_chainId' 
          });
          
          // Set wallet network based on chain ID
          if (chainId === BASE_CHAIN_ID) {
            setWalletNetwork('base')
            localStorage.setItem('walletNetwork', 'base')
          } else {
            setWalletNetwork('ethereum')
            localStorage.setItem('walletNetwork', 'ethereum')
          }
          
          localStorage.setItem('walletAddress', address)
          setIsConnecting(false)
          return
        }
      }
      
      // Fallback to Solana
      const provider = window.phantom?.solana
      
      if (provider?.isPhantom) {
        const response = await provider.connect()
        const address = response.publicKey.toString()
        setWalletAddress(address)
        setWalletNetwork('solana')
        localStorage.setItem('walletAddress', address)
        localStorage.setItem('walletNetwork', 'solana')
      }
    } catch (error) {
      console.error("Wallet connection error:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setBalance('0')
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletNetwork')
  }

  // Switch to Base Chain
  const switchToBaseChain = async () => {
    if (!window.phantom?.ethereum) return;
    
    try {
      setIsConnecting(true);
      
      // Try to switch to Base chain
      try {
        await window.phantom.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to Phantom
        if (switchError.code === 4902) {
          // Add the Base chain
          await window.phantom.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_CHAIN_CONFIG],
          });
        } else {
          throw switchError;
        }
      }
      
      // Get accounts after switching
      const accounts = await window.phantom.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setWalletNetwork('base');
        localStorage.setItem('walletAddress', address);
        localStorage.setItem('walletNetwork', 'base');
      }
    } catch (error) {
      console.error("Error switching to Base chain:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch between Networks
  const switchWalletNetwork = async (targetNetwork: 'solana' | 'ethereum' | 'base') => {
    if (!window.phantom) return

    try {
      disconnectWallet()
      setIsConnecting(true)
      
      if (targetNetwork === 'solana') {
        // Switch to Solana
        const provider = window.phantom?.solana
        
        if (provider?.isPhantom) {
          const response = await provider.connect()
          const address = response.publicKey.toString()
          setWalletAddress(address)
          setWalletNetwork('solana')
          localStorage.setItem('walletAddress', address)
          localStorage.setItem('walletNetwork', 'solana')
        }
      } else if (targetNetwork === 'base') {
        // Switch to Base
        await switchToBaseChain()
      } else {
        // Switch to Ethereum Mainnet
        if (window.phantom?.ethereum) {
          try {
            await window.phantom.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x1' }], // Ethereum mainnet
            });
            
            const accounts = await window.phantom.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts.length > 0) {
              const address = accounts[0];
              setWalletAddress(address);
              setWalletNetwork('ethereum');
              localStorage.setItem('walletAddress', address);
              localStorage.setItem('walletNetwork', 'ethereum');
            }
          } catch (error) {
            console.error("Error switching to Ethereum:", error);
          }
        }
      }
    } catch (error) {
      console.error("Wallet switch error:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Fetch new balance when wallet address or network changes
  useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    }
  }, [walletAddress, walletNetwork]);

  // Restore saved wallet address on page load
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    const savedNetwork = localStorage.getItem('walletNetwork')
    
    if (savedAddress) {
      setWalletAddress(savedAddress)
      if (savedNetwork === 'ethereum' || savedNetwork === 'solana' || savedNetwork === 'base') {
        setWalletNetwork(savedNetwork as 'ethereum' | 'solana' | 'base')
      }
    }
  }, [])

  const { symbol, name } = getNetworkInfo();

  return (
    <header className="sticky top-0 z-30 border-b border-border h-16 flex items-center justify-between px-4 md:px-6 bg-background">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <span className="text-xl font-bold text-primary">Stele</span>
        </Link>
        
        <div className="flex items-center">
          <Link href={"/"} className="mr-4">
            <div 
              className={cn(
                "flex flex-row items-center font-medium text-sm transition-colors",
                pathname === "/" 
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-4 w-4 mr-1.5" />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href={"/challenges"} className="mr-4">
            <div 
              className={cn(
                "flex flex-row items-center font-medium text-sm transition-colors",
                pathname.includes("/challenges") || pathname.includes("/challenge/") 
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Trophy className="h-4 w-4 mr-1.5" />
              <span>Challenges</span>
            </div>
          </Link>
          <Link href={"/portfolio"} className="mr-4">
            <div 
              className={cn(
                "flex flex-row items-center font-medium text-sm transition-colors",
                pathname.includes("/portfolio") 
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              <span>Portfolio</span>
            </div>
          </Link>
          <Link href={"/vote"}>
            <div 
              className={cn(
                "flex flex-row items-center font-medium text-sm transition-colors",
                pathname.includes("/vote") 
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Vote className="h-4 w-4 mr-1.5" />
              <span>Vote</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {walletNetwork === 'base' && entryFee && (
          <div className="hidden md:flex items-center justify-center bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
            <DollarSign className="h-3 w-3 mr-1" />
            Entry Fee : {isLoadingEntryFee ? 'Loading...' : `${entryFee} USDC`}
          </div>
        )}
        
        {walletAddress ? (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-muted-foreground">{name}</span>
              <span className="text-sm font-medium">
                {isLoadingBalance ? 'Loading...' : `${balance} ${symbol}`}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hidden sm:flex">
                  <Wallet className="mr-2 h-4 w-4" />
                  {walletNetwork === 'solana'
                    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                    : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{name}</span>
                    <span className="text-xs font-normal text-muted-foreground mt-1">
                      {isLoadingBalance ? 'Loading...' : `${balance} ${symbol}`}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(walletAddress)
                }}>
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={fetchBalance}>
                  Refresh Balance
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Switch Network</DropdownMenuLabel>
                {walletNetwork !== 'ethereum' && (
                  <DropdownMenuItem onClick={() => switchWalletNetwork('ethereum')}>
                    Ethereum Mainnet
                  </DropdownMenuItem>
                )}
                {walletNetwork !== 'base' && (
                  <DropdownMenuItem onClick={() => switchWalletNetwork('base')}>
                    Base Mainnet
                  </DropdownMenuItem>
                )}
                {walletNetwork !== 'solana' && (
                  <DropdownMenuItem onClick={() => switchWalletNetwork('solana')}>
                    Solana
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={disconnectWallet}>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-primary border-primary hover:bg-primary/10 hidden sm:flex"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            <Wallet className="mr-2 h-4 w-4" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        )}

        <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
