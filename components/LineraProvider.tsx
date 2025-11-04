import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as linera from '../@linera/client';
import { PrivateKey } from '../@linera/signer';
import { WebSocketClient } from '../utils/WebSocketClient';

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

  // Функція для запиту rounds через HTTP ендпоінт
  const queryRounds = async (endpoint: string): Promise<Round[]> => {
    try {
      const query = `
        query {
          allRounds {
            id
            status
            resolutionPrice
            resolvedAt
            closedAt
            createdAt
            closingPrice
            upBets
            downBets
            result
            prizePool
            upBetsPool
            downBetsPool
          }
        }
      `;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          query: query.trim()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const result = await response.json();
      const rounds = result?.data?.allRounds || [];
      
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
      const btcEndpoint = import.meta.env.VITE_BTC_ENDPOINT;
      const ethEndpoint = import.meta.env.VITE_ETH_ENDPOINT;

      const [btcRounds, ethRounds] = await Promise.all([
        queryRounds(btcEndpoint),
        queryRounds(ethEndpoint)
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

  // Функція для налаштування BTC WebSocket підключення
  const setupBtcWebSocket = () => {
    try {
      // Перевіряємо чи вже існує активне з'єднання
      if (btcWebSocketRef.current && btcWebSocketRef.current.isConnectedStatus()) {
        console.log('BTC WebSocket already connected, skipping setup');
        return;
      }

      const btcChainId = import.meta.env.VITE_BTC_CHAIN_ID;
      const btcWebSocketUrl = import.meta.env.VITE_BTC_WEBSOCKET_URL || 'ws://localhost:8082/ws';
      
      if (!btcChainId) {
        console.error('BTC Chain ID not found in environment variables');
        setState(prev => ({
          ...prev,
          btcWebSocketStatus: '❌ Missing Chain ID'
        }));
        return;
      }

      console.log('Setting up BTC WebSocket:', { btcChainId, btcWebSocketUrl });
      
      btcWebSocketRef.current = new WebSocketClient({
        url: btcWebSocketUrl,
        chainId: btcChainId,
        heartbeatInterval: 30000, // 30 секунд
        onNotification: (notification) => {
          console.log('BTC notification received:', notification);
          setState(prev => ({
            ...prev,
            btcNotifications: [
              notification,
              ...(prev.btcNotifications || []).slice(0, 4) // Зберігаємо останні 5 повідомлень
            ]
          }));
          // Оновлюємо дані після отримання повідомлення
          refreshRounds();
        },
        onError: (error) => {
          console.error('BTC WebSocket error:', error);
          setState(prev => ({
            ...prev,
            btcWebSocketStatus: '❌ Error'
          }));
        },
        onStatusChange: (status) => {
          console.log('BTC WebSocket status changed:', status);
          setState(prev => ({
            ...prev,
            btcWebSocketStatus: status
          }));
        }
      });

      btcWebSocketRef.current.connect();
    } catch (error) {
      console.error('Failed to setup BTC WebSocket:', error);
      setState(prev => ({
        ...prev,
        btcWebSocketStatus: '❌ Setup Failed'
      }));
    }
  };

  // Функція для налаштування ETH WebSocket підключення
  const setupEthWebSocket = () => {
    try {
      // Перевіряємо чи вже існує активне з'єднання
      if (ethWebSocketRef.current && ethWebSocketRef.current.isConnectedStatus()) {
        console.log('ETH WebSocket already connected, skipping setup');
        return;
      }

      const ethChainId = import.meta.env.VITE_ETH_CHAIN_ID;
      const ethWebSocketUrl = import.meta.env.VITE_ETH_WEBSOCKET_URL || 'ws://localhost:8083/ws';
      
      if (!ethChainId) {
        console.error('ETH Chain ID not found in environment variables');
        setState(prev => ({
          ...prev,
          ethWebSocketStatus: '❌ Missing Chain ID'
        }));
        return;
      }

      console.log('Setting up ETH WebSocket:', { ethChainId, ethWebSocketUrl });
      
      ethWebSocketRef.current = new WebSocketClient({
        url: ethWebSocketUrl,
        chainId: ethChainId,
        heartbeatInterval: 30000, // 30 секунд
        onNotification: (notification) => {
          console.log('ETH notification received:', notification);
          setState(prev => ({
            ...prev,
            ethNotifications: [
              notification,
              ...(prev.ethNotifications || []).slice(0, 4) // Зберігаємо останні 5 повідомлень
            ]
          }));
          // Оновлюємо дані після отримання повідомлення
          refreshRounds();
        },
        onError: (error) => {
          console.error('ETH WebSocket error:', error);
          setState(prev => ({
            ...prev,
            ethWebSocketStatus: '❌ Error'
          }));
        },
        onStatusChange: (status) => {
          console.log('ETH WebSocket status changed:', status);
          setState(prev => ({
            ...prev,
            ethWebSocketStatus: status
          }));
        }
      });

      ethWebSocketRef.current.connect();
    } catch (error) {
      console.error('Failed to setup ETH WebSocket:', error);
      setState(prev => ({
        ...prev,
        ethWebSocketStatus: '❌ Setup Failed'
      }));
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

  // useEffect для налаштування WebSocket підключень
  useEffect(() => {
    // Перевіряємо чи система готова і чи ще не налаштовано WebSocket
    if (state.loading || state.status !== 'Ready') {
      return; // Чекаємо поки система буде готова
    }

    // Перевіряємо чи вже налаштовано WebSocket
    if (webSocketSetupRef.current) {
      return; // Вже налаштовано, не робимо нічого
    }

    console.log('Setting up WebSocket connections...');
    webSocketSetupRef.current = true;
    
    // Налаштовуємо BTC WebSocket
    setupBtcWebSocket();
    
    // Налаштовуємо ETH WebSocket
    setupEthWebSocket();

  }, [state.status, state.loading]); // Залежності: status та loading

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

  // Періодичне оновлення rounds кожну секунду
  useEffect(() => {
    // Початкове завантаження даних
    refreshRounds();

    // Встановлюємо інтервал для оновлення кожну секунду
    const interval = setInterval(() => {
      refreshRounds();
    }, 1000);

    // Очищуємо інтервал при розмонтуванні компонента
    return () => {
      clearInterval(interval);
    };
  }, []); // Порожній масив залежностей - запускається тільки один раз

  return <LineraContext.Provider value={{
    ...state, 
    refreshBalance,
    refreshRounds,
    setActiveTab
  }}>{children}</LineraContext.Provider>;
};