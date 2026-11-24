import { test, expect } from '@playwright/test'
import { mockApi, sseRoute, AI_REPLY } from './mock-api'

// AI yordamchi: UserFlow-Mobile.md 15-bo'lim, UserFlow-Desktop.md 16-bo'lim

const fabOf = (page, name = 'AI yordamchi') => page.getByRole('button', { name, exact: true })
const panelOf = (page, name = 'DaftarOn yordamchisi') => page.getByRole('dialog', { name })
const noTip = (page) => page.addInitScript(() => localStorage.setItem('ai_tip_seen', '1'))
// Til: qurilma sozlamasi va server profili bir xil bo'lsin (sessiya profil tilini qo'llashi mumkin)
const withLang = (lang) => ({
    'GET /settings': (route, { f }) => route.fulfill({ json: { ...f.settings, profile: { ...f.settings.profile, language: lang } } })
})

async function send(panel, text, isMobile) {
    const input = panel.getByLabel('Savol', { exact: true })
    await input.fill(text)
    if (isMobile) await panel.getByRole('button', { name: 'Yuborish' }).click()
    else await input.press('Enter')
}

test('15.1 AI: tugma → panel → savol → oqim bilan javob → 👍', async ({ page, isMobile }) => {
    const { calls } = await mockApi(page)
    await noTip(page)
    await page.goto('/')
    const fab = fabOf(page)
    await expect(fab).toBeVisible()
    await fab.click()

    const panel = panelOf(page)
    await expect(panel.getByRole('heading', { name: 'DaftarOn yordamchisi' })).toBeVisible()
    await expect(panel.getByText('Assalomu alaykum, Xurshidbek!')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Bugun kimlar qarzini qaytarishi kerak?' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Jami qarz qancha?' })).toBeVisible()
    await expect(panel.getByText('AI xato qilishi mumkin. Muhim raqamlarni tekshiring.')).toBeVisible()
    await expect(panel.getByText('Bugun 27 ta savol qoldi')).toBeVisible()

    await send(panel, 'Bugun kim qaytaradi?', isMobile)
    await expect(panel.getByText("Aziz aka — 22 000 so'm")).toBeVisible()
    await expect(panel.locator('strong', { hasText: '2 ta mijoz' })).toBeVisible()
    await expect(panel.locator('ol > li')).toHaveCount(2)
    await expect(panel.getByText('Bugun 26 ta savol qoldi')).toBeVisible()
    await expect(panel.getByText('Bugungi qarzlar')).toBeVisible()
    expect(calls.find((c) => c.method === 'POST' && c.path === '/ai/chat').body).toEqual({
        conversation_id: null, message: 'Bugun kim qaytaradi?', locale: 'uz', context: { route: '/', screen: 'Bosh sahifa' }
    })

    const up = panel.getByRole('button', { name: 'Foydali javob' })
    await up.click()
    await expect(up).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => calls.find((c) => c.path === '/ai/messages/341/feedback')?.body).toEqual({ rating: 'up' })

    // Yopib, boshqa sahifaga o'tib qayta ochilganda suhbat joyida; keyingi savol shu suhbatga va yangi sahifa konteksti bilan
    await panel.getByRole('button', { name: 'Yopish' }).click()
    await expect(panel).toBeHidden()
    await page.getByRole('link', { name: 'Mijozlar', exact: true }).first().click()
    await expect(page).toHaveURL(/\/customers$/)
    await fab.click()
    await expect(panel.getByText("Aziz aka — 22 000 so'm")).toBeVisible()
    await send(panel, 'Yana bitta savol', isMobile)
    await expect.poll(() => calls.filter((c) => c.path === '/ai/chat').length).toBe(2)
    expect(calls.filter((c) => c.path === '/ai/chat')[1].body).toMatchObject({
        conversation_id: 12, message: 'Yana bitta savol', context: { route: '/customers', screen: 'Mijozlar' }
    })

    // Yangi suhbat: bo'sh holat va mijozlar sahifasiga mos tezkor savollar
    await panel.getByRole('button', { name: 'Yangi suhbat' }).click()
    await expect(panel.getByRole('button', { name: "Muddati o'tganlar kimlar?" })).toBeVisible()
    await expect(panel.getByRole('button', { name: "Mijozni qanday qo'shaman?" })).toBeVisible()
})

for (const [lang, fabName, panelName, chip, locale] of [
    ['ru', 'AI-помощник', 'Помощник DaftarOn', 'Кто просрочил оплату?', 'ru'],
    ['uz_cyrl', 'AI ёрдамчи', 'DaftarOn ёрдамчиси', 'Муддати ўтганлар кимлар?', 'uz_Cyrl']
]) {
    test(`15.2 AI: ${lang} — tugma nomi, tezkor savol va locale`, async ({ page }) => {
        const { calls } = await mockApi(page, { overrides: withLang(lang) })
        await page.addInitScript((l) => {
            localStorage.setItem('lang', l)
            localStorage.setItem('ai_tip_seen', '1')
        }, lang)
        await page.goto('/customers')
        await fabOf(page, fabName).click()
        const panel = panelOf(page, panelName)
        await panel.getByRole('button', { name: chip }).click()
        await expect.poll(() => calls.find((c) => c.path === '/ai/chat')?.body).toMatchObject({
            message: chip, locale, context: { route: '/customers', screen: 'Mijozlar' }
        })
        await expect(panel.getByText("Aziz aka — 22 000 so'm")).toBeVisible()
    })
}

test('15.3 AI: kunlik limit tugadi (429) — matn qaytadi, «Ta\'riflar» tugmasi', async ({ page, isMobile }) => {
    await mockApi(page, {
        overrides: {
            'POST /ai/chat': (route) => route.fulfill({ status: 429, json: { message: 'Bugungi limit tugadi', reason: 'ai_daily_limit', limit: 30, used: 30, left: 0, resets_at: '2026-11-25T00:00:00+05:00' } })
        }
    })
    await noTip(page)
    await page.goto('/')
    await fabOf(page).click()
    const panel = panelOf(page)
    await send(panel, 'Jami qarz?', isMobile)
    await expect(panel.getByText("Bugungi savollar limiti tugadi. Ertaga yana so'rashingiz yoki Pro ta'rifga o'tishingiz mumkin")).toBeVisible()
    await expect(panel.getByText('Bugun 0 ta savol qoldi')).toBeVisible()
    const input = panel.getByLabel('Savol', { exact: true })
    await expect(input).toBeDisabled()
    await expect(input).toHaveValue('Jami qarz?')
    await expect(panel.locator('[role="log"]')).toHaveCount(0)
    await panel.getByRole('button', { name: "Ta'riflar" }).click()
    await expect(page).toHaveURL(/\/subscription$/)
})

test('15.4 AI: yordamchi o\'chirilgan (503) — @daftaron_support havolasi', async ({ page, isMobile }) => {
    await mockApi(page, {
        overrides: { 'POST /ai/chat': (route) => route.fulfill({ status: 503, json: { message: "O'chirilgan", reason: 'ai_disabled' } }) }
    })
    await noTip(page)
    await page.goto('/settings')
    await fabOf(page).click()
    const panel = panelOf(page)
    await send(panel, 'Salom', isMobile)
    await expect(panel.getByText(/Yordamchi vaqtincha ishlamayapti\./)).toBeVisible()
    await expect(panel.getByRole('link', { name: '@daftaron_support' })).toHaveAttribute('href', 'https://t.me/daftaron_support')
    await expect(panel.getByLabel('Savol', { exact: true })).toBeDisabled()
})

for (const [name, reply] of [
    ['enabled: false', (route) => route.fulfill({ json: { enabled: false, plan: 'pro', limit: 0, used: 0, left: 0 } })],
    ['404 (backend hali chiqmagan)', (route) => route.fulfill({ status: 404, json: { message: 'Not Found' } })]
]) {
    test(`15.4 AI: /ai/usage → ${name} — tugma ko'rinmaydi`, async ({ page }) => {
        await mockApi(page, { overrides: { 'GET /ai/usage': reply } })
        await noTip(page)
        await page.goto('/support')
        await expect(page.getByRole('button', { name: 'Yordamchini ochish' })).toBeVisible()
        await page.waitForTimeout(800)
        await expect(fabOf(page)).toBeHidden()
        // Yordam sahifasidan ochilsa — holat va aloqa havolasi
        await page.getByRole('button', { name: 'Yordamchini ochish' }).click()
        const panel = panelOf(page)
        await expect(panel.getByText(/Yordamchi vaqtincha ishlamayapti\./)).toBeVisible()
        await expect(panel.getByLabel('Savol', { exact: true })).toBeDisabled()
    })
}

