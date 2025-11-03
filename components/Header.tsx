import { TrendingUp, Wallet, RefreshCw, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { useLinera } from "./LineraProvider";
import { useState, useEffect } from "react";
import { getUserTimezone, formatLocalTime } from "../utils/timeUtils";

export function Header() {
  const { balance, loading, accountOwner, refreshBalance, subscriptionStatus, notifications } = useLinera();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState(getUserTimezone());

  // Оновлюємо поточний час кожну секунду
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Отримуємо інформацію про часовий пояс при завантаженні
  useEffect(() => {
    setTimezone(getUserTimezone());
  }, []);

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
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - MicroBet Title with Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">MicroBet</h1>
          </div>

          {/* Center - Empty */}
          <div className="flex items-center gap-2">
          </div>

          {/* Right side - Actions and Wallet */}
          <div className="flex items-center gap-4">
            {/* Current Time and Timezone */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
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

            {/* Subscription Status */}
            {subscriptionStatus && (
              <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                📡 {subscriptionStatus}
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full border border-red-200 cursor-pointer hover:bg-red-100 transition-colors">
              <Wallet className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-red-600">
                  {loading ? "Loading..." : `${formatBalance(balance)} LNRA`}
                </div>
                <div className="text-xs text-red-500">
                  {accountOwner ? `${accountOwner.slice(0, 6)}...${accountOwner.slice(-4)}` : "WALLET"}
                </div>
              </div>
              {/* Кнопка оновлення балансу */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefreshBalance}
                disabled={isRefreshing || loading}
                className="ml-2 p-1 h-6 w-6 hover:bg-red-100"
              >
                <RefreshCw className={`w-3 h-3 text-red-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
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
    </header>
  );
}
