// Sana helperlari (Asia/Tashkent, UTC+5, DST yo'q)
// toISOString().slice(0, 10) ishlatmang: Toshkentda 00:00-05:00 oralig'ida kechagi sanani beradi.

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

// Date -> Toshkent bo'yicha "YYYY-MM-DD" (qurilma timezone'idan qat'i nazar)
export const toTashkentYmd = (date = new Date()) => {
    const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS)
    const y = shifted.getUTCFullYear()
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
    const d = String(shifted.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export const todayYmd = () => toTashkentYmd(new Date())

// "YYYY-MM-DD" + n kun -> "YYYY-MM-DD" (sof kalendar arifmetikasi)
export const addDaysYmd = (ymd, days) => {
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + days))
    return dt.toISOString().slice(0, 10)
}

export const addMonthsYmd = (ymd, months) => {
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1 + months, d))
    return dt.toISOString().slice(0, 10)
}

// API qiymati -> "YYYY-MM-DD".
// Sof sana ("2026-10-20") o'zicha qaytadi; vaqtli qiymat (created_at kabi) Toshkent sanasiga o'tkaziladi
export const toYmd = (value) => {
    if (!value) return ''
    const str = String(value)
    if (YMD_RE.test(str)) return str
    const dt = new Date(str)
    return isNaN(dt.getTime()) ? '' : toTashkentYmd(dt)
}

// Eng kechki sana ("YYYY-MM-DD" satrlar leksikografik solishtiriladi), bo'shlar e'tiborsiz
export const maxYmd = (...dates) => dates.filter(Boolean).sort().pop() || ''

// a - b kunlarda ("YYYY-MM-DD" lar)
export const diffDaysYmd = (a, b) => {
    const toUtc = (ymd) => {
        const [y, m, d] = ymd.split('-').map(Number)
        return Date.UTC(y, m - 1, d)
    }
    return Math.round((toUtc(a) - toUtc(b)) / 86400000)
}
