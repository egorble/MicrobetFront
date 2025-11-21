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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow h-full relative card-mobile">
      <LightningAnimation 
        isActive={lightningActive} 
        onComplete={handleLightningComplete}
      />
      {/* Header */}
      <div className={`px-3 sm:px-4 py-2 sm:py-3 ${
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
            <span className={`font-medium ${isLater ? "text-gray-600 text-sm" : "text-white text-sm"}`}>
              {game.status}
            </span>
          </div>
          <span className={`text-xs font-mono ${isLater ? "text-gray-500" : "text-white opacity-90"}`}>
            {game.id}
          </span>
        </div>
        
        {/* Відображення часу для всіх статусів крім Later - скорочено для мобільних */}
        {!isLater && (
          <div className="flex items-center justify-center mt-1">
            <span className="text-white text-xs opacity-75 text-center">
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
          <div className="text-center py-4 sm:py-6">
            <div className="text-gray-400 text-base font-medium mb-3">UP</div>
            <div className="mb-3">
              <div className="text-gray-500 text-xs">Entry starts</div>
              <div className="text-gray-900 text-sm font-medium">{game.entryStarts || 'TBD'}</div>
            </div>
            <div className="text-gray-400 text-base font-medium">DOWN</div>
          </div>
        ) : (
          <>
            {/* UP Section */}
            <div className="text-center mb-3">
              <div className={`text-lg font-bold mb-1 ${
                isExpired ? 
                  (game.result === 'UP' ? "text-green-500" : "text-gray-400") : 
                  "text-green-500"
              }`}>UP</div>
              <div className="text-gray-500 text-xs">1.00x Payout</div>
            </div>

            {/* Action Buttons or Price Info */}
            {isNext ? (
              <div className="space-y-3 mb-3">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium text-sm">Prize Pool:</span>
                    <span className="text-gray-900 font-bold text-sm">{game.prizePool}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleButtonClick('up')}
                    className="flex-1 border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-bold py-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-green-500/25 text-sm touch-target active:scale-95"
                  >
                    Enter UP
                  </button>
                  <button 
                    onClick={() => handleButtonClick('down')}
                    className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold py-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 text-sm touch-target active:scale-95"
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
            <div className="text-center mt-3">
              <div className="text-gray-500 text-xs mb-1">1.00x Payout</div>
              <div className={`text-lg font-bold ${
                isExpired ? 
                  (game.result === 'DOWN' ? "text-red-500" : "text-gray-400") : 
                  "text-red-500"
              }`}>DOWN</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
