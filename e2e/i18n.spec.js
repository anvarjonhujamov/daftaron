import { test, expect } from '@playwright/test'
import { mockApi } from './mock-api'

// Ilova tili: uz_latn (asosiy), uz_cyrl (lotindan transliteratsiya), ru (src/i18n/ru.js)

test('Til: kirish sahifasida almashadi (rus, kirill, lotin)', async ({ page }) => {
    await mockApi(page, { loggedIn: false })
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Kod olish' })).toBeVisible()

    await page.getByRole('radio', { name: 'Русский' }).click()
    await expect(page.getByRole('button', { name: 'Получить код' })).toBeVisible()
    await expect(page.getByLabel('Номер телефона')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    await page.getByRole('radio', { name: 'Ўзбек' }).click()
    await expect(page.getByRole('button', { name: 'Код олиш' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'uz-Cyrl')

    // Tanlov qurilmada saqlanadi
    await page.reload()
    await expect(page.getByRole('button', { name: 'Код олиш' })).toBeVisible()
    await page.getByRole('radio', { name: "O'zbek" }).click()
    await expect(page.getByRole('button', { name: 'Kod olish' })).toBeVisible()
})

test('Til: kirishdan oldin tanlangan til kirgandan keyin serverga yoziladi', async ({ page }) => {
    const { calls } = await mockApi(page, {
        loggedIn: false,
        overrides: {
            'POST /auth/otp/request': (route) => route.fulfill({ json: { message: 'SMS yubordik', phone: '+998901234567', channel: 'sms', expires_in: 120, resend_in: 60 } }),
            'POST /auth/otp/verify': (route, { f }) => route.fulfill({ status: 201, json: { token: '5|tok', user: f.user, is_new_user: false } }),
            'PUT /profile': (route) => route.fulfill({ json: { user: {}, preferences: { language: 'ru' } } })
        }
    })
    await page.goto('/login')
    await page.getByRole('radio', { name: 'Русский' }).click()
    await page.getByLabel('Номер телефона').fill('90 123 45 67')
    await page.getByRole('button', { name: 'Получить код' }).click()
    await expect(page.getByRole('heading', { name: 'Введите код' })).toBeVisible()
    await page.getByLabel('код из 4 цифр').fill('4821')
    // Server profile.language = uz_latn, lekin kirish sahifasidagi tanlov ustun
    await expect(page.getByRole('link', { name: 'Клиенты' }).first()).toBeVisible()
    await expect.poll(() => calls.find((c) => c.method === 'PUT' && c.path === '/profile')?.body).toMatchObject({ language: 'ru' })
})

test("Til: serverdagi til qo'llanadi va API'ga X-Locale yuboriladi", async ({ page }) => {
    const langs = new Set()
    page.on('request', (req) => { if (req.url().startsWith('http://api.test/')) langs.add(req.headers()['x-locale']) })
    const { f } = await mockApi(page, {
        overrides: {
            'GET /settings': (route, { f }) => route.fulfill({ json: { ...f.settings, profile: { ...f.settings.profile, language: 'uz_cyrl' } } })
        }
    })
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: /Мижозлар/ })).toBeVisible()
    // Mijoz ismi (foydalanuvchi ma'lumoti) transliteratsiya qilinmaydi
    await expect(page.getByText(f.customers[0].name).locator('visible=true').first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: /Мижозлар/ })).toBeVisible()
    expect(langs).toContain('uz_cyrl')
})

test("Til: Sozlamalarda tanlanadi — ilova darhol o'zgaradi va serverga yoziladi", async ({ page }) => {
    const { calls } = await mockApi(page, {
        overrides: { 'PUT /profile': (route) => route.fulfill({ json: { user: {}, preferences: { language: 'ru' } } }) }
    })
    await page.goto('/settings/appearance')
    await page.getByRole('radio', { name: 'Русский' }).click()
    await expect(page.getByRole('radiogroup', { name: 'Язык' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Клиенты' }).first()).toBeVisible()
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/profile').body).toMatchObject({ language: 'ru' })
})
