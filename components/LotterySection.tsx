import { useState, useEffect } from "react";
import { LotteryHero } from "./LotteryHero";
import { LotteryHistory } from "./LotteryHistory";
import { supabaseLottery } from "../utils/supabaseClient";
import { useLinera } from "./LineraProvider";
import { parseTimestamp, formatLocalTime } from "../utils/timeUtils";

export type LotteryStatus = "ACTIVE" | "CLOSED" | "DRAWING" | "COMPLETE";

export interface Winner {
    ticketId: string;
    owner: string;
    amount: string;
}

export interface LotteryRound {
    id: string;
    status: LotteryStatus;
    prizePool: string;
    ticketPrice: string;
    endTime: number; // timestamp
    winners: Winner[]; // All generated winners
    ticketsSold: number;
}

export function LotterySection() {
    const { purchaseTickets } = useLinera();
    const { lotteryApplication } = useLinera() as any;
    const [rounds, setRounds] = useState<LotteryRound[]>([]);
    const [latestWinners, setLatestWinners] = useState<Winner[]>([]);
    const [dbRoundsCache, setDbRoundsCache] = useState<any[]>([]);

    const toMs = (v: any): number | null => {
        try { return parseTimestamp(v) } catch { return null }
    };

    useEffect(() => {
        const load = async () => {
            // Fetch rounds descending (newest first)
            const { data: dbRounds } = await supabaseLottery
                .from('lottery_rounds')
                .select('*')
                .order('id', { ascending: false }) // CHANGED: Fetch newest first
                .limit(50);

            const { data: latestWinners } = await supabaseLottery
                .from('lottery_winners')
                .select('round_id,ticket_number,source_chain_id,prize_amount,created_at')
                .order('created_at', { ascending: false })
                .limit(200);

            const winnersByRound = new Map<number, Winner[]>();
            (latestWinners || []).forEach((w: any, idx: number) => {
                const list = winnersByRound.get(Number(w.round_id)) || [];
                list.push({
                    ticketId: String(w.ticket_number),
                    owner: String(w.source_chain_id || 'unknown'),
                    amount: String(w.prize_amount)
                });
                winnersByRound.set(Number(w.round_id), list);
            });

            setDbRoundsCache(dbRounds || [])
            const mapped: LotteryRound[] = (dbRounds || []).map((r: any) => {
                // Log keys to find end_time
                if (r.id === '5' || r.id === 5) {
                    console.log('[Lottery Sync] Round 5 Data:', JSON.stringify(r));
                }

                const createdMs = r.created_at ? (toMs(r.created_at) ?? Date.now()) : Date.now();

                // Try to find a valid end time from DB, otherwise fallback to 5 mins
                // Checking common names: end_time, closed_at, scheduled_at
                const dbEndTime = r.end_time || r.closed_at || r.scheduled_end_time;
                const endMs = dbEndTime ? (toMs(dbEndTime) ?? (createdMs + 5 * 60 * 1000)) : (createdMs + 5 * 60 * 1000);

                const winners = winnersByRound.get(Number(r.id)) || [];
                let statusUpper = String(r.status).toUpperCase() as LotteryStatus;

                // REMOVED: Client-side status override. Trust the DB status.
                // if (statusUpper === 'ACTIVE' && endMs <= Date.now()) {
                //    statusUpper = 'CLOSED';
                // }

                // const revealed = statusUpper === 'COMPLETE' ? winners : [];
                return {
                    id: String(r.id),
                    status: statusUpper,
                    prizePool: String(r.prize_pool),
                    ticketPrice: String(r.ticket_price),
                    endTime: endMs,
                    ticketsSold: Number(r.total_tickets_sold || 0),
                    winners,
                };
            });

            // Log latest round from DB for debugging
            if (mapped.length > 0) {
                const latest = mapped[0];
                console.log(`[Lottery Sync] Latest DB Round: ID=${latest.id}, Status=${latest.status}, EndTime=${formatLocalTime(latest.endTime)} (Local)`);
            }

            setRounds(mapped);

            const latest20: Winner[] = (latestWinners || []).slice(0, 20).map((w: any, idx: number) => ({
                ticketId: String(w.ticket_number),
                owner: String(w.source_chain_id || 'unknown'),
                amount: String(w.prize_amount)
            }))
            setLatestWinners(latest20)
        };

        load();

        const chRounds = supabaseLottery
            .channel('lottery_rounds_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lottery_rounds' }, load)
            .subscribe();
        const chWinners = supabaseLottery
            .channel('lottery_winners_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lottery_winners' }, load)
            .subscribe();
        return () => {
            supabaseLottery.removeChannel(chRounds);
            supabaseLottery.removeChannel(chWinners);
        };
    }, []);

    // Reveal winners one by one every 10 seconds while drawing
    // Reveal logic moved to LotteryHero
    // useEffect(() => { ... }, [rounds.length]);

    useEffect(() => {
        const loadGraphQL = async () => {
            if (!lotteryApplication) return;
            const q = {
                query: `query { allRounds { id status ticketPrice totalTicketsSold prizePool createdAt closedAt } }`
            };
            const res = await lotteryApplication.query(JSON.stringify(q));
            const parsed = typeof res === 'string' ? JSON.parse(res) : res;
            const list = parsed?.data?.allRounds || [];
            const mapped: LotteryRound[] = list.map((r: any) => {
                const createdMs = r.createdAt ? (toMs(r.createdAt) ?? Date.now()) : Date.now();
                const endMs = createdMs + 5 * 60 * 1000;
                return {
                    id: String(r.id),
                    status: ((): LotteryStatus => {
                        const su = String(r.status).toUpperCase() as LotteryStatus;
                        if (su === 'ACTIVE' && endMs <= Date.now()) return 'CLOSED';
                        return su;
                    })(),
                    prizePool: String(r.prizePool),
                    ticketPrice: String(r.ticketPrice),
                    endTime: endMs,
                    ticketsSold: Number(r.totalTicketsSold || 0),
                    winners: [],
                };
            });

            // Prefer latest non-COMPLETE as active
            // Since we fetch all, sort descending by ID
            const activeCandidate = mapped
                .filter(r => r.status === 'ACTIVE' || r.status === 'CLOSED' || r.status === 'DRAWING')
                .sort((a, b) => Number(b.id) - Number(a.id))[0]

            let combined = (dbRoundsCache || []).map((r: any) => {
                const createdMs = r.created_at ? (toMs(r.created_at) ?? Date.now()) : Date.now();
                const endMs = createdMs + 5 * 60 * 1000;
                const statusUpper = String(r.status).toUpperCase() as LotteryStatus;
                const winners: Winner[] = []
                // const revealed = statusUpper === 'COMPLETE' ? winners : [];
                return {
                    id: String(r.id),
                    status: statusUpper,
                    prizePool: String(r.prize_pool),
                    ticketPrice: String(r.ticket_price),
                    endTime: endMs,
                    ticketsSold: Number(r.total_tickets_sold || 0),
                    winners,
                } as LotteryRound
            })

            if (activeCandidate) {
                console.log('[Lottery Sync] GraphQL Active Candidate:', activeCandidate.id, activeCandidate.status);
                const idx = combined.findIndex(rr => rr.id === activeCandidate.id)
                if (idx >= 0) {
                    combined[idx] = { ...combined[idx], ...activeCandidate }
                } else {
                    combined.unshift(activeCandidate)
                }
            }

            // Ensure combined list is sorted descending by ID
            combined.sort((a, b) => Number(b.id) - Number(a.id));

            setRounds(combined)
        };
        loadGraphQL();
    }, [lotteryApplication, dbRoundsCache]);

    const handleBuyTicket = async (amountTokens: string) => {
        if (!purchaseTickets) return;
        await purchaseTickets(amountTokens);
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
            <LotteryHistory rounds={historyRounds} latest={latestWinners} />
        </div>
    );
}