test('15.5 AI: internet yo\'q — kiritish o\'chiq', async ({ page, context }) => {
    await mockApi(page)
    await noTip(page)
    await page.goto('/')
    await fabOf(page).click()
    const panel = panelOf(page)
    const input = panel.getByLabel('Savol', { exact: true })
    await expect(input).toBeEnabled()
    await context.setOffline(true)
    await expect(input).toBeDisabled()
    await expect(panel.getByText('Internetga ulaning', { exact: true }).first()).toBeVisible()
    await context.setOffline(false)
    await expect(input).toBeEnabled()
})

// Oqimni bo'laklab beradigan fetch (route.fulfill javobni bir yo'la beradi). scenario — har urinish uchun:
// slow — sekin (to'xtatiladi), cut — done'siz uziladi (Qayta yuborish), full — to'liq javob
const slowStreamScript = (scenario = ['slow', 'cut', 'full']) => {
    const original = window.fetch
    let n = 0
    window.__aiChatCount = 0
    window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url
        if (!url.includes('/ai/chat')) return original(input, init)
        n += 1
        window.__aiChatCount = n
        const attempt = n
        const kind = scenario[Math.min(attempt, scenario.length) - 1]
        const enc = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const wait = (ms) => new Promise((r) => setTimeout(r, ms))
                const emit = (event, data) => controller.enqueue(enc.encode(`event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`))
                let aborted = false
                init?.signal?.addEventListener('abort', () => {
                    aborted = true
                    controller.error(new DOMException('Aborted', 'AbortError'))
                })
                emit('start', { conversation_id: 12, user_message_id: 400 + attempt })
                emit('status', { state: 'looking_up' })
                await wait(700)
                if (aborted) return
                if (kind === 'slow') {
                    emit('delta', { text: 'Birinchi qism' })
                    await wait(30000)
                } else if (kind === 'cut') {
                    emit('delta', { text: 'Uzilgan javob' })
                    controller.close()
                } else {
                    emit('delta', { text: "To'liq " })
                    await wait(200)
                    emit('delta', { text: 'javob keldi' })
                    emit('done', { conversation_id: 12, message_id: 500, usage_left: 20, title: 'Sinov' })
                    controller.close()
                }
            }
        })
        return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    }
}

test("15.6 AI: «yozmoqda», To'xtatish va uzilganda Qayta yuborish", async ({ page, isMobile }) => {
    await mockApi(page)
    await noTip(page)
    await page.addInitScript(slowStreamScript)
    await page.goto('/')
    await fabOf(page).click()
    const panel = panelOf(page)

    await send(panel, 'Birinchi savol', isMobile)
    await expect(panel.getByText("Ma'lumotlar ko'rilmoqda…")).toBeVisible()
    await expect(panel.getByText('Birinchi qism')).toBeVisible()
    await panel.getByRole('button', { name: "Javobni to'xtatish" }).click()
    await expect(panel.getByText("Javob to'xtatildi")).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Foydali javob' })).toHaveCount(0)

    await send(panel, 'Ikkinchi savol', isMobile)
    await expect(panel.getByText("Aloqa uzildi. Javob to'liq kelmadi.")).toBeVisible()
    await panel.getByRole('button', { name: 'Qayta yuborish' }).click()
    await expect(panel.getByText("To'liq javob keldi")).toBeVisible()
    await expect(panel.getByText('Uzilgan javob')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Foydali javob' })).toBeVisible()
    await expect(panel.getByText('Bugun 20 ta savol qoldi')).toBeVisible()
})

test('15.6 AI: uzilgan javob serverda saqlangan bo\'lsa qayta so\'ralmaydi', async ({ page, isMobile }) => {
    await mockApi(page, {
        overrides: {
            'GET /ai/conversations/12': (route, { f }) => route.fulfill({
                json: {
                    conversation: f.ai.conversations[0],
                    messages: [
                        { id: 401, role: 'user', text: 'Uzilgan savol', feedback: null, created_at: '2026-11-24T10:00:00+05:00' },
                        { id: 402, role: 'assistant', text: 'Serverda saqlangan to\'liq javob', feedback: null, created_at: '2026-11-24T10:00:09+05:00' }
                    ]
                }
            })
        }
    })
    await noTip(page)
    await page.addInitScript(slowStreamScript, ['cut', 'full'])
    await page.goto('/')
    await fabOf(page).click()
    const panel = panelOf(page)
    await send(panel, 'Uzilgan savol', isMobile)
    await expect(panel.getByText("Aloqa uzildi. Javob to'liq kelmadi.")).toBeVisible()
    await panel.getByRole('button', { name: 'Qayta yuborish' }).click()
    await expect(panel.getByText("Serverda saqlangan to'liq javob")).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Foydali javob' })).toBeVisible()
    expect(await page.evaluate(() => window.__aiChatCount)).toBe(1)
})

test("15.7 AI: tarix — suhbatni ochish va tasdiqlab o'chirish", async ({ page }) => {
    const { calls } = await mockApi(page)
    await noTip(page)
    await page.goto('/')
    await fabOf(page).click()
    const panel = panelOf(page)
    await panel.getByRole('button', { name: 'Suhbatlar tarixi' }).click()
    await expect(panel.getByRole('heading', { name: 'Suhbatlar tarixi' })).toBeVisible()
    await panel.getByRole('button', { name: /SMS eslatma sozlamasi/ }).click()
    await expect(panel.getByText('Eslatma qaytarish kuni soat 09:00 da bir marta ketadi. Muddati o\'tganlarga «Muddati o\'tganlar» sahifasidan qo\'lda yuborasiz.')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Foydali javob' })).toHaveAttribute('aria-pressed', 'true')

    await panel.getByRole('button', { name: 'Suhbatlar tarixi' }).click()
    await panel.getByRole('button', { name: "Suhbatni o'chirish" }).first().click()
    const confirm = page.getByRole('dialog', { name: "Suhbatni o'chirish" })
    await expect(confirm.getByText('«Bugungi qarzlar» suhbati butunlay o\'chiriladi.')).toBeVisible()
    await confirm.getByRole('button', { name: "O'chirish" }).click()
    await expect(confirm).toBeHidden()
    await expect(panel.getByRole('button', { name: /Bugungi qarzlar/ })).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /SMS eslatma sozlamasi/ })).toBeVisible()
    expect(calls.find((c) => c.method === 'DELETE')?.path).toBe('/ai/conversations/12')
})

test('15.8 AI: maslahat bir marta; nasiya oynasi ochiq bo\'lsa tugma yashirin', async ({ page }) => {
    await mockApi(page)
    await page.goto('/customers/31')
    const fab = fabOf(page)
    const tip = page.getByRole('tooltip')
    await expect(tip).toContainText("Savolingiz bormi? Yordamchidan so'rang")
    await tip.getByRole('button', { name: 'Yopish' }).click()
    await expect(tip).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem('ai_tip_seen'))).toBe('1')

    await page.getByRole('button', { name: 'Nasiya', exact: true }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(fab).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(fab).toBeVisible()

    await page.reload()
    await expect(fab).toBeVisible()
    await page.waitForTimeout(2000)
    await expect(tip).toHaveCount(0)
})

test("15.9 AI: Muddati o'tganlar pastki paneli tugma ostida qolmaydi", async ({ page }) => {
    await mockApi(page)
    await noTip(page)
    await page.goto('/overdue')
    const bar = page.locator('[data-fab-avoid]')
    await expect(bar).toBeVisible()
    const fab = fabOf(page)
    await expect(fab).toBeVisible()
    const [f, b] = [await fab.boundingBox(), await bar.boundingBox()]
    const overlapX = f.x < b.x + b.width && f.x + f.width > b.x
    if (overlapX) expect(f.y + f.height).toBeLessThanOrEqual(b.y)
})

test('15.10 AI: kompyuter — Tab panel ichida, Shift+Enter qator, Enter yuboradi, Esc yopadi', async ({ page, isMobile }) => {
    test.skip(isMobile, 'faqat kompyuter')
    const { calls } = await mockApi(page)
    await noTip(page)
    await page.goto('/')
    const fab = fabOf(page)
    await fab.focus()
    await page.keyboard.press('Enter')
    const panel = panelOf(page)
    const input = panel.getByLabel('Savol', { exact: true })
    await expect(input).toBeFocused()
    // Sahifa ishlaydi: panel modal emas
    await expect(page.getByRole('link', { name: 'Mijozlar', exact: true }).first()).toBeVisible()

    for (let i = 0; i < 9; i++) await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true)
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab')
    expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true)

    await input.fill('Birinchi qator')
    await input.press('Shift+Enter')
    await input.pressSequentially('Ikkinchi qator')
    await expect(input).toHaveValue('Birinchi qator\nIkkinchi qator')
    await input.press('Enter')
    await expect.poll(() => calls.find((c) => c.path === '/ai/chat')?.body?.message).toBe('Birinchi qator\nIkkinchi qator')
    await expect(panel.getByText("Aziz aka — 22 000 so'm")).toBeVisible()

    await input.focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(fab).toBeFocused()
})

test('15.11 AI: javobdagi HTML bajarilmaydi, havola faqat https', async ({ page, isMobile }) => {
    await mockApi(page, {
        overrides: {
            'POST /ai/chat': (route) => sseRoute(route, [
                ['start', { conversation_id: 3, user_message_id: 1 }],
                ['delta', { text: '<img src=x onerror="window.__xss=1"> <b>qalin emas</b>\n' }],
                ['delta', { text: '- javascript:alert(1)\n- https://daftaron.uz/yordam' }],
                ['done', { conversation_id: 3, message_id: 2, usage_left: 5, title: null }]
            ])
        }
    })
    await noTip(page)
    await page.goto('/')
    await fabOf(page).click()
    const panel = panelOf(page)
    await send(panel, 'test', isMobile)
    await expect(panel.getByText('<b>qalin emas</b>', { exact: false })).toBeVisible()
    await expect(panel.locator('img')).toHaveCount(0)
    expect(await page.evaluate(() => window.__xss)).toBeUndefined()
    const links = panel.locator('[role="log"] a')
    await expect(links).toHaveCount(1)
    await expect(links).toHaveAttribute('href', 'https://daftaron.uz/yordam')
    await expect(links).toHaveAttribute('rel', 'noopener noreferrer')
})

test('15.12 AI: Yordam sahifasi tugmasi panelni ochadi; qulf rejimida ham tugma bor', async ({ page }) => {
    await mockApi(page)
    await noTip(page)
    await page.goto('/support')
    await page.getByRole('button', { name: 'Yordamchini ochish' }).click()
    await expect(panelOf(page)).toBeVisible()
})

test('15.12 AI: bepul sinov tugagan (faqat ta\'rif sahifasi) — tugma va ta\'rif savollari', async ({ page }) => {
    await mockApi(page, {
        overrides: { 'GET /subscription/status': (route, { f }) => route.fulfill({ json: { ...f.subscription, trial_expired: true } }) }
    })
    await noTip(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/subscription$/)
    await fabOf(page).click()
    const panel = panelOf(page)
    await expect(panel.getByRole('button', { name: "Pro ta'rif nima beradi?" })).toBeVisible()
    await expect(panel.getByRole('button', { name: "Balansni qanday to'ldiraman?" })).toBeVisible()
})

