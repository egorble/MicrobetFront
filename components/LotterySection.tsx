import { useLinera } from "./LineraProvider";
import { LotteryHero } from "./LotteryHero";
import { LotteryHistory } from "./LotteryHistory";

export function LotterySection() {
    const { purchaseTickets, lotteryRounds, lotteryWinners } = useLinera();

    const handleBuyTicket = async (amountTokens: string) => {
        if (!purchaseTickets) return;
        await purchaseTickets(amountTokens);
    };

    const rounds = lotteryRounds || [];
    const activeRound = rounds.find(r => r.status === "ACTIVE" || r.status === "CLOSED" || r.status === "DRAWING");
    // If we have rounds but no active round found, maybe the first one is the most relevant to show?
    // Or just pass undefined and let LotteryHero show loading/placeholder.
    // Actually, if rounds are loaded but none are active, we might want to show the latest completed one or a "Next round starting soon" state.
    // For now, let's stick to the plan: pass activeRound (undefined if not found) to LotteryHero.

    const historyRounds = rounds.filter(r => r.status === "COMPLETE");

    return (
        <div className="space-y-8">
            {/* Hero Section - Always rendered to prevent layout shift */}
            <LotteryHero
                round={activeRound}
                onBuyTicket={handleBuyTicket}
            />

            {/* History Section */}
            <LotteryHistory rounds={historyRounds} latest={lotteryWinners || []} />
        </div>
    );
}
