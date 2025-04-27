"use client"

import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { Home, Trophy, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Bell, Search, User } from "lucide-react"
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

export function Header() {
  const pathname = usePathname()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletNetwork, setWalletNetwork] = useState<'solana' | 'ethereum'>('solana')

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
          setWalletNetwork('ethereum')
          localStorage.setItem('walletAddress', address)
          localStorage.setItem('walletNetwork', 'ethereum')
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
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('walletNetwork')
  }

  // Switch between Ethereum and Solana wallet
  const switchWalletNetwork = async () => {
    if (!window.phantom) return

    try {
      disconnectWallet()
      setIsConnecting(true)
      
      if (walletNetwork === 'solana') {
        // Switch to Ethereum
        if (window.phantom?.ethereum) {
          const accounts = await window.phantom.ethereum.request({ 
            method: 'eth_requestAccounts' 
          })
          
          if (accounts && accounts.length > 0) {
            const address = accounts[0]
            setWalletAddress(address)
            setWalletNetwork('ethereum')
            localStorage.setItem('walletAddress', address)
            localStorage.setItem('walletNetwork', 'ethereum')
          }
        }
      } else {
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
      }
    } catch (error) {
      console.error("Wallet switch error:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Restore saved wallet address on page load
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress')
    const savedNetwork = localStorage.getItem('walletNetwork')
    
    if (savedAddress) {
      setWalletAddress(savedAddress)
      if (savedNetwork === 'ethereum' || savedNetwork === 'solana') {
        setWalletNetwork(savedNetwork)
      }
    }
  }, [])

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
          <Link href={"/portfolio"}>
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
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {walletAddress ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hidden sm:flex">
                {walletNetwork === 'ethereum' ? 'ETH: ' : 'SOL: '}
                {walletNetwork === 'ethereum' 
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(walletAddress)
              }}>
                Copy Address
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={switchWalletNetwork}>
                Switch to {walletNetwork === 'ethereum' ? 'Solana' : 'Ethereum'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={disconnectWallet}>
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-primary border-primary hover:bg-primary/10 hidden sm:flex"
            onClick={connectWallet}
            disabled={isConnecting}
          >
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
