// NOTA CITY - src/pages/EventLog.jsx
// Read-only scrolling log of every tick event.
// Shows tick type, when it fired, population and funds at that moment,
// and the notes the tick engine wrote describing what happened.

import { useEffect, useState } from 'react'
import { getTicks } from '../lib/api'
import '../pages/pages.css'

const TICK_COLORS = {
  fast_tick: '#4a7a4a',
  mid_tick:  '#4a4a7a',
  slow_tick: '#7a4a4a',
}

export default function EventLog() {
  const [ticks, setTicks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTicks().then(res => {
      setTicks(res.data)
      setLoading(false)
    })
    const interval = setInterval(() => {
      getTicks().then(res => setTicks(res.data))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="page-status">Loading event log...</div>

  return (
    <div className="page">
      <div className="page-header">
        <h2>EVENT LOG</h2>
        <span className="readonly-badge">READ ONLY</span>
      </div>

      {ticks.length === 0 && (
        <div className="page-status">
          No ticks yet. The engine fires on 5/10/30 minute intervals.
        </div>
      )}

      <div className="event-log">
        {ticks.map(tick => (
          <div
            key={tick.id}
            className="event-row"
            style={{ borderLeft: `3px solid ${TICK_COLORS[tick.tick_type] || '#444'}` }}
          >
            <div className="event-meta">
              <span className="event-type" style={{ color: TICK_COLORS[tick.tick_type] }}>
                {tick.tick_type.toUpperCase()}
              </span>
              <span className="event-time">
                {new Date(tick.fired_at).toLocaleString()}
              </span>
            </div>
            <div className="event-notes">{tick.notes}</div>
            <div className="event-snapshot">
              POP: {tick.population_snapshot?.toLocaleString() || 0} &nbsp;|&nbsp;
              FUNDS: ${tick.funds_snapshot?.toLocaleString() || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
