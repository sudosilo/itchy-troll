import { Panel, PanelHeader, PanelBody, FormGroup, TextInput, Tabs, Select } from './UI.jsx'
import styles from './SongInfo.module.css'

const VIBE_OPTIONS = ['','Dark & Driving','Euphoric','Melancholic','Aggressive','Chill & Hypnotic','Uplifting','Chaotic','Groovy','Atmospheric','Raw & Gritty']
const TEMPO_OPTIONS = ['','Slow Burn (60–80 BPM)','Mid-Tempo (90–110 BPM)','Driving (120–130 BPM)','Club (130–140 BPM)','Hard & Fast (140–160 BPM)','Jungle / DnB (170+ BPM)']

export default function SongInfo({ song }) {
  const { mode, setMode, songTitle, setSongTitle, vibe, setVibe, tempo, setTempo, key, setKey } = song

  return (
    <Panel>
      <PanelHeader title="Song Info">
        <div className={styles.modeIndicator}>
          <div className={[styles.modeDot, styles[`modeDot_${mode}`]].join(' ')} />
          <span>{mode.toUpperCase()}</span>
        </div>
      </PanelHeader>
      <PanelBody>
        <FormGroup label="Song Title">
          <TextInput value={songTitle} onChange={setSongTitle} placeholder="Untitled" />
        </FormGroup>
        <FormGroup label="Mode">
          <Tabs
            options={[{ value: 'band', label: 'Band / Vocal' }, { value: 'edm', label: 'EDM / Electronic' }]}
            value={mode}
            onChange={setMode}
          />
        </FormGroup>
        <FormGroup label="Vibe / Energy">
          <Select
            value={vibe}
            onChange={setVibe}
            options={VIBE_OPTIONS.map(v => ({ value: v, label: v || '— Select —' }))}
          />
        </FormGroup>
        <FormGroup label="Tempo / Feel">
          <Select
            value={tempo}
            onChange={setTempo}
            options={TEMPO_OPTIONS.map(t => ({ value: t, label: t || '— Select —' }))}
          />
        </FormGroup>
        <FormGroup label="Key / Mode (optional)">
          <TextInput value={key} onChange={setKey} placeholder="e.g. A minor, F# major" />
        </FormGroup>
      </PanelBody>
    </Panel>
  )
}
