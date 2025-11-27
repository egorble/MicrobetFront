const axios = require('axios')
const WebSocket = require('ws')

// Configuration
const LOTTERY_CHAIN_ID = '5004f32aab0413261b1fb0087ebd5ed650dfba64306466f939aac7dbe846d11e'
const LOTTERY_APP_ID = '018cda9557b55765846b47f70fe334999275f6bc561994fa6cb8a1fe14e60eb1'
const LOTTERY_ENDPOINT = `http://localhost:8081/chains/${LOTTERY_CHAIN_ID}/applications/${LOTTERY_APP_ID}`
const WS_URL = 'ws://localhost:8081/ws'

const BOT_CHAIN_ID = 'f45a39ccd602efab007fd302589bcce1c115f903c268ed3d1c8c1eeb98a1c127'
const BOT_ENDPOINT = `http://localhost:8084/chains/${BOT_CHAIN_ID}/applications/${LOTTERY_APP_ID}`
const TARGET_OWNER = '0x0ac08e63dc28f0570b2b842e7bd8cfa3b17bd77cb29197f4e6b0b17183919b88'
const BOT_OWNER = '0x1b9df7f664314174d7e90cb3f7a7aa6fe5fe90e3b5efaed6d50915adbba1b810'

// State
let lastProcessedRoundId = -1

// Logging
function now() { return new Date().toISOString() }
function log(...args) { console.log(`[${now()}] [bot-buy-tickets]`, ...args) }
function error(...args) { console.error(`[${now()}] [bot-buy-tickets]`, ...args) }

// GraphQL Helper
async function executeQuery(endpoint, query) {
  try {
    const res = await axios.post(endpoint, { query }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
    if (res.data?.errors) throw new Error(JSON.stringify(res.data.errors))
    return res.data?.data
  } catch (e) {
    error('Query failed:', e.message)
    return null
  }
}

// Fetch Active Round
async function getActiveRound() {
  const query = `query { allRounds { id status } }`
  const data = await executeQuery(LOTTERY_ENDPOINT, query)
  if (!data?.allRounds) return null
  
  // Find round with status ACTIVE
  const activeRound = data.allRounds
    .filter(r => String(r.status).toUpperCase() === 'ACTIVE')
    .sort((a, b) => Number(b.id) - Number(a.id))[0]
    
  return activeRound
}

// Buy Tickets Mutation
async function buyTickets(roundId) {
  const mutation = `
    mutation {
      transfer(
        owner: "${BOT_OWNER}",
        amount: "4.",
        targetAccount: {
          chainId: "${LOTTERY_CHAIN_ID}",
          owner: "${TARGET_OWNER}"
        },
        purchaseTickets: true
      )
    }
  `
  log(`Sending buy ticket mutation for round ${roundId}...`)
  const res = await executeQuery(BOT_ENDPOINT, mutation)
  if (res) {
    log(`Successfully bought tickets for round ${roundId}`)
  }
}

// Check and Buy Logic
async function checkAndBuy() {
  const activeRound = await getActiveRound()
  if (!activeRound) {
    // log('No active round found')
    return
  }

  const roundId = Number(activeRound.id)
  if (roundId > lastProcessedRoundId) {
    log(`New active round found: ${roundId} (last processed: ${lastProcessedRoundId})`)
    await buyTickets(roundId)
    lastProcessedRoundId = roundId
  } else {
    // log(`Round ${roundId} already processed or old`)
  }
}

// WebSocket Connection
function connectWs() {
  let ws
  let reconnectTimer

  function connect() {
    ws = new WebSocket(WS_URL, 'graphql-transport-ws')
    
    ws.onopen = () => {
      log('Connected to WebSocket')
      ws.send(JSON.stringify({ type: 'connection_init' }))
    }

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'connection_ack') {
        log('Subscribing to notifications...')
        ws.send(JSON.stringify({
          id: 'bot_subscription',
          type: 'subscribe',
          payload: { query: `subscription { notifications(chainId: "${LOTTERY_CHAIN_ID}") }` }
        }))
        // Initial check on connection
        checkAndBuy()
      } else if (msg.type === 'next') {
        // Notification received
        log('Notification received')
        checkAndBuy()
      }
    }

    ws.onclose = () => {
      log('WebSocket closed, reconnecting in 5s...')
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, 5000)
    }

    ws.onerror = (err) => {
      error('WebSocket error:', err.message)
      ws.close()
    }
  }

  connect()
}

// Start
log('Starting bot...')
connectWs()
