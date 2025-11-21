/**
 * Конфігурація для Linera Prediction Game Orchestrator
 */

module.exports = {
  // Ендпоінти Linera applications
  endpoints: {
    BTC: 'http://localhost:8082/chains/68113d35d4d4bccf55484cfdfe483955127740badafc80bdfc0621200f69004a/applications/b6bdc6a4308cb89178dad2be75a7b6da86147e2e34000cc78827f1b43b6a08ab',
    ETH: 'http://localhost:8083/chains/4c5aee235b9d9ddf62f05d377fd832c718cb5939fc3545ba5ee2829b4c99dfb7/applications/328ca28c55326b55f6506841af115d6ae24a87f1e72da0c9736e8b227c30be95'
  },

  // Налаштування часу
  timing: {
    // Інтервал між циклами (мілісекунди)
    intervalMs: 5 * 60 * 1000, // 5 хвилин
    
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