// NOTA CITY - src/pages/Power.jsx
// Editable power layer with placement validation.
// - Cannot place on zone tiles
// - Power shares road tiles
// - Plant is the unlimited source
// - Lines connect plant to zones via roads
// - Bulldozer tool
// - Drag to paint, optimistic updates

import { useEffect, useState, useRef } from 'react'
import Grid from '../components/Grid'
import { getTiles, updateTile } from '../lib/api'
import { buildTileMap, canPlacePower, getPoweredZones } from '../lib/rules'
import '../pages/pages.css'

const POWER_TYPES = ['plant', 'line', 'none']

const POWER_LABELS = {
  plant: 'PLANT',
  line:  'LINE',
  none:  '🚧 BULLDOZE',
}

export default function Power() {
  const [tiles, setTiles] = useState([])
  const [selected, setSelected] = useState('line')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [poweredZones, setPoweredZones] = useState(new Set())
  const isPainting = useRef(false)
  const tileMapRef = useRef({})

  useEffect(() => {
    getTiles().then(res => {
      setTiles(res.data)
      tileMapRef.current = buildTileMap(res.data)
      setPoweredZones(getPoweredZones(res.data))
      setLoading(false)
    })
  }, [])

  function showMessage(text, isError) {
    setMessage({ text, isError })
    setTimeout(() => setMessage(null), 2000)
  }

  async function paintTile(x, y) {
    const check = canPlacePower(x, y, selected, tileMapRef.current)
    if (!check.allowed) {
      showMessage(check.reason, true)
      return
    }

    const updated = tiles.map(t =>
      t.x === x && t.y === y ? { ...t, power_type: selected } : t
    )
    setTiles(updated)
    tileMapRef.current[`${x},${y}`] = {
      ...tileMapRef.current[`${x},${y}`],
      power_type: selected
    }
    setPoweredZones(getPoweredZones(updated))

    try {
      await updateTile(x, y, { power_type: selected })
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
        <h2>POWER LAYER</h2>
        <span className="stat-inline">
          ⚡ {poweredZones.size} tiles powered
        </span>
      </div>

      {message && (
        <div className={`placement-msg ${message.isError ? 'error' : ''}`}>
          {message.text}
        </div>
      )}

      <div className="tool-bar">
        <span className="tool-label">PAINT:</span>
        {POWER_TYPES.map(type => (
          <button
            key={type}
            className={`tool-btn ${selected === type ? 'active' : ''} ${type === 'none' ? 'bulldoze' : ''}`}
            onClick={() => setSelected(type)}
          >
            {POWER_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid-wrap">
        <Grid
          tiles={tiles}
          layer="power"
          onTileClick={paintTile}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          highlightSet={poweredZones}
        />
      </div>

      <div className="layer-legend">
        <span style={{color:'#aaaa00'}}>■ Plant (source)</span>
        <span style={{color:'#7a7a00'}}>■ Line</span>
        <span style={{color:'#4aff4a'}}>■ Powered zone</span>
      </div>
    </div>
  )
}
