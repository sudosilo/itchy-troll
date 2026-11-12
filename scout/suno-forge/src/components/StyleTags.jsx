import { Panel, PanelHeader, PanelBody, FormGroup, TextInput } from './UI.jsx'
import { GENRES } from '../lib/constants.js'
import styles from './StyleTags.module.css'

export default function StyleTags({ song }) {
  const { mode, selectedGenres, toggleGenre, customTags, setCustomTags } = song
  const tags = [...GENRES[mode], ...GENRES.shared]

  return (
    <Panel>
      <PanelHeader title="Style Tags" badge="Style Output" />
      <PanelBody>
        <label className={styles.label}>Genre / Sound Tags</label>
        <div className={styles.genreGrid}>
          {tags.map(tag => (
            <span
              key={tag}
              className={[styles.pill, selectedGenres.includes(tag) ? styles.pillSelected : ''].join(' ')}
              onClick={() => toggleGenre(tag)}
            >
              {tag}
            </span>
          ))}
        </div>
        <FormGroup label="Custom Tags">
          <TextInput
            value={customTags}
            onChange={setCustomTags}
            placeholder="e.g. distorted bass, tape hiss"
          />
        </FormGroup>
      </PanelBody>
    </Panel>
  )
}
