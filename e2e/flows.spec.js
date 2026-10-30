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
    await expect(page.getByRole('heading', { name: "Siz va do'koningiz" })).toBeVisible()
    expect(calls.find((c) => c.path === '/auth/otp/verify').body).toMatchObject({ phone: '+998901234567', code: '4821' })
})

test("Onboarding 1-qadam: ism Telegram'dan, viloyat/tuman ixtiyoriy, 422 maydon ostida", async ({ page }) => {
    let shopCalls = 0
    const { calls } = await mockApi(page, {
        overrides: {
            'GET /onboarding': (route) => route.fulfill({ json: { step: shopCalls > 1 ? 'customer' : 'shop', completed: false, profile: { name: 'Aziz Karimov', region_id: 2, district_id: null } } }),
            'POST /onboarding/shop': (route) => {
                shopCalls += 1
                if (shopCalls === 1) return route.fulfill({ status: 422, json: { message: 'Xato', errors: { district_id: ["Tuman tanlangan viloyatga tegishli emas."] } } })
                return route.fulfill({ status: 201, json: { message: "Do'kon saqlandi.", onboarding: { step: 'customer' } } })
            }
        }
    })
    await page.goto('/onboarding')
    await expect(page.getByLabel('Ismingiz')).toHaveValue('Aziz Karimov')
    await expect(page.getByLabel('Viloyat')).toHaveValue('2')
    await page.getByLabel('Ismingiz').fill('')
    await page.getByRole('button', { name: 'Keyingisi' }).click()
    await expect(page.getByText('Ismingizni kiriting')).toBeVisible()
    await expect(page.getByText("Do'kon nomini kiriting")).toBeVisible()
    expect(shopCalls).toBe(0)

    await page.getByLabel('Ismingiz').fill('Aziz')
    await page.getByLabel("Do'kon nomi").fill('Barkamol Market')
    await page.getByLabel('Viloyat').selectOption('1')
    await expect(page.getByLabel('Tuman')).toBeEnabled()
    await page.getByLabel('Tuman').selectOption('12')
    await page.getByRole('button', { name: 'Keyingisi' }).click()
    await expect(page.getByText('Tuman tanlangan viloyatga tegishli emas.')).toBeVisible()

    // Viloyat almashsa tuman tozalanadi — faqat viloyat yuboriladi
    await page.getByLabel('Viloyat').selectOption('2')
    await expect(page.getByLabel('Tuman')).toHaveValue('')
    await page.getByRole('button', { name: 'Keyingisi' }).click()
    await expect(page.getByRole('heading', { name: "Birinchi mijozni qo'shing" })).toBeVisible()
    const bodies = calls.filter((c) => c.path === '/onboarding/shop').map((c) => c.body)
    expect(bodies[0]).toMatchObject({ name: 'Barkamol Market', owner_name: 'Aziz', region_id: 1, district_id: 12 })
    expect(bodies[1]).toMatchObject({ name: 'Barkamol Market', owner_name: 'Aziz', region_id: 2 })
    expect(bodies[1]).not.toHaveProperty('district_id')
})

test('22.1 Kirish: Telegram bot orqali (tg_login kodi → token, manzildan olib tashlanadi)', async ({ page }) => {
    const { calls } = await mockApi(page, {
        loggedIn: false,
        overrides: {
            'POST /auth/telegram/exchange': (route, { f }) => route.fulfill({ json: { token: '6|tg', user: f.user, is_new_user: false, onboarding: { step: 'done', completed: true } } })
        }
    })
    await page.goto('/login?tg_login=ABC123')
    await expect(page).toHaveURL(/\/$/)
    expect(calls.find((c) => c.path === '/auth/telegram/exchange').body).toMatchObject({ code: 'ABC123' })
})

