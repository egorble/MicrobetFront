import { TrendingUp, Wallet, RefreshCw, Clock, ChevronDown, Plus, Minus, Ticket, Bell } from "lucide-react";
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
    connectWallet,
    notifications,
    markAllAsRead,
    claimEnabled,
    pendingBundles,
    claimChainBalance,
    hasClaimed
  } = useLinera();
  const [isConnecting, setIsConnecting] = useState(false);
  const connected = !!accountOwner && status === 'Ready';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState(getUserTimezone());

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [chainBalance, setChainBalance] = useState<string>("0");
  const [mintAmount, setMintAmount] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showMintInput, setShowMintInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

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
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle opening notifications - mark as read if needed
  const handleOpenNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

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

            {/* Notifications & Wallet Dropdown */}
            {connected && (
              <div className="flex items-center gap-2">
                {/* Claim Button */}
                <div className="relative">
                  <Button
                    onClick={async () => {
                      if (!claimChainBalance || isClaiming || !claimEnabled) return;
                      setIsClaiming(true);
                      try {
                        await claimChainBalance();
                      } finally {
                        setIsClaiming(false);
                      }
                    }}
                    className={`px-3 py-2 rounded-full ${claimEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 text-gray-500'} `}
                    disabled={!claimEnabled || isClaiming}
                  >
                    {isClaiming ? 'Claiming...' : (hasClaimed && !claimEnabled ? 'Claimed' : 'Claim')}
                  </Button>
                  {(pendingBundles || 0) > 0 && claimEnabled && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-white bg-red-500 text-[10px] font-bold text-white">
                      {(pendingBundles || 0) > 9 ? '9+' : (pendingBundles || 0)}
                    </span>
                  )}
                </div>
                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={handleOpenNotifications}
                    className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-gray-800' : 'text-gray-600'}`} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex items-center justify-center h-4 w-4 rounded-full ring-2 ring-white bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black ring-opacity-5">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        {notifications && notifications.length > 0 && unreadCount > 0 && (
                          <button
                            onClick={() => markAllAsRead && markAllAsRead()}
                            className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[24rem] overflow-y-auto custom-scrollbar">
                        {notifications && notifications.length > 0 ? (
                          <div className="divide-y divide-gray-50">
                            {notifications.map((note) => (
                              <div
                                key={note.id}
                                className={`p-4 transition-colors flex gap-3 group ${!note.read ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'}`}
                              >
                                <div className="mt-1 relative">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!note.read ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <Ticket className="w-4 h-4" />
                                  </div>
                                  {!note.read && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm leading-relaxed ${!note.read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                    {note.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(note.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                              <Bell className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-900 font-medium mb-1">No notifications</p>
                            <p className="text-sm text-gray-500">You're all caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Wallet Dropdown */}
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
              </div>
            )}

            {/* Action buttons - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2">


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
