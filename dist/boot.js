// Ilova yuklanishidan oldin: tungi rejim (oq "chaqnash" bo'lmasin) va Telegram SDK.
// Alohida fayl — CSP inline skriptlarga ruxsat bermaydi.
(function () {
    try {
        var theme = localStorage.getItem('theme')
        var dark = theme ? theme === 'dark' : false
        if (dark) document.documentElement.classList.add('dark')
    } catch (e) { /* ignore */ }

    // Telegram SDK faqat Telegram ichida, async (oddiy brauzerda sahifani bloklamaydi)
    var inTelegram = /tgWebApp/.test(window.location.hash) || !!window.TelegramWebviewProxy || window.parent !== window
    try { inTelegram = inTelegram || !!sessionStorage.getItem('__telegram__initParams') } catch (e) { /* ignore */ }
    if (!inTelegram) return
    var s = document.createElement('script')
    s.src = 'https://telegram.org/js/telegram-web-app.js'
    s.async = true
    s.onload = function () { window.dispatchEvent(new Event('telegram-sdk-loaded')) }
    document.head.appendChild(s)
})()
