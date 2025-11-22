import { TrendingUp, Wallet, RefreshCw, Clock, ChevronDown, Plus, Minus, Ticket } from "lucide-react";
import { Button } from "./ui/button";
import { useLinera } from "./LineraProvider";
import { useState, useEffect, useRef } from "react";
import { getUserTimezone, formatLocalTime } from "../utils/timeUtils";

interface HeaderProps {
  gameMode: 'prediction' | 'lottery';
  setGameMode: (mode: 'prediction' | 'lottery') => void;
}

export function Header({ gameMode, setGameMode }: HeaderProps) {
  const {
    balance,
    loading,
    accountOwner,
    refreshBalance,
    application,
    status,
    connectWallet
  } = useLinera();
  const [isConnecting, setIsConnecting] = useState(false);
  const connected = !!accountOwner && status === 'Ready';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState(getUserTimezone());

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chainBalance, setChainBalance] = useState<string>("0");
  const [mintAmount, setMintAmount] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showMintInput, setShowMintInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Оновлюємо поточний час кожну секунду
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Закриваємо dropdown при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowMintInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Запитуємо chainBalance при відкритті dropdown
  useEffect(() => {
    if (isDropdownOpen) {
      queryChainBalance();
    }
  }, [isDropdownOpen, application, accountOwner]);

  // Отримуємо інформацію про часовий пояс при завантаженні
  useEffect(() => {
    setTimezone(getUserTimezone());
  }, []);

  // Функція для запиту chainBalance
  const queryChainBalance = async () => {
    if (!application || !accountOwner) return;

    try {
      const query = `
        query {
          accounts {
            entry(key: "${accountOwner}") {
              value
            }
            chainBalance
          }
        }
      `;

      const result = await application.query(JSON.stringify({ query }));
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      const chainBal = parsedResult?.data?.accounts?.chainBalance || "0";
      setChainBalance(chainBal);
    } catch (error) {
      console.error('Chain balance query error:', error);
      setChainBalance("0");
    }
  };

  // Функція для mint
  const handleMint = async () => {
    if (!application || !accountOwner || !mintAmount) return;

    setIsMinting(true);
    try {
      const mutation = `
        mutation {
          mint(
            owner: "${accountOwner}",
            amount: "${mintAmount}"
          )
        }
      `;

      await application.query(JSON.stringify({ query: mutation }));
      if (refreshBalance) {
        await refreshBalance();
      }
      await queryChainBalance();
      setMintAmount("");
      setShowMintInput(false);
    } catch (error) {
      console.error('Mint error:', error);
    } finally {
      setIsMinting(false);
    }
  };

  // Функція для withdraw
  const handleWithdraw = async () => {
    if (!application) return;

    setIsWithdrawing(true);
    try {
      const mutation = `
        mutation {
          withdraw
        }
      `;

      await application.query(JSON.stringify({ query: mutation }));
      if (refreshBalance) {
        await refreshBalance();
      }
      await queryChainBalance();
    } catch (error) {
      console.error('Withdraw error:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Форматування балансу для відображення
  const formatBalance = (balance?: string) => {
    if (!balance) return "0.0000";
    const numBalance = parseFloat(balance);
    return numBalance.toFixed(4);
  };

  // Функція для ручного оновлення балансу
  const handleRefreshBalance = async () => {
    console.log('handleRefreshBalance called');
    console.log('refreshBalance function:', refreshBalance);
    console.log('isRefreshing:', isRefreshing);

    if (!refreshBalance || isRefreshing) {
      console.log('Refresh blocked - no function or already refreshing');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log('Calling refreshBalance...');
      await refreshBalance();
      console.log('refreshBalance completed');
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - MicroBet Title with Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800">MicroBet</h1>
            </div>

            {/* Game Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-lg ml-2">
              <button
                onClick={() => setGameMode('prediction')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${gameMode === 'prediction'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span className="hidden sm:inline">Prediction</span>
              </button>
              <button
                onClick={() => setGameMode('lottery')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${gameMode === 'lottery'
                    ? 'bg-white shadow-sm text-purple-700'
                    : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                <Ticket className="w-3 h-3" />
                <span className="hidden sm:inline">Lottery</span>
                <span className="sm:hidden">Lotto</span>
              </button>
            </div>
          </div>

          {/* Right side - Actions and Wallet */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Current Time and Timezone - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
              <Clock className="w-4 h-4 text-gray-600" />
              <div className="text-sm">
                <div className="text-gray-800 font-medium">
                  {formatLocalTime(currentTime)}
                </div>
                <div className="text-xs text-gray-500">
                  {timezone.offsetString}
                </div>
              </div>
            </div>

            {/* Connect Wallet Button (shown when not connected) */}
            {!connected && (
              <Button
                onClick={async () => {
                  if (!connectWallet || isConnecting) return;
                  setIsConnecting(true);
                  try {
                    await connectWallet();
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isConnecting || loading}
              >
                {isConnecting || loading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}

            {/* Wallet Dropdown */}
            {connected && (
              <div className="relative" ref={dropdownRef}>
                <div
                  className="flex items-center gap-1 sm:gap-2 bg-red-50 px-2 sm:px-4 py-2 rounded-full border border-red-200 cursor-pointer hover:bg-red-100 transition-colors touch-target"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                  <div className="hidden sm:block">
                    <div className="text-red-600 text-sm">
                      {loading ? "Loading..." : `${formatBalance(balance)} LNRA`}
                    </div>
                    <div className="text-xs text-red-500">
                      {accountOwner ? `${accountOwner.slice(0, 6)}...${accountOwner.slice(-4)}` : "WALLET"}
                    </div>
                  </div>
                  <div className="sm:hidden">
                    <div className="text-red-600 text-xs font-medium">
                      {loading ? "..." : formatBalance(balance)}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-red-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-w-[calc(100vw-2rem)]">
                    <div className="p-4">
                      {/* Balances */}
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Owner Balance:</span>
                          <span className="font-medium text-gray-900">{formatBalance(balance)} LNRA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Chain Balance:</span>
                          <span className="font-medium text-gray-900">{formatBalance(chainBalance)} LNRA</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        {/* Mint Section */}
                        <div>
                          {!showMintInput ? (
                            <Button
                              onClick={() => setShowMintInput(true)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              disabled={isMinting}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Mint Tokens
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="number"
                                value={mintAmount}
                                onChange={(e) => setMintAmount(e.target.value)}
                                placeholder="Enter amount to mint"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleMint}
                                  disabled={isMinting || !mintAmount}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {isMinting ? "Minting..." : "Confirm"}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setShowMintInput(false);
                                    setMintAmount("");
                                  }}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Withdraw Button */}
                        <Button
                          onClick={handleWithdraw}
                          disabled={isWithdrawing}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Minus className="w-4 h-4 mr-2" />
                          {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                        </Button>

                        {/* Refresh Balance Button */}
                        <Button
                          onClick={handleRefreshBalance}
                          disabled={isRefreshing || loading}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                          {isRefreshing ? "Refreshing..." : "Refresh Balance"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </Button>

              <Button variant="outline" size="icon" className="rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
