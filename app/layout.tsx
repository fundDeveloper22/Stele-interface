import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { BlockNumberDisplay } from "@/app/components/BlockNumberDisplay"
import { EntryFeeProvider } from "@/lib/hooks/use-entry-fee"
import QueryProvider from "../components/QueryProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stele - Decentralized Investment Challenge Platform",
  description: "A decentralized investment challenge platform for testing cryptocurrency investment strategies",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <EntryFeeProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <div className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-40">
                  <div className="container mx-auto px-4 py-1">
                    <div className="flex justify-end">
                      <BlockNumberDisplay />
                    </div>
                  </div>
                </div>
                <main className="flex-1 p-4 md:p-6">
                  {children}
                </main>
              </div>
            </EntryFeeProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
