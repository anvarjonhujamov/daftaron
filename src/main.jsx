import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '@fontsource-variable/inter'
import { registerSW } from 'virtual:pwa-register'

// sw.js nginx'da uzoq keshlanadi, shuning uchun yangilanishni o'zimiz tekshiramiz:
// har soatda va ilova qayta ochilganda. Yangi SW (skipWaiting + clientsClaim) faollashganda sahifa yangilanadi.
registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
        if (!registration) return
        const check = () => {
            if (navigator.onLine) registration.update().catch(() => {})
        }
        setInterval(check, 60 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') check()
        })
    }
})
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
)
