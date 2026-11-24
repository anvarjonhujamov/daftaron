// i18n tekshiruvi: src/ dagi t('...') va tk('...') kalitlari ru.js'da bormi, ru.js'da ortiqcha kalit yo'qmi,
// {o'zgaruvchi}lar mosmi. Ishlatish: npm run i18n:check (tarjimasi yo'q kalit bo'lsa — exit 1)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ru from '../src/i18n/ru.js'

const SRC = new URL('../src/', import.meta.url).pathname
const files = []
const walk = (dir) => readdirSync(dir).forEach((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { if (f !== 'i18n') walk(p) } else if (/\.jsx?$/.test(f)) files.push(p)
})
walk(SRC)

// t('...'), t("..."), tk('...') — birinchi argument literal satr
const CALL = /(?<![\w.])tk?\(\s*(['"])((?:\\.|(?!\1).)*)\1/g
const unescape = (s) => s.replace(/\\(.)/g, '$1')
const used = new Map()
for (const f of files) {
    const code = readFileSync(f, 'utf8')
    for (const m of code.matchAll(CALL)) {
        const key = unescape(m[2])
        if (!used.has(key)) used.set(key, f.slice(SRC.length))
    }
}

const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const missing = [...used].filter(([k]) => !(k in ru))
const unused = Object.keys(ru).filter((k) => !used.has(k))
const badVars = Object.entries(ru).filter(([k, v]) => v.split('|').some((form) => vars(form) !== vars(k)))

console.log(`Kalitlar: ${used.size}, ru.js: ${Object.keys(ru).length}`)
if (missing.length) console.log(`\nRuscha tarjimasi yo'q (${missing.length}):\n` + missing.map(([k, f]) => `  ${JSON.stringify(k)}  — ${f}`).join('\n'))
if (unused.length) console.log(`\nru.js'da ishlatilmaydigan (${unused.length}):\n` + unused.map((k) => `  ${JSON.stringify(k)}`).join('\n'))
if (badVars.length) console.log(`\n{o'zgaruvchi}lar mos emas (${badVars.length}):\n` + badVars.map(([k, v]) => `  ${JSON.stringify(k)} → ${JSON.stringify(v)}`).join('\n'))
process.exit(missing.length || badVars.length ? 1 : 0)
