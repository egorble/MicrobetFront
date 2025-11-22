import { LotteryRound, Winner } from "./LotterySection";
import { Trophy, ExternalLink, Crown } from "lucide-react";
import { formatLocalTime } from "../utils/timeUtils";

interface LotteryHistoryProps {
    rounds: LotteryRound[];
    latest?: Winner[];
}

export function LotteryHistory({ rounds, latest }: LotteryHistoryProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Recent Winners
                </h3>
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">History</span>
            </div>

            <div className="divide-y divide-gray-100">
                {rounds.length === 0 ? (
                    <div className="p-4 sm:p-6">
                        {latest && latest.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {latest.map((winner) => (
                                    <div key={`${winner.ticketId}-${winner.owner}`} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                                                #{winner.rank}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-900">{winner.amount} LNRA</div>
                                                <div className="text-xs text-gray-500 font-mono truncate">
                                                    {winner.owner.slice(0, 6)}...{winner.owner.slice(-4)}
                                                </div>
                                                <div className="text-[11px] text-gray-400">Ticket #{winner.ticketId}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">No completed rounds yet.</div>
                        )}
                    </div>
                ) : (
                    rounds.map((round) => {
                        const topWinners = round.winners.slice(0, 3);
                        const otherWinners = round.winners.slice(3);

                        return (
                            <div key={round.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col gap-6">

                                    {/* Round Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                #{round.id}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Ended {formatLocalTime(round.endTime)}
                                            </div>
                                        </div>
                                        <div className="font-medium text-gray-900">
                                            Total Prize: <span className="text-green-600 font-bold">{round.prizePool} LNRA</span>
                                        </div>
                                    </div>

                                    {/* Top 3 Winners */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {topWinners.map((winner) => (
                                            <div key={winner.ticketId} className={`relative overflow-hidden rounded-xl p-4 border ${winner.rank === 1 ? "bg-gradient-to-br from-yellow-50 to-white border-yellow-200" :
                                                    winner.rank === 2 ? "bg-gradient-to-br from-gray-50 to-white border-gray-200" :
                                                        "bg-gradient-to-br from-orange-50 to-white border-orange-200"
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${winner.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                                            winner.rank === 2 ? "bg-gray-100 text-gray-700" :
                                                                "bg-orange-100 text-orange-700"
                                                        }`}>
                                                        <Crown className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${winner.rank === 1 ? "text-yellow-700" :
                                                                winner.rank === 2 ? "text-gray-600" :
                                                                    "text-orange-700"
                                                            }`}>
                                                            {winner.rank === 1 ? "1st Place" : winner.rank === 2 ? "2nd Place" : "3rd Place"}
                                                        </div>
                                                        <div className="font-bold text-lg text-gray-900">{winner.amount} LNRA</div>
                                                        <div className="text-xs text-gray-500 font-mono truncate">
                                                            {winner.owner.slice(0, 6)}...{winner.owner.slice(-4)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Other Winners (Scrollable Grid) */}
                                    {otherWinners.length > 0 && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Other Winners</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                                                {otherWinners.map((winner) => (
                                                    <div key={winner.ticketId} className="bg-white border border-gray-100 rounded-lg p-2 text-center hover:border-gray-300 transition-colors">
                                                        <div className="text-xs text-gray-400 font-medium mb-1">#{winner.rank}</div>
                                                        <div className="font-bold text-green-600 text-sm mb-1">{winner.amount}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono truncate">
                                                            {winner.owner.slice(0, 4)}...{winner.owner.slice(-4)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
