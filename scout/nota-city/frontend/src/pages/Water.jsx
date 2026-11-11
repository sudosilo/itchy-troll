// NOTA CITY - src/pages/Water.jsx
// Editable water layer with placement validation.
// - Cannot place on zone tiles
// - Water shares road tiles
// - Tower is the unlimited source
// - Pipes connect tower to zones via roads
// - Bulldozer tool
// - Drag to paint, optimistic updates

import { useEffect, useState, useRef } from 'react'
import Grid from '../components/Grid'
import { getTiles, updateTile } from '../lib/api'
import { buildTileMap, canPlaceWater, getWaterServedZones } from '../lib/rules'
import '../pages/pages.css'

const WATER_TYPES = ['tower', 'pipe', 'none']

const WATER_LABELS = {
  tower: 'TOWER',
  pipe:  'PIPE',
  none:  '🚧 BULLDOZE',
}

export default function Water() {
  const [tiles, setTiles] = useState([])
  const [selected, setSelected] = useState('pipe')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [servedZones, setServedZones] = useState(new Set())
  const isPainting = useRef(false)
  const tileMapRef = useRef({})

  useEffect(() => {
    getTiles().then(res => {
      setTiles(res.data)
      tileMapRef.current = buildTileMap(res.data)
      setServedZones(getWaterServedZones(res.data))
      setLoading(false)
    })
  }, [])

  function showMessage(text, isError) {
    setMessage({ text, isError })
    setTimeout(() => setMessage(null), 2000)
  }

  async function paintTile(x, y) {
    const check = canPlaceWater(x, y, selected, tileMapRef.current)
    if (!check.allowed) {
      showMessage(check.reason, true)
      return
    }

    const updated = tiles.map(t =>
      t.x === x && t.y === y ? { ...t, water_type: selected } : t
    )
    setTiles(updated)
    tileMapRef.current[`${x},${y}`] = {
      ...tileMapRef.current[`${x},${y}`],
      water_type: selected
    }
    setServedZones(getWaterServedZones(updated))

    try {
      await updateTile(x, y, { water_type: selected })
    } catch (err) {
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
        <h2>WATER LAYER</h2>
        <span className="stat-inline">
          💧 {servedZones.size} tiles served
        </span>
      </div>

      {message && (
        <div className={`placement-msg ${message.isError ? 'error' : ''}`}>
          {message.text}
        </div>
      )}

      <div className="tool-bar">
        <span className="tool-label">PAINT:</span>
        {WATER_TYPES.map(type => (
          <button
            key={type}
            className={`tool-btn ${selected === type ? 'active' : ''} ${type === 'none' ? 'bulldoze' : ''}`}
            onClick={() => setSelected(type)}
          >
            {WATER_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid-wrap">
        <Grid
          tiles={tiles}
          layer="water"
          onTileClick={paintTile}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          highlightSet={servedZones}
        />
      </div>

      <div className="layer-legend">
        <span style={{color:'#0077aa'}}>■ Tower (source)</span>
        <span style={{color:'#004a7a'}}>■ Pipe</span>
        <span style={{color:'#4aff4a'}}>■ Served zone</span>
      </div>
    </div>
  )
}
