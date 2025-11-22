const axios = require('axios')
const WebSocket = require('ws')

const LOTTERY_HTTP = 'http://localhost:8081/chains/8034b1b376dd64d049deec9bb3a74378502e9b2a6b1b370c5d1a510534e93b66/applications/371ac1a268cc29a7f5e5fee3fda0baf58d9a7d75b6ea80e028bbc6ed647c0b77'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function extractChainId(endpointUrl) {
  const m = endpointUrl.match(/\/chains\/([^/]+)/)
  return m ? m[1] : null
}

function endpointToWsUrl(endpointUrl) {
  const m = endpointUrl.match(/^http:\/\/([^/]+)/)
  const host = m ? m[1] : null
  return host ? `ws://${host}/ws` : null
}

async function executeQuery(endpoint, query) {
  const res = await axios.post(endpoint, { query }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 })
  if (res.data?.errors) throw new Error(JSON.stringify(res.data.errors))
  return res.data?.data
}

async function executeMutation(endpoint, mutation) {
  const res = await axios.post(endpoint, { query: mutation }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 })
  if (res.data?.errors) throw new Error(JSON.stringify(res.data.errors))
  return res.data?.data
}

const ALL_ROUNDS_QUERY = `query {
  allRounds {
    id
    status
    ticketPrice
    totalTicketsSold
    currentWinnerPool
    pool1Count
    pool2Count
    pool3Count
    pool4Count
    pool1WinnersDrawn
    pool2WinnersDrawn
    pool3WinnersDrawn
    pool4WinnersDrawn
  }
}`

async function fetchAllRounds() {
  const data = await executeQuery(LOTTERY_HTTP, ALL_ROUNDS_QUERY)
  return data?.allRounds || []
}

function makeWs(url, chainId, onEvent) {
  let ws
  let attempts = 0
  function connect() {
    attempts += 1
    ws = new WebSocket(url, 'graphql-transport-ws')
    ws.onopen = () => {
      attempts = 0
      ws.send(JSON.stringify({ type: 'connection_init' }))
    }
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'connection_ack') {
        ws.send(JSON.stringify({ id: 'lottery_notifications', type: 'subscribe', payload: { query: `subscription { notifications(chainId: "${chainId}") }` } }))
      } else if (msg.type === 'next') {
        onEvent()
      }
    }
    ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
      setTimeout(connect, delay)
    }
    ws.onerror = () => {}
  }
  connect()
  return () => { try { ws?.close() } catch {} }
}

async function waitForClosedRound(timeoutMs = 60000) {
  const chainId = extractChainId(LOTTERY_HTTP)
  const wsUrl = endpointToWsUrl(LOTTERY_HTTP)

  const initial = await fetchAllRounds()
  const candidate = initial.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort((a,b) => Number(b.id) - Number(a.id))[0]
  if (candidate) return candidate.id

  return await new Promise((resolve) => {
    let done = false
    const timer = setTimeout(async () => {
      if (done) return
      done = true
      const rounds = await fetchAllRounds()
      const c = rounds.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort((a,b) => Number(b.id) - Number(a.id))[0]
      resolve(c ? c.id : null)
      stop()
    }, timeoutMs)
    const stop = makeWs(wsUrl, chainId, async () => {
      if (done) return
      const rounds = await fetchAllRounds()
      const c = rounds.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort((a,b) => Number(b.id) - Number(a.id))[0]
      if (c) {
        done = true
        clearTimeout(timer)
        resolve(c.id)
        stop()
      }
    })
  })
}

async function isRoundComplete(id) {
  const rounds = await fetchAllRounds()
  const r = rounds.find(r => Number(r.id) === Number(id))
  return String(r?.status || '').toUpperCase() === 'COMPLETE'
}

async function generateWinnersLoop(roundId) {
  while (true) {
    const complete = await isRoundComplete(roundId)
    if (complete) break
    const mutation = `mutation { generateWinner(roundId: ${Number(roundId)}) }`
    try { await executeMutation(LOTTERY_HTTP, mutation) } catch {}
    await sleep(10000)
  }
}

async function closeLotteryRound() {
  const mutation = `mutation { closeLotteryRound }`
  return await executeMutation(LOTTERY_HTTP, mutation)
}

async function cycle() {
  console.log('[lottery] closeLotteryRound')
  await closeLotteryRound()
  const closedId = await waitForClosedRound(60000)
  console.log(`[lottery] closed round id=${closedId}`)
  if (closedId != null) {
    console.log(`[lottery] start generateWinner loop for round ${closedId}`)
    await generateWinnersLoop(closedId)
    console.log(`[lottery] round ${closedId} COMPLETE`)
  }
}

async function start() {
  console.log('[lottery] orchestrator started')
  while (true) {
    try {
      await cycle()
    } catch {}
    console.log('[lottery] sleeping 5m')
    await sleep(5 * 60 * 1000)
  }
}

if (require.main === module) {
  start().catch(() => { process.exit(1) })
}

module.exports = { start }