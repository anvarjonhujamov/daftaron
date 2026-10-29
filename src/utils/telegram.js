// Telegram Mini App (SDK index.html dagi boot.js orqali faqat Telegram ichida yuklanadi)

export const telegramWebApp = () => window.Telegram?.WebApp || null

// Imzolangan init_data (bo'sh bo'lsa — Telegram ichida emasmiz)
export const telegramInitData = () => telegramWebApp()?.initData || ''

export const initTelegramWebApp = () => {
    const app = telegramWebApp()
    if (!app) return false
    try {
        app.ready()
        app.expand()
    } catch { /* ignore */ }
    return true
}

// SDK yuklanishini kutish (async yuklanadi); Telegram ichida bo'lmasak darhol null
export const waitTelegram = (timeout = 3000) => new Promise((resolve) => {
    if (telegramWebApp()) return resolve(telegramWebApp())
    const inTelegram = /tgWebApp/.test(window.location.hash) || !!window.TelegramWebviewProxy || window.parent !== window
    if (!inTelegram) return resolve(null)
    const done = () => resolve(telegramWebApp())
    window.addEventListener('telegram-sdk-loaded', done, { once: true })
    setTimeout(done, timeout)
})

// Kontaktni so'rash: javob qatori (imzolangan) init_data sifatida backend'ga yuboriladi
export const requestTelegramContact = () => new Promise((resolve) => {
    const app = telegramWebApp()
    if (!app?.requestContact) return resolve(null)
    app.requestContact((shared, result) => resolve(shared ? (result?.response || null) : null))
})
