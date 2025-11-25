const axios = require('axios')
const WebSocket = require('ws')
const { createClient } = require('@supabase/supabase-js')
const config = require('./config')
const fs = require('fs')
const path = require('path')

function now() { return new Date().toISOString() }
function log() { const args = Array.from(arguments); console.log(`[${now()}] [lottery-sync]`, ...args) }
function warn() { const args = Array.from(arguments); console.warn(`[${now()}] [lottery-sync]`, ...args) }
function error() { const args = Array.from(arguments); console.error(`[${now()}] [lottery-sync]`, ...args) }
function compactStr(v) { return String(v).replace(/\s+/g, ' ').trim() }
function trunc(s, n = 1000) { try { const t = String(s); return t.length > n ? t.slice(0, n) + '…' : t } catch { return '' } }

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

const SUPABASE_URL = process.env.SUPABASE_URL_LOTTERY || process.env.SUPABASE_URL || config.supabase?.url || 'https://oznvztsgrgfcithgnosn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOTTERY || process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase?.serviceRoleKey
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

const LOTTERY_HTTP = config.endpoints?.LOTTERY || 'http://localhost:8081/chains/5004f32aab0413261b1fb0087ebd5ed650dfba64306466f939aac7dbe846d11e/applications/018cda9557b55765846b47f70fe334999275f6bc561994fa6cb8a1fe14e60eb1'

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
  const q = compactStr(query)
  log('POST', endpoint, 'query:', q)
  try {
    const res = await axios.post(endpoint, { query }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 10000,
      validateStatus: () => true
    })
    if (res.status < 200 || res.status >= 300) {
      error('HTTP', res.status, res.statusText)
      return {}
    }
    const raw = res.data
    if (raw?.errors) {
      error('GraphQL errors:', trunc(JSON.stringify(raw.errors)))
    }
    const data = raw?.data || {}
    const keys = Object.keys(data)
    log('RESPONSE keys=' + keys.join(',') + ' size=' + JSON.stringify(data).length)
    log('RESPONSE preview=', trunc(JSON.stringify(raw)))
    return data
  } catch (err) {
    error('POST failed:', err.message || err)
    return {}
  }
}

const ALL_ROUNDS_QUERY = `query { allRounds { ticketPrice totalTicketsSold status closedAt createdAt prizePool id } }`

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

async function fetchAllRounds() {
  const data = await executeQuery(LOTTERY_HTTP, ALL_ROUNDS_QUERY)
  const rounds = data?.allRounds || []
  log('allRounds count=', rounds.length)
  return rounds
}

function latestTargetRound(rounds) {
  const statusOf = (r) => String(r.status).toUpperCase()
  const byIdDesc = (a, b) => Number(b.id) - Number(a.id)

  const closed = rounds.filter(r => statusOf(r) === 'CLOSED').sort(byIdDesc)
  if (closed.length) return { id: closed[0].id, status: 'CLOSED' }

  const complete = rounds.filter(r => statusOf(r) === 'COMPLETE').sort(byIdDesc)
  if (complete.length) return { id: complete[0].id, status: 'COMPLETE' }

  return null
}

function mapWinner(roundId, w) {
  return {
    round_id: Number(roundId),
    ticket_number: String(w.ticketNumber),
    source_chain_id: String(w.sourceChainId || 'unknown'),
    prize_amount: String(w.prizeAmount),
  }
}

async function fetchRoundWinners(roundId) {
  const q = `query { roundWinners(roundId: ${Number(roundId)}) { ticketNumber sourceChainId prizeAmount } }`
  const data = await executeQuery(LOTTERY_HTTP, q)
  const winners = data?.roundWinners || []
  log('roundWinners roundId=' + roundId + ' count=' + winners.length)
  return winners
}

async function upsertWinners(roundId) {
  if (!supabase) throw new Error('Supabase not configured')
  const winners = await fetchRoundWinners(roundId)
  if (!winners || winners.length === 0) return
  const rows = winners.map(w => mapWinner(roundId, w))
  const { error: upsertError } = await supabase
    .from('lottery_winners')
    .upsert(rows, { onConflict: 'round_id,ticket_number,source_chain_id' })
  if (upsertError) {
    try { error('lottery_winners upsert error', upsertError.message) } catch {}
  } else {
    try { log('upsert winners batch count=' + rows.length + ' roundId=' + roundId) } catch {}
  }
}

// removed duplicate mapRound (use the detailed mapper below)

