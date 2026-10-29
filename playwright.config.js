import { defineConfig, devices } from '@playwright/test'

// E2E: ilova build qilinib, API to'liq mock qilinadi (e2e/mock-api.js) — haqiqiy bazaga yozilmaydi, SMS ketmaydi
export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    fullyParallel: true,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:4174',
        channel: 'chromium',
        serviceWorkers: 'block',
        locale: 'uz-UZ',
        timezoneId: 'Asia/Tashkent'
    },
    projects: [
        { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
        { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }
    ],
    webServer: {
        command: 'VITE_API_URL=http://api.test/api/v1 npx vite build --outDir e2e/.dist --emptyOutDir && npx vite preview --outDir e2e/.dist --port 4174 --strictPort',
        port: 4174,
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    }
})
