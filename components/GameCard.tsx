import { LightningAnimation } from "./LightningAnimation";
import { useState, useCallback } from "react";
import { formatLocalTime } from "../utils/timeUtils";

type GameStatus = "LIVE" | "Next" | "Later" | "EXPIRED";

interface Game {
  status: GameStatus;
  id: string;
  payout?: string;
  lastPrice?: string;
  lockedPrice?: string;
  prizePool?: string;
  entryPrice?: string | null;
  payoutMultiplier?: string;
  entryStarts?: string | null;
  result?: 'UP' | 'DOWN' | null;
  // Часові поля
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt?: string;
}

interface GameCardProps {
  game: Game;
  currentPrice?: string; // Додаємо поточну ціну
  onPredictionClick?: (prediction: 'UP' | 'DOWN') => void; // Додаємо функцію для відкриття модального вікна
}

export function GameCard({ game, currentPrice, onPredictionClick }: GameCardProps) {
  const [lightningActive, setLightningActive] = useState(false);
  
  // Функція для форматування часу з урахуванням локального часового поясу
  const formatTime = (dateString: string | null | undefined) => {
    return formatLocalTime(dateString);
  };
  
  const handleButtonClick = (direction: 'up' | 'down') => {
    console.log(`Button clicked: ${direction}, lightning active: ${lightningActive}`);
    setLightningActive(true);
    // Викликаємо функцію для відкриття модального вікна
    if (onPredictionClick) {
      onPredictionClick(direction.toUpperCase() as 'UP' | 'DOWN');
    }
    console.log(`Clicked ${direction} for game ${game.id}`);
  };

  const handleLightningComplete = useCallback(() => {
    console.log('Lightning animation completed, setting active to false');
    setLightningActive(false);
  }, []);

  const isLive = game.status === "LIVE";
  const isNext = game.status === "Next";
  const isLater = game.status === "Later";
  const isExpired = game.status === "EXPIRED";

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow h-full relative">
      <LightningAnimation 
        isActive={lightningActive} 
        onComplete={handleLightningComplete}
      />
      {/* Header */}
      <div className={`px-3 sm:px-4 py-2 ${
        isLive ? "bg-red-600" : 
        isNext ? "bg-red-500" : 
        isExpired ? "bg-gray-500" : 
        "bg-gray-100"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
            <span className={isLater ? "text-gray-600 text-xs sm:text-sm" : "text-white text-xs sm:text-sm"}>
              {game.status}
            </span>
          </div>
          <span className={isLater ? "text-gray-500 text-xs" : "text-white text-xs"}>
            {game.id}
          </span>
        </div>
        
        {/* Відображення часу для всіх статусів крім Later */}
        {!isLater && (
          <div className="flex items-center justify-center mt-1">
            <span className="text-white text-xs opacity-75">
              {isExpired && game.resolvedAt ? `Resolved: ${formatTime(game.resolvedAt)}` :
               isLive && game.closedAt ? `Closed: ${formatTime(game.closedAt)}` :
               isNext && game.createdAt ? `Created: ${formatTime(game.createdAt)}` :
               game.createdAt ? `Created: ${formatTime(game.createdAt)}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {isLater ? (
          // Later card - simplified
          <div className="text-center py-6 sm:py-8">
            <div className="text-gray-400 text-sm mb-4">UP</div>
            <div className="mb-4">
              <div className="text-gray-500 text-xs sm:text-sm">Entry starts</div>
              <div className="text-gray-900 text-sm sm:text-base">{game.entryStarts}</div>
            </div>
            <div className="text-gray-400 text-sm">DOWN</div>
          </div>
        ) : (
          <>
            {/* UP Section */}
            <div className="text-center mb-3 sm:mb-4">
              <div className={`text-base sm:text-lg font-medium mb-1 ${
                isExpired ? 
                  (game.result === 'UP' ? "text-green-500 font-bold" : "text-gray-400") : 
                  "text-green-500"
              }`}>UP</div>
              <div className="text-gray-500 text-xs sm:text-sm">0x Payout</div>
            </div>

            {/* Action Buttons or Price Info */}
            {isNext ? (
              <div className="space-y-3 mb-3">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium text-xs sm:text-sm">Prize Pool:</span>
                    <span className="text-gray-900 font-semibold text-sm sm:text-base">{game.prizePool}</span>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button 
                    onClick={() => handleButtonClick('up')}
                    className="flex-1 border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-semibold py-3 sm:py-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-green-500/25 text-sm sm:text-base"
                  >
                    Enter UP
                  </button>
                  <button 
                    onClick={() => handleButtonClick('down')}
                    className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-semibold py-3 sm:py-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 text-sm sm:text-base"
                  >
                    Enter DOWN
                  </button>
                </div>
              </div>
            ) : isExpired ? (
              <div className="space-y-2 mb-3">
                {game.lastPrice && (
                  <div className="bg-gray-50 rounded-lg px-2 sm:px-3 py-2 border border-gray-200">
                    <div className="text-gray-500 text-xs mb-0.5">RESOLVED PRICE</div>
                    <div className="text-gray-600 text-xs sm:text-sm">{game.lastPrice}</div>
                  </div>
                )}
                
                {game.lockedPrice && (
                  <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                    <span className="text-gray-500 text-xs">Locked Price:</span>
                    <span className="text-gray-600 text-xs sm:text-sm">{game.lockedPrice}</span>
                  </div>
                )}

                {game.prizePool && (
                  <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                    <span className="text-gray-500 text-xs">Prize Pool:</span>
                    <span className="text-gray-600 text-xs sm:text-sm">{game.prizePool}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {(game.lastPrice || currentPrice) && (
                  <div className="bg-gray-50 rounded-lg px-2 sm:px-3 py-2 border border-gray-200">
                    <div className="text-gray-500 text-xs mb-0.5">LIVE LAST PRICE</div>
                    <div className="text-red-600 text-xs sm:text-sm">{currentPrice || game.lastPrice}</div>
                  </div>
                )}
                
                {game.lockedPrice && (
                  <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                    <span className="text-gray-500 text-xs">Locked Price:</span>
                    <span className="text-gray-900 text-xs sm:text-sm">{game.lockedPrice}</span>
                  </div>
                )}

                {game.prizePool && (
                  <div className="flex justify-between items-center px-2 sm:px-3 py-2">
                    <span className="text-gray-500 text-xs">Prize Pool:</span>
                    <span className="text-gray-900 text-xs sm:text-sm">{game.prizePool}</span>
                  </div>
                )}
              </div>
            )}

            {/* DOWN Section */}
            <div className="text-center mt-3 sm:mt-4">
              <div className="text-gray-500 text-xs sm:text-sm mb-1">1.00x Payout</div>
              <div className={`text-base sm:text-lg font-medium ${
                isExpired ? 
                  (game.result === 'DOWN' ? "text-red-500 font-bold" : "text-gray-400") : 
                  "text-red-500"
              }`}>DOWN</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
