import { useState } from 'react'
import { Panel, PanelHeader, PanelBody, FormGroup, Select, Btn, Spinner } from './UI.jsx'
import { SECTION_TYPES } from '../lib/constants.js'
import { buildStyleString, callClaude } from '../lib/songUtils.js'
import styles from './DescriptorGenerator.module.css'

export default function DescriptorGenerator({ song, onInsertDescriptor }) {
  const [sectionType, setSectionType] = useState('Verse')
  const [chips, setChips] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const typeOptions = SECTION_TYPES[song.mode]

  async function generate() {
    setLoading(true)
    setError('')
    setChips([])

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

    const prompt = `You write [musical descriptors] for song sections on the Suno platform.

Generate 6 descriptors for a [${sectionType}] section.
Style: ${styleStr || 'original'}
Mode: ${song.mode === 'edm' ? 'EDM/Electronic' : 'Band/Vocal'}${song.mode === 'edm' ? `, ${song.bpm} BPM` : ''}

Rules:
- Each descriptor is a SHORT phrase: instrumentation, energy, dynamics, texture, production mood ONLY
- NEVER include lyrics, vocal phrases, or anything a singer would say
- No brackets, no numbering — just the raw descriptor text
- One per line

Return ONLY the descriptor text, one per line. Nothing else.`

    try {
      const raw = await callClaude(prompt, 300)
      const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean)
      setChips(lines)
    } catch (e) {
      setError('API error — check connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel>
      <PanelHeader title="Descriptor Generator" badge="[ ] only" />
      <PanelBody>
        <FormGroup label="Section Type">
          <Select value={sectionType} onChange={setSectionType} options={typeOptions} />
        </FormGroup>
        <Btn onClick={generate} disabled={loading} style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>
          {loading ? <><Spinner /> Generating...</> : '✦ Generate [Descriptor]'}
        </Btn>
        {error && <div className={styles.error}>{error}</div>}
        {chips.length > 0 && (
          <>
            <div className={styles.chipRow}>
              {chips.map((chip, i) => (
                <span key={i} className={styles.chip} onClick={() => onInsertDescriptor(chip)}>
                  {chip}
                </span>
              ))}
            </div>
            <div className={styles.hint}>↑ Click to paste into focused section descriptor</div>
          </>
        )}
      </PanelBody>
    </Panel>
  )
}
