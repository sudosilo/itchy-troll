// NOTA CITY - src/pages/Zones.jsx
// Editable zone layer with placement validation.
// - Zones require an adjacent road tile
// - Cannot place zones on road tiles
// - Drag to paint across multiple tiles
// - Optimistic updates: tile changes color instantly, confirms with server
// - Bulldozer tool clears zone back to empty

import { useEffect, useState, useRef } from 'react'
import Grid from '../components/Grid'
import { getTiles, updateTile } from '../lib/api'
import { buildTileMap, canPlaceZone } from '../lib/rules'
import '../pages/pages.css'

const ZONE_TYPES = ['residential', 'commercial', 'industrial', 'empty']

const ZONE_LABELS = {
  residential: 'RESIDENTIAL',
  commercial:  'COMMERCIAL',
  industrial:  'INDUSTRIAL',
  empty:       '🚧 BULLDOZE',
}

export default function Zones() {
  const [tiles, setTiles] = useState([])
  const [selected, setSelected] = useState('residential')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const isPainting = useRef(false)
  const tileMapRef = useRef({})

  useEffect(() => {
    getTiles().then(res => {
      setTiles(res.data)
      tileMapRef.current = buildTileMap(res.data)
      setLoading(false)
    })
  }, [])

  function showMessage(text, isError) {
    setMessage({ text, isError })
    setTimeout(() => setMessage(null), 2000)
  }

  async function paintTile(x, y) {
    const check = canPlaceZone(x, y, selected, tileMapRef.current)
    if (!check.allowed) {
      showMessage(check.reason, true)
      return
    }

    // Optimistic update — change color immediately
    setTiles(prev => prev.map(t =>
      t.x === x && t.y === y ? { ...t, zone_type: selected } : t
    ))
    tileMapRef.current[`${x},${y}`] = {
      ...tileMapRef.current[`${x},${y}`],
      zone_type: selected
    }

    try {
      await updateTile(x, y, { zone_type: selected })
    } catch (err) {
      // Revert on failure
      setTiles(prev => prev.map(t =>
        t.x === x && t.y === y
          ? { ...t, zone_type: tileMapRef.current[`${x},${y}`]?.zone_type || 'empty' }
          : t
      ))
      showMessage('Server error — tile reverted', true)
    }
  }

  function handleMouseDown(x, y) {
    isPainting.current = true
    paintTile(x, y)
  }

  function handleMouseEnter(x, y) {
    if (isPainting.current) paintTile(x, y)
  }

  function handleMouseUp() {
    isPainting.current = false
  }

  if (loading) return <div className="page-status">Loading...</div>

  return (
    <div className="page" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="page-header">
        <h2>ZONES LAYER</h2>
      </div>

      {message && (
        <div className={`placement-msg ${message.isError ? 'error' : ''}`}>
          {message.text}
        </div>
      )}

      <div className="tool-bar">
        <span className="tool-label">PAINT:</span>
        {ZONE_TYPES.map(type => (
          <button
            key={type}
            className={`tool-btn ${selected === type ? 'active' : ''} ${type === 'empty' ? 'bulldoze' : ''}`}
            onClick={() => setSelected(type)}
          >
            {ZONE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid-wrap">
        <Grid
          tiles={tiles}
          layer="zones"
          onTileClick={paintTile}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
        />
      </div>

      <div className="layer-legend">
        <span style={{color:'#2a5a2a'}}>■ Residential</span>
        <span style={{color:'#2a2a7a'}}>■ Commercial</span>
        <span style={{color:'#7a5a2a'}}>■ Industrial</span>
        <span style={{color:'#4a6a4a'}}>— Requires adjacent road</span>
      </div>
    </div>
  )
}
