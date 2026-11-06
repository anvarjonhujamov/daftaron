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

// TZ 28.21: xodim (do'kon egasi boshqa) — huquqlarda staff.manage yo'q
const WORKER_PERMS = ['debt.create', 'payment.create', 'customer.edit']

test("Xodim: o'z do'konimni ochish → POST /onboarding/shop, keyin onboarding davomi", async ({ page }) => {
    let opened = false
    const { calls } = await mockApi(page, {
        overrides: {
            'GET /auth/me': (route, { f }) => route.fulfill({ json: opened
                ? { user: { ...f.user, tenant_id: 50 }, active_tenant: { id: 50, name: 'Aziz savdo', owner_id: 7 }, available_tenants: [{ ...f.tenant, owner_id: 99 }, { id: 50, name: 'Aziz savdo', owner_id: 7 }] }
                : { user: f.user, active_tenant: { ...f.tenant, owner_id: 99 }, available_tenants: [{ ...f.tenant, owner_id: 99 }] } }),
            'GET /settings': (route, { f }) => route.fulfill({ json: { ...f.settings, permissions: opened ? f.settings.permissions : WORKER_PERMS } }),
            'GET /tenants': (route) => route.fulfill({ json: { active_tenant_id: 12, tenants: [{ id: 12, name: 'Barkamol Market', is_owner: false, is_active: true }] } }),
            'GET /onboarding': (route) => route.fulfill({ json: { step: 'done', completed: true, profile: { name: 'Xurshidbek', region_id: null, district_id: null } } }),
            'POST /onboarding/shop': (route) => {
                opened = true
                return route.fulfill({ status: 201, json: { message: "Do'kon saqlandi.", tenant: { id: 50, name: 'Aziz savdo' }, onboarding: { step: 'customer', completed: false } } })
            }
        }
    })
    await page.goto('/shops')
    await expect(page.getByText('Xodim sifatida')).toBeVisible()
    await page.getByRole('button', { name: "O'z do'konimni ochish" }).click()
    await expect(page.getByRole('heading', { name: "Siz va do'koningiz" })).toBeVisible()
    await page.getByLabel("Do'kon nomi").fill('Aziz savdo')
    await page.getByRole('button', { name: 'Keyingisi' }).click()
    await expect(page.getByRole('heading', { name: "Birinchi mijozni qo'shing" })).toBeVisible()
    expect(calls.find((c) => c.path === '/onboarding/shop').body).toMatchObject({ name: 'Aziz savdo', owner_name: 'Xurshidbek' })
})

