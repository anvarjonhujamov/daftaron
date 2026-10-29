import { test, expect } from '@playwright/test'
import { mockApi } from './mock-api'

// Test nomlari UserFlow-Mobile.md 22-bo'lim va UserFlow-Desktop.md bandlari bo'yicha

test('22.1 Kirish: SMS-kod bilan (yangi raqam → onboarding)', async ({ page }) => {
    const { calls } = await mockApi(page, {
        loggedIn: false,
        overrides: {
            'POST /auth/otp/request': (route) => route.fulfill({ json: { message: 'SMS yubordik', phone: '+998901234567', channel: 'sms', expires_in: 120, resend_in: 60 } }),
            'POST /auth/otp/verify': (route, { f }) => route.fulfill({ status: 201, json: { token: '5|new', user: { ...f.user, tenant_id: null }, is_new_user: true, onboarding: { step: 'shop', completed: false } } }),
            'GET /auth/me': (route, { f }) => route.fulfill({ json: { user: { ...f.user, tenant_id: null }, active_tenant: null, available_tenants: [] } }),
            'GET /onboarding': (route) => route.fulfill({ json: { step: 'shop', completed: false } })
        }
    })
    await page.goto('/login')
    await page.getByLabel('Telefon raqam').fill('90 123 45 67')
    await page.getByRole('button', { name: 'Kod olish' }).click()
    await expect(page.getByRole('heading', { name: 'Kodni kiriting' })).toBeVisible()
    await expect(page.getByText('Kodni qayta yuborish:')).toBeVisible()
    await page.getByLabel('4 xonali kod').fill('4821')
    await expect(page.getByRole('heading', { name: "Do'koningiz nomi nima?" })).toBeVisible()
    expect(calls.find((c) => c.path === '/auth/otp/verify').body).toMatchObject({ phone: '+998901234567', code: '4821' })
})

test("22.2 Mijoz ichidan nasiya: kechagi sana va izoh bilan", async ({ page, isMobile }) => {
    const { calls } = await mockApi(page)
    await page.goto('/customers/31')
    await expect(page.getByRole('heading', { name: 'Aziz aka' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Nasiya', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Aziz akaga nasiya')).toBeVisible()
    if (isMobile) {
        for (const k of ['8', '5', '000']) await dialog.getByRole('button', { name: k, exact: true }).click()
    } else {
        await dialog.getByLabel('Summa').fill('85000')
    }
    await dialog.getByRole('radio', { name: 'Kecha' }).click()
    await dialog.getByRole('button', { name: "Izoh qo'shish" }).click()
    await dialog.getByLabel('Izoh').fill("un, yog'")
    await dialog.getByRole('button', { name: /Saqlash — 85 000/ }).click()
    await expect(dialog.getByText('Nasiya yozildi')).toBeVisible()
    const sent = calls.find((c) => c.method === 'POST' && c.path === '/debts').body
    expect(sent).toMatchObject({ customer_id: 31, amount: 85000, note: "un, yog'", send_sms: true })
    expect(sent.given_at < new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10)).toBe(true)
})

test("22.4 To'lov: umumiy rejim va ortiqcha to'lov balansga", async ({ page }) => {
    const { calls } = await mockApi(page)
    await page.goto('/customers/31')
    await page.getByRole('button', { name: /^To'lov( olish)?$/ }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel("Qancha to'ladi?").fill('60000')
    await expect(dialog.getByText('Mijoz balansiga')).toBeVisible()
    await dialog.getByRole('button', { name: /To'lovni saqlash/ }).click()
    await expect(dialog.getByText("To'lov qabul qilindi")).toBeVisible()
    await expect(dialog.getByText(/Balansga yozildi: 6 000/)).toBeVisible()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/customers/31/payments').body).toMatchObject({ amount: 60000, mode: 'auto', method: 'cash' })
})

test("22.6 Muddati o'tganlarga ommaviy SMS", async ({ page }) => {
    const { calls } = await mockApi(page)
    await page.goto('/overdue')
    await expect(page.getByText('2 ta tanlandi.')).toBeVisible()
    await expect(page.getByText('2 ta SMS ketadi')).toBeVisible()
    await page.getByRole('button', { name: /Tanlanganlarga SMS \(2\)/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Yuborish' }).click()
    await expect(page.getByText('2 ta SMS yuborildi')).toBeVisible()
    const real = calls.filter((c) => c.path === '/overdue/bulk-sms' && c.body.dry_run === false)
    expect(real).toHaveLength(1)
    expect(real[0].body.customer_ids.sort()).toEqual([32, 34])
})

test('22.10 Sozlamalar: eslatmalarni saqlash', async ({ page, isMobile }) => {
    const { calls } = await mockApi(page)
    await page.goto(isMobile ? '/settings/reminders' : '/settings')
    const scope = isMobile ? page : page.locator('#reminders')
    await scope.getByRole('switch', { name: "To'lov qabul qilinganda SMS" }).click()
    await scope.getByRole('button', { name: 'Saqlash', exact: true }).click()
    await expect(page.getByText('Saqlandi')).toBeVisible()
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/settings/notifications').body).toMatchObject({ sms_on_payment: true, reminder_time: '09:00' })
})
