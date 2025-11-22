import { LotteryRound, Winner } from "./LotterySection";
import { Trophy, Clock, Ticket, TrendingUp, Crown } from "lucide-react";
import { formatLocalTime } from "../utils/timeUtils";
import { useMemo } from "react";

interface LotteryHistoryProps {
    rounds: LotteryRound[];
    latest?: Winner[];
}

export function LotteryHistory({ rounds, latest }: LotteryHistoryProps) {
    // Flatten all winners from history rounds + latest winners into a single feed
    const feed = useMemo(() => {
        const allWinners: { winner: Winner; roundId: string; time: number }[] = [];

        // Add latest winners (assume they are recent)
        if (latest) {
            latest.forEach(w => {
                allWinners.push({ winner: w, roundId: 'Live', time: Date.now() });
            });
        }

        // Add winners from past rounds
        rounds.forEach(r => {
            r.winners.forEach(w => {
                allWinners.push({ winner: w, roundId: r.id, time: r.endTime });
            });
        });

        // Sort by amount (descending) for "Big Wins"
        const byAmount = [...allWinners].sort((a, b) => parseFloat(b.winner.amount) - parseFloat(a.winner.amount));
        const topWins = byAmount.slice(0, 3);

        // Sort by time (newest first) for the feed, removing duplicates based on ticketId
        const seen = new Set();
        const byTime = allWinners
            .filter(item => {
                const key = `${item.winner.ticketId}-${item.winner.owner}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.time - a.time)
            .slice(0, 50); // Keep last 50

        return { topWins, recent: byTime };
    }, [rounds, latest]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Big Wins Highlight */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                            <Crown className="w-6 h-6 text-yellow-200" />
                            Biggest Wins
                        </h3>
                        <div className="space-y-4">
                            {feed.topWins.map((item, idx) => (
                                <div key={`${item.winner.ticketId}-${idx}`} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex items-center gap-4">
                                    <div className="text-2xl font-bold text-yellow-200">#{idx + 1}</div>
                                    <div>
                                        <div className="text-2xl font-black">{item.winner.amount} <span className="text-sm font-medium opacity-75">LNRA</span></div>
                                        <div className="text-xs opacity-75 font-mono">
                                            {item.winner.owner.slice(0, 6)}...{item.winner.owner.slice(-4)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {feed.topWins.length === 0 && (
                                <div className="text-center opacity-50 py-4">No big wins yet</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs text-gray-500 uppercase font-bold">Total Rounds</div>
                            <div className="text-2xl font-black text-gray-900">{rounds.length}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs text-gray-500 uppercase font-bold">Total Winners</div>
                            <div className="text-2xl font-black text-gray-900">{feed.recent.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Live Feed */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            Live Winners Feed
                        </h3>
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
                        {feed.recent.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <Trophy className="w-12 h-12 opacity-20" />
                                <p>Waiting for winners...</p>
                            </div>
                        ) : (
                            feed.recent.map((item, idx) => (
                                <div key={`${item.winner.ticketId}-${idx}`} className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                                        <Trophy className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-gray-900 text-lg">{item.winner.amount} LNRA</span>
                                            {item.roundId !== 'Live' && (
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase">
                                                    Round #{item.roundId}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600">
                                                {item.winner.owner.slice(0, 6)}...{item.winner.owner.slice(-4)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span className="flex items-center gap-1 text-xs">
                                                <Ticket className="w-3 h-3" /> #{item.winner.ticketId}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right text-xs text-gray-400 font-medium">
                                        {item.roundId === 'Live' ? 'Just now' : formatLocalTime(item.time)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
