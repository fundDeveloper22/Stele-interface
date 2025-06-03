'use client'
import { DashboardStats } from '@/app/dashboard/page'
import { useActiveChallenges } from '@/app/hooks/useActiveChallenges'

export default function DashBoardQuery() {
  // the data is already pre-fetched on the server and immediately available here,
  // without an additional network call
  const { data } = useActiveChallenges()
  return <DashboardStats data={data} />
}
      