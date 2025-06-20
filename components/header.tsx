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
  ETHEREUM_CHAIN_ID, 
  ETHEREUM_CHAIN_CONFIG, 
  STELE_CONTRACT_ADDRESS,
  USDC_DECIMALS
} from "@/lib/constants"
import { useEntryFee } from "@/lib/hooks/use-entry-fee"
import { useWallet } from "@/app/hooks/useWallet"

export function Header() {
  const pathname = usePathname()
  
  // Use global wallet hook
  const { address: walletAddress, isConnected, network: walletNetwork, connectWallet, disconnectWallet, switchNetwork } = useWallet()
  
  const [isConnecting, setIsConnecting] = useState(false)
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

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true)
      await connectWallet()
    } catch (error) {
      console.error("Wallet connection error:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectWallet = () => {
    setBalance('0')
    disconnectWallet()
  }

  // Switch between Networks
  const switchWalletNetwork = async (targetNetwork: 'solana' | 'ethereum' | 'base') => {
    try {
      setIsConnecting(true)
      await switchNetwork(targetNetwork)
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

  const { symbol, name } = getNetworkInfo();

  return (
    <header className="sticky top-0 z-30 border-b border-border h-16 flex items-center justify-between px-4 md:px-6 bg-background">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <span className="text-xl font-bold text-primary">Stele</span>
        </Link>
        
        <div className="flex items-center">
          <Link href={"/dashboard"} className="mr-4">
            <div 
              className={cn(
                "flex flex-row items-center font-medium text-sm transition-colors",
                pathname === "/" || pathname === "/dashboard"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-4 w-4 mr-1.5" />
              <span>Dashboard</span>
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
              <span>My Portfolio</span>
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
        {walletNetwork === 'ethereum' && entryFee && (
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
                <DropdownMenuItem onClick={handleDisconnectWallet}>
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
            onClick={handleConnectWallet}
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
