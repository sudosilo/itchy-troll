import { useRef } from 'react'
import { Panel, PanelHeader, PanelBody, Btn } from './UI.jsx'
import SectionBlock from './SectionBlock.jsx'
import styles from './SectionList.module.css'

export default function SectionList({ song }) {
  const { mode, sections, addSection, removeSection, updateSection, moveSection } = song
  const dragIdx = useRef(null)

  return (
    <Panel style={{ flex: 1 }}>
      <PanelHeader title="Song Sections">
        <div className={styles.addButtons}>
          {['verse','chorus','bridge','drop','custom'].map(t => (
            <Btn key={t} size="sm" onClick={() => addSection(t)}>+ {t}</Btn>
          ))}
        </div>
      </PanelHeader>
      <PanelBody>
        {sections.length === 0 && (
          <div className={styles.emptyHint}>↑ Add sections above to start building</div>
        )}
        {sections.map((sec, idx) => (
          <SectionBlock
            key={sec.id}
            section={sec}
            mode={mode}
            onChange={(field, value) => updateSection(sec.id, field, value)}
            onRemove={() => removeSection(sec.id)}
            onDragStart={() => { dragIdx.current = idx }}
            onDragOver={() => {}}
            onDrop={() => {
              if (dragIdx.current !== null && dragIdx.current !== idx) {
                moveSection(dragIdx.current, idx)
                dragIdx.current = idx
              }
            }}
          />
        ))}
      </PanelBody>
    </Panel>
  )
}
