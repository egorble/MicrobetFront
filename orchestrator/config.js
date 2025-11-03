/**
 * Конфігурація для Linera Prediction Game Orchestrator
 */

module.exports = {
  // Ендпоінти Linera applications
  endpoints: {
    BTC: 'http://localhost:8082/chains/fe4098e82d023ff809cfaf46e26884b19d7b28b085bc97bd62de899542474a0c/applications/7e95a16fa13a747779457045f1c6812dc8cfa300868060ee6d58e2d2dc2ddc8b',
    ETH: 'http://localhost:8083/chains/c1f0f66fbd4d5580eddb0467dfff3d987c8bb7cdbb69f2b7b90dce9074d7d63b/applications/ed810c47fea3fa99b7a6bca60c82ed7c78d5b1d7c1b96b3436d25b11c5808ee0'
  },

  // Налаштування часу
  timing: {
    // Інтервал між циклами (мілісекунди)
    intervalMs: 0.5 * 60 * 1000, // 5 хвилин
    
    // Затримка між мутаціями resolveRound та closeRound (мілісекунди)
    mutationDelayMs: 400, // 400мс
    
    // Таймаут для HTTP запитів (мілісекунди)
    httpTimeoutMs: 10000 // 10 секунд
  },

  // Налаштування Binance API
  binance: {
    baseUrl: 'https://api.binance.com/api/v3',
    symbols: {
      BTC: 'BTCUSDT',
      ETH: 'ETHUSDT'
    },
    // Fallback ціни у випадку помилки API
    fallbackPrices: {
      BTC: 67000,
      ETH: 3400
    }
  },

  // Налаштування логування
  logging: {
    // Показувати детальні логи
    verbose: true,
    
    // Показувати емодзі в логах
    useEmojis: true,
    
    // Логувати помилки в файл
    logErrorsToFile: false,
    
    // Шлях до файлу логів (якщо logErrorsToFile = true)
    errorLogPath: './orchestrator-errors.log'
  },

  // Налаштування для розробки/тестування
  development: {
    // Швидкий режим для тестування (кожні 30 секунд)
    fastMode: false,
    fastModeIntervalMs: 30 * 1000,
    
    // Використовувати тестові ціни замість Binance API
    useTestPrices: false,
    testPrices: {
      BTC: 67234.56,
      ETH: 3456.78
    }
  }
};