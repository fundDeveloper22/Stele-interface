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

export function Header() {
  const pathname = usePathname()

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
        <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hidden sm:flex">
          Connect Wallet
        </Button>

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
