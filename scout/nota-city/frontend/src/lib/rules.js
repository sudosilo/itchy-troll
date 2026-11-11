// NOTA CITY - src/lib/rules.js
// Placement validation rules.

export function buildTileMap(tiles) {
  const map = {}
  tiles.forEach(t => { map[`${t.x},${t.y}`] = t })
  return map
}

export function getNeighbors(x, y, tileMap) {
  return [
    tileMap[`${x},${y-1}`],
    tileMap[`${x},${y+1}`],
    tileMap[`${x-1},${y}`],
    tileMap[`${x+1},${y}`],
  ].filter(Boolean)
}

// A tile is considered a road if it exists and has a non-none road_type
function isRoad(tile) {
  return tile && tile.road_type && tile.road_type !== 'none'
}

// A tile is considered zoned if it exists and has a non-empty zone_type
function isZoned(tile) {
  return tile && tile.zone_type && tile.zone_type !== 'empty'
}

export function canPlaceZone(x, y, zoneType, tileMap) {
  if (zoneType === 'empty') return { allowed: true }
  const tile = tileMap[`${x},${y}`]
  if (isRoad(tile)) {
    return { allowed: false, reason: 'Cannot zone a road tile' }
  }
  const neighbors = getNeighbors(x, y, tileMap)
  const hasRoad = neighbors.some(n => isRoad(n))
  if (!hasRoad) {
    return { allowed: false, reason: 'Zone requires an adjacent road' }
  }
  return { allowed: true }
}

export function canPlaceRoad(x, y, roadType, tileMap) {
  if (roadType === 'none') return { allowed: true }
  const tile = tileMap[`${x},${y}`]
  if (isZoned(tile)) {
    return { allowed: false, reason: 'Cannot place road on a zone tile' }
  }
  return { allowed: true }
}

export function canPlacePower(x, y, powerType, tileMap) {
  if (powerType === 'none') return { allowed: true }
  const tile = tileMap[`${x},${y}`]
  if (isZoned(tile)) {
    return { allowed: false, reason: 'Cannot place power on a zone tile' }
  }
  return { allowed: true }
}

export function canPlaceWater(x, y, waterType, tileMap) {
  if (waterType === 'none') return { allowed: true }
  const tile = tileMap[`${x},${y}`]
  if (isZoned(tile)) {
    return { allowed: false, reason: 'Cannot place water on a zone tile' }
  }
  return { allowed: true }
}

export function getConnectedTiles(tiles, sourceCheck, conductorCheck) {
  const tileMap = buildTileMap(tiles)
  const visited = new Set()
  const queue = []
  tiles.forEach(t => {
    if (sourceCheck(t)) {
      queue.push(t)
      visited.add(`${t.x},${t.y}`)
    }
  })
  while (queue.length > 0) {
    const current = queue.shift()
    const neighbors = getNeighbors(current.x, current.y, tileMap)
    neighbors.forEach(n => {
      const key = `${n.x},${n.y}`
      if (!visited.has(key) && conductorCheck(n)) {
        visited.add(key)
        queue.push(n)
      }
    })
  }
  return visited
}

export function getPoweredZones(tiles) {
  return getConnectedTiles(
    tiles,
    t => t.power_type === 'plant',
    t => t.power_type !== 'none' || t.zone_type !== 'empty'
  )
}

export function getWaterServedZones(tiles) {
  return getConnectedTiles(
    tiles,
    t => t.water_type === 'tower',
    t => t.water_type !== 'none' || t.zone_type !== 'empty'
  )
}
