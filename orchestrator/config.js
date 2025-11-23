/**
 * Конфігурація для Linera Prediction Game Orchestrator
 */

module.exports = {
  // Ендпоінти Linera applications
  endpoints: {
    BTC: 'http://localhost:8082/chains/68113d35d4d4bccf55484cfdfe483955127740badafc80bdfc0621200f69004a/applications/b6bdc6a4308cb89178dad2be75a7b6da86147e2e34000cc78827f1b43b6a08ab',
    ETH: 'http://localhost:8083/chains/4c5aee235b9d9ddf62f05d377fd832c718cb5939fc3545ba5ee2829b4c99dfb7/applications/328ca28c55326b55f6506841af115d6ae24a87f1e72da0c9736e8b227c30be95',
    LOTTERY: 'http://localhost:8081/chains/8034b1b376dd64d049deec9bb3a74378502e9b2a6b1b370c5d1a510534e93b66/applications/a41bebfc427a7b9df271c4bd2c9b6d8977fdac7aa8da313abca396b7e51b9769'
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

  supabase: {
    url: 'https://oznvztsgrgfcithgnosn.supabase.co',
    serviceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bnZ6dHNncmdmY2l0aGdub3NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgyNzc3MywiZXhwIjoyMDc5NDAzNzczfQ.8ge0Whdgm9C2Lnoj8w85fAtEc961IGL2XOWtrXWdOD8"
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