import { useState, useEffect } from "react";
import { LotteryHero } from "./LotteryHero";
import { LotteryHistory } from "./LotteryHistory";

export type LotteryStatus = "ACTIVE" | "CLOSED" | "DRAWING" | "COMPLETE";

export interface Winner {
    ticketId: string;
    owner: string;
    amount: string;
    rank: number; // 1st, 2nd, 3rd...
}

export interface LotteryRound {
    id: string;
    status: LotteryStatus;
    prizePool: string;
    ticketPrice: string;
    endTime: number; // timestamp
    winners: Winner[]; // All generated winners
    revealedWinners: Winner[]; // Winners currently visible
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
            winners: [
                { ticketId: "8842", owner: "0x1234...5678", amount: "2500", rank: 1 },
                { ticketId: "1234", owner: "0xabcd...efgh", amount: "1000", rank: 2 },
                { ticketId: "5678", owner: "0x9876...5432", amount: "500", rank: 3 }
            ],
            revealedWinners: [
                { ticketId: "8842", owner: "0x1234...5678", amount: "2500", rank: 1 },
                { ticketId: "1234", owner: "0xabcd...efgh", amount: "1000", rank: 2 },
                { ticketId: "5678", owner: "0x9876...5432", amount: "500", rank: 3 }
            ]
        },
        {
            id: "1025",
            status: "ACTIVE",
            prizePool: "1250",
            ticketPrice: "5",
            endTime: Date.now() + 30000, // 30 seconds for demo
            ticketsSold: 250,
            winners: [],
            revealedWinners: []
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
                        return { ...round, status: "CLOSED", endTime: now + 3000 }; // 3s pause before drawing
                    }

                    // Closed -> Drawing (Generate Winners)
                    if (round.status === "CLOSED" && round.endTime <= now) {
                        const totalPrize = parseFloat(round.prizePool);
                        const newWinners: Winner[] = [
                            {
                                rank: 1,
                                amount: (totalPrize * 0.5).toFixed(0),
                                ticketId: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
                                owner: `0x${Math.random().toString(16).substr(2, 40)}`
                            },
                            {
                                rank: 2,
                                amount: (totalPrize * 0.3).toFixed(0),
                                ticketId: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
                                owner: `0x${Math.random().toString(16).substr(2, 40)}`
                            },
                            {
                                rank: 3,
                                amount: (totalPrize * 0.1).toFixed(0),
                                ticketId: Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
                                owner: `0x${Math.random().toString(16).substr(2, 40)}`
                            }
                        ];

                        return {
                            ...round,
                            status: "DRAWING",
                            winners: newWinners,
                            revealedWinners: [],
                            endTime: now + 1000 // Start revealing in 1s
                        };
                    }

                    // Drawing Logic (Reveal one by one)
                    if (round.status === "DRAWING" && round.endTime <= now) {
                        const nextIndex = round.revealedWinners.length;

                        // If all revealed, move to COMPLETE
                        if (nextIndex >= round.winners.length) {
                            return { ...round, status: "COMPLETE" };
                        }

                        // Reveal next winner
                        return {
                            ...round,
                            revealedWinners: [...round.revealedWinners, round.winners[nextIndex]],
                            endTime: now + 4000 // 4 seconds between reveals
                        };
                    }

                    return round;
                });
            });

            // Check if we need a new round
            setRounds(currentRounds => {
                const activeRound = currentRounds.find(r => r.status === "ACTIVE" || r.status === "CLOSED" || r.status === "DRAWING");

                // If no active round, start the next one
                if (!activeRound) {
                    const lastRoundId = parseInt(currentRounds[currentRounds.length - 1].id);
                    const newRound: LotteryRound = {
                        id: (lastRoundId + 1).toString(),
                        status: "ACTIVE",
                        prizePool: "0",
                        ticketPrice: "5",
                        endTime: Date.now() + 30000, // 30s rounds
                        ticketsSold: 0,
                        winners: [],
                        revealedWinners: []
                    };

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

    const activeRound = rounds.find(r => r.status === "ACTIVE" || r.status === "CLOSED" || r.status === "DRAWING");
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
