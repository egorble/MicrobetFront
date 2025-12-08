/**
 * Конфігурація для Linera Prediction Game Orchestrator
 */
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const dirs = [__dirname, path.resolve(__dirname, '..')]
  const files = ['.env', '.env.local']
  for (const dir of dirs) {
    for (const name of files) {
      const p = path.join(dir, name)
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8')
        for (const line of text.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
          if (m) {
            const k = m[1]
            const v = m[2].replace(/^"|"$/g, '')
            if (!process.env[k]) process.env[k] = v
          }
        }
      }
    }
  }
}

const endpoints = {}
Object.defineProperties(endpoints, {
  BTC: { enumerable: true, get() { return process.env.BTC_HTTP } },
  ETH: { enumerable: true, get() { return process.env.ETH_HTTP } },
  LOTTERY: { enumerable: true, get() { return process.env.LOTTERY_HTTP } },
})

module.exports = {
  loadEnv,
  // Ендпоінти Linera applications
  endpoints,

  // Налаштування часу
  timing: {
    // Інтервал між циклами (мілісекунди)
    intervalMs: 5 * 60 * 1000,

    // Затримка між мутаціями resolveRound та closeRound (мілісекунди)
    mutationDelayMs: 400,

    // Таймаут для HTTP запитів (мілісекунди)
    httpTimeoutMs: 10000
  },

  supabase: {
    url: process.env.SUPABASE_URL || 'https://oznvztsgrgfcithgnosn.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
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
}
