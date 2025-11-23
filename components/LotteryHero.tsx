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

    const scrollRef = useRef<HTMLDivElement>(null);

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

    const [displayedWinners, setDisplayedWinners] = useState<any[]>([]);
    const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset displayed winners when round changes
    useEffect(() => {
        setDisplayedWinners([]);
    }, [round?.id]);

    // Handle reveal animation locally
    useEffect(() => {
        if (!round) return;
        const isDrawing = round.status === 'DRAWING' || round.status === 'CLOSED';
        if (!isDrawing) {
            setDisplayedWinners([]);
            return;
        }

        // If we already have all winners displayed, stop
        if (displayedWinners.length >= round.winners.length) {
            return;
        }

        // Start revealing if not already started
        if (!revealTimerRef.current) {
            revealTimerRef.current = setInterval(() => {
                setDisplayedWinners(current => {
                    if (current.length >= round.winners.length) {
                        if (revealTimerRef.current) {
                            clearInterval(revealTimerRef.current);
                            revealTimerRef.current = null;
                        }
                        return current;
                    }
                    const nextIndex = current.length;
                    return [...current, round.winners[nextIndex]];
                });
            }, 2000); // Reveal every 2 seconds
        }

        return () => {
            if (revealTimerRef.current) {
                clearInterval(revealTimerRef.current);
                revealTimerRef.current = null;
            }
        };
    }, [round?.status, round?.winners, displayedWinners.length]);

    // Auto-scroll to bottom of winner list
    useEffect(() => {
        if (round && (round.status === "DRAWING" || round.status === "CLOSED") && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [displayedWinners.length, round?.status]);

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

                        {/* How it works / Real-time Badge */}
                        <div className="pt-6 border-t border-gray-100 space-y-4">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                How to Play & Win
                            </h4>

                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">1</div>
                                    <p className="text-sm text-gray-600">
                                        <strong>Buy Tickets:</strong> Purchase as many tickets as you want before the round ends.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">2</div>
                                    <p className="text-sm text-gray-600">
                                        <strong>Watch Live:</strong> Don't leave! Watch the <strong>Real-Time Draw</strong> right here. Winners are selected instantly on-chain.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">3</div>
                                    <p className="text-sm text-gray-600">
                                        <strong>Instant Payout:</strong> If you win, prizes are sent directly to your wallet immediately.
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
                                        {isDrawing ? "Drawing Winners!" : "Round Closed"}
                                    </h3>
                                    <p className="text-gray-500">
                                        {isDrawing ? "Watch the winners appear live below" : "Check the results below"}
                                    </p>
                                </div>

                                {/* Live Winner Feed */}
                                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex flex-col h-[200px]">
                                    <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                                        <span>Ticket #</span>
                                        <span>Prize</span>
                                    </div>
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-2 space-y-2 scroll-smooth"
                                    >
                                        {displayedWinners.map((winner, idx) => (
                                            <div key={`${winner.ticketId}-${idx}`} className="flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-100 animate-in slide-in-from-bottom-2 fade-in duration-500">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                                        <Ticket className="w-3 h-3" />
                                                    </div>
                                                    <span className="font-mono font-bold text-gray-900">#{winner.ticketId}</span>
                                                </div>
                                                <span className="font-bold text-green-600">+{winner.amount} LNRA</span>
                                            </div>
                                        ))}
                                        {displayedWinners.length === 0 && (
                                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                                                Waiting for results...
                                            </div>
                                        )}
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
