// Telegram WebApp bilan ishlash uchun kichik helperlar

export const isTelegramWebApp = () =>
    typeof window !== 'undefined' &&
    window.Telegram &&
    window.Telegram.WebApp

export const initTelegramWebApp = () => {
    if (!isTelegramWebApp()) return false

    try {
        const { WebApp } = window.Telegram

        // Telegram WebApp tayyor bo'lgach, ilovani to'liq ekranga kengaytiramiz
        WebApp.ready()
        WebApp.expand()

        // Telegram mavzusiga mos orqa fon rangini qo'llashga harakat qilamiz
        if (WebApp.backgroundColor) {
            document.body.style.backgroundColor = WebApp.backgroundColor
        }

        return true
    } catch (e) {
        console.error('Telegram WebApp init xatolik:', e)
        return false
    }
}

