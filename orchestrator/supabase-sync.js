const axios = require('axios')
const WebSocket = require('ws')
const PocketBase = require('pocketbase').default
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

const PB_URL = process.env.POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'
const pb = (() => {
  const c = new PocketBase(PB_URL)
  try { c.autoCancellation(false) } catch {}
  return c
})()

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

function mapPbRound(chain, r) {
  return {
    round_id: Number(r.id),
    chain: String(chain),
    status: String(r.status).toUpperCase(),
    resolution_price: r.resolutionPrice != null ? Number(r.resolutionPrice) : null,
    closing_price: r.closingPrice != null ? Number(r.closingPrice) : null,
    up_bets: Number(r.upBets),
    down_bets: Number(r.downBets),
    result: r.result != null ? String(r.result) : null,
    prize_pool: Number(r.prizePool),
    up_bets_pool: Number(r.upBetsPool),
    down_bets_pool: Number(r.downBetsPool),
    created_at: toIsoSafe(r.createdAt) || new Date().toISOString(),
    resolved_at: toIsoSafe(r.resolvedAt),
    closed_at: toIsoSafe(r.closedAt),
  }
}

async function findPbRecord(chain, roundId) {
  try {
    const filter = `round_id = ${Number(roundId)} && chain ~ "${String(chain)}"`
    const rec = await pb.collection('rounds').getFirstListItem(filter, { requestKey: `find-${chain}-${roundId}` })
    return rec || null
  } catch {
    return null
  }
}

async function upsertOneRound(chain, r) {
  const data = mapPbRound(chain, r)
  const existing = await findPbRecord(chain, r.id)
  if (existing && existing.id) {
    try {
      await pb.collection('rounds').update(existing.id, data)
      return 'updated'
    } catch (e) {
      try { console.error('[pb-sync] update error chain=', chain, 'round=', r.id, e?.message || e) } catch {}
      return 'error'
    }
  }
  try {
    await pb.collection('rounds').create(data)
    return 'created'
  } catch (e) {
    // If create fails (e.g., unique index conflict), try update path again
    try {
      const fallback = await findPbRecord(chain, r.id)
      if (fallback && fallback.id) {
        await pb.collection('rounds').update(fallback.id, data)
        return 'updated'
      }
    } catch {}
    try { console.error('[pb-sync] create error chain=', chain, 'round=', r.id, e?.message || e) } catch {}
    return 'error'
  }
}

async function cleanupOldRounds(chain, keepCount = 10) {
  try {
    const res = await pb.collection('rounds').getList(1, 200, { sort: '-round_id', filter: `chain ~ "${String(chain)}"`, requestKey: `list-${chain}` })
    const items = res?.items || []
    if (items.length > keepCount) {
      const toDelete = items.slice(keepCount)
      for (const rec of toDelete) {
        try { await pb.collection('rounds').delete(rec.id) } catch (e) { try { console.warn('[pb-sync] delete error id=', rec.id, e?.message || e) } catch {} }
      }
    }
  } catch (e) {
    try { console.warn('[pb-sync] cleanup error chain=', chain, e?.message || e) } catch {}
  }
}

async function upsertRounds(chain, rounds) {
  const latest = rounds.slice().sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 10)
  let created = 0, updated = 0
  for (const r of latest) {
    const res = await upsertOneRound(chain, r)
    if (res === 'created') created += 1
    else if (res === 'updated') updated += 1
  }
  await cleanupOldRounds(chain, 10)
  try { console.log(`[pb-sync] upsert chain=${chain} created=${created} updated=${updated} kept=${latest.length}`) } catch {}
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
  console.log('Starting PocketBase sync daemon')
  console.log('PocketBase URL', PB_URL)
  await initialSync()
  console.log('Connecting BTC WS')
  makeWs(BTC_WS, BTC_CHAIN_ID, handleBtcEvent)
  console.log('Connecting ETH WS')
  makeWs(ETH_WS, ETH_CHAIN_ID, handleEthEvent)
}

main().catch(() => { process.exit(1) })
