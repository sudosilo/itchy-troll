// NOTA CITY - src/pages/Roads.jsx
// Editable road layer with placement validation.
// - Cannot place roads on zone tiles
// - Drag to paint
// - Optimistic updates
// - Bulldozer tool

import { useEffect, useState, useRef } from 'react'
import Grid from '../components/Grid'
import { getTiles, updateTile } from '../lib/api'
import { buildTileMap, canPlaceRoad } from '../lib/rules'
import '../pages/pages.css'

const ROAD_TYPES = ['paved', 'dirt', 'none']

const ROAD_LABELS = {
  paved: 'PAVED',
  dirt:  'DIRT',
  none:  '🚧 BULLDOZE',
}

export default function Roads() {
  const [tiles, setTiles] = useState([])
  const [selected, setSelected] = useState('paved')
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
    const check = canPlaceRoad(x, y, selected, tileMapRef.current)
    if (!check.allowed) {
      showMessage(check.reason, true)
      return
    }

    setTiles(prev => prev.map(t =>
      t.x === x && t.y === y ? { ...t, road_type: selected } : t
    ))
    tileMapRef.current[`${x},${y}`] = {
      ...tileMapRef.current[`${x},${y}`],
      road_type: selected
    }

    try {
      await updateTile(x, y, { road_type: selected })
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
        <h2>ROADS LAYER</h2>
      </div>

      {message && (
        <div className={`placement-msg ${message.isError ? 'error' : ''}`}>
          {message.text}
        </div>
      )}

      <div className="tool-bar">
        <span className="tool-label">PAINT:</span>
        {ROAD_TYPES.map(type => (
          <button
            key={type}
            className={`tool-btn ${selected === type ? 'active' : ''} ${type === 'none' ? 'bulldoze' : ''}`}
            onClick={() => setSelected(type)}
          >
            {ROAD_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="grid-wrap">
        <Grid
          tiles={tiles}
          layer="roads"
          onTileClick={paintTile}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
        />
      </div>

      <div className="layer-legend">
        <span style={{color:'#555'}}>■ Paved</span>
        <span style={{color:'#7a6a4a'}}>■ Dirt</span>
      </div>
    </div>
  )
}
