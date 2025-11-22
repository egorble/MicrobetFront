import { LotteryRound, Winner } from "./LotterySection";
import { Trophy } from "lucide-react";
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {latest.map((winner, idx) => (
                                    <div key={`${winner.ticketId}-${winner.owner}-${idx}`} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-red-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                                                <Trophy className="w-4 h-4" />
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

                                    {/* All Winners Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {round.winners.map((winner) => (
                                            <div key={winner.ticketId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-red-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                                                        <Trophy className="w-4 h-4" />
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

                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
