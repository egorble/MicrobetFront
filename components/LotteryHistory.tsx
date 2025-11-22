import { LotteryRound } from "./LotterySection";
import { Trophy, ExternalLink } from "lucide-react";
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
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                {/* Round Info */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold text-yellow-700 text-sm">#{round.id}</span>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Ended {formatLocalTime(round.endTime)}
                                        </div>
                                        <div className="font-medium text-gray-900">
                                            Prize Pool: <span className="text-green-600 font-bold">{round.prizePool} LNRA</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Winner Info */}
                                {round.winner && (
                                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Winner</div>
                                            <div className="font-mono text-sm font-medium text-gray-900 flex items-center gap-1">
                                                {round.winner.owner.slice(0, 6)}...{round.winner.owner.slice(-4)}
                                                <ExternalLink className="w-3 h-3 text-gray-400" />
                                            </div>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200 mx-1"></div>
                                        <div className="text-left">
                                            <div className="text-xs text-gray-500">Won</div>
                                            <div className="font-bold text-green-600">{round.winner.amount} LNRA</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
