const axios = require('axios')
const WebSocket = require('ws')
const { createClient } = require('@supabase/supabase-js')
const { Pool } = require('pg')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oznvztsgrgfcithgnosn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
const pgPool = SUPABASE_DB_URL ? new Pool({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }) : null

const LOTTERY_HTTP = 'http://localhost:8081/chains/8034b1b376dd64d049deec9bb3a74378502e9b2a6b1b370c5d1a510534e93b66/applications/c2dad20dd15958901615a149e3de7852ce369d8663230c3d8c938dbd509018ee'

function extractChainId(endpointUrl) {
  const m = endpointUrl.match(/\/chains\/([^/]+)/)
  return m ? m[1] : null
}

function endpointToWsUrl(endpointUrl) {
  const m = endpointUrl.match(/^http:\/\/([^/]+)/)
  const host = m ? m[1] : null
  return host ? `ws://${host}/ws` : null
}

function toIsoSafe(v) {
  try {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') {
      let ms = v
      if (v >= 1e17) ms = Math.floor(v / 1e6)
      else if (v >= 1e13) ms = Math.floor(v / 1e3)
      else if (v >= 1e11) ms = v
      else if (v >= 1e9) ms = v * 1000
      const d = new Date(ms)
      if (isNaN(d.getTime())) return null
      return d.toISOString()
    }
    const s = String(v).trim()
    const norm = s.startsWith('+') ? s.slice(1) : s
    const num = Number(norm)
    if (!Number.isNaN(num) && norm !== '') {
      let ms = num
      if (num >= 1e17) ms = Math.floor(num / 1e6)
      else if (num >= 1e13) ms = Math.floor(num / 1e3)
      else if (num >= 1e11) ms = num
      else if (num >= 1e9) ms = num * 1000
      const dNum = new Date(ms)
      if (!isNaN(dNum.getTime())) return dNum.toISOString()
    }
    const d = new Date(norm)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

const ALL_ROUNDS_QUERY = `query { allRounds { id ticketPrice totalTicketsSold status closedAt createdAt prizePool } }`

async function fetchAllRounds(httpEndpoint) {
  const res = await axios.post(httpEndpoint, { query: ALL_ROUNDS_QUERY }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 })
  return res.data?.data?.allRounds || []
}

function pickLatestClosed(rounds) {
  const closed = rounds.filter(r => String(r.status).toUpperCase() === 'CLOSED')
  if (!closed.length) return null
  closed.sort((a,b) => Number(b.id) - Number(a.id))
  return closed[0]
}

const ROUND_WINNERS_QUERY = (roundId) => `query { roundWinners(roundId: ${Number(roundId)}) { ticketNumber sourceChainId prizeAmount } }`

async function fetchRoundWinners(httpEndpoint, roundId) {
  const res = await axios.post(httpEndpoint, { query: ROUND_WINNERS_QUERY(roundId) }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 })
  return res.data?.data?.roundWinners || []
}

function mapRound(r) {
  return {
    id: r.id,
    status: r.status,
    ticket_price: Number(r.ticketPrice),
    total_tickets_sold: Number(r.totalTicketsSold),
    prize_pool: Number(r.prizePool),
    created_at: toIsoSafe(r.createdAt) || new Date().toISOString(),
    closed_at: toIsoSafe(r.closedAt),
  }
}

function mapWinner(roundId, w) {
  return {
    round_id: Number(roundId),
    ticket_number: Number(w.ticketNumber),
    source_chain_id: String(w.sourceChainId || ''),
    prize_amount: Number(w.prizeAmount),
    created_at: new Date().toISOString(),
  }
}

async function upsertLotteryRounds(rounds) {
  const payload = rounds.map(mapRound)
  if (supabase) {
    const { error } = await supabase.from('lottery_rounds').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    return
  }
  if (pgPool) {
    const client = await pgPool.connect()
    try {
      const text = `insert into public.lottery_rounds (id, status, ticket_price, total_tickets_sold, prize_pool, created_at, closed_at)
                    values ($1,$2,$3,$4,$5,$6,$7)
                    on conflict (id) do update set
                      status = excluded.status,
                      ticket_price = excluded.ticket_price,
                      total_tickets_sold = excluded.total_tickets_sold,
                      prize_pool = excluded.prize_pool,
                      created_at = excluded.created_at,
                      closed_at = excluded.closed_at`
      for (const row of payload) {
        const values = [row.id, row.status, row.ticket_price, row.total_tickets_sold, row.prize_pool, row.created_at, row.closed_at]
        await client.query(text, values)
      }
    } finally {
      client.release()
    }
    return
  }
  throw new Error('No Supabase key or DB URL configured')
}

async function upsertLotteryWinners(roundId, winners) {
  const payload = winners.map(w => mapWinner(roundId, w))
  if (supabase) {
    const { error } = await supabase.from('lottery_winners').upsert(payload, { onConflict: 'round_id,ticket_number,source_chain_id' })
    if (error) throw error
    return
  }
  if (pgPool) {
    const client = await pgPool.connect()
    try {
      const text = `insert into public.lottery_winners (round_id, ticket_number, source_chain_id, prize_amount, created_at)
                    values ($1,$2,$3,$4,$5)
                    on conflict (round_id, ticket_number, source_chain_id) do update set
                      prize_amount = excluded.prize_amount,
                      created_at = excluded.created_at`
      for (const row of payload) {
        const values = [row.round_id, row.ticket_number, row.source_chain_id, row.prize_amount, row.created_at]
        await client.query(text, values)
      }
    } finally {
      client.release()
    }
    return
  }
  throw new Error('No Supabase key or DB URL configured')
}

async function handleEvent() {
  const rounds = await fetchAllRounds(LOTTERY_HTTP)
  await upsertLotteryRounds(rounds)
  const latestClosed = pickLatestClosed(rounds)
  if (latestClosed) {
    const winners = await fetchRoundWinners(LOTTERY_HTTP, latestClosed.id)
    if (winners && winners.length) {
      await upsertLotteryWinners(latestClosed.id, winners)
    }
  }
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
        ws.send(JSON.stringify({ id: 'lottery_sync', type: 'subscribe', payload: { query: `subscription { notifications(chainId: "${chainId}") }` } }))
      } else if (msg.type === 'next') {
        onEvent().catch(() => {})
      }
    }
    ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
      setTimeout(connect, delay)
    }
    ws.onerror = () => {}
  }
  connect()
}

async function initialSync() {
  try {
    await handleEvent()
  } catch {}
}

async function main() {
  await initialSync()
  const wsUrl = endpointToWsUrl(LOTTERY_HTTP)
  const chainId = extractChainId(LOTTERY_HTTP)
  makeWs(wsUrl, chainId, handleEvent)
}

if (require.main === module) {
  main().catch(() => { process.exit(1) })
}

module.exports = { main }