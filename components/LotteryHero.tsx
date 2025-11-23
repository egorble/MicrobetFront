import { useState, useEffect, useRef } from "react";
import { Ticket, Clock, Sparkles, Check, AlertCircle, ArrowRight } from "lucide-react";
import { LotteryRound } from "./LineraProvider";
import { LightningAnimation } from "./LightningAnimation";
import { formatLocalTime } from "../utils/timeUtils";

interface LotteryHeroProps {
    round?: LotteryRound;
    onBuyTicket: (amount: string) => void;
}

export function LotteryHero({ round, onBuyTicket }: LotteryHeroProps) {
    const [timeLeft, setTimeLeft] = useState<string>('00:00');
    const [amount, setAmount] = useState('10');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [lightningActive, setLightningActive] = useState(false);

    // Timer logic
    useEffect(() => {
        if (!round) return;
        const updateTimer = () => {
            const now = Date.now();
            const diff = round.endTime - now;

            // Log timer details for debugging (using Local Time)
            if (Math.floor(now / 1000) % 5 === 0) { // Log every ~5 seconds
                console.log(`[Lottery Timer] Round ${round.id}: Now=${formatLocalTime(now)} (Local), End=${formatLocalTime(round.endTime)} (Local), Diff=${diff}ms`);
            }

            if (diff <= 0) {
                setTimeLeft('00:00');
                return;
            }

            const minutes = Math.floor(diff / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [round?.endTime, round?.id]);

    // Get the latest winner directly from the round data
    // The winners array is sorted by created_at descending (newest first)
    const latestWinner = round?.winners && round.winners.length > 0
        ? round.winners[0]
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: 'info', message: 'Purchasing ticket...' });
        setLightningActive(true);

        // Simulate network delay
        setTimeout(() => {
            onBuyTicket(amount);
            setStatus({ type: 'success', message: 'Tickets Purchased Successfully!' });
            setIsSubmitting(false);
            setLightningActive(false);

            setTimeout(() => {
                setAmount('1');
                setStatus(null);
            }, 3000);
        }, 1500);
    };

    // Trust the backend status. If it says ACTIVE, it is active, even if our local timer thinks it's over.
    const isActive = round?.status === "ACTIVE";
    const isDrawing = round?.status === "DRAWING" || round?.status === "CLOSED";
    const isComplete = round?.status === "COMPLETE";

    if (!round) {
        return (
            <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-xl animate-pulse">
                <div className="relative p-6 sm:p-8 md:p-10">
                    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                        <div className="flex-1 space-y-6 w-full">
                            <div className="h-8 w-32 bg-gray-200 rounded-full"></div>
                            <div className="h-16 w-3/4 bg-gray-200 rounded-xl"></div>
                            <div className="h-6 w-1/2 bg-gray-200 rounded-lg"></div>
                            <div className="flex gap-4">
                                <div className="h-16 w-32 bg-gray-200 rounded-xl"></div>
                                <div className="h-16 w-32 bg-gray-200 rounded-xl"></div>
                            </div>
                        </div>
                        <div className="w-full md:w-96 h-[300px] bg-gray-100 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-xl">
            <LightningAnimation
                isActive={lightningActive}
                onComplete={() => setLightningActive(false)}
            />

            {/* Background Elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            <div className="relative p-6 sm:p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">

                    {/* Left Side: Info & Timer */}
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-600 text-sm font-bold uppercase tracking-wide">
                                {isActive ? (
                                    <>
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        Live Round #{round.id}
                                    </>
                                ) : isDrawing ? (
                                    <>
                                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                                        Live Draw in Progress
                                    </>
                                ) : isComplete ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Round Complete
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-4 h-4" />
                                        Round Closed
                                    </>
                                )}
                            </div>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight">
                                Win <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">{round.prizePool} LNRA</span>
                            </h2>
                            <p className="text-gray-500 text-lg">
                                {isActive ? (
                                    <>Next draw in: <span className="font-mono font-bold text-gray-900">{timeLeft}</span></>
                                ) : isDrawing ? (
                                    <span className="text-red-600 font-bold animate-pulse">Revealing Winners...</span>
                                ) : isComplete ? (
                                    "All prizes distributed"
                                ) : (
                                    "Preparing Draw..."
                                )}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                <div className="text-gray-500 text-xs uppercase font-bold">Ticket Price</div>
                                <div className="text-xl font-bold text-gray-900">{round.ticketPrice} LNRA</div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                <div className="text-gray-500 text-xs uppercase font-bold">Tickets Sold</div>
                                <div className="text-xl font-bold text-gray-900">{round.ticketsSold}</div>
                            </div>
                        </div>

                        {/* How it works - Block Design */}
                        <div className="pt-8 border-t border-gray-100">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                How to Play & Win
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Step 1 */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-gray-900 mb-3 border border-gray-100">1</div>
                                    <h5 className="font-bold text-gray-900 text-sm mb-1">Buy Tickets</h5>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Purchase tickets before the timer ends.
                                    </p>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100 hover:border-red-200 transition-colors relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-red-100 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-red-600 mb-3 border border-red-100 relative z-10">2</div>
                                    <h5 className="font-bold text-gray-900 text-sm mb-1 relative z-10">Watch Live</h5>
                                    <p className="text-xs text-gray-600 leading-relaxed relative z-10">
                                        Don't leave! Winners are picked <strong>live</strong> on-screen.
                                    </p>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-green-50 rounded-xl p-4 border border-green-100 hover:border-green-200 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-green-600 mb-3 border border-green-100">3</div>
                                    <h5 className="font-bold text-gray-900 text-sm mb-1">Instant Win</h5>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Prizes are sent to your wallet immediately.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Action Card or Live Draw */}
                    <div className="w-full md:w-96 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative z-10 min-h-[300px] flex flex-col justify-center">
                        {isActive ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">Purchase</h3>
                                    <p className="text-sm text-gray-500">Enter token amount to spend</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Amount (LNRA)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="1"
                                            step="1"
                                            className="flex-1 text-center py-2 border border-gray-200 rounded-lg font-bold text-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Total Tokens:</span>
                                        <span className="font-bold text-gray-900">{amount} LNRA</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Ticket className="w-5 h-5" />
                                            Buy Tickets
                                        </>
                                    )}
                                </button>

                                {status && (
                                    <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' :
                                        status.type === 'error' ? 'bg-red-50 text-red-700' :
                                            'bg-blue-50 text-blue-700'
                                        }`}>
                                        {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {status.message}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {isDrawing ? "Drawing Winners!" : isComplete ? "Round Complete" : "Round Closed"}
                                    </h3>
                                    <p className="text-gray-500">
                                        {isDrawing ? "Watch the winners appear live below" : isComplete ? "All winners have been paid" : "Check the results below"}
                                    </p>
                                </div>

                                {/* Live Winner Feed - Single Item Display */}
                                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex flex-col h-[180px] relative">
                                    <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between z-10">
                                        <span>Latest Winner</span>
                                        <span>Prize</span>
                                    </div>

                                    <div className="flex-1 flex items-center justify-center p-4 relative">
                                        {latestWinner ? (
                                            <div
                                                key={latestWinner.ticketId}
                                                className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm">
                                                    <Ticket className="w-6 h-6" />
                                                </div>

                                                <div className="flex-1 text-left">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Winning Ticket</div>
                                                    <div className="font-mono font-black text-xl text-gray-900 tracking-tight">
                                                        #{latestWinner.ticketId}
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg font-bold text-sm">
                                                        <Sparkles className="w-3 h-3" />
                                                        <span>+{latestWinner.amount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-400 space-y-2 animate-pulse">
                                                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto"></div>
                                                <div className="text-sm font-medium">Waiting for results...</div>
                                            </div>
                                        )}

                                        {/* Background decoration */}
                                        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