test('22.1 Kirish: Telegram havolasi eskirgan (410) — qayta kirish tugmasi', async ({ page }) => {
    const { calls } = await mockApi(page, {
        loggedIn: false,
        overrides: {
            'POST /auth/telegram/exchange': (route) => route.fulfill({ status: 410, json: { message: 'Kirish havolasi eskirgan', reason: 'telegram_login_expired' } }),
            'POST /auth/telegram/start': (route) => route.fulfill({ json: { ticket: 't1', bot_url: '/install', expires_in: 900 } })
        }
    })
    await page.goto('/login?tg_login=OLD')
    await expect(page.getByRole('alert')).toContainText('eskirgan')
    expect(page.url()).not.toContain('tg_login')
    await page.getByRole('button', { name: 'Telegram orqali qayta kirish' }).click()
    await expect(page).toHaveURL(/\/install$/)
    expect(calls.find((c) => c.path === '/auth/telegram/start').body.return_url).toMatch(/\/login$/)
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

test("Sozlamalar: ulangan Telegram chat ko'rinadi, Telegram'da kirgan — botsiz ulanadi", async ({ page, isMobile }) => {
    let chats = []
    const { calls } = await mockApi(page, {
        overrides: {
            'GET /telegram/chats': (route) => route.fulfill({ json: { bot_url: 'https://t.me/daftaron_bot', chats, can_link_self: true } }),
            'POST /telegram/link-self': (route) => {
                chats = [{ id: 3, chat_id: '555', title: 'Aziz Karimov' }]
                return route.fulfill({ status: 201, json: { message: 'Telegram ulandi.', chat: chats[0] } })
            }
        }
    })
    await page.goto(isMobile ? '/settings/reminders' : '/settings')
    const scope = isMobile ? page : page.locator('#reminders')
    await expect(scope.getByText('Hali ulanmagan.').locator('visible=true')).toBeVisible()
    await scope.getByRole('button', { name: "Telegram'ga ulash" }).click()
    await expect(scope.getByText('Aziz Karimov').locator('visible=true')).toBeVisible()
    await expect(scope.getByText('Hali ulanmagan.').locator('visible=true')).toBeHidden()
    expect(calls.some((c) => c.path === '/telegram/link-token')).toBe(false)
})

test("Do'kon nomi: /auth/me active_tenant bo'sh kelsa ham ko'rinadi", async ({ page, isMobile }) => {
    await mockApi(page, {
        overrides: {
            // Prod'dagi xato: do'konlar id'siz keladi, active_tenant — null
            'GET /auth/me': (route, { f }) => route.fulfill({ json: { user: f.user, active_tenant: null, available_tenants: [{ name: 'Barkamol Market', owner_id: 7 }] } })
        }
    })
    await page.goto('/')
    const place = isMobile ? page.getByRole('link', { name: /Barkamol Market/ }) : page.locator('aside').getByText('Barkamol Market')
    await expect(place).toBeVisible()
})

test("Oddiy ta'rif: Excel qulflangan — obuna sahifasiga, eksport so'rovi yo'q", async ({ page }) => {
    const { calls } = await mockApi(page, {
        overrides: {
            'GET /subscription/status': (route, { f }) => route.fulfill({ json: { ...f.subscription, current_plan_id: 1, usage: { ...f.subscription.usage, plan_name: 'Oddiy', export_allowed: false } } })
        }
    })
    await page.goto('/reports')
    await page.getByRole('button', { name: /Excel/ }).click()
    await expect(page).toHaveURL(/\/subscription$/)
    await expect(page.getByText("Excel'ga yuklash").first()).toBeVisible()
    expect(calls.some((c) => c.path.includes('export'))).toBe(false)
})

test('Excel: backend 403 plan_feature (blob javob) — xabar o\'qiladi, obuna sahifasiga', async ({ page }) => {
    await mockApi(page, {
        overrides: {
            'GET /history/export.xlsx': (route) => route.fulfill({ status: 403, json: { message: "Ta'rifda yo'q", reason: 'plan_feature', feature: 'export' } })
        }
    })
    await page.goto('/history')
    await page.getByRole('button', { name: /Excel/ }).click()
    await expect(page).toHaveURL(/\/subscription$/)
})
