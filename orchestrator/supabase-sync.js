const axios = require('axios')
const WebSocket = require('ws')
const { createClient } = require('@supabase/supabase-js')
const { Pool } = require('pg')
const config = require('./config')
const fs = require('fs')
const path = require('path')

function loadLocalEnv() {
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

loadLocalEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || config.supabase?.url || 'https://oznvztsgrgfcithgnosn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase?.serviceRoleKey
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null
const pgPool = SUPABASE_DB_URL ? new Pool({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }) : null

function extractChainId(endpointUrl) {
  const m = endpointUrl.match(/\/chains\/([^/]+)/)
  return m ? m[1] : null
}

function endpointToWsUrl(endpointUrl) {
  const m = endpointUrl.match(/^http:\/\/([^/]+)/)
  const host = m ? m[1] : null
  return host ? `ws://${host}/ws` : null
}

const BTC_HTTP = config.endpoints.BTC
const ETH_HTTP = config.endpoints.ETH
const BTC_CHAIN_ID = extractChainId(BTC_HTTP)
const ETH_CHAIN_ID = extractChainId(ETH_HTTP)
const BTC_WS = endpointToWsUrl(BTC_HTTP)
const ETH_WS = endpointToWsUrl(ETH_HTTP)

const ALL_ROUNDS_QUERY = `query { allRounds { id status resolutionPrice resolvedAt closedAt createdAt closingPrice upBets downBets result prizePool upBetsPool downBetsPool } }`

async function fetchAllRounds(httpEndpoint) {
  const res = await axios.post(httpEndpoint, { query: ALL_ROUNDS_QUERY }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 })
  return res.data?.data?.allRounds || []
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

function mapRound(chain, r) {
  return {
    id: r.id,
    chain,
    status: r.status,
    resolution_price: r.resolutionPrice != null ? Number(r.resolutionPrice) : null,
    closing_price: r.closingPrice != null ? Number(r.closingPrice) : null,
    up_bets: r.upBets,
    down_bets: r.downBets,
    result: r.result,
    prize_pool: Number(r.prizePool),
    up_bets_pool: Number(r.upBetsPool),
    down_bets_pool: Number(r.downBetsPool),
    created_at: toIsoSafe(r.createdAt) || new Date().toISOString(),
    resolved_at: toIsoSafe(r.resolvedAt),
    closed_at: toIsoSafe(r.closedAt),
  }
}

async function upsertRounds(chain, rounds) {
  const payload = rounds.map(r => mapRound(chain, r))
  if (supabase) {
    const { error } = await supabase.from('rounds').upsert(payload, { onConflict: 'chain,id' })
    if (error) throw error
    return
  }
  if (pgPool) {
    const client = await pgPool.connect()
    try {
      const text = `insert into public.rounds (id, chain, status, resolution_price, closing_price, up_bets, down_bets, result, prize_pool, up_bets_pool, down_bets_pool, created_at, resolved_at, closed_at)
                    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                    on conflict (chain, id) do update set
                      status = excluded.status,
                      resolution_price = excluded.resolution_price,
                      closing_price = excluded.closing_price,
                      up_bets = excluded.up_bets,
                      down_bets = excluded.down_bets,
                      result = excluded.result,
                      prize_pool = excluded.prize_pool,
                      up_bets_pool = excluded.up_bets_pool,
                      down_bets_pool = excluded.down_bets_pool,
                      created_at = excluded.created_at,
                      resolved_at = excluded.resolved_at,
                      closed_at = excluded.closed_at`
      for (const row of payload) {
        const values = [row.id, row.chain, row.status, row.resolution_price, row.closing_price, row.up_bets, row.down_bets, row.result, row.prize_pool, row.up_bets_pool, row.down_bets_pool, row.created_at, row.resolved_at, row.closed_at]
        await client.query(text, values)
      }
    } finally {
      client.release()
    }
    return
  }
  throw new Error('No Supabase key or DB URL configured')
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
        ws.send(JSON.stringify({ id: 'chain_notifications', type: 'subscribe', payload: { query: `subscription { notifications(chainId: "${chainId}") }` } }))
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
}

async function initialSync() {
  try {
    const [btc, eth] = await Promise.all([fetchAllRounds(BTC_HTTP), fetchAllRounds(ETH_HTTP)])
    await upsertRounds('btc', btc)
    await upsertRounds('eth', eth)
    console.log(`Initial sync completed: btc=${btc.length}, eth=${eth.length}`)
  } catch (e) {
    console.error('Initial sync error', e)
  }
}

async function handleBtcEvent() {
  try {
    const rounds = await fetchAllRounds(BTC_HTTP)
    await upsertRounds('btc', rounds)
    console.log(`BTC upserted: ${rounds.length}`)
  } catch (e) {
    console.error('BTC event error', e)
  }
}

async function handleEthEvent() {
  try {
    const rounds = await fetchAllRounds(ETH_HTTP)
    await upsertRounds('eth', rounds)
    console.log(`ETH upserted: ${rounds.length}`)
  } catch (e) {
    console.error('ETH event error', e)
  }
}

async function main() {
  console.log('Starting Supabase sync daemon')
  console.log('Supabase URL configured')
  await initialSync()
  console.log('Connecting BTC WS')
  makeWs(BTC_WS, BTC_CHAIN_ID, handleBtcEvent)
  console.log('Connecting ETH WS')
  makeWs(ETH_WS, ETH_CHAIN_ID, handleEthEvent)
}

main().catch(() => { process.exit(1) })
