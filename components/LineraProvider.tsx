import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { WebSocketClient } from '../utils/WebSocketClient';
import { supabase } from '../utils/supabaseClient';

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

interface LineraContextType {
  client?: linera.Client;
  wallet?: linera.Wallet;
  chainId?: string;
  application?: linera.Application; // Deprecated - use btcApplication or ethApplication
  btcApplication?: linera.Application;
  ethApplication?: linera.Application;
  accountOwner?: string;
  balance?: string;
  loading: boolean;
  status: 'Loading' | 'Creating Wallet' | 'Creating Client' | 'Creating Chain' | 'Ready';
  error?: Error;
  refreshBalance?: () => Promise<void>;
  subscriptionStatus?: string;
  notifications?: string[];
  // New fields for multi-chain support
  activeTab?: 'btc' | 'eth';
  btcRounds?: Round[];
  ethRounds?: Round[];
  setActiveTab?: (tab: 'btc' | 'eth') => void;
  refreshRounds?: () => Promise<void>;
  // WebSocket statuses
  btcWebSocketStatus?: string;
  ethWebSocketStatus?: string;
  btcNotifications?: string[];
  ethNotifications?: string[];
}

const LineraContext = createContext<LineraContextType>({ 
  loading: true, 
  status: 'Loading' 
});

export const useLinera = () => useContext(LineraContext);

export const LineraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LineraContextType>({ 
    loading: true, 
    status: 'Loading',
    subscriptionStatus: '',
    notifications: [],
    activeTab: 'btc',
    btcRounds: [],
    ethRounds: [],
    btcWebSocketStatus: '🔴 Disconnected',
    ethWebSocketStatus: '🔴 Disconnected',
    btcNotifications: [],
    ethNotifications: []
  });
  const initRef = useRef(false);
  const subscriptionRef = useRef<any>(null); // Для зберігання subscription
  const btcWebSocketRef = useRef<WebSocketClient | null>(null);
  const ethWebSocketRef = useRef<WebSocketClient | null>(null);
  const webSocketSetupRef = useRef(false); // Для відстеження чи налаштовані WebSocket'и
  const refreshTimerRef = useRef<number | null>(null);

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


  // Функція для зміни активної вкладки
  const setActiveTab = (tab: 'btc' | 'eth') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    async function initLinera() {
      try {
        // 1. Ініціалізація WASM з кращою обробкою помилок
        console.log('Linera init: loading WASM');
        setState(prev => ({ ...prev, status: 'Loading' }));
        
        try {
          await linera.default();
        } catch (wasmError) {
          console.warn('WASM loading warning:', wasmError);
          // Спробуємо ще раз через невелику затримку
          await new Promise(resolve => setTimeout(resolve, 1000));
          await linera.default();
        }

        // 2. Отримання конфігурації
        const faucetUrl = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';
        const btcApplicationId = import.meta.env.VITE_BTC_APPLICATION_ID || 'btc_app_id_here';
        const ethApplicationId = import.meta.env.VITE_ETH_APPLICATION_ID || 'eth_app_id_here';

        // 3. Створення або отримання мнемоніки
        let mnemonic = localStorage.getItem('linera_mnemonic');
        if (!mnemonic) {
          const { ethers } = await import('ethers');
          mnemonic = ethers.Wallet.createRandom().mnemonic!.phrase;
          localStorage.setItem('linera_mnemonic', mnemonic);
        }

        // 4. Створення signer та faucet
        const signer = PrivateKey.fromMnemonic(mnemonic);
        const faucet = new linera.Faucet(faucetUrl);
        const owner = signer.address();

        // 5. Створення wallet та chain
        setState(prev => ({ ...prev, status: 'Creating Wallet' }));
        const wallet = await faucet.createWallet();
        const chainId = await faucet.claimChain(wallet, owner);

        // 6. Створення client та applications
        setState(prev => ({ ...prev, status: 'Creating Client' }));
        const clientInstance = await new linera.Client(wallet, signer, false);
        const btcApplication = await clientInstance.frontend().application(btcApplicationId);
        const ethApplication = await clientInstance.frontend().application(ethApplicationId);

        // 7. Запит початкового балансу перед mint (використовуємо BTC application для балансу)
        console.log('Querying initial balance...');
        const initialBalance = await queryBalance(btcApplication, owner);
        console.log('Initial balance:', initialBalance);

        // 8. Виконання mint мутації тільки якщо баланс = 0
        if (parseFloat(initialBalance) === 0) {
          console.log('Balance is 0, executing mint mutation...');
          try {
            const mutation = `
              mutation {
                mint(
                  owner: "${owner}",
                  amount: "5"
                )
              }
            `;
            
            const mintResult = await btcApplication.query(JSON.stringify({ query: mutation }));
            console.log('Mint mutation result:', mintResult);
            
            // Запитуємо баланс знову після mint
            const balanceAfterMint = await queryBalance(btcApplication, owner);
            console.log('Balance after mint:', balanceAfterMint);
            
            // 9. Оновлення стану з новим балансом
            setState(prev => ({
              ...prev,
              client: clientInstance,
              wallet,
              chainId,
              application: btcApplication, // Deprecated - для зворотної сумісності
              btcApplication,
              ethApplication,
              accountOwner: owner,
              balance: balanceAfterMint,
              loading: false,
              status: 'Ready',
            }));
          } catch (mintError) {
            console.warn('Mint mutation failed:', mintError);
            // Продовжуємо з початковим балансом навіть якщо mint не вдався
            setState(prev => ({
              ...prev,
              client: clientInstance,
              wallet,
              chainId,
              application: btcApplication, // Deprecated - для зворотної сумісності
              btcApplication,
              ethApplication,
              accountOwner: owner,
              balance: initialBalance,
              loading: false,
              status: 'Ready',
            }));
          }
        } else {
          console.log('Balance is not 0, skipping mint mutation');
          // 9. Оновлення стану з існуючим балансом
          setState(prev => ({
            ...prev,
            client: clientInstance,
            wallet,
            chainId,
            application: btcApplication, // Deprecated - для зворотної сумісності
            btcApplication,
            ethApplication,
            accountOwner: owner,
            balance: initialBalance,
            loading: false,
            status: 'Ready',
          }));
        }

      } catch (err) {
        console.error('Linera init error', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }));
      }
    }
    
    initLinera();
  }, []);

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
               console.log('New block detected, refreshing balance...');
               
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

            // Add notification to the list for display
            const timestamp = new Date().toLocaleTimeString();
            const notificationText = `[${timestamp}] ${notification.reason?.NewBlock ? 'New Block' : 'Chain notification'}: ${JSON.stringify(notification)}`;

            setState(prev => ({
              ...prev,
              notifications: [...(prev.notifications || []), notificationText].slice(-5) // Keep last 5
            }));
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
    setActiveTab
  }}>{children}</LineraContext.Provider>;
};