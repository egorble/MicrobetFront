import { useState, useEffect } from "react";
import { LotteryHero } from "./LotteryHero";
import { LotteryHistory } from "./LotteryHistory";

export type LotteryStatus = "ACTIVE" | "CLOSED" | "COMPLETE";

export interface LotteryRound {
    id: string;
    status: LotteryStatus;
    prizePool: string;
    ticketPrice: string;
    endTime: number; // timestamp
    winner?: {
        ticketId: string;
        owner: string;
        amount: string;
    };
    ticketsSold: number;
}

export function LotterySection() {
    // Initial mock data
    const [rounds, setRounds] = useState<LotteryRound[]>([
        {
            id: "1024",
            status: "COMPLETE",
            prizePool: "5000",
            ticketPrice: "5",
            endTime: Date.now() - 100000,
            ticketsSold: 1000,
            winner: {
                ticketId: "8842",
                owner: "0x1234567890abcdef1234567890abcdef12345678",
                amount: "2500"
            }
        },
        {
            id: "1025",
            status: "ACTIVE",
            prizePool: "1250",
            ticketPrice: "5",
            endTime: Date.now() + 30000, // 30 seconds for demo
            ticketsSold: 250
        }
    ]);

    // Simulation Loop
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            setRounds(currentRounds => {
                return currentRounds.map(round => {
                    // Active -> Closed
                    if (round.status === "ACTIVE" && round.endTime <= now) {
                        return { ...round, status: "CLOSED", endTime: now + 5000 }; // 5s drawing time
                    }

                    // Closed -> Complete
                    if (round.status === "CLOSED" && round.endTime <= now) {
                        // Generate random winner
                        const winnerId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                        const prize = (parseInt(round.prizePool) * 0.5).toString(); // 50% to winner

                        return {
                            ...round,
                            status: "COMPLETE",
                            winner: {
                                ticketId: winnerId,
                                owner: `0x${Math.random().toString(16).substr(2, 40)}`,
                                amount: prize
                            }
                        };
                    }

                    return round;
                });
            });

            // Check if we need a new round
            setRounds(currentRounds => {
                const activeRound = currentRounds.find(r => r.status === "ACTIVE");
                const closedRound = currentRounds.find(r => r.status === "CLOSED");

                // If no active or closed round, start the next one or create new
                if (!activeRound && !closedRound) {
                    const lastRoundId = parseInt(currentRounds[currentRounds.length - 1].id);
                    const newRound: LotteryRound = {
                        id: (lastRoundId + 1).toString(),
                        status: "ACTIVE",
                        prizePool: "0",
                        ticketPrice: "5",
                        endTime: Date.now() + 30000, // 30s rounds for demo
                        ticketsSold: 0
                    };

                    // Keep only last 5 rounds + new one
                    const newRounds = [...currentRounds, newRound];
                    if (newRounds.length > 10) {
                        return newRounds.slice(newRounds.length - 10);
                    }
                    return newRounds;
                }

                return currentRounds;
            });

        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleBuyTicket = (amount: string) => {
        setRounds(currentRounds =>
            currentRounds.map(round => {
                if (round.status === "ACTIVE") {
                    const ticketCount = parseInt(amount);
                    const addedPool = ticketCount * parseFloat(round.ticketPrice);
                    return {
                        ...round,
                        ticketsSold: round.ticketsSold + ticketCount,
                        prizePool: (parseFloat(round.prizePool) + addedPool).toString()
                    };
                }
                return round;
            })
        );
    };

    const activeRound = rounds.find(r => r.status === "ACTIVE" || r.status === "CLOSED");
    const historyRounds = rounds.filter(r => r.status === "COMPLETE").reverse();

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            {activeRound && (
                <LotteryHero
                    round={activeRound}
                    onBuyTicket={handleBuyTicket}
                />
            )}

            {/* History Section */}
            <LotteryHistory rounds={historyRounds} />
        </div>
    );
}
