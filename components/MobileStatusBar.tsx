import { Wifi, Battery, Signal } from 'lucide-react';

interface MobileStatusBarProps {
  currentTime?: string;
  batteryLevel?: number;
  signalStrength?: number;
}

export function MobileStatusBar({ currentTime, batteryLevel = 85, signalStrength = 4 }: MobileStatusBarProps) {
  return (
    <div className="sm:hidden bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between text-xs font-medium">
      {/* Left side - Time */}
      <div className="text-gray-900">
        {currentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Right side - Status icons */}
      <div className="flex items-center gap-1">
        {/* Signal strength */}
        <div className="flex items-center gap-0.5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full ${
                i < signalStrength ? 'bg-gray-900' : 'bg-gray-300'
              }`}
              style={{ height: `${(i + 1) * 2 + 2}px` }}
            />
          ))}
        </div>

        {/* WiFi */}
        <Wifi className="w-3 h-3 text-gray-900 ml-1" />

        {/* Battery */}
        <div className="flex items-center ml-1">
          <div className="relative">
            <div className="w-6 h-3 border border-gray-900 rounded-sm">
              <div 
                className="h-full bg-gray-900 rounded-sm"
                style={{ width: `${batteryLevel}%` }}
              />
            </div>
            <div className="absolute -right-0.5 top-0.5 w-0.5 h-2 bg-gray-900 rounded-r-sm" />
          </div>
          <span className="text-gray-900 ml-1 text-xs">{batteryLevel}%</span>
        </div>
      </div>
    </div>
  );
}