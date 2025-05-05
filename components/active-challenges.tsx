import { ChallengeCard } from "@/components/challenge-card"

export function ActiveChallenges() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Active Challenges</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChallengeCard
          id="one-week-challenge"
          title="1 week challenge"
          type="1 week challenge"
          participants={42}
          timeLeft="3 days 12 hours"
          prize="$1,250.00"
          progress={65}
          status="active"
        />

        <ChallengeCard
          id="one-month-challenge"
          title="1 month challenge"
          type="1 month challenge"
          participants={78}
          timeLeft="18 days"
          prize="$3,500.00"
          progress={40}
          status="active"
        />

        <ChallengeCard
          id="three-month-challenge"
          title="3 months challenge"
          type="3 months challenge"
          participants={36}
          timeLeft="2 months 5 days"
          prize="$5,800.00"
          progress={25}
          status="active"
        />

        <ChallengeCard
          id="six-month-challenge"
          title="6 months challenge"
          type="6 months challenge"
          participants={64}
          timeLeft="Starting Soon"
          prize="$2,000.00"
          progress={0}
          status="pending"
        />

        <ChallengeCard
          id="one-year-challenge"
          title="1 year challenge"
          type="1 year challenge"
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
