import { Fragment, type ReactNode } from 'react'

/* Tiny, dependency-free, XSS-safe markdown renderer (builds React nodes, never raw HTML).
   Supports: headings, paragraphs, bold/italic/inline code, fenced code, lists, tables, quotes, rules. */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${i++}`
    if (tok.startsWith('`')) out.push(<code key={key} className="rounded bg-chip px-1 py-0.5 font-mono text-[0.85em] text-brand-dark">{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('**') || tok.startsWith('__')) out.push(<strong key={key} className="font-bold">{inline(tok.slice(2, -2), key)}</strong>)
    else out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

export function Markdown({ text, invert = false }: { text: string; invert?: boolean }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }

    // fenced code
    if (line.trim().startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) buf.push(lines[i++])
      i++
      blocks.push(
        <pre key={k++} className="my-2 overflow-x-auto rounded-lg bg-[#2a1a10] p-3 font-mono text-xs leading-relaxed text-[#f3e9d6]">
          <code>{buf.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const size = ['text-xl', 'text-lg', 'text-base', 'text-base'][h[1].length - 1]
      blocks.push(
        <p key={k++} className={`mb-1 mt-3 font-display font-bold first:mt-0 ${size}`}>
          {inline(h[2], `h${k}`)}
        </p>,
      )
      i++
      continue
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const head = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]))
      blocks.push(
        <div key={k++} className="my-2 overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-chip text-brand-dark">
              <tr>
                {head.map((c, ci) => (
                  <th key={ci} className="px-3 py-2 font-bold">
                    {inline(c, `th${k}${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white text-ink">
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-line">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-1.5 align-top">
                      {inline(c, `td${k}${ri}${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // lists
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={k++} className={`my-1.5 space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, ii) => (
            <li key={ii}>{inline(it, `li${k}${ii}`)}</li>
          ))}
        </Tag>,
      )
      continue
    }

    // quote
    if (line.startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(
        <blockquote key={k++} className={`my-2 border-l-4 border-gold pl-3 ${invert ? 'opacity-90' : 'text-muted'}`}>
          {inline(buf.join(' '), `bq${k}`)}
        </blockquote>,
      )
      continue
    }

    // rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={k++} className="my-3 border-line" />)
      i++
      continue
    }

    // paragraph (merge consecutive plain lines)
    const buf: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*•]|\d+[.)])\s+)/.test(lines[i]) && !lines[i].includes('|')) buf.push(lines[i++])
    blocks.push(
      <p key={k++} className="my-1.5 first:mt-0 last:mb-0">
        {buf.map((b, bi) => (
          <Fragment key={bi}>
            {bi > 0 && <br />}
            {inline(b, `p${k}${bi}`)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div className="text-[14px] leading-relaxed">{blocks}</div>
}
