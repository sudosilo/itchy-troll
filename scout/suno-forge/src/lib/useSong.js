import { useState, useCallback } from 'react'
import { SECTION_TYPES, DEFAULT_DESCS } from './constants.js'

let idCounter = 0
const newId = () => `sec_${++idCounter}`

function makeSection(type, mode) {
  const sectionTypes = SECTION_TYPES[mode]
  const resolvedType = sectionTypes.find(t => t.toLowerCase().includes(type)) || sectionTypes[0]
  return {
    id: newId(),
    type: resolvedType,
    desc: DEFAULT_DESCS[resolvedType] || '',
    lyrics: '',
    backup: '',
  }
}

export function useSong() {
  const [mode, setModeState] = useState('band')
  const [sections, setSections] = useState(() => [
    makeSection('verse', 'band'),
    makeSection('chorus', 'band'),
  ])
  const [selectedGenres, setSelectedGenres] = useState([])
  const [songTitle, setSongTitle] = useState('')
  const [customTags, setCustomTags] = useState('')
  const [vibe, setVibe] = useState('')
  const [tempo, setTempo] = useState('')
  const [key, setKey] = useState('')
  const [bpm, setBpm] = useState(128)
  const [dropStyle, setDropStyle] = useState('Hard Drop')
  const [sidechain, setSidechain] = useState('')
  const [instruments, setInstruments] = useState([{ id: 'inst_1', name: '808 Bass', level: 70 }])

  const setMode = useCallback((m) => {
    setModeState(m)
    setSections(prev => prev.map(sec => {
      const types = SECTION_TYPES[m]
      const newType = types.includes(sec.type) ? sec.type : types[0]
      return { ...sec, type: newType, desc: DEFAULT_DESCS[newType] || sec.desc }
    }))
    setSelectedGenres([])
  }, [])

  const addSection = useCallback((hint) => {
    setSections(prev => [...prev, makeSection(hint, mode)])
  }, [mode])

  const removeSection = useCallback((id) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }, [])

  const updateSection = useCallback((id, field, value) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }, [])

  const moveSection = useCallback((fromIdx, toIdx) => {
    setSections(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
  }, [])

  const toggleGenre = useCallback((genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }, [])

  const addInstrument = useCallback(() => {
    setInstruments(prev => [...prev, { id: `inst_${Date.now()}`, name: '808 Bass', level: 70 }])
  }, [])

  const updateInstrument = useCallback((id, field, value) => {
    setInstruments(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }, [])

  const removeInstrument = useCallback((id) => {
    setInstruments(prev => prev.filter(i => i.id !== id))
  }, [])

  return {
    mode, setMode,
    sections, setSections, addSection, removeSection, updateSection, moveSection,
    selectedGenres, toggleGenre,
    songTitle, setSongTitle,
    customTags, setCustomTags,
    vibe, setVibe,
    tempo, setTempo,
    key, setKey,
    bpm, setBpm,
    dropStyle, setDropStyle,
    sidechain, setSidechain,
    instruments, addInstrument, updateInstrument, removeInstrument,
  }
}
