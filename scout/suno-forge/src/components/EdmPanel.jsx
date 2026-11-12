import { Panel, PanelHeader, PanelBody, FormGroup, Select, Btn } from './UI.jsx'
import { INSTRUMENT_OPTIONS } from '../lib/constants.js'
import styles from './EdmPanel.module.css'

const DROP_STYLES = ['Hard Drop','Filter Drop','Silence Drop','Reverse Swell Drop','Riser + Crash','Minimal Glitch Drop']
const SIDECHAIN_OPTIONS = [{ value: '', label: 'None' },'Subtle pump','Heavy pump','Ducking bass']

export default function EdmPanel({ song }) {
  const { bpm, setBpm, dropStyle, setDropStyle, sidechain, setSidechain, instruments, addInstrument, updateInstrument, removeInstrument } = song

  return (
    <Panel>
      <PanelHeader title="EDM Structure" />
      <PanelBody>
        <div className={styles.bpmRow}>
          <div>
            <div className={styles.bpmDisplay}>{bpm}</div>
            <div className={styles.bpmSub}>BPM</div>
          </div>
          <input
            type="range"
            min="60"
            max="200"
            value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className={styles.bpmSlider}
          />
        </div>

        <FormGroup label="Drop Style">
          <Select value={dropStyle} onChange={setDropStyle} options={DROP_STYLES} />
        </FormGroup>

        <FormGroup label="Sidechain">
          <Select value={sidechain} onChange={setSidechain} options={SIDECHAIN_OPTIONS} />
        </FormGroup>

        <div className={styles.instrumentsLabel}>Instruments / Elements</div>
        {instruments.map(inst => (
          <div key={inst.id} className={styles.instrumentRow}>
            <select
              className={styles.instSelect}
              value={inst.name}
              onChange={e => updateInstrument(inst.id, 'name', e.target.value)}
            >
              {INSTRUMENT_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <input
              type="range"
              min="0"
              max="100"
              value={inst.level}
              onChange={e => updateInstrument(inst.id, 'level', Number(e.target.value))}
              className={styles.levelSlider}
            />
            <span className={styles.levelVal}>{inst.level}%</span>
            <Btn variant="danger" size="sm" onClick={() => removeInstrument(inst.id)}>✕</Btn>
          </div>
        ))}
        <Btn size="sm" onClick={addInstrument} style={{ marginTop: 8 }}>+ Add Element</Btn>
      </PanelBody>
    </Panel>
  )
}
