import type React from "react"
import Link from "next/link"
import { BarChart3, Trophy, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar() {
  return (
    <div className="w-64 h-full bg-black border-r border-border flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">Stele</span>
        </Link>
      </div>

      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground">Main</h2>
        <div className="space-y-1">
          <NavItem href="/" icon={<Home className="mr-2 h-4 w-4" />}>
            Dashboard
          </NavItem>
          <NavItem href="/challenges" icon={<Trophy className="mr-2 h-4 w-4" />}>
            Challenges
          </NavItem>
          <NavItem href="/portfolio" icon={<BarChart3 className="mr-2 h-4 w-4" />}>
            Portfolio
          </NavItem>
        </div>
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  active?: boolean
}

function NavItem({ href, icon, children, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
        active ? "bg-accent text-accent-foreground" : "transparent",
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