test("Ikki rolli hisob: ish beruvchi do'konidan o'z do'koniga o'tish (GET /tenants → PUT /tenants/active)", async ({ page }) => {
    const { calls } = await mockApi(page, {
        overrides: {
            'GET /auth/me': (route, { f }) => route.fulfill({ json: { user: f.user, active_tenant: { ...f.tenant, owner_id: 99 }, available_tenants: [{ ...f.tenant, owner_id: 99 }, { id: 50, name: 'Aziz savdo', owner_id: 7 }] } }),
            'GET /settings': (route, { f }) => route.fulfill({ json: { ...f.settings, permissions: WORKER_PERMS } }),
            'GET /tenants': (route) => route.fulfill({ json: { active_tenant_id: 12, tenants: [
                { id: 50, name: 'Aziz savdo', is_owner: true, is_active: false },
                { id: 12, name: 'Barkamol Market', is_owner: false, is_active: true }
            ] } }),
            'PUT /tenants/active': (route) => route.fulfill({ json: { message: "Faol do'kon yangilandi.", active_tenant: { id: 50, name: 'Aziz savdo' } } })
        }
    })
    await page.goto('/shops')
    await expect(page.getByText("O'z do'koningiz", { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: "O'z do'konimni ochish" })).toHaveCount(0)
    await page.getByRole('button', { name: "O'tish" }).click()
    await expect(page).toHaveURL(/\/$/)
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/tenants/active').body).toEqual({ tenant_id: 50 })
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

test("Oddiy ta'rif: hamma ta'riflar narxi va limitdan tashqari narxlar bilan, Pro'ga o'tish", async ({ page }) => {
    const oddiy = (f) => ({ ...f.subscription, current_plan_id: 1, usage: { ...f.subscription.usage, plan_name: 'Oddiy', shop_used: 1, shop_total_limit: 1, worker_used: 0, worker_total_limit: 0 } })
    const { calls } = await mockApi(page, {
        overrides: {
            'GET /subscription/status': (route, { f }) => route.fulfill({ json: oddiy(f) }),
            'POST /subscription/choose/2': (route) => route.fulfill({ json: { message: 'Obuna muvaffaqiyatli faollashtirildi.', current_plan_id: 2 } })
        }
    })
    await page.goto('/subscription')
    for (const name of ['Oddiy', 'Pro', 'Premium']) await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Xodim qo'shib bo'lmaydi").first()).toBeVisible()
    // Pro: bazada debt_limit = 0, lekin limits.debt = null — «Cheksiz nasiya»
    await expect(page.getByText('Cheksiz nasiya').first()).toBeVisible()
    await expect(page.getByText("Nasiya yozib bo'lmaydi")).toHaveCount(0)
    await expect(page.getByText("190 so'm/SMS").first()).toBeVisible()
    await expect(page.getByText("+1 do'kon")).toBeVisible()
    await page.getByRole('button', { name: "Proga o'tish" }).click()
    await page.getByRole('button', { name: 'Tasdiqlash' }).click()
    await expect.poll(() => calls.some((c) => c.method === 'POST' && c.path.endsWith('/subscription/choose/2'))).toBe(true)

    // Sozlamalarda ham ta'riflar ko'rinadi
    await page.goto('/settings/account')
    await expect(page.getByRole('button', { name: "Proga o'tish" }).first()).toBeVisible()
})

test("Oddiy ta'rif: do'kon limiti tugagan — qo'shish o'rniga ta'riflarga", async ({ page }) => {
    await mockApi(page, {
        overrides: {
            'GET /subscription/status': (route, { f }) => route.fulfill({ json: { ...f.subscription, current_plan_id: 1, usage: { ...f.subscription.usage, plan_name: 'Oddiy', shop_used: 1, shop_total_limit: 1 } } }),
            'GET /shops': (route, { f }) => route.fulfill({ json: { active_tenant_id: f.user.tenant_id, usage: { base: 1, extra: 0, total: 1, used: 1, remaining: 0 }, data: [{ id: f.user.tenant_id, name: 'Barkamol Market', is_owner: true, is_active: true, stats: {} }] } })
        }
    })
    await page.goto('/shops')
    await expect(page.getByText("Do'kon limiti tugagan")).toBeVisible()
    await page.getByRole('button', { name: "Do'kon", exact: true }).click()
    await expect(page).toHaveURL(/\/subscription$/)
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

test("Foydalanish qo'llanmasi: qurilma bo'yicha guruhlar, havolalar yangi oynada", async ({ page, isMobile }) => {
    await mockApi(page)
    await page.goto('/settings/documents')
    await page.getByRole('link', { name: /Foydalanish qo'llanmasi.*Hujjat, video, havola/ }).first().click()
    await expect(page).toHaveURL(/\/guides$/)
    await expect(page.getByRole('heading', { name: "Foydalanish qo'llanmasi" })).toBeVisible()

    // Hozirgi qurilmaga mos guruh birinchi
    const groups = await page.locator('section h2').allTextContents()
    expect(groups).toEqual(isMobile
        ? ['Telefon uchun', 'Kompyuter uchun', 'Barcha qurilmalar uchun']
        : ['Kompyuter uchun', 'Telefon uchun', 'Barcha qurilmalar uchun'])

    const pdf = page.getByRole('link', { name: /Kompyuterda ishlash/ })
    await expect(pdf).toHaveAttribute('href', 'https://api.test/api/public/guides/1/file')
    await expect(pdf).toHaveAttribute('target', '_blank')
    await expect(pdf).toContainText('Fayl · 2,4 MB')
    await expect(page.getByRole('link', { name: /Telefonda ishlash/ })).toContainText('Video')
    // https bo'lmagan havola chiqmaydi
    await expect(page.getByText('Xavfsiz emas')).toHaveCount(0)
})

test("Foydalanish qo'llanmasi: bo'sh holat", async ({ page }) => {
    await mockApi(page, { overrides: { 'GET /public/guides': (route) => route.fulfill({ json: { data: [] } }) } })
    await page.goto('/guides')
    await expect(page.getByText("Hozircha qo'llanma yo'q")).toBeVisible()
})

test("Foydalanish qo'llanmasi: xato va qayta urinish", async ({ page }) => {
    let failed = false
    await mockApi(page, {
        overrides: {
            'GET /public/guides': (route, { f }) => {
                if (!failed) {
                    failed = true
                    return route.fulfill({ status: 500, json: { message: 'Xato' } })
                }
                return route.fulfill({ json: { data: f.guides } })
            }
        }
    })
    await page.goto('/guides')
    await page.getByRole('button', { name: 'Qayta urinish' }).click()
    await expect(page.getByRole('link', { name: /Telegram kanal/ })).toBeVisible()
})

for (const [name, url] of [['Click', /my\.click\.uz\/services\/pay/], ['Payme', /checkout\.paycom\.uz/]]) {
    test(`Balansni to'ldirish: ${name} tanlanganda oyna ochiladi va to'lov sahifasiga o'tadi`, async ({ page }) => {
        const errors = []
        page.on('pageerror', (e) => errors.push(e.message))
        await mockApi(page)
        await page.route(url, (route) => route.fulfill({ body: 'ok' }))
        await page.goto('/subscription')
        await page.getByRole('button', { name, exact: true }).click()
        const dialog = page.getByRole('dialog', { name: "Balansni to'ldirish" })
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('radio', { name, exact: true })).toBeChecked()
        await dialog.getByLabel('Summa').fill('50000')
        await dialog.getByRole('button', { name: `${name} orqali to'lash` }).click()
        await expect(page).toHaveURL(url)
        expect(errors).toEqual([])
    })
}
