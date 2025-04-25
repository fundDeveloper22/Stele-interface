import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Swap Assets",
  description: "Exchange assets within your challenge",
}

export default function SwapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 