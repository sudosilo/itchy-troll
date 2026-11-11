// NOTA CITY - src/pages/Overview.jsx
// Read-only view of the entire city with all layers composited.
// Shows city stats at the top. No editing allowed here.
// To edit, go to the specific layer tab.

import { useEffect, useState } from 'react'
import Grid from '../components/Grid'
import '../pages/pages.css'
import { getCity, getTiles } from '../lib/api'

export default function Overview() {
  const [city, setCity] = useState(null)
  const [tiles, setTiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [cityRes, tilesRes] = await Promise.all([getCity(), getTiles()])
        setCity(cityRes.data)
        setTiles(tilesRes.data)
      } catch (err) {
        setError('Cannot reach backend. Is the server running?')
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="page-status">Loading city data...</div>
  if (error) return <div className="page-status error">{error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h2>OVERVIEW</h2>
        <span className="readonly-badge">READ ONLY</span>
      </div>

      {city && (
        <div className="stats-bar">
          <div className="stat">
            <label>CITY</label>
            <value>{city.city_name}</value>
          </div>
          <div className="stat">
            <label>POPULATION</label>
            <value>{city.population.toLocaleString()}</value>
          </div>
          <div className="stat">
            <label>FUNDS</label>
            <value>${city.funds.toLocaleString()}</value>
          </div>
          <div className="stat">
            <label>TICK</label>
            <value>{city.tick_count}</value>
          </div>
        </div>
      )}

      <div className="grid-wrap">
        <Grid tiles={tiles} layer="overview" readonly={true} />
      </div>

      <div className="page-hint">
        Select a layer tab above to begin editing.
      </div>
    </div>
  )
}