// Qo'lda ko'rish uchun skrinshotlar (SHOTS=1): uch tilda telefon va kompyuter, planshet 1180px, tungi rejim
const SHOT_REPLY = {
    uz_latn: AI_REPLY,
    uz_cyrl: [
        AI_REPLY[0],
        ['delta', { text: 'Бугун **2 та мижоз** қарзини қайтариши керак:\n1. Aziz aka — 22 000 сўм\n2. Madina — 38 000 сўм' }],
        ['done', { conversation_id: 12, message_id: 341, usage_left: 26, title: 'Бугунги қарзлар' }]
    ],
    ru: [
        AI_REPLY[0],
        ['delta', { text: 'Сегодня долг должны вернуть **2 клиента**:\n1. Aziz aka — 22 000 сум\n2. Madina — 38 000 сум' }],
        ['done', { conversation_id: 12, message_id: 341, usage_left: 26, title: 'Долги на сегодня' }]
    ]
}
const QUESTION = { uz_latn: 'Bugun kimlar qarzini qaytarishi kerak?', uz_cyrl: 'Бугун кимлар қарзини қайтариши керак?', ru: 'Кто должен вернуть долг сегодня?' }

test.describe('AI skrinshotlar', () => {
    test.skip(() => !process.env.SHOTS, 'faqat SHOTS=1 bilan')
    for (const lang of ['uz_latn', 'uz_cyrl', 'ru']) {
        test(`skrinshot: ${lang}`, async ({ page }, info) => {
            const p = info.project.name
            await mockApi(page, { overrides: { ...withLang(lang), 'POST /ai/chat': (route) => sseRoute(route, SHOT_REPLY[lang]) } })
            await page.addInitScript((l) => localStorage.setItem('lang', l), lang)
            await page.goto('/')
            await expect(page.getByRole('tooltip')).toBeVisible()
            await page.screenshot({ path: `e2e/.shots/ai/${p}_${lang}_1_tugma.png` })
            await page.locator('.ai-fab button').last().click()
            await expect(page.getByRole('dialog').getByRole('heading').first()).toBeVisible()
            await page.waitForTimeout(700)
            await page.screenshot({ path: `e2e/.shots/ai/${p}_${lang}_2_bosh.png` })
            await page.getByRole('dialog').getByRole('button', { name: QUESTION[lang] }).click()
            await expect(page.getByRole('dialog').locator('ol > li')).toHaveCount(2)
            await page.waitForTimeout(300)
            await page.screenshot({ path: `e2e/.shots/ai/${p}_${lang}_3_javob.png` })
            if (lang === 'uz_latn') {
                await page.evaluate(() => document.documentElement.classList.add('dark'))
                await page.waitForTimeout(200)
                await page.screenshot({ path: `e2e/.shots/ai/${p}_${lang}_4_tungi.png` })
                await page.evaluate(() => document.documentElement.classList.remove('dark'))
                await page.getByRole('dialog').getByRole('button', { name: 'Suhbatlar tarixi' }).click()
                await page.waitForTimeout(300)
                await page.screenshot({ path: `e2e/.shots/ai/${p}_${lang}_5_tarix.png` })
            }
        })
    }

    test('skrinshot: planshet 1180px va holatlar', async ({ page, isMobile }) => {
        test.skip(isMobile, 'kompyuter loyihasida')
        await mockApi(page, {
            overrides: { 'POST /ai/chat': (route) => route.fulfill({ status: 429, json: { message: 'Limit', reason: 'ai_daily_limit', left: 0 } }) }
        })
        await noTip(page)
        await page.setViewportSize({ width: 1180, height: 820 })
        await page.goto('/customers')
        await fabOf(page).click()
        await expect(page.getByRole('dialog').getByRole('heading').first()).toBeVisible()
        await page.waitForTimeout(700)
        await page.screenshot({ path: 'e2e/.shots/ai/tablet1180_uz_latn_bosh.png' })
        await page.getByRole('dialog').getByRole('button', { name: "Muddati o'tganlar kimlar?" }).click()
        await expect(page.getByRole('dialog').getByText(/Bugungi savollar limiti tugadi/)).toBeVisible()
        await page.screenshot({ path: 'e2e/.shots/ai/tablet1180_uz_latn_limit.png' })
        await page.goto('/overdue')
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'e2e/.shots/ai/tablet1180_overdue_tugma.png' })
    })
})
