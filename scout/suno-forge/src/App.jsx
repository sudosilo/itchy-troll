import { useState, useRef, useCallback } from 'react'
import { useSong } from './lib/useSong.js'
import { buildStyleString, callClaude, cleanBackup } from './lib/songUtils.js'
import { GENRES, EXPAND_STRUCTURE } from './lib/constants.js'
import SongInfo from './components/SongInfo.jsx'
import StyleTags from './components/StyleTags.jsx'
import EdmPanel from './components/EdmPanel.jsx'
import DescriptorGenerator from './components/DescriptorGenerator.jsx'
import SectionList from './components/SectionList.jsx'
import OutputPreview from './components/OutputPreview.jsx'
import ExpandedOutput from './components/ExpandedOutput.jsx'
import styles from './App.module.css'

export default function App() {
  const song = useSong()
  const [expandedPlain, setExpandedPlain] = useState('')
  const [expandLoading, setExpandLoading] = useState(false)
  const [showExpanded, setShowExpanded] = useState(false)
  const [flash, setFlash] = useState('')
  const lastFocusedSectionId = useRef(null)
  const flashTimer = useRef(null)

  function showFlashMsg(msg) {
    setFlash(msg)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(''), 1800)
  }

  // Track which section was last focused for descriptor insertion
  function handleDescriptorInsert(text) {
    const id = lastFocusedSectionId.current || song.sections[song.sections.length - 1]?.id
    if (!id) return
    song.updateSection(id, 'desc', text)
    showFlashMsg('DESCRIPTOR INSERTED')
  }

  async function expandSong() {
    if (!song.sections.length) return
    setExpandLoading(true)
    setShowExpanded(true)
    setExpandedPlain('')

    const styleStr = buildStyleString({
      selectedGenres: song.selectedGenres,
      customTags: song.customTags,
      vibe: song.vibe,
      tempo: song.tempo,
      key: song.key,
      mode: song.mode,
      bpm: song.bpm,
      dropStyle: song.dropStyle,
      sidechain: song.sidechain,
    })

    const isEdm = song.mode === 'edm'
    const structure = EXPAND_STRUCTURE[song.mode]

    // Build lyric lookup from seed sections
    const lyricsByType = {}
    const backupByType = {}
    song.sections.forEach(s => {
      if (s.lyrics) lyricsByType[s.type] = s.lyrics
      if (s.backup) backupByType[s.type] = s.backup
    })
    const fallbackLyrics = song.sections.find(s => s.lyrics)?.lyrics || ''
    const fallbackBackup = song.sections.find(s => s.backup)?.backup || ''

    const prompt = `You write [musical descriptors] for song sections on the Suno platform.

Given this song structure and style, write ONE short descriptor per section.
A descriptor describes ONLY: instrumentation, energy level, dynamics, texture, production mood.
NEVER include lyrics, vocal phrases, or anything a singer would say.

Style: ${styleStr || 'original'}
Mode: ${isEdm ? 'EDM/Electronic' : 'Band/Vocal'}${isEdm ? `, ${song.bpm} BPM` : ''}

Sections (one descriptor per line, in order, no labels, no brackets, no numbering):
${structure.join('\n')}

Return ONLY the descriptor text, one per line, in the same order. Nothing else.`

    try {
      const raw = await callClaude(prompt, 600)
      const descriptors = raw.trim().split('\n').map(l => l.trim()).filter(Boolean)

      const lines = []
      structure.forEach((secType, i) => {
        const desc = descriptors[i] || secType
        const noLyricSections = ['Intro', 'Outro', 'Breakdown', 'Riser']
        const lyrics = lyricsByType[secType] || (noLyricSections.includes(secType) ? '' : fallbackLyrics)
        const backup = backupByType[secType] || (lyrics ? fallbackBackup : '')

        lines.push(`[${desc}]`)
        if (lyrics) lyrics.split('\n').forEach(l => { if (l.trim()) lines.push(`**${l.trim()}**`) })
        if (backup) {
          backup.split('\n').forEach(l => {
            const c = cleanBackup(l)
            if (c) lines.push(`(${c})`)
          })
        }
        lines.push('')
      })

      lines.push(`Style:\n${styleStr}`)
      setExpandedPlain(lines.join('\n').trim())
    } catch (e) {
      setExpandedPlain('// API error — try again')
    } finally {
      setExpandLoading(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>SUNO FORGE</span>
          <span className={styles.logoSub}>Song Builder</span>
        </div>
        <span className={styles.headerBadge}>VITE + REACT</span>
      </header>

      {flash && <div className={styles.flash}>{flash}</div>}

      <div className={styles.mainGrid}>
        {/* LEFT COLUMN */}
        <div className={styles.leftCol}>
          <SongInfo song={song} />
          <StyleTags song={song} />
          {song.mode === 'edm' && <EdmPanel song={song} />}
          <DescriptorGenerator song={song} onInsertDescriptor={handleDescriptorInsert} />
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightCol}>
          <div onFocusCapture={e => {
            const block = e.target.closest('[data-section-id]')
            if (block) lastFocusedSectionId.current = block.dataset.sectionId
          }}>
            <SectionList song={song} />
          </div>
          <OutputPreview
            song={song}
            onExpandSong={expandSong}
            expandLoading={expandLoading}
          />
          {showExpanded && (
            <ExpandedOutput
              plain={expandedPlain}
              loading={expandLoading}
              songTitle={song.songTitle}
              onClose={() => setShowExpanded(false)}
              onRegen={expandSong}
            />
          )}
        </div>
      </div>
    </div>
  )
}
