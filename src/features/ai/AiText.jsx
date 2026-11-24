import { Fragment } from 'react'
import { safeUrl } from '../../lib/sanitize'

// Yordamchi javobi: oddiy Markdown — **qalin**, "- " ro'yxat, "1." qadamlar, qator uzilishi, https havola.
// HTML sifatida emas, React elementlari bilan chiziladi (innerHTML yo'q): matndagi <teg> shunchaki matn bo'lib ko'rinadi.

const INLINE = /\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|(https:\/\/[^\s<>"'()]+[^\s<>"'().,!?;:])/g

function inline(text, key) {
    const out = []
    let last = 0
    for (const m of text.matchAll(INLINE)) {
        if (m.index > last) out.push(text.slice(last, m.index))
        if (m[3]) {
            const href = safeUrl(m[3])
            out.push(href
                ? <a key={`${key}-${m.index}`} href={href} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-brand-strong underline">{m[3]}</a>
                : m[3])
        } else {
            out.push(<strong key={`${key}-${m.index}`} className="font-bold">{m[1] || m[2]}</strong>)
        }
        last = m.index + m[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
}

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBER = /^\s*(\d{1,3})[.)]\s+(.*)$/
const HEADING = /^\s*#{1,4}\s+(.*)$/

// Matn → bloklar: { type: 'p', lines } | { type: 'ul'|'ol', start, items: [lines] }
export function parseBlocks(text) {
    const blocks = []
    let cur = null
    const close = () => { cur = null }
    for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
        const line = raw.replace(/\s+$/, '')
        if (!line.trim()) { close(); continue }
        const b = line.match(BULLET)
        const n = !b && line.match(NUMBER)
        if (b || n) {
            const type = b ? 'ul' : 'ol'
            if (!cur || cur.type !== type) {
                cur = { type, start: n ? Number(n[1]) : 1, items: [] }
                blocks.push(cur)
            }
            cur.items.push([b ? b[1] : n[2]])
            continue
        }
        // Ro'yxat bandining davomi (bo'sh joy bilan boshlangan qator)
        if (cur && cur.type !== 'p' && /^\s+/.test(raw)) {
            cur.items[cur.items.length - 1].push(line.trim())
            continue
        }
        const h = line.match(HEADING)
        const content = h ? `**${h[1]}**` : line
        if (!cur || cur.type !== 'p') {
            cur = { type: 'p', lines: [] }
            blocks.push(cur)
        }
        cur.lines.push(content)
    }
    return blocks
}

const lines = (list, key) => list.map((l, i) => (
    <Fragment key={i}>{i > 0 && <br />}{inline(l, `${key}-${i}`)}</Fragment>
))

export default function AiText({ text }) {
    const blocks = parseBlocks(text)
    return (
        <div className="space-y-2 break-words">
            {blocks.map((b, i) => {
                if (b.type === 'p') return <p key={i}>{lines(b.lines, i)}</p>
                const List = b.type === 'ul' ? 'ul' : 'ol'
                return (
                    <List key={i} start={b.type === 'ol' && b.start !== 1 ? b.start : undefined}
                        className={b.type === 'ul' ? 'list-disc space-y-1 pl-5' : 'list-decimal space-y-1 pl-6'}>
                        {b.items.map((item, j) => <li key={j} className="pl-0.5">{lines(item, `${i}-${j}`)}</li>)}
                    </List>
                )
            })}
        </div>
    )
}

// Nusxa olish uchun: Markdown belgilarisiz matn
export const plainText = (text) => String(text || '').replace(/\*\*([^*\n]+?)\*\*/g, '$1').replace(/__([^_\n]+?)__/g, '$1')
