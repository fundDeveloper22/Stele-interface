import { ChallengeCard } from "@/components/challenge-card"

export function ActiveChallenges() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Active Challenges</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChallengeCard
          id="short-term-investment"
          title="Short-term Investment Master"
          type="1 Week Challenge"
          participants={42}
          timeLeft="3 days 12 hours"
          prize="$1,250.00"
          progress={65}
          status="active"
        />

        <ChallengeCard
          id="mid-term-investment"
          title="Mid-term Investment Strategy"
          type="1 Month Challenge"
          participants={78}
          timeLeft="18 days"
          prize="$3,500.00"
          progress={40}
          status="active"
        />

        <ChallengeCard
          id="long-term-investment"
          title="Long-term Investment Portfolio"
          type="3 Month Challenge"
          participants={36}
          timeLeft="2 months 5 days"
          prize="$5,800.00"
          progress={25}
          status="active"
        />

        <ChallengeCard
          id="crypto-trading"
          title="Crypto Trading Competition"
          type="1 Week Challenge"
          participants={64}
          timeLeft="Starting Soon"
          prize="$2,000.00"
          progress={0}
          status="pending"
        />

        <ChallengeCard
          id="defi-yield"
          title="DeFi Yield Optimization"
          type="1 Month Challenge"
          participants={52}
          timeLeft="Completed"
          prize="$4,200.00"
          progress={100}
          status="completed"
        />
      </div>
    </div>
  )
}
