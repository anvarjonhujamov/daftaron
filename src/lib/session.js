// Sessiya: token va foydalanuvchi localStorage'da (backend Sanctum Bearer).
// Chiqishda shu qurilmadagi barcha ma'lumot (keshlar ham) o'chiriladi — umumiy kompyuterda
// keyingi odam oldingi do'kon mijozlarini ko'rmasin.

// theme — qurilma sozlamasi; supplier_* — eski versiyadan qolgan, hali serverga yuborilmagan
// ta'minotchi yozuvlari (suppliers.api.js migratsiyasi) — o'chsa qayta tiklab bo'lmaydi
const keep = (key) => key === 'theme' || /^supplier_(\d+_(purchases|payments)|unsynced_v1)$/.test(key)

export const getToken = () => {
    try { return localStorage.getItem('token') } catch { return null }
}

export const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

export const setSession = (token, user) => {
    clearLocalData()
    localStorage.setItem('token', token)
    if (user) localStorage.setItem('user', JSON.stringify(user))
}

export const setUser = (user) => {
    if (user) localStorage.setItem('user', JSON.stringify(user))
}

export const clearLocalData = () => {
    try {
        Object.keys(localStorage).filter((k) => !keep(k)).forEach((k) => localStorage.removeItem(k))
        sessionStorage.removeItem('chunk_reload')
    } catch { /* ignore */ }
    // Eski versiya service worker'i API javoblarini 'api-cache' ga yozgan
    if (typeof caches !== 'undefined') caches.delete('api-cache').catch(() => {})
}

// Brauzer va tizim nomi: "Android · Chrome" (faol qurilmalar ro'yxatida ko'rinadi)
export const deviceName = () => {
    const ua = navigator.userAgent || ''
    const os = /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
        : /Windows/i.test(ua) ? 'Windows'
        : /Mac OS/i.test(ua) ? 'macOS'
        : /Linux/i.test(ua) ? 'Linux' : 'Web'
    const browser = /Telegram/i.test(ua) || window.Telegram?.WebApp?.initData ? 'Telegram'
        : /YaBrowser/i.test(ua) ? 'Yandex'
        : /Edg\//i.test(ua) ? 'Edge'
        : /OPR\//i.test(ua) ? 'Opera'
        : /Chrome\//i.test(ua) ? 'Chrome'
        : /Firefox\//i.test(ua) ? 'Firefox'
        : /Safari\//i.test(ua) ? 'Safari' : 'Brauzer'
    return `${os} · ${browser}`
}
