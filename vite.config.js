import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Ilova ichida ko'rsatiladigan build versiyasi: package.json versiyasi + build vaqti (Asia/Tashkent)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const buildStamp = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '.')
const APP_VERSION = `${pkg.version}+${buildStamp}`

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(APP_VERSION)
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            // Ro'yxatdan o'tkazish src/main.jsx da (virtual:pwa-register): yangilanishni tekshirish + avtomatik reload
            injectRegister: false,
            includeAssets: ['favicon.png', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Daftaron - Nasiya Boshqaruvi',
                short_name: 'Daftaron',
                description: 'Nasiya va qarzdorlik boshqaruvi ilovasi',
                theme_color: '#3b82f6',
                background_color: '#f8fafc',
                display: 'standalone',
                orientation: 'portrait',
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
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => request.destination === 'font',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'fonts',
                            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24
                            }
                        }
                    }
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
        host: true,
        proxy: {
            '/overdue': {
                target: 'https://daftaron.firstcoder.uz',
                changeOrigin: true,
                secure: true
            },
            '/sanctum': {
                target: 'https://daftaron.firstcoder.uz',
                changeOrigin: true,
                secure: true
            }
        }
    }
})
