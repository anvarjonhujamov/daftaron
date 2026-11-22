// Yandex Metrika: faqat tashriflar, manbalar va sahifalar. Vebvizor va klik xaritasi o'chiq:
// ekranda mijozlarning ismi, telefoni va qarzlari bor, ular Yandex'ga yozilmasin.
// URL'da sir bo'lishi mumkin: Mini App #tgWebAppData (init_data), ?tg_login= kodi, bot imzosi (?phone&ts&sig),
// mijoz qidiruvi (?q=). tag.js ishga tushganda location.href'ni o'zi yuboradi, shuning uchun:
// - Metrika faqat URL toza bo'lganda (hash yo'q, query'da faqat utm_*/yclid) ishga tushadi;
// - hit'lar qo'lda (defer), tozalangan URL bilan yuboriladi;
// - location.href'ni o'zi o'qiydigan beacon'lar (trackLinks, accurateTrackBounce) o'chiq.
// ID vite.config.js da (VITE_METRIKA_ID yoki DEFAULT_METRIKA_ID); 0 bo'lsa Metrika umuman yuklanmaydi.
const ID = Number(__METRIKA_ID__) || 0

let started = false
let lastUrl = null

const isSafeParam = (key) => key.startsWith('utm_') || key === 'yclid'

function isCleanLocation() {
    const { hash, search } = window.location
    if (hash && hash !== '#') return false
    return [...new URLSearchParams(search).keys()].every(isSafeParam)
}

function cleanUrl(href) {
    try {
        const u = new URL(href, window.location.origin)
        const keep = new URLSearchParams()
        u.searchParams.forEach((value, key) => {
            if (isSafeParam(key)) keep.set(key, value)
        })
        const qs = keep.toString()
        return u.origin + u.pathname + (qs ? `?${qs}` : '')
    } catch {
        return undefined
    }
}

function start() {
    started = true
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments) }
    window.ym.l = Date.now()
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://mc.yandex.ru/metrika/tag.js'
    document.head.appendChild(s)
    window.ym(ID, 'init', {
        defer: true,
        webvisor: false,
        clickmap: false,
        trackHash: false,
        trackLinks: false,
        accurateTrackBounce: false
    })
}

// Har bir sahifa o'zgarishida chaqiriladi
export function trackPage() {
    if (!ID || import.meta.env.DEV) return
    if (!started) {
        if (!isCleanLocation()) return
        start()
    }
    const url = cleanUrl(window.location.href)
    if (!url || url === lastUrl) return
    const referer = lastUrl || (document.referrer ? cleanUrl(document.referrer) : undefined)
    lastUrl = url
    window.ym(ID, 'hit', url, { referer, title: document.title })
}
