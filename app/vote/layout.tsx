export default function VoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      {children}
    </div>
  )
}

export const metadata = {
  title: 'Vote | Stele Governance',
  description: 'Vote on Stele governance proposals',
} 