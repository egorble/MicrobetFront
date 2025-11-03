import React, { useState } from 'react';
import { Bell, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useLinera } from './LineraProvider';

export const NotificationPanel: React.FC = () => {
  const { notifications, subscriptionStatus } = useLinera();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-800">
            📬 Notifications ({notifications.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto">
          {/* Subscription Status */}
          {subscriptionStatus && (
            <div className="p-3 border-b border-gray-100 bg-blue-50">
              <div className="text-xs text-blue-700">
                📡 Status: {subscriptionStatus}
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="p-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No notifications yet...
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif, index) => (
                  <div 
                    key={index} 
                    className="text-xs text-gray-700 bg-gray-50 p-2 rounded border-l-2 border-blue-400"
                  >
                    {notif}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};