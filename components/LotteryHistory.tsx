import { LotteryRound } from "./LotterySection";
import { Trophy, ExternalLink, Users } from "lucide-react";
import { formatLocalTime } from "../utils/timeUtils";

interface LotteryHistoryProps {
    rounds: LotteryRound[];
}

export function LotteryHistory({ rounds }: LotteryHistoryProps) {
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
                    <div className="p-8 text-center text-gray-500">
                        No completed rounds yet.
                    </div>
                ) : (
                    rounds.map((round) => (
                        <div key={round.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col gap-4">

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

                                {/* Winners List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {round.winners.map((winner) => (
                                        <div key={winner.ticketId} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${winner.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                                    winner.rank === 2 ? "bg-gray-100 text-gray-700" :
                                                        "bg-orange-100 text-orange-700"
                                                }`}>
                                                #{winner.rank}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-mono text-xs font-medium text-gray-900 flex items-center gap-1">
                                                    {winner.owner.slice(0, 6)}...{winner.owner.slice(-4)}
                                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                                </div>
                                                <div className="text-xs text-green-600 font-bold">
                                                    +{winner.amount} LNRA
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
