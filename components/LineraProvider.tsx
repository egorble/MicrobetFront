import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import * as linera from '@linera/client';
import { MetaMask } from '@linera/signer';
import { WebSocketClient } from '../utils/WebSocketClient';
import { supabase, supabaseLottery } from '../utils/supabaseClient';
import { parseTimestamp } from '../utils/timeUtils';

// Types for rounds data
interface Round {
  id: number;
  status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
  resolutionPrice: string | null;
  closingPrice: string | null;
  upBets: number;
  downBets: number;
  result: 'UP' | 'DOWN' | null;
  prizePool: string;
  upBetsPool: string;
  downBetsPool: string;
  // Time fields
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  // Calculated fields
  upPayout?: number;
  downPayout?: number;
}

export type LotteryStatus = "ACTIVE" | "CLOSED" | "DRAWING" | "COMPLETE";

export interface Winner {
  roundId: string;
  ticketId: string;
  owner: string;
  amount: string;
  createdAt: number;
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

export interface NotificationItem {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'win';
  amount: string;
  roundId: string;
  ticketId: string;
}

interface LineraContextType {
  client?: linera.Client;
  wallet?: linera.Wallet;
  chainId?: string;
  application?: linera.Application; // Deprecated - use btcApplication or ethApplication
  btcApplication?: linera.Application;
  ethApplication?: linera.Application;
  lotteryApplication?: linera.Application;
  accountOwner?: string;
  balance?: string;
  loading: boolean;
  status: 'Not Connected' | 'Connecting' | 'Loading' | 'Creating Wallet' | 'Creating Client' | 'Creating Chain' | 'Ready';
  error?: Error;
  refreshBalance?: () => Promise<void>;
  subscriptionStatus?: string;
  notifications: NotificationItem[];
  // New fields for multi-chain support
  activeTab?: 'btc' | 'eth';
  btcRounds?: Round[];
  ethRounds?: Round[];
  setActiveTab?: (tab: 'btc' | 'eth') => void;
  refreshRounds?: () => Promise<void>;
  // Lottery Data
  lotteryRounds?: LotteryRound[];
  lotteryWinners?: Winner[];
  refreshLottery?: () => Promise<void>;
  // WebSocket statuses
  btcWebSocketStatus?: string;
  ethWebSocketStatus?: string;
  btcNotifications?: string[];
  ethNotifications?: string[];
  connectWallet?: () => Promise<void>;
  purchaseTickets?: (amountTokens: string) => Promise<void>;
  markAllAsRead?: () => void;
}

const LineraContext = createContext<LineraContextType>({
  loading: false,
  status: 'Not Connected',
  notifications: []
});

export const useLinera = () => useContext(LineraContext);

export const LineraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LineraContextType>({
    loading: false,
    status: 'Not Connected',
    subscriptionStatus: '',
    notifications: [],
    activeTab: 'btc',
    btcRounds: [],
    ethRounds: [],
    btcWebSocketStatus: '🔴 Disconnected',
    ethWebSocketStatus: '🔴 Disconnected',
    btcNotifications: [],
    ethNotifications: [],
    lotteryRounds: [],
    lotteryWinners: []
  });

