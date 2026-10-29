import { test } from '@playwright/test'
import { mockApi } from './mock-api'

// Qo'lda ko'rish uchun skrinshotlar (SHOTS=1): oynalar va tungi rejim
test.skip(() => !process.env.SHOTS, 'faqat SHOTS=1 bilan')

test('oynalar va tungi rejim', async ({ page }, info) => {
    await mockApi(page)
    const p = info.project.name
    await page.goto('/customers/31')
    await page.getByRole('button', { name: 'Nasiya', exact: true }).first().click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `e2e/.shots/${p}_debt_sheet.png` })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /^To'lov( olish)?$/ }).first().click()
    await page.getByRole('dialog').getByLabel("Qancha to'ladi?").fill('30000')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `e2e/.shots/${p}_payment_sheet.png` })
    await page.keyboard.press('Escape')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.goto('/')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.screenshot({ path: `e2e/.shots/${p}_home_dark.png` })
})
