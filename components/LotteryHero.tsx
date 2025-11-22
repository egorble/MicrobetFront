import { useState, useEffect, useRef } from "react";
import { Ticket, Clock, Sparkles, Check, AlertCircle, ArrowRight } from "lucide-react";
import { LotteryRound } from "./LotterySection";
import { LightningAnimation } from "./LightningAnimation";

interface LotteryHeroProps {
    round: LotteryRound;
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
        const updateTimer = () => {
            const now = Date.now();
            const diff = round.endTime - now;

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
    }, [round.endTime]);

    // Auto-scroll to bottom of winner list
    useEffect(() => {
        if (round.status === "DRAWING" && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [round.revealedWinners.length, round.status]);

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

    const isActive = round.status === "ACTIVE" && (round.endTime - Date.now() > 0);
    const isDrawing = round.status === "DRAWING" || round.status === "CLOSED";

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
                                        <span className="font-bold text-red-600">{parseFloat(amount || '0').toFixed(2)} LNRA</span>
                                    </div>
                                </div>

                                {status && (
                                    <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' :
                                        status.type === 'error' ? 'bg-red-50 text-red-700' :
                                            'bg-blue-50 text-blue-700'
                                        }`}>
                                        {status.type === 'success' ? <Check className="w-4 h-4 mt-0.5" /> :
                                            status.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5" /> :
                                                <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                                        <span>{status.message}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !amount}
                                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Processing...' : (
                                        <>
                                            Buy Tickets <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : isDrawing ? (
                            <div className="space-y-4">
                                <div className="text-center mb-2">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                                        <Sparkles className="w-5 h-5 text-yellow-500" />
                                        Live Draw
                                    </h3>
                                </div>

                                <div
                                    ref={scrollRef}
                                    className="space-y-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scroll-smooth"
                                >
                                    {round.revealedWinners.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 animate-pulse">
                                            Selecting winners...
                                        </div>
                                    ) : (
                                        round.revealedWinners.map((winner, index) => (
                                            <div
                                                key={winner.ticketId}
                                                className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-300 flex items-center gap-3"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                                    <Ticket className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-gray-500">Ticket #{winner.ticketId}</div>
                                                    <div className="font-mono text-sm font-medium truncate" title={winner.owner}>
                                                        {winner.owner.slice(0, 6)}...{winner.owner.slice(-4)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">Won</div>
                                                    <div className="font-bold text-green-600">{winner.amount}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {round.revealedWinners.length < round.winners.length && (
                                        <div className="text-center py-2 text-sm text-gray-400 animate-pulse">
                                            Revealing next winner...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-20 h-20 mx-auto bg-amber-50 rounded-full flex items-center justify-center animate-pulse">
                                    <Clock className="w-10 h-10 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Drawing Winner</h3>
                                    <p className="text-gray-500">Please wait a moment...</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
