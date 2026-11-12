import { useMemo } from 'react'
import { Panel, PanelHeader, PanelBody, Btn } from './UI.jsx'
import { buildPlainOutput, buildStyleString, buildFullOutput, cleanDescriptor, cleanBackup } from '../lib/songUtils.js'
import styles from './OutputPreview.module.css'

function renderColorized(sections, styleStr) {
  const nodes = []
  let key = 0

  sections.forEach(sec => {
    const desc = cleanDescriptor(sec.desc)
    if (desc) {
      nodes.push(<span key={key++} className={styles.outDesc}>[{desc}]</span>)
      nodes.push('\n')
    }
    if (sec.lyrics) {
      sec.lyrics.split('\n').forEach(l => {
        if (l.trim()) {
          nodes.push(<span key={key++} className={styles.outLyrics}>**{l.trim()}**</span>)
          nodes.push('\n')
        }
      })
    }
    const backup = cleanBackup(sec.backup)
    if (backup) {
      backup.split('\n').forEach(l => {
        const c = cleanBackup(l)
        if (c) {
          nodes.push(<span key={key++} className={styles.outBackup}>({c})</span>)
          nodes.push('\n')
        }
      })
    }
    nodes.push('\n')
  })

  if (styleStr) {
    nodes.push(<span key={key++} className={styles.outStyle}>Style:{'\n'}{styleStr}</span>)
  }

  return nodes
}

export default function OutputPreview({ song, onExpandSong, expandLoading }) {
  const styleStr = useMemo(() => buildStyleString({
    selectedGenres: song.selectedGenres,
    customTags: song.customTags,
    vibe: song.vibe,
    tempo: song.tempo,
    key: song.key,
    mode: song.mode,
    bpm: song.bpm,
    dropStyle: song.dropStyle,
    sidechain: song.sidechain,
  }), [song])

  const colorized = useMemo(() => renderColorized(song.sections, styleStr), [song.sections, styleStr])
  const isEmpty = song.sections.length === 0

  function copyAll() {
    const full = buildFullOutput(song.sections, styleStr, song.songTitle)
    navigator.clipboard.writeText(full).then(() => {})
  }

  function copyLyrics() {
    navigator.clipboard.writeText('Lyrics:\n\n' + buildPlainOutput(song.sections))
  }

  function copyStyle() {
    navigator.clipboard.writeText('Style:\n' + styleStr)
  }

  return (
    <Panel>
      <PanelHeader title="Output Preview">
        <div className={styles.headerBtns}>
          <Btn size="sm" variant="accent" onClick={copyAll} disabled={isEmpty}>Copy All</Btn>
        </div>
      </PanelHeader>
      <PanelBody>
        <div className={styles.outputArea}>
          {isEmpty
            ? <span className={styles.placeholder}>Build your song to see the output here...</span>
            : colorized
          }
        </div>
        <div className={styles.bottomBar}>
          <div className={styles.bottomLeft}>
            <Btn onClick={copyLyrics} disabled={isEmpty}>Copy Lyrics</Btn>
            <Btn onClick={copyStyle} disabled={isEmpty}>Copy Style</Btn>
            <Btn variant="pink" onClick={onExpandSong} disabled={isEmpty || expandLoading}>
              {expandLoading ? '⏳ Building...' : '✦ Expand Full Song'}
            </Btn>
          </div>
          <Btn variant="accent" onClick={copyAll} disabled={isEmpty}>⬡ Export to SUNO</Btn>
        </div>
      </PanelBody>
    </Panel>
  )
}