  const subscriptionRef = useRef<any>(null); // Для зберігання subscription
  const btcWebSocketRef = useRef<WebSocketClient | null>(null);
  const ethWebSocketRef = useRef<WebSocketClient | null>(null);
  const webSocketSetupRef = useRef(false); // Для відстеження чи налаштовані WebSocket'и
  const refreshTimerRef = useRef<number | null>(null);
  const lastLotteryFetchRef = useRef<number>(0);
  const notifiedWinsRef = useRef<Set<string>>(new Set()); // Track notified wins

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lottery_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, notifications: parsed }));
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('lottery_notifications', JSON.stringify(state.notifications));
  }, [state.notifications]);

  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  }, []);

  const toMs = (v: any): number | null => {
    try { return parseTimestamp(v) } catch { return null }
  };

  const scheduleRefreshRounds = () => {
    if (refreshTimerRef.current !== null) return;
    // Дебаунсимо запити до Supabase, щоб уникнути шторму при масових upsert
    refreshTimerRef.current = window.setTimeout(() => {
      refreshRounds?.();
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }, 1000);
  };

  // Функція для запиту балансу
  const queryBalance = async (application: linera.Application, owner: string): Promise<string> => {
    try {
      const query = `
        query {
          accounts {
            entry(key: "${owner}") {
              value
            }
          }
        }
      `;

      const result = await application.query(JSON.stringify({ query }));
      console.log('Balance query result:', result);

      // Парсимо результат
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      const balance = parsedResult?.data?.accounts?.entry?.value || "0";
      return balance;
    } catch (error) {
      console.error('Balance query error:', error);
      return "0";
    }
  };

  // Функція для оновлення балансу (винесена з useEffect)
  const refreshBalance = async () => {
    console.log('refreshBalance called');
    if (state.application && state.accountOwner) {
      console.log('Querying new balance for:', state.accountOwner);
      const newBalance = await queryBalance(state.application, state.accountOwner);
      console.log('New balance received:', newBalance);
      console.log('Current balance:', state.balance);
      setState(prev => {
        console.log('Updating state with new balance:', newBalance);
        return { ...prev, balance: newBalance };
      });
    } else {
      console.log('Cannot refresh balance - missing application or accountOwner');
    }
  };

  // Функція для розрахунку payout коефіцієнтів
  const calculatePayouts = (round: Round): { upPayout: number; downPayout: number } => {
    const totalPool = parseFloat(round.prizePool);
    const upPool = parseFloat(round.upBetsPool);
    const downPool = parseFloat(round.downBetsPool);

    if (totalPool === 0) return { upPayout: 1, downPayout: 1 };

    const upPayout = upPool > 0 ? totalPool / upPool : 1;
    const downPayout = downPool > 0 ? totalPool / downPool : 1;

    return { upPayout, downPayout };
  };

  // Функція для запиту rounds із Supabase
  const queryRounds = async (chain: 'btc' | 'eth'): Promise<Round[]> => {
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('chain', chain)
        .order('id', { ascending: false })
        .limit(500);
      if (error) throw error;
      const roundsDesc = (data || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        resolutionPrice: row.resolution_price != null ? String(row.resolution_price) : null,
        resolvedAt: row.resolved_at,
        closedAt: row.closed_at,
        createdAt: row.created_at,
        closingPrice: row.closing_price != null ? String(row.closing_price) : null,
        upBets: row.up_bets,
        downBets: row.down_bets,
        result: row.result,
        prizePool: String(row.prize_pool),
        upBetsPool: String(row.up_bets_pool),
        downBetsPool: String(row.down_bets_pool),
      })) as Round[];
      const rounds = roundsDesc.slice().sort((a, b) => a.id - b.id);

      // Додаємо розраховані payout коефіцієнти
      return rounds.map((round: Round) => {
        const { upPayout, downPayout } = calculatePayouts(round);
        return { ...round, upPayout, downPayout };
      });
    } catch (error) {
      return [];
    }
  };

  // Функція для оновлення rounds data
  const refreshRounds = async () => {
    try {
      const [btcRounds, ethRounds] = await Promise.all([
        queryRounds('btc'),
        queryRounds('eth')
      ]);

      setState(prev => ({
        ...prev,
        btcRounds,
        ethRounds
      }));
    } catch (error) {
      // Мовчки обробляємо помилку
    }
  };

  // Lottery Fetching Logic
  const refreshLottery = async () => {
    const now = Date.now();
    if (now - lastLotteryFetchRef.current < 1000) {
      return; // Throttled: max 1 request per second
    }
    lastLotteryFetchRef.current = now;

    // 1. Fetch rounds descending (newest first)
    const { data: dbRounds } = await supabaseLottery
      .from('lottery_rounds')
      .select('*')
      .order('id', { ascending: false })
      .limit(50);

    const { data: latestWinners } = await supabaseLottery
      .from('lottery_winners')
      .select('round_id,ticket_number,source_chain_id,prize_amount,created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    const winnersByRound = new Map<number, Winner[]>();
    const seenTickets = new Set<string>();

    (latestWinners || []).forEach((w: any) => {
      const roundId = Number(w.round_id);
      const ticketId = String(w.ticket_number);
      const uniqueKey = `${roundId}-${ticketId}`;
      const createdAt = w.created_at ? (toMs(w.created_at) ?? Date.now()) : Date.now();

      if (seenTickets.has(uniqueKey)) return;
      seenTickets.add(uniqueKey);

      const list = winnersByRound.get(roundId) || [];
      list.push({
        roundId: String(roundId),
        ticketId: ticketId,
        owner: String(w.source_chain_id || 'unknown'),
        amount: String(w.prize_amount),
        createdAt: createdAt
      });
      winnersByRound.set(roundId, list);
    });

    const mappedWinners: Winner[] = [];
    const seenGlobalTickets = new Set<string>();

    (latestWinners || []).forEach((w: any) => {
      const ticketId = String(w.ticket_number);
      const roundId = Number(w.round_id);
      const uniqueKey = `${roundId}-${ticketId}`;
      const createdAt = w.created_at ? (toMs(w.created_at) ?? Date.now()) : Date.now();

      if (seenGlobalTickets.has(uniqueKey)) return;
      if (mappedWinners.length >= 50) return;

      seenGlobalTickets.add(uniqueKey);

      const winnerObj = {
        roundId: String(roundId),
        ticketId: ticketId,
        owner: String(w.source_chain_id || 'unknown'),
        amount: String(w.prize_amount),
        createdAt: createdAt
      };

      mappedWinners.push(winnerObj);

      // Check for personal win
      if (state.chainId && winnerObj.owner === state.chainId) {
        const winKey = `win-${uniqueKey}`;
        if (!notifiedWinsRef.current.has(winKey)) {
          notifiedWinsRef.current.add(winKey);

          const newNotification: NotificationItem = {
            id: crypto.randomUUID(),
            message: `You won ${winnerObj.amount} LNRA in Round #${winnerObj.roundId}!`,
            timestamp: Date.now(),
            read: false,
            type: 'win',
            amount: winnerObj.amount,
            roundId: winnerObj.roundId,
            ticketId: winnerObj.ticketId
          };

          setState(prev => ({
            ...prev,
            notifications: [newNotification, ...prev.notifications].slice(0, 50)
          }));
        }
      }
    });

    // Sync with GraphQL if available
    let combined = (dbRounds || []).map((r: any) => {
      const createdMs = r.created_at ? (toMs(r.created_at) ?? Date.now()) : Date.now();
      const endMs = createdMs + 5 * 60 * 1000;
      const statusUpper = String(r.status).toUpperCase() as LotteryStatus;
      let winners: Winner[] = winnersByRound.get(r.id) || [];

      // Sort winners deterministically to prevent UI duplication during reveal animation
      winners.sort((a, b) => Number(b.ticketId) - Number(a.ticketId));

      return {
        id: String(r.id),
        status: statusUpper,
        prizePool: String(r.prize_pool),
        ticketPrice: String(r.ticket_price),
        endTime: endMs,
        ticketsSold: Number(r.totalTicketsSold || 0),
        winners,
      } as LotteryRound
    });

    if (state.lotteryApplication) {
      try {
        const q = {
          query: `query { allRounds { id status ticketPrice totalTicketsSold prizePool createdAt closedAt } }`
        };
        const res = await state.lotteryApplication.query(JSON.stringify(q));
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        const list = parsed?.data?.allRounds || [];

        const gqlMapped: LotteryRound[] = list.map((r: any) => {
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

        // Find active candidate from GraphQL
        const activeCandidate = gqlMapped
          .filter(r => r.status === 'ACTIVE' || r.status === 'CLOSED' || r.status === 'DRAWING')
          .sort((a, b) => Number(b.id) - Number(a.id))[0];

        if (activeCandidate) {
          const idx = combined.findIndex(rr => rr.id === activeCandidate.id);
          if (idx >= 0) {
            combined[idx] = {
              ...combined[idx],
              ...activeCandidate,
              winners: combined[idx].winners.length > 0 ? combined[idx].winners : activeCandidate.winners
            };
          } else {
            combined.unshift(activeCandidate);
          }
        }
      } catch (e) {
        console.error("GraphQL Sync Error:", e);
      }
    }

    combined.sort((a, b) => Number(b.id) - Number(a.id));

    setState(prev => ({
      ...prev,
      lotteryRounds: combined,
      lotteryWinners: mappedWinners
    }));
  };


  // Функція для зміни активної вкладки
  const setActiveTab = (tab: 'btc' | 'eth') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const connectWallet = async () => {
    try {
      setState(prev => ({ ...prev, status: 'Connecting', loading: true }));
      try {
        await linera.default();
      } catch (wasmError) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await linera.default();
      }
      const faucetUrl = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
      const btcApplicationId = import.meta.env.VITE_BTC_APPLICATION_ID || 'btc_app_id_here';
      const ethApplicationId = import.meta.env.VITE_ETH_APPLICATION_ID || 'eth_app_id_here';
      const lotteryApplicationId = import.meta.env.VITE_LOTTERY_APPLICATION_ID || '';
      let signer: any = new MetaMask();
      const faucet = new linera.Faucet(faucetUrl);
      const owner = await Promise.resolve(signer.address());
      setState(prev => ({ ...prev, status: 'Creating Wallet' }));
      const wallet = await faucet.createWallet();
      const chainId = await faucet.claimChain(wallet, owner);
      setState(prev => ({ ...prev, status: 'Creating Client' }));
      const clientInstance = await new linera.Client(wallet, signer, true);
      const btcApplication = await clientInstance.frontend().application(btcApplicationId);
      const ethApplication = await clientInstance.frontend().application(ethApplicationId);
      const lotteryApplication = lotteryApplicationId ? await clientInstance.frontend().application(lotteryApplicationId) : undefined;
      const initialBalance = await queryBalance(btcApplication, owner);
      if (parseFloat(initialBalance) === 0) {
        try {
          const mutation = `
            mutation {
              mint(
                owner: "${owner}",
                amount: "5"
              )
            }
          `;
          await btcApplication.query(JSON.stringify({ query: mutation }));
          const balanceAfterMint = await queryBalance(btcApplication, owner);
          setState(prev => ({
            ...prev,
            client: clientInstance,
            wallet,
            chainId,
            application: btcApplication,
            btcApplication,
            ethApplication,
            lotteryApplication,
            accountOwner: owner,
            balance: balanceAfterMint,
            loading: false,
            status: 'Ready',
          }));
        } catch {
          setState(prev => ({
            ...prev,
            client: clientInstance,
            wallet,
            chainId,
            application: btcApplication,
            btcApplication,
            ethApplication,
            lotteryApplication,
            accountOwner: owner,
            balance: initialBalance,
            loading: false,
            status: 'Ready',
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          client: clientInstance,
          wallet,
          chainId,
          application: btcApplication,
          btcApplication,
          ethApplication,
          lotteryApplication,
          accountOwner: owner,
          balance: initialBalance,
          loading: false,
          status: 'Ready',
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        status: 'Not Connected',
        error: err as Error,
      }));
    }
  };

  const purchaseTickets = async (amountTokens: string) => {
    if (!state.lotteryApplication || !state.accountOwner) return;
    const chainId = import.meta.env.VITE_LOTTERY_CHAIN_ID || '';
    const targetOwner = import.meta.env.VITE_LOTTERY_TARGET_OWNER || '';
    const mutation = `mutation { transfer(owner: "${state.accountOwner}", amount: "${amountTokens}", targetAccount: { chainId: "${chainId}", owner: "${targetOwner}" }, purchaseTickets: true) }`;
    await state.lotteryApplication.query(JSON.stringify({ query: mutation }));
  };

  // Окремий useEffect для налаштування subscription
  useEffect(() => {
    if (!state.application || !state.accountOwner || state.loading) {
      return; // Чекаємо поки application буде готовий
    }

    // Функція для налаштування subscription
    const setupSubscription = async () => {
      try {
        setState(prev => ({
          ...prev,
          subscriptionStatus: '🔄 Setting up subscription...'
        }));

        console.log('Setting up subscription...');
        console.log('Client object:', state.client);
        console.log('Client methods:', state.client ? Object.getOwnPropertyNames(Object.getPrototypeOf(state.client)) : 'No client');

        // ✅ CORRECT: Use client.onNotification() for reactivity
        if (state.client && state.accountOwner) {
          console.log('Setting up notification callback through client...');

          // Set up notification callback using client.onNotification()
          const unsubscribe = state.client.onNotification((notification: any) => {
            console.log('Received notification:', notification);

            // Check if this is a new block notification (indicates state change)
            if (notification.reason?.NewBlock) {
              const newBlockHeight = Number(notification.reason.NewBlock.height);
              const storageKey = `linera_last_block_${state.chainId}`;
              const lastHeight = Number(localStorage.getItem(storageKey) || '0');

              if (newBlockHeight < lastHeight) {
                console.log(`Ignoring old block notification: ${newBlockHeight} < ${lastHeight}`);
                return;
              }

              // Update stored height
              localStorage.setItem(storageKey, String(newBlockHeight));
              console.log(`Processing new block: ${newBlockHeight}, refreshing balance...`);

              // Refresh balance when new block is detected
              if (state.application && state.accountOwner) {
                queryBalance(state.application, state.accountOwner).then(newBalance => {
                  console.log('Balance updated after new block:', newBalance);

                  // ✅ ВАЖЛИВО: Оновлюємо стан з новим балансом
                  setState(prev => ({
                    ...prev,
                    balance: newBalance
                  }));
                });
              }
            }
          });

          // Store the unsubscribe function
          subscriptionRef.current = { unsubscribe };

          setState(prev => ({
            ...prev,
            subscriptionStatus: '✅ Notification callback active'
          }));

          console.log('Notification callback set up successfully');

          // Initial load of rounds data
          refreshRounds();
        } else {
          console.log('Client or accountOwner not available for notifications');
          setState(prev => ({
            ...prev,
            subscriptionStatus: '⚠️ Notifications not available - missing client or accountOwner'
          }));
        }

      } catch (err) {
        console.error('Notification setup error:', err);
        setState(prev => ({
          ...prev,
          subscriptionStatus: `❌ Notification setup failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        }));
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (subscriptionRef.current?.unsubscribe) {
        try {
          subscriptionRef.current.unsubscribe();
          setState(prev => ({
            ...prev,
            subscriptionStatus: '🔴 Notifications disabled'
          }));
          console.log('Main notification callback removed');
        } catch (err) {
          console.warn('Error removing main notification callback:', err);
        }
      }
    };
  }, [state.client, state.accountOwner, state.loading]); // Dependencies: client, accountOwner and loading

  useEffect(() => {
    if (state.loading || state.status !== 'Ready') {
      return;
    }
    const btcChannel = supabase.channel('rounds_btc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: 'chain=eq.btc' }, () => { scheduleRefreshRounds(); })
      .subscribe();
    const ethChannel = supabase.channel('rounds_eth')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: 'chain=eq.eth' }, () => { scheduleRefreshRounds(); })
      .subscribe();
    return () => {
      supabase.removeChannel(btcChannel)
      supabase.removeChannel(ethChannel)
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  }, [state.status, state.loading])

  // Lottery Subscriptions
  useEffect(() => {
    refreshLottery();

    const chRounds = supabaseLottery
      .channel('lottery_rounds_changes_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lottery_rounds' }, refreshLottery)
      .subscribe();
    const chWinners = supabaseLottery
      .channel('lottery_winners_changes_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lottery_winners' }, refreshLottery)
      .subscribe();

    return () => {
      supabaseLottery.removeChannel(chRounds);
      supabaseLottery.removeChannel(chWinners);
    };
  }, [state.lotteryApplication]); // Re-run when lotteryApplication becomes available to sync GQL

  // Окремий useEffect для cleanup при unmount компонента
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up WebSocket connections...');
      webSocketSetupRef.current = false;

      if (btcWebSocketRef.current) {
        btcWebSocketRef.current.disconnect();
        btcWebSocketRef.current = null;
      }

      if (ethWebSocketRef.current) {
        ethWebSocketRef.current.disconnect();
        ethWebSocketRef.current = null;
      }
    };
  }, []); // Порожній масив залежностей - запускається тільки при unmount

  useEffect(() => {
    refreshRounds();
  }, [])

  return <LineraContext.Provider value={{
    ...state,
    refreshBalance,
    refreshRounds,
    refreshLottery,
    setActiveTab,
    connectWallet,
    purchaseTickets,
    markAllAsRead
  }}>{children}</LineraContext.Provider>;
};