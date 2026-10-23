export function cleanDescriptor(s) {
  return s.replace(/^\[|\]$/g, '').trim()
}

export function cleanBackup(s) {
  return s.replace(/^\(|\)$|^\[|\]$/g, '').trim()
}

export function buildPlainOutput(sections) {
  const lines = []
  sections.forEach(sec => {
    const desc = cleanDescriptor(sec.desc)
    if (desc) lines.push(`[${desc}]`)
    if (sec.lyrics) {
      sec.lyrics.split('\n').forEach(l => { if (l.trim()) lines.push(`**${l.trim()}**`) })
    }
    const backup = cleanBackup(sec.backup)
    if (backup) {
      backup.split('\n').forEach(l => {
        const c = cleanBackup(l)
        if (c) lines.push(`(${c})`)
      })
    }
    lines.push('')
  })
  return lines.join('\n').trim()
}

export function buildStyleString({ selectedGenres, customTags, vibe, tempo, key, mode, bpm, dropStyle, sidechain }) {
  const parts = [...selectedGenres]
  if (customTags) parts.push(...customTags.split(',').map(s => s.trim()).filter(Boolean))
  if (vibe) parts.push(vibe)
  if (tempo) parts.push(tempo)
  if (mode === 'edm') {
    if (bpm) parts.push(`${bpm} BPM`)
    if (dropStyle) parts.push(dropStyle)
    if (sidechain) parts.push(sidechain)
  }
  if (key) parts.push(key)
  return parts.join(', ')
}

export function buildFullOutput(sections, styleStr, title) {
  const lyrics = buildPlainOutput(sections)
  let out = ''
  if (title) out += `// ${title}\n\n`
  out += `Lyrics:\n\n${lyrics}\n\n---\n\nStyle:\n${styleStr}`
  return out
}

export async function callClaude(prompt, maxTokens = 600) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await resp.json()
  return data.content?.map(c => c.text || '').join('') || ''
}
