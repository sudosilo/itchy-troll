import { useRef } from 'react'
import { SECTION_TYPES, DEFAULT_DESCS } from '../lib/constants.js'
import { Btn } from './UI.jsx'
import styles from './SectionBlock.module.css'

export default function SectionBlock({ section, mode, onChange, onRemove, onDragStart, onDragOver, onDrop }) {
  const blockRef = useRef(null)

  function handleTypeChange(newType) {
    onChange('type', newType)
    if (!section.desc || Object.values(DEFAULT_DESCS).includes(section.desc)) {
      onChange('desc', DEFAULT_DESCS[newType] || '')
    }
  }

  return (
    <div
      ref={blockRef}
      className={styles.block}
      data-section-id={section.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver(e) }}
      onDrop={onDrop}
    >
      <div className={styles.header}>
        <span className={styles.dragHandle}>⠿</span>
        <select
          className={styles.typeSelect}
          value={section.type}
          onChange={e => handleTypeChange(e.target.value)}
        >
          {SECTION_TYPES[mode].map(t => <option key={t}>{t}</option>)}
        </select>
        <Btn variant="danger" size="sm" onClick={onRemove}>✕</Btn>
      </div>

      <div className={styles.body}>
        <input
          type="text"
          className={styles.descField}
          value={section.desc}
          onChange={e => onChange('desc', e.target.value)}
          placeholder="[Instruments, energy, dynamics — NO lyrics here]"
        />
        <textarea
          className={styles.lyricsField}
          value={section.lyrics}
          onChange={e => onChange('lyrics', e.target.value)}
          placeholder="Primary lyrics..."
        />
        <div className={styles.backupRow}>
          <label className={styles.backupLabel}>Backup / Harmony Vocals</label>
          <input
            type="text"
            className={styles.backupField}
            value={section.backup}
            onChange={e => onChange('backup', e.target.value)}
            placeholder="(Backup vocal lines...)"
          />
        </div>
      </div>
    </div>
  )
}
