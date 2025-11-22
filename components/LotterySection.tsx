import { useState, useEffect } from "react";
import { LotteryHero } from "./LotteryHero";
import { LotteryHistory } from "./LotteryHistory";
import { supabaseLottery } from "../utils/supabaseClient";
import { useLinera } from "./LineraProvider";

export type LotteryStatus = "ACTIVE" | "CLOSED" | "DRAWING" | "COMPLETE";

export interface Winner {
    ticketId: string;
    owner: string;
    amount: string;
    rank: number; // 1st, 2nd, 3rd...
}

export interface LotteryRound {
    id: string;
    status: LotteryStatus;
    prizePool: string;
    ticketPrice: string;
    endTime: number; // timestamp
    winners: Winner[]; // All generated winners
    revealedWinners: Winner[]; // Winners currently visible
    ticketsSold: number;
}

export function LotterySection() {
    const { purchaseTickets } = useLinera();
    const { lotteryApplication } = useLinera() as any;
    const [rounds, setRounds] = useState<LotteryRound[]>([]);
    const [latestWinners, setLatestWinners] = useState<Winner[]>([]);

    useEffect(() => {
        const load = async () => {
            const { data: dbRounds } = await supabaseLottery
                .from('lottery_rounds')
                .select('*')
                .order('id', { ascending: true })
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
                    rank: list.length + 1,
                    ticketId: String(w.ticket_number),
                    owner: String(w.source_chain_id || 'unknown'),
                    amount: String(w.prize_amount)
                });
                winnersByRound.set(Number(w.round_id), list);
            });

            const mapped: LotteryRound[] = (dbRounds || []).map((r: any) => {
                const createdMs = r.created_at ? new Date(r.created_at).getTime() : Date.now();
                const endMs = createdMs + 5 * 60 * 1000;
                const winners = winnersByRound.get(Number(r.id)) || [];
                return {
                    id: String(r.id),
                    status: String(r.status).toUpperCase() as LotteryStatus,
                    prizePool: String(r.prize_pool),
                    ticketPrice: String(r.ticket_price),
                    endTime: endMs,
                    ticketsSold: Number(r.total_tickets_sold || 0),
                    winners,
                    revealedWinners: winners
                };
            });

            setRounds(mapped);

            const latest20: Winner[] = (latestWinners || []).slice(0, 20).map((w: any, idx: number) => ({
                rank: idx + 1,
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
                const createdMs = r.createdAt ? Date.parse(r.createdAt) : Date.now();
                const endMs = createdMs + 5 * 60 * 1000;
                return {
                    id: String(r.id),
                    status: String(r.status).toUpperCase() as LotteryStatus,
                    prizePool: String(r.prizePool),
                    ticketPrice: String(r.ticketPrice),
                    endTime: endMs,
                    ticketsSold: Number(r.totalTicketsSold || 0),
                    winners: [],
                    revealedWinners: []
                };
            });
            if (!mapped.length) return;
            setRounds(mapped);
        };
        if (rounds.length === 0) {
            loadGraphQL();
        }
    }, [lotteryApplication, rounds.length]);

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
