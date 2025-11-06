import React, {useEffect, useState} from 'react'
import { motion } from 'framer-motion'

// CryptoDashboard.jsx
// Single-file React component (TailwindCSS required in your project)
// - Fetches market data from CoinGecko
// - Renders 3 cards (New, Top Gainers, Popular) similar to the screenshot
// - Optional: hook up OpenAI to generate short summaries (example provided)

export default function CryptoDashboard({
  // pass arrays of coin ids (CoinGecko id strings) to control which coins appear
  newList = ['apecoin','metis-token','pipe-token','binancecoin','2local'],
  popularList = ['solana','bitcoin','ethereum','tether','hype-token'],
  vsCurrency = 'usd',
  refreshIntervalMs = 60_000, // refresh every 60s
}){
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function fetchData(){
      setLoading(true)
      setError(null)
      try{
        // fetch top 200 coins by market cap so we can filter and compute gainers
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=200&page=1&price_change_percentage=24h`
        const res = await fetch(url)
        if(!res.ok) throw new Error('CoinGecko fetch error')
        const data = await res.json()
        if(mounted){
          setCoins(data)
          setLoading(false)
        }
      }catch(err){
        if(mounted){
          setError(err.message)
          setLoading(false)
        }
      }
    }
    fetchData()
    const id = setInterval(fetchData, refreshIntervalMs)
    return () => { mounted = false; clearInterval(id) }
  }, [vsCurrency, refreshIntervalMs])

  // helpers
  const findByIds = (idsArray) => idsArray.map(id => coins.find(c => c.id === id)).filter(Boolean)
  const topGainers = [...coins].sort((a,b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0,5)

  const formatPrice = (p) => {
    if(p >= 1000) return `$${p.toLocaleString(undefined, {maximumFractionDigits:2})}`
    if(p >= 1) return `$${p.toFixed(2)}`
    return `$${p.toFixed(5)}`
  }

  const changeColor = (v) => v >= 0 ? 'text-green-400' : 'text-red-400'

  // OPTIONAL: example usage of OpenAI to create a 1-line summary from the fetched coins
  // NOTE: if you want to actually call this you'll need to call it from server-side or
  // an API route so you don't expose your OpenAI key in the browser. This is an example only.
  async function generateSummaryWithOpenAI(pricesSnapshot){
    if(!process.env.NEXT_PUBLIC_OPENAI_API_KEY) return null
    try{
      const prompt = `Provide a one-line human-friendly market summary for these tokens and their 24h changes: ${JSON.stringify(pricesSnapshot)}`
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{role:'user', content: prompt}],
          max_tokens: 60
        })
      })
      const j = await res.json()
      return j?.choices?.[0]?.message?.content ?? null
    }catch(e){
      console.warn('OpenAI summary failed', e)
      return null
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New */}
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1,y:0}} className="bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-300 font-semibold">New</h3>
            <span className="text-xs text-slate-400">24h Change</span>
          </div>
          <div className="space-y-3">
            { loading && <div className="text-slate-400">Loading…</div> }
            { error && <div className="text-red-400">{error}</div> }
            { !loading && !error && findByIds(newList).map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={c.image} alt={c.symbol} className="w-8 h-8 rounded-full"/>
                  <div>
                    <div className="text-sm text-slate-100 font-medium">{c.symbol.toUpperCase()}</div>
                    <div className="text-xs text-slate-400">{formatPrice(c.current_price)}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${changeColor(c.price_change_percentage_24h)}`}>
                  {c.price_change_percentage_24h ? `${c.price_change_percentage_24h.toFixed(2)}%` : '—'}
                </div>
              </div>
            )) }
          </div>
        </motion.div>

        {/* Top Gainers */}
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1,y:0}} className="bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-300 font-semibold">Top Gainers</h3>
            <span className="text-xs text-slate-400">24h Change</span>
          </div>
          <div className="space-y-3">
            { topGainers.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={c.image} alt={c.symbol} className="w-8 h-8 rounded-full"/>
                  <div>
                    <div className="text-sm text-slate-100 font-medium">{c.symbol.toUpperCase()}</div>
                    <div className="text-xs text-slate-400">{formatPrice(c.current_price)}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${changeColor(c.price_change_percentage_24h)}`}>
                  {c.price_change_percentage_24h ? `${c.price_change_percentage_24h.toFixed(2)}%` : '—'}
                </div>
              </div>
            )) }
          </div>
        </motion.div>

        {/* Popular */}
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1,y:0}} className="bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-300 font-semibold">Popular</h3>
            <span className="text-xs text-slate-400">24h Change</span>
          </div>
          <div className="space-y-3">
            { !loading && !error && findByIds(popularList).map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={c.image} alt={c.symbol} className="w-8 h-8 rounded-full"/>
                  <div>
                    <div className="text-sm text-slate-100 font-medium">{c.symbol.toUpperCase()}</div>
                    <div className="text-xs text-slate-400">{formatPrice(c.current_price)}</div>
                  </div>
                </div>
                <div className={`text-sm font-medium ${changeColor(c.price_change_percentage_24h)}`}>
                  {c.price_change_percentage_24h ? `${c.price_change_percentage_24h.toFixed(2)}%` : '—'}
                </div>
              </div>
            )) }
          </div>
        </motion.div>
      </div>

      {/* small helper footer */}
      <div className="mt-4 text-xs text-slate-500">Prices from CoinGecko · updates every {Math.round(refreshIntervalMs/1000)}s</div>
    </div>
  )
}

/*
Usage:
1. Add this file to your React project (e.g. components/CryptoDashboard.jsx).
2. Ensure TailwindCSS is configured (this component uses Tailwind classes).
3. Install framer-motion: `npm i framer-motion` or `yarn add framer-motion`.
4. Import and render: `import CryptoDashboard from './components/CryptoDashboard'` then <CryptoDashboard />

Optional OpenAI note:
- If you want a human-friendly text summary using your OpenAI key, create a server-side API route
  that calls OpenAI (keep key server-side!), then call that route from this component.
- Example in this file shows how to call OpenAI client from the browser (NOT RECOMMENDED). Use server-side instead.
*/
