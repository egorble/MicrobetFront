const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const roots = [path.resolve(__dirname, '..'), __dirname]
  const files = ['.env.local', '.env']
  for (const dir of roots) {
    for (const f of files) {
      const p = path.join(dir, f)
      if (fs.existsSync(p)) {
        const txt = fs.readFileSync(p, 'utf8')
        for (const line of txt.split(/\r?\n/)) {
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

function makeClients() {
  const lotteryUrl = process.env.VITE_SUPABASE_LOTTERY_URL || process.env.SUPABASE_URL_LOTTERY
  const lotteryAnon = process.env.VITE_SUPABASE_LOTTERY_ANON_KEY
  const lotteryService = process.env.SUPABASE_SERVICE_ROLE_KEY_LOTTERY
  if (!lotteryUrl) throw new Error('Missing lottery Supabase URL')
  if (!lotteryAnon && !lotteryService) throw new Error('Missing lottery Supabase key (anon or service role)')
  const anonClient = lotteryAnon ? createClient(lotteryUrl, lotteryAnon) : null
  const serviceClient = lotteryService ? createClient(lotteryUrl, lotteryService) : null
  return { lotteryUrl, anonClient, serviceClient }
}

async function testWith(client, label) {
  console.log(`\n=== Testing Supabase (${label}) ===`)
  try {
    const rounds = await client
      .from('lottery_rounds')
      .select('id,status,ticket_price,total_tickets_sold,prize_pool,created_at,closed_at')
      .order('id', { ascending: false })
      .limit(10)
    if (rounds.error) throw rounds.error
    console.log(`lottery_rounds count=${rounds.data?.length || 0}`)
    (rounds.data || []).slice(0, 3).forEach((r, i) => console.log(` round[${i}]`, r))

    const winners20 = await client
      .from('lottery_winners')
      .select('round_id,ticket_number,source_chain_id,prize_amount,created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (winners20.error) throw winners20.error
    console.log(`lottery_winners latest20 count=${winners20.data?.length || 0}`)
    (winners20.data || []).slice(0, 3).forEach((w, i) => console.log(` winner[${i}]`, w))

    const latestView = await client
      .from('lottery_winners_latest')
      .select('round_id,ticket_number,source_chain_id,prize_amount,created_at')
      .limit(20)
    if (latestView.error) {
      console.log('lottery_winners_latest view error:', latestView.error.message)
    } else {
      console.log(`lottery_winners_latest count=${latestView.data?.length || 0}`)
      ;(latestView.data || []).slice(0, 3).forEach((w, i) => console.log(` latest[${i}]`, w))
    }
  } catch (err) {
    console.error(`Error (${label}):`, err.message || err)
  }
}

async function main() {
  loadEnv()
  const { lotteryUrl, anonClient, serviceClient } = makeClients()
  console.log(`Using lottery URL: ${lotteryUrl}`)
  if (anonClient) await testWith(anonClient, 'anon')
  if (serviceClient) await testWith(serviceClient, 'service')
  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })