import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLinera } from './LineraProvider';

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: 'UP' | 'DOWN';
  gameType: 'BTC' | 'ETH';
}

export const PredictionModal: React.FC<PredictionModalProps> = ({ isOpen, onClose, prediction, gameType }) => {
  const { btcApplication, ethApplication, accountOwner, loading, refreshBalance } = useLinera();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Вибираємо правильне application в залежності від типу гри
  const application = gameType === 'BTC' ? btcApplication : ethApplication;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!application || !accountOwner || !amount) {
      setStatus('Missing required data');
      return;
    }

    setIsSubmitting(true);
    setStatus('Submitting prediction...');

    try {
      // Визначаємо chain ID та target owner в залежності від типу гри
      const chainId = gameType === 'BTC' 
        ? import.meta.env.VITE_BTC_CHAIN_ID 
        : import.meta.env.VITE_ETH_CHAIN_ID;
      
      const targetOwner = gameType === 'BTC'
        ? import.meta.env.VITE_BTC_TARGET_OWNER
        : import.meta.env.VITE_ETH_TARGET_OWNER;

      const mutation = `
        mutation {
          transfer(
            owner: "${accountOwner}",
            amount: "${amount}",
            targetAccount: {
              chainId: "${chainId}",
              owner: "${targetOwner}"
            },
            prediction: "${prediction}"
          )
        }
      `;

      const result = await application.query(JSON.stringify({ query: mutation }));

      setStatus(`Success! ${gameType} prediction ${prediction} submitted with amount ${amount}`);
      console.log('Mutation result:', result);
      
      // Оновлюємо баланс після успішної транзакції
      if (refreshBalance) {
        try {
          await refreshBalance();
        } catch (refreshError) {
          console.warn('Failed to refresh balance after transaction:', refreshError);
        }
      }
      
      // Закриваємо модал через 2 секунди після успіху
      setTimeout(() => {
        onClose();
        setAmount('');
        setStatus('');
      }, 2000);

    } catch (error: any) {
      setStatus(`Error: ${error.message || 'Failed to submit prediction'}`);
      console.error('Mutation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setAmount('');
      setStatus('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Make {gameType} Prediction
          </h2>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            prediction === 'UP' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {prediction === 'UP' ? '📈' : '📉'} {prediction}
          </div>
        </div>

        {/* Linera Status */}
        {loading && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-700 text-sm">Initializing Linera client...</p>
          </div>
        )}

        {!loading && !accountOwner && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg">
            <p className="text-red-700 text-sm">Linera client not ready</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount (LNRA)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              min="0"
              step="0.01"
              required
              disabled={isSubmitting || loading || !accountOwner}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Account Info */}
          {accountOwner && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p>Account: {accountOwner.slice(0, 10)}...{accountOwner.slice(-8)}</p>
            </div>
          )}

          {/* Status */}
          {status && (
            <div className={`p-3 rounded-lg text-sm ${
              status.includes('Success') 
                ? 'bg-green-50 text-green-700' 
                : status.includes('Error') 
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {status}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading || !accountOwner || !amount}
              className={`flex-1 px-4 py-3 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                prediction === 'UP'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : `Submit ${prediction}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};