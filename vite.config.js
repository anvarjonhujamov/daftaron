import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const DEFAULT_API_URL = 'https://daftaron.firstcoder.uz/api/v1'
// Yandex Metrika hisoblagichi (daftaron.uz va web.daftaron.uz uchun bitta). 0 — o'chiq
const DEFAULT_METRIKA_ID = 114490025

// Content-Security-Policy faqat build'da: dev server inline skript (HMR) ishlatadi.
// Token localStorage'da — begona skript yuklanmasligi shart (XSS'dan himoya).
// Metrika yoqilgan bo'lsa, faqat mc.yandex.ru qo'shiladi (tag.js, hit'lar).
function cspPlugin(apiUrl, metrika) {
    const apiOrigin = new URL(apiUrl).origin
    const ym = metrika ? ' https://mc.yandex.ru' : ''
    const csp = [
        "default-src 'self'",
        `script-src 'self' https://telegram.org${ym}`,
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob:${ym}`,
        "font-src 'self' data:",
        `connect-src 'self' ${apiOrigin}${ym}`,
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; ')
    return {
            name: 'daftaron-csp',
            apply: 'build',
            transformIndexHtml: (html) => html.replace(
                '<meta charset="UTF-8" />',
                `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />`
            )
        }
    }

    // Ilova ichida ko'rsatiladigan build versiyasi: package.json versiyasi + build vaqti (Asia/Tashkent)
    const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    const buildStamp = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '.')
    const APP_VERSION = `${pkg.version}+${buildStamp}`

    export default defineConfig(({ mode }) => {
        const env = loadEnv(mode, process.cwd(), 'VITE_')
        const metrikaId = Number(env.VITE_METRIKA_ID ?? DEFAULT_METRIKA_ID) || 0
        return {
        define: {
            __APP_VERSION__: JSON.stringify(APP_VERSION),
            __METRIKA_ID__: JSON.stringify(metrikaId)
        },
        plugins: [
            react(),
            cspPlugin(env.VITE_API_URL || DEFAULT_API_URL, metrikaId > 0),
            VitePWA({
                registerType: 'autoUpdate',
                // Ro'yxatdan o'tkazish src/main.jsx da (virtual:pwa-register): yangilanishni tekshirish + avtomatik reload
                injectRegister: false,
                includeAssets: ['favicon.png', 'apple-touch-icon.png'],
                manifest: {
                    name: 'DaftarOn — nasiya daftari',
                    short_name: 'DaftarOn',
                    description: "Do'kon uchun raqamli nasiya daftari",
                    theme_color: '#2563EB',
                    background_color: '#F6F7FB',
                    display: 'standalone',
                    // Planshetda landshaft rejim ham kerak
                    orientation: 'any',
                    start_url: '/',
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable'
                        }
                    ]
                },
                workbox: {
                    // Yangi SW kutmasdan faollashadi va ochiq sahifalarni boshqaradi (registerSW sahifani yangilaydi)
                    skipWaiting: true,
                    clientsClaim: true,
                    // Shriftlar oldindan yuklanmaydi: Inter 7 ta subset (~220 KB), brauzer unicode-range bo'yicha
                    // faqat keraklisini oladi, u pastdagi 'fonts' keshiga tushadi
                    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                    // API javoblari SW'da keshlanmaydi: ular foydalanuvchi va do'konga xos (X-Tenant-Id),
                    // umumiy qurilmada boshqa odamga ko'rinib qolmasin
                    runtimeCaching: [
                        {
                            urlPattern: ({ request }) => request.destination === 'font',
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'fonts',
                                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
                            }
                        },
                    ]
                },
                devOptions: {
                    enabled: true,
                    type: 'module'
                }
            })
        ],
        build: {
            rollupOptions: {
                output: {
                    // Kutubxonalar alohida chunk: deploylar orasida o'zgarmaydi, brauzer keshidan olinadi.
                    // lucide ikonlari bitta faylga (aks holda o'nlab mayda so'rov bo'ladi)
                    manualChunks(id) {
                        if (!id.includes('node_modules')) return
                        if (id.includes('lucide-react')) return 'icons'
                        if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/.test(id)) return 'react'
                        return 'vendor'
                    }
                }
            }
        },
        server: {
            port: 5173,
            host: true
        }
    }
})
