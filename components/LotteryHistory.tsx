import { LotteryRound, Winner } from "./LotterySection";
import { Trophy, Clock, Ticket, BarChart3, Users, Coins, ArrowUpRight } from "lucide-react";
import { formatLocalTime } from "../utils/timeUtils";
import { useMemo } from "react";

interface LotteryHistoryProps {
    rounds: LotteryRound[];
    latest?: Winner[];
}

export function LotteryHistory({ rounds, latest }: LotteryHistoryProps) {
    const feed = useMemo(() => {
        const allWinners: { winner: Winner; roundId: string; time: number }[] = [];

        if (latest) {
            latest.forEach(w => {
                allWinners.push({ winner: w, roundId: 'Live', time: Date.now() });
            });
        }

        rounds.forEach(r => {
            r.winners.forEach(w => {
                allWinners.push({ winner: w, roundId: r.id, time: r.endTime });
            });
        });

        const seen = new Set();
        const byTime = allWinners
            .filter(item => {
                const key = `${item.winner.ticketId}-${item.winner.owner}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => b.time - a.time)
            .slice(0, 100);

        const totalVolume = rounds.reduce((acc, r) => acc + parseFloat(r.prizePool), 0);

        return { recent: byTime, totalVolume };
    }, [rounds, latest]);

    return (
        <div className="space-y-8">
            {/* Premium Stats Bar */}
            <div className="bg-black rounded-3xl p-1 shadow-2xl shadow-gray-200/50">
                <div className="bg-gray-900/50 rounded-[20px] p-6 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                    <div className="flex items-center gap-5 px-4">
                        <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/20">
                            <BarChart3 className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Rounds</div>
                            <div className="text-3xl font-black text-white tracking-tight">{rounds.length}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 px-4 pt-6 md:pt-0">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Winners</div>
                            <div className="text-3xl font-black text-white tracking-tight">{feed.recent.length}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 px-4 pt-6 md:pt-0">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white">
                            <Coins className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Distributed</div>
                            <div className="text-3xl font-black text-white tracking-tight">
                                {feed.totalVolume.toLocaleString()} <span className="text-lg font-bold text-red-500">LNRA</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Feed */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden flex flex-col h-[700px]">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                            <Clock className="w-6 h-6 text-red-600" />
                            Live Winners Feed
                        </h3>
                        <p className="text-sm text-gray-400 font-medium mt-1">Real-time lottery results</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full border border-red-100">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                        </span>
                        <span className="text-xs font-bold text-red-700 tracking-wide">LIVE</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {feed.recent.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                            <Trophy className="w-16 h-16 opacity-20" />
                            <p className="font-medium">Waiting for the first winner...</p>
                        </div>
                    ) : (
                        feed.recent.map((item, idx) => (
                            <div
                                key={`${item.winner.ticketId}-${idx}`}
                                className="group relative bg-white rounded-2xl p-5 border border-gray-100 hover:border-red-100 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${idx === 0 ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-red-600'
                                        }`}>
                                        <Trophy className="w-6 h-6" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-gray-900 text-xl tracking-tight">
                                                    {item.winner.amount} <span className="text-sm text-gray-400 font-bold">LNRA</span>
                                                </span>
                                                {item.roundId !== 'Live' && (
                                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                                        Round #{item.roundId}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                                {item.roundId === 'Live' ? 'Just now' : formatLocalTime(item.time)}
                                                {idx === 0 && <span className="flex h-2 w-2 rounded-full bg-red-500 ml-1"></span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-mono text-xs font-medium text-gray-600">
                                                    {item.winner.owner.slice(0, 6)}...{item.winner.owner.slice(-4)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                                <Ticket className="w-3.5 h-3.5" />
                                                <span>Ticket #{item.winner.ticketId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-5 top-1/2 -translate-y-1/2">
                                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
