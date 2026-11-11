// NOTA CITY - src/components/Grid.jsx
const GRID_SIZE = 32

const ZONE_COLORS = {
  empty:       '#0a0a0a',
  residential: '#2a5a2a',
  commercial:  '#2a2a7a',
  industrial:  '#7a5a2a',
}

const ROAD_COLORS = {
  none:  null,
  paved: '#555555',
  dirt:  '#7a6a4a',
}

const POWER_COLORS = {
  none:  null,
  line:  '#7a7a00',
  plant: '#aaaa00',
}

const WATER_COLORS = {
  none:  null,
  pipe:  '#004a7a',
  tower: '#0077aa',
}

const TERRAIN_COLORS = {
  grass: '#1a2a1a',
  water: '#0a1a2a',
  dirt:  '#2a1a0a',
}

function getTileColor(tile, layer, isHighlighted) {
  if (!tile) return '#0a0a0a'

  const hasRoad = tile.road_type && tile.road_type !== 'none'
  const roadColor = hasRoad ? (ROAD_COLORS[tile.road_type] || '#555555') : null

  if (layer === 'zones') {
    if (hasRoad) return roadColor
    return ZONE_COLORS[tile.zone_type] || '#0a0a0a'
  }
  if (layer === 'roads') {
    return roadColor || '#0a0a0a'
  }
  if (layer === 'power') {
    if (tile.power_type && tile.power_type !== 'none') return POWER_COLORS[tile.power_type]
    if (hasRoad) return roadColor
    if (isHighlighted && tile.zone_type !== 'empty') return '#3a3a00'
    return '#0a0a0a'
  }
  if (layer === 'water') {
    if (tile.water_type && tile.water_type !== 'none') return WATER_COLORS[tile.water_type]
    if (hasRoad) return roadColor
    if (isHighlighted && tile.zone_type !== 'empty') return '#003a5a'
    return '#0a0a0a'
  }

  // Overview
  if (hasRoad) return roadColor
  if (tile.zone_type && tile.zone_type !== 'empty') return ZONE_COLORS[tile.zone_type]
  return TERRAIN_COLORS[tile.terrain] || '#0a0a0a'
}

export default function Grid({
  tiles = [],
  onTileClick,
  onMouseDown,
  onMouseEnter,
  layer = 'overview',
  readonly = false,
  highlightSet = new Set(),
}) {
  const tileMap = {}
  tiles.forEach(t => { tileMap[`${t.x},${t.y}`] = t })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 16px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 16px)`,
        gap: '1px',
        background: '#111',
        border: '1px solid #2a4a2a',
        width: 'fit-content',
        userSelect: 'none',
      }}
    >
      {Array.from({ length: GRID_SIZE }, (_, y) =>
        Array.from({ length: GRID_SIZE }, (_, x) => {
          const tile = tileMap[`${x},${y}`]
          const isHighlighted = highlightSet.has(`${x},${y}`)
          const color = getTileColor(tile, layer, isHighlighted)
          return (
            <div
              key={`${x},${y}`}
              title={`${x},${y}`}
              style={{
                width: 16,
                height: 16,
                background: color,
                cursor: readonly ? 'default' : 'crosshair',
                boxSizing: 'border-box',
                border: isHighlighted ? '1px solid #4aff4a44' : 'none',
              }}
              onClick={() => { if (!readonly && onTileClick) onTileClick(x, y) }}
              onMouseDown={() => { if (!readonly && onMouseDown) onMouseDown(x, y) }}
              onMouseEnter={() => { if (!readonly && onMouseEnter) onMouseEnter(x, y) }}
            />
          )
        })
      )}
    </div>
  )
}
