import { Fragment, createElement, useSyncExternalStore } from 'react'
import ru from './ru'
import cyrl from './uz_cyrl'
import { toCyrillic } from './cyrillic'

// Ilova tili: uz_latn (asosiy), uz_cyrl, ru — backend'dagi profile.language qiymatlari.
// Kalit — o'zbekcha (lotin) matnning o'zi: t("Mijozlar"). Ruscha — ru.js lug'atidan, kirill — lotindan
// transliteratsiya (to'liq matn uz_cyrl.js'da bo'lsa, o'shasi). Tarjima topilmasa lotin matni chiqadi.
//
// Modul darajasidagi o'zgarmaslarda t() chaqirmang (til almashganda qayta hisoblanmaydi):
// matnni o'zbekcha saqlang, ko'rsatishda t(item.label) qiling.

export const LANGS = [
    { value: 'uz_latn', label: "O'zbek", html: 'uz' },
    { value: 'uz_cyrl', label: 'Ўзбек', html: 'uz-Cyrl' },
    { value: 'ru', label: 'Русский', html: 'ru' }
]

const STORAGE_KEY = 'lang'
// Kirish sahifasida tanlangan til: kirgandan keyin serverga yoziladi (server qiymati ustidan)
const PENDING_KEY = 'lang_pending'
const isLang = (v) => LANGS.some((l) => l.value === v)

const read = (key) => {
    try { return localStorage.getItem(key) } catch { return null }
}

let current = isLang(read(STORAGE_KEY)) ? read(STORAGE_KEY) : 'uz_latn'
const listeners = new Set()
const cyrlCache = new Map()

const applyHtmlLang = () => {
    document.documentElement.lang = LANGS.find((l) => l.value === current).html
}
applyHtmlLang()

export const getLang = () => current

export const setLang = (lang, { pending = false } = {}) => {
    if (!isLang(lang)) return
    try {
        localStorage.setItem(STORAGE_KEY, lang)
        if (pending) localStorage.setItem(PENDING_KEY, '1')
        else localStorage.removeItem(PENDING_KEY)
    } catch { /* ignore */ }
    if (lang === current) return
    current = lang
    applyHtmlLang()
    listeners.forEach((fn) => fn())
}

export const isLangPending = () => read(PENDING_KEY) === '1'

const subscribe = (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
}

export const useLang = () => useSyncExternalStore(subscribe, getLang)

// Rus tilida son bilan kelishish: "{n} клиент|{n} клиента|{n} клиентов" (son — vars.count yoki vars.n)
const ruForm = (n) => {
    const a = Math.abs(n) % 100
    const b = a % 10
    if (a > 10 && a < 20) return 2
    if (b === 1) return 0
    if (b > 1 && b < 5) return 1
    return 2
}

const fill = (s, vars) => {
    // Qiymatlardan biri React element (havola, <strong>) bo'lsa — massiv qaytadi: {t('{link} yangilandi', { link: <Link/> })}
    if (Object.values(vars).some((v) => v !== null && typeof v === 'object')) {
        return s.split(/(\{\w+\})/).filter(Boolean).map((part, i) => {
            const k = part.match(/^\{(\w+)\}$/)?.[1]
            const v = k && k in vars ? vars[k] : part
            return typeof v === 'object' && v !== null ? createElement(Fragment, { key: i }, v) : String(v ?? '')
        })
    }
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])))
}

export function t(text, vars) {
    if (typeof text !== 'string' || !text) return text
    let s = text
    if (current === 'ru') {
        s = ru[text] || text
        if (s.includes('|')) {
            const forms = s.split('|')
            const n = parseInt(String(vars?.count ?? vars?.n ?? '').replace(/\D/g, ''), 10)
            s = forms[Number.isFinite(n) ? Math.min(ruForm(n), forms.length - 1) : forms.length - 1]
        }
    } else if (current === 'uz_cyrl') {
        s = cyrl[text] || cyrlCache.get(text)
        if (!s) {
            s = toCyrillic(text)
            cyrlCache.set(text, s)
        }
    }
    return vars ? fill(s, vars) : s
}

// Modul darajasidagi variantlar ro'yxati (Chips/Select): label ko'rsatishda tarjima qilinadi
export const tOpts = (items) => items.map((i) => ({ ...i, label: t(i.label) }))

// Modul darajasidagi matnni tarjima kaliti deb belgilash (o'zgarmaydi; ko'rsatishda t(x) qiling).
// i18n tekshiruv skripti t('...') va tk('...') ichidagi kalitlarni yig'adi
export const tk = (s) => s
