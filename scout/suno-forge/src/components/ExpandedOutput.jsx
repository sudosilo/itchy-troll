import { Panel, PanelHeader, PanelBody, Btn, Spinner } from './UI.jsx'
import styles from './ExpandedOutput.module.css'

function renderLine(line, key) {
  const t = line.trim()
  if (!t) return <br key={key} />
  if (/^\[.+\]$/.test(t)) return <span key={key} className={styles.outDesc}>{t}{'\n'}</span>
  if (/^Style:/i.test(t)) return <span key={key} className={styles.outStyle}>{t}{'\n'}</span>
  const lm = t.match(/^\*\*(.+)\*\*$/)
  if (lm) return <span key={key} className={styles.outLyrics}>**{lm[1]}**{'\n'}</span>
  const bm = t.match(/^\((.+)\)$/)
  if (bm) return <span key={key} className={styles.outBackup}>({bm[1]}){'\n'}</span>
  return <span key={key} className={styles.outMuted}>{t}{'\n'}</span>
}

export default function ExpandedOutput({ plain, loading, onClose, onRegen, songTitle }) {
  function copyExpanded() {
    if (!plain) return
    const full = (songTitle ? `// ${songTitle}\n\n` : '') + plain
    navigator.clipboard.writeText(full)
  }

  if (!loading && !plain) return null

  return (
    <Panel>
      <PanelHeader title="✦ Expanded Song" badge="AI GENERATED">
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" onClick={onRegen} disabled={loading}>↺ Regen</Btn>
          <Btn size="sm" variant="accent" onClick={copyExpanded} disabled={!plain}>⬡ Export to SUNO</Btn>
          <Btn size="sm" onClick={onClose}>✕</Btn>
        </div>
      </PanelHeader>
      <PanelBody>
        <div className={styles.outputArea}>
          {loading
            ? <div className={styles.loadingRow}><Spinner /> Building full song structure...</div>
            : plain.split('\n').map((line, i) => renderLine(line, i))
          }
        </div>
      </PanelBody>
    </Panel>
  )
}
