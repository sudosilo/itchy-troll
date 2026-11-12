import styles from './UI.module.css'

export function Panel({ children, style }) {
  return <div className={styles.panel} style={style}>{children}</div>
}

export function PanelHeader({ title, badge, children }) {
  return (
    <div className={styles.panelHeader}>
      <span className={styles.panelTitle}>{title}</span>
      {badge && <span className={styles.aiBadge}>{badge}</span>}
      {children}
    </div>
  )
}

export function PanelBody({ children, style }) {
  return <div className={styles.panelBody} style={style}>{children}</div>
}

export function FormGroup({ label, children }) {
  return (
    <div className={styles.formGroup}>
      {label && <label className={styles.label}>{label}</label>}
      {children}
    </div>
  )
}

export function Btn({ children, onClick, variant = 'default', size = 'md', style, disabled }) {
  const cls = [
    styles.btn,
    styles[`btn_${variant}`],
    styles[`btn_${size}`],
  ].filter(Boolean).join(' ')
  return (
    <button className={cls} onClick={onClick} style={style} disabled={disabled}>
      {children}
    </button>
  )
}

export function Tabs({ options, value, onChange }) {
  return (
    <div className={styles.tabs}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={[styles.tabBtn, value === opt.value ? styles.tabBtnActive : ''].join(' ')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Select({ value, onChange, options, style }) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={style}
    >
      {options.map(o =>
        typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  )
}

export function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input
      type="text"
      className={styles.textInput}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
    />
  )
}

export function Spinner() {
  return <div className={styles.spinner} />
}
