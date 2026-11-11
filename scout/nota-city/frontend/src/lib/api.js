// NOTA CITY - src/lib/api.js
// Central API connector. All backend calls go through here.
// VITE_API_URL is set in .env.local for local dev
// and in Vercel environment variables for production.

import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({ baseURL: BASE })

// City meta - population, funds, tick count
export const getCity = () => api.get('/api/city')
export const updateCity = (data) => api.put('/api/city', data)

// Grid tiles - the 32x32 map
export const getTiles = () => api.get('/api/tiles')
export const getTile = (x, y) => api.get(`/api/tiles/${x}/${y}`)
export const updateTile = (x, y, data) => api.put(`/api/tiles/${x}/${y}`, data)

// Tick log - event history
export const getTicks = () => api.get('/api/ticks')
export const getTicksByType = (type) => api.get(`/api/ticks/${type}`)