function toMsRaw(v) {
  try {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') {
      const num = v
      if (num >= 1e17) return Math.floor(num / 1e6)
      if (num >= 1e13) return Math.floor(num / 1e3)
      if (num >= 1e11) return num
      if (num >= 1e9) return num * 1000
      return num
    }
    const s = String(v).trim()
    if (/^[+\-]?\d+(\.\d+)?$/.test(s)) {
      const num = Number(s)
      if (num >= 1e17) return Math.floor(num / 1e6)
      if (num >= 1e13) return Math.floor(num / 1e3)
      if (num >= 1e11) return num
      if (num >= 1e9) return num * 1000
      return num
    }
    const d = new Date(s)
    const t = d.getTime()
    if (isNaN(t)) return null
    return t
  } catch { return null }
}

function mapRound(r) {
  const createdMs = toMsRaw(r.createdAt)
  const closedMs = toMsRaw(r.closedAt)
  const createdIso = createdMs ? new Date(createdMs).toISOString() : null
  const closedIso = closedMs ? new Date(closedMs).toISOString() : null
  try { console.log(`[lottery-sync] mapRound id=${r.id} status=${r.status} rawCreated=${r.createdAt} rawClosed=${r.closedAt} createdMs=${createdMs} closedMs=${closedMs} now=${Date.now()} diffCreatedMs=${createdMs != null ? Date.now() - createdMs : 'n/a'}`) } catch {}
  return {
    id: Number(r.id),
    status: String(r.status),
    ticket_price: String(r.ticketPrice),
    total_tickets_sold: Number(r.totalTicketsSold),
    prize_pool: String(r.prizePool),
    created_at: createdIso,
    closed_at: closedIso,
  }
}

async function upsertRounds(rounds) {
  if (!supabase) throw new Error('Supabase not configured')
  const payload = rounds.map(mapRound)
  if (!payload.length) return
  const { error: upsertError } = await supabase
    .from('lottery_rounds')
    .upsert(payload, { onConflict: 'id' })
  if (upsertError) {
    try { error('upsert rounds error', upsertError.message) } catch {}
  } else {
    try { log('upsert rounds batch count=' + payload.length) } catch {}
  }
}

let syncing = false
let pending = false
async function handleEvent() {
  if (syncing) { pending = true; return }
  syncing = true
  const start = Date.now()
  try {
    const rounds = await fetchAllRounds()
    await upsertRounds(rounds)
    const target = latestTargetRound(rounds)
    log('latest target round id=' + (target?.id ?? 'null') + ' status=' + (target?.status ?? 'null'))
    if (target?.id != null) {
      await upsertWinners(target.id)
    }
  } catch (e) {
    error('handleEvent error:', e?.message || e)
  } finally {
    const dur = Date.now() - start
    log('handleEvent duration ms=' + dur)
    syncing = false
    if (pending) { pending = false; setTimeout(handleEvent, 200) }
  }
}

function makeWs(url, chainId, onEvent) {
  let ws
  let attempts = 0
  let pingTimer = null
  function schedulePing() {
    try { clearInterval(pingTimer) } catch {}
    pingTimer = setInterval(() => {
      try { ws?.send(JSON.stringify({ type: 'ping' })) } catch {}
    }, 15000)
  }
  function connect() {
    attempts += 1
    ws = new WebSocket(url, 'graphql-transport-ws')
    ws.onopen = () => {
      attempts = 0
      log('WS open', url)
      ws.send(JSON.stringify({ type: 'connection_init' }))
      schedulePing()
    }
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      try { log('WS message type=' + msg.type + ' payload=' + (msg.payload ? 'present' : 'undefined')) } catch {}
      if (msg.type === 'connection_ack') {
        ws.send(JSON.stringify({ id: 'lottery_sync', type: 'subscribe', payload: { query: `subscription { notifications(chainId: "${chainId}") }` } }))
        log('WS subscribed notifications chainId=' + chainId)
      } else if (msg.type === 'next') {
        onEvent()
      } else if (msg.type === 'pong') {
        // server responded to ping
      }
    }
    ws.onclose = (code, reason) => {
      try { clearInterval(pingTimer) } catch {}
      const base = Math.min(1000 * Math.pow(2, attempts), 30000)
      const jitter = Math.floor(Math.random() * 500)
      const delay = base + jitter
      warn('WS closed code=' + code + ' reason=' + (reason || '') + ' reconnect in ' + delay + 'ms')
      setTimeout(connect, delay)
    }
    ws.onerror = (err) => { error('WS error:', err?.message || err) }
  }
  connect()
  return () => { try { clearInterval(pingTimer); ws?.close() } catch {} }
}

async function main() {
  await handleEvent()
  const chainId = extractChainId(LOTTERY_HTTP)
  const wsUrl = endpointToWsUrl(LOTTERY_HTTP)
  makeWs(wsUrl, chainId, handleEvent)
}

main().catch(() => { process.exit(1) })