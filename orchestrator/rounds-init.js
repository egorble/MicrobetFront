const axios = require('axios')
const config = require('./config')

config.loadEnv()

function now() { return new Date().toISOString() }
function log() { const args = Array.from(arguments); console.log(`[${now()}] [rounds-init]`, ...args) }
function warn() { const args = Array.from(arguments); console.warn(`[${now()}] [rounds-init]`, ...args) }
function error() { const args = Array.from(arguments); console.error(`[${now()}] [rounds-init]`, ...args) }
function compactStr(v) { return String(v).replace(/\s+/g, ' ').trim() }

async function postMutation(endpoint, query) {
  const q = compactStr(query)
  const res = await axios.post(endpoint, { query }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 15000, validateStatus: () => true })
  if (res?.data?.errors) throw new Error(JSON.stringify(res.data.errors))
  return res?.data?.data
}

function extractChainId(endpointUrl) { const m = String(endpointUrl).match(/\/chains\/([^\/]+)/); return m ? m[1] : null }

async function initChain(label, endpoint, lbChainId, microbetAppId) {
  log('init', label, 'endpoint=', endpoint)
  if (!endpoint) throw new Error('missing endpoint')
  if (!microbetAppId) throw new Error('missing microbet app id')
  if (lbChainId) { await postMutation(endpoint, `mutation { setLeaderboardChainId(chainId: "${lbChainId}") }`) } else { warn('skip setLeaderboardChainId: missing leaderboard chain id for', label) }
  await postMutation(endpoint, `mutation { setMicrobetAppId(microbetAppId: "${microbetAppId}") }`)
  await postMutation(endpoint, `mutation { createRound }`)
  await postMutation(endpoint, `mutation { closeRound(closingPrice: "1") }`)
  log('done', label)
}

async function start() {
  const BTC_HTTP = config.endpoints.BTC
  const ETH_HTTP = config.endpoints.ETH
  const LB_BTC_EP = config.endpoints.LEADERBOARD_BTC
  const LB_ETH_EP = config.endpoints.LEADERBOARD_ETH
  const lbBtc = process.env.VITE_LEADERBOARD_BTC_CHAIN_ID || extractChainId(LB_BTC_EP) || process.env.VITE_LEADERBOARD_CHAIN_ID
  const lbEth = process.env.VITE_LEADERBOARD_ETH_CHAIN_ID || extractChainId(LB_ETH_EP) || process.env.VITE_LEADERBOARD_CHAIN_ID
  const microbetId = process.env.MICROBETREAL || process.env.VITE_MICROBET_APPLICATION_ID || process.env.VITE_LINERA_APPLICATION_ID
  await initChain('btc', BTC_HTTP, lbBtc, microbetId)
  await initChain('eth', ETH_HTTP, lbEth, microbetId)
}

if (require.main === module) { start().catch((e) => { error('fatal', e?.message || e); process.exit(1) }) }

module.exports = { start }
