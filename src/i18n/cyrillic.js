// O'zbek lotin → kirill transliteratsiyasi (UI matnlari uchun).
// Kirill lug'ati alohida yuritilmaydi: lotin matni shu yerda o'giriladi, xato chiqqan to'liq matnlar
// uz_cyrl.js'da qo'lda beriladi. Brend va texnik so'zlar ({n}, domenlar, Click, SMS...) lotinda qoladi.

const APOS = "'ʼ‘’ʻ`"
const isApos = (c) => !!c && APOS.includes(c)
const VOWELS = 'aeiouAEIOU'

const SINGLE = {
    a: 'а', b: 'б', c: 'ц', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
    n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', z: 'з'
}

// Butun so'z (kichik harfda) — qoidadan tashqari yoziladiganlar
const WORDS = {
    yanvar: 'январь', fevral: 'февраль', aprel: 'апрель', iyun: 'июнь', iyul: 'июль',
    sentabr: 'сентябрь', oktabr: 'октябрь', noyabr: 'ноябрь', dekabr: 'декабрь'
}

// So'z boshi (qo'shimchalar bilan ham): kompyuterda → компьютерда
const STEMS = [
    ['kompyuter', 'компьютер'],
    ['sentabr', 'сентябр'],
    ['oktabr', 'октябр'],
    ['aksiya', 'акция'],
    ['litsenziya', 'лицензия'],
    ['statsionar', 'стационар'],
    ['filtr', 'фильтр'],
    ['tranzaksiya', 'транзакция'],
    ['kvitansiya', 'квитанция']
]

// Lotinda qoladigan qismlar: {o'zgaruvchi}, havola/domen, email, brend va qisqartmalar
const KEEP_RE = new RegExp([
    '\\{\\w+\\}',
    'https?:\\/\\/\\S+',
    '[\\w.+-]+@[\\w-]+\\.\\w+',
    '@\\w+',
    '\\b\\w+_\\w+\\b', // public_id kabi texnik nomlar
    '\\b[\\w-]+(?:\\.[\\w-]+)*\\.(?:uz|com|ru|org|net|app|me|co)\\b\\S*',
    '\\b(?:DaftarOn|Daftaron|Click|Payme|Paynet|Uzum|Xazna|Telegram|Eskiz|Excel|PDF|JPG|PNG|WEBP|PWA|SMS|OTP|QR|ID|INV|AI|Pro|Premium|Start|Email|Google Play|Google|Play Market|App Store|iOS|Android|iPhone|iPad|Chrome|Safari|Yandex|Ctrl|Esc|Enter|Mini App|Median|Windows|macOS|Linux|Wi-Fi|Groq|UZS)\\b',
    '\\b[A-Z]\\b(?=\\s*[—–-])' // klaviatura tugmasi: "N — nasiya"
].join('|'), 'g')

const WORD_RE = /[A-Za-z]+(?:['ʼ‘’ʻ`][A-Za-z]*)*/g

const upper = (s, on) => (on ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const matchCase = (src, out) => {
    if (src.length > 1 && src === src.toUpperCase() && /[A-Z]/.test(src)) return out.toUpperCase()
    return src[0] !== src[0].toLowerCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out
}

const letters = (w, from = 0) => {
    let out = ''
    for (let i = from; i < w.length; i++) {
        const c = w[i]
        const lc = c.toLowerCase()
        const up = c !== lc
        const next = (w[i + 1] || '').toLowerCase()

        if ((lc === 'o' || lc === 'g') && isApos(w[i + 1])) {
            out += upper(lc === 'o' ? 'ў' : 'ғ', up)
            i++
            continue
        }
        if (lc === 's' && isApos(w[i + 1]) && (w[i + 2] || '').toLowerCase() === 'h') {
            out += upper('с', up) + 'ҳ'
            i += 2
            continue
        }
        if (lc === 's' && next === 'h') { out += upper('ш', up); i++; continue }
        if (lc === 'c' && next === 'h') { out += upper('ч', up); i++; continue }
        if (lc === 'y') {
            if (next === 'o' && !isApos(w[i + 2])) { out += upper('ё', up); i++; continue }
            if (next === 'u') { out += upper('ю', up); i++; continue }
            if (next === 'a') { out += upper('я', up); i++; continue }
            if (next === 'e') { out += upper('е', up); i++; continue }
            out += upper('й', up)
            continue
        }
        if (lc === 't') {
            const rest = w.slice(i, i + 5).toLowerCase()
            if (rest === 'tsiya' || rest === 'tsion') {
                out += upper('ц', up) + (rest === 'tsiya' ? 'ия' : 'ион')
                i += 4
                continue
            }
        }
        if (lc === 'e') {
            const prev = i === from ? '' : w[i - 1]
            out += upper(!prev || VOWELS.includes(prev) ? 'э' : 'е', up)
            continue
        }
        if (isApos(c)) {
            // so'z oxiridagi tutuq — qo'shtirnoq, o'zgarmaydi
            out += i === w.length - 1 ? c : 'ъ'
            continue
        }
        out += SINGLE[lc] ? upper(SINGLE[lc], up) : c
    }
    return out
}

const word = (w) => {
    const lw = w.toLowerCase()
    if (WORDS[lw]) return matchCase(w, WORDS[lw])
    for (const [stem, cyr] of STEMS) {
        if (lw.startsWith(stem)) return matchCase(w, cyr) + letters(w, stem.length)
    }
    const out = letters(w)
    return w.length > 1 && w === w.toUpperCase() ? out.toUpperCase() : out
}

const plain = (s) => s.replace(WORD_RE, word)

export function toCyrillic(text) {
    let out = ''
    let last = 0
    for (const m of text.matchAll(KEEP_RE)) {
        out += plain(text.slice(last, m.index)) + m[0]
        last = m.index + m[0].length
        // Lotin so'zdan keyingi qo'shimcha: Telegram'ga → Telegram'га (tutuq saqlanadi)
        if (isApos(text[last]) && /\w/.test(m[0].slice(-1))) {
            out += text[last]
            last++
        }
    }
    return out + plain(text.slice(last))
}
