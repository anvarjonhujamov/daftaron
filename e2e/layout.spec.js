import { test, expect } from '@playwright/test'
import { mockApi } from './mock-api'

// Har kenglikda gorizontal skroll bo'lmasin (360, 390, 768, 1024, 1440)
const WIDTHS = [360, 390, 768, 1024, 1440]
const PAGES = ['/', '/customers', '/customers/31', '/overdue', '/settings', '/subscription', '/login']

test.describe('Moslashuvchanlik', () => {
    test.skip(({ isMobile }) => isMobile, 'bir marta yetarli')
    for (const width of WIDTHS) {
        test(`${width}px: gorizontal skroll yo'q`, async ({ page }) => {
            await mockApi(page, { loggedIn: true })
            await page.setViewportSize({ width, height: 900 })
            for (const path of PAGES) {
                await page.goto(path)
                await page.waitForLoadState('networkidle')
                // Gorizontal skroll konteyneri ichidagilardan tashqari hech narsa ekran chetidan chiqmasin
                const outside = await page.evaluate(() => {
                    const scrollable = (el) => {
                        for (let p = el.parentElement; p; p = p.parentElement) {
                            const o = getComputedStyle(p).overflowX
                            if ((o === 'auto' || o === 'scroll' || o === 'hidden') && p !== document.body && p !== document.documentElement) return true
                        }
                        return false
                    }
                    return [...document.querySelectorAll('body *')]
                        .filter((el) => el.offsetParent !== null && !el.closest('dialog'))
                        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) })
                        .filter((el) => !scrollable(el))
                        .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)} "${el.textContent.trim().slice(0, 30)}"`)
                        .slice(0, 5)
                })
                expect(outside, `${path} @ ${width}`).toEqual([])
                if (process.env.SHOTS) await page.screenshot({ path: `e2e/.shots/${width}${path.replace(/\//g, '_') || '_home'}.png`, fullPage: true })
            }
        })
    }
})
