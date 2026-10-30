# Daftaron — web SPA

Do'konlar uchun raqamli nasiya daftarining web ilovasi (`web.daftaron.uz`, PWA). Foydalanuvchilar uni mobil brauzerda, PWA sifatida yoki Telegram Mini App ichida ochadi. **Native Android ilova yo'q** (eski TWA va Expo kodlari 2026-10-30 da o'chirilgan, git tarixida bor).

Backend alohida repo: `/Applications/MAMP/htdocs/daftaron` (Laravel 12), API `https://daftaron.firstcoder.uz/api/v1`. Uning [CLAUDE.md](/Applications/MAMP/htdocs/daftaron/CLAUDE.md)'sida domen lug'ati (Tenant, Debt, Payment, Supplier...) va biznes qoidalari bor.

## API kontrakti — manba backend'da

- Endpointlar ro'yxati: backend `TZ.md`, **19-bo'lim**. So'rov/javob formatlari: **23-bo'lim** (ta'minotchilar — 24). Batafsil: backend `public/docs/openapi.yaml`.
- Har doim backend repodagi faylni o'qing: `/Applications/MAMP/htdocs/daftaron/TZ.md` (bu repoda nusxa saqlanmaydi).
- Kontraktni bu yerda takrorlamang. Backend'da yo'q endpoint chaqirmang; kerak bo'lsa avval backend'ga qo'shilsin.

## Stek

- React 19 + Vite 6, JavaScript (TypeScript yo'q), `react-router-dom` 7 (`BrowserRouter`)
- Tailwind 3 (`darkMode: 'class'`), shrift `@fontsource-variable/inter`
- `axios`, `react-hot-toast` (xabarlar), `lucide-react` (ikonlar)
- `vite-plugin-pwa` (workbox, `autoUpdate`)
- State kutubxonasi yo'q: hook'lar + `localStorage` keshi, kontekstlar — `app/session.jsx` (sessiya) va `app/actions.jsx` (nasiya/to'lov oynalari)
- i18n yo'q: UI matnlari o'zbekcha (lotin). Sozlamalardagi til tanlovi faqat backend'ga saqlanadi (SMS/bot uchun)

## Buyruqlar

```bash
npm run dev       # http://localhost:5173 (host: true)
npm run build     # dist/ ga
npm run preview
npm run test:e2e  # Playwright: build + API to'liq mock (e2e/mock-api.js), telefon 390px va kompyuter 1440px
```

ESLint yo'q. O'zgarishdan keyin kamida `npm run build`, katta o'zgarishda `npm run test:e2e`.
API manzili `.env.local` dagi `VITE_API_URL` (namuna `.env.example`), bo'lmasa **prod**. Dev'ni prod'ga ulasangiz,
yaratilgan mijoz/nasiya/to'lov haqiqiy bazaga tushadi va mijozlarga haqiqiy SMS ketadi.

## Tuzilma

```
src/
  main.jsx            # BrowserRouter, PWA SW ro'yxatdan o'tkazish (soatda bir yangilanish tekshiruvi)
  App.jsx             # barcha route'lar, lazyPage(), Private (token / onboarding tekshiruvi)
  app/                # session.jsx (me+settings+subscription, huquqlar), Layout, nav.js, actions.jsx, LegalAcceptSheet
  api/                # client.js (axios) + <resurs>.api.js; funksiya nomlari openapi operationId'ga yaqin
  features/           # bir necha sahifada ishlatiladigan oynalar: DebtSheet, PaymentSheet, CustomerPicker, SupplierSheets, TopUpSheet...
  pages/              # sahifalar (<Nom>Page.jsx), bittasi = bitta route
  ui/                 # dizayn tizimi: controls.jsx (Button, Input, MoneyInput, PhoneInput, Chips, Toggle...), display.jsx (Card, KpiCard, Row, Table, EmptyState...), Sheet.jsx (modal, Confirm, AmountPad)
  lib/                # session.js (token, chiqishda tozalash), cache.js, hooks.js (useResource...), errors.js, sanitize.js
  utils/              # date.js, format.js, phone.js, telegram.js, click.js, payme.js
public/boot.js        # tungi rejim (chaqnashsiz) va Telegram SDK'ni shartli yuklash — CSP sabab inline emas
e2e/                  # Playwright testlari (UserFlow bandlari bo'yicha nomlangan)
```

## Dizayn tizimi (DaftarOn 2.0)

- Manba: claude.ai artifact «DaftarOn 2.0 — sodda UI» (58 ekran). Logotip — `public/logo.png`, o'zgartirilmaydi.
- Rasmlar ko'rsatiladigan o'lchamda (logo 192px, to'lov ikonlari 96px balandlik): SW ularni oldindan yuklaydi, katta PNG qo'ymang.
- Ranglar faqat tokenlar orqali: `bg-bg`, `bg-card`, `bg-soft`, `text-ink`/`ink-2`/`ink-3`, `border-line`/`line-2`, `brand` (asosiy), `debt` (qarz, qizil), `pay` (to'lov, yashil), `supp` (ta'minotchi, to'q sariq), `warn`, `danger`. Har birida `-soft` (fon) varianti bor.
  Qiymatlar `src/index.css` dagi CSS o'zgaruvchilarida, tungi rejim — `.dark` bloki. **Komponentga hex va `dark:` yozilmaydi** — tokenlar o'zi almashadi.
- Matn rangi tokenlari tungi rejimda ochroq (kontrast AA). Tugma foni uchun `bg-pay-strong`, `bg-brand`, `bg-danger`; `text-debt`/`text-pay` — faqat matn.
- O'lchamlar: karta `rounded-card` (18px), input/tugma `rounded-ctl` (14px); telefonda asosiy tugma/input 56px (`size="lg"`), kompyuterda 48px.
- Formatlar: sana `dd.mm.yyyy` (`formatDate`), summa `1 250 000 so'm` (`formatMoney`/`<Money>`), telefon `+998 90 123 45 67` (`formatPhone`, kiritish — `<PhoneInput>`). Qiymat yo'q bo'lsa `—`, hech qachon `NaN`.
- Har sahifada: yuklanish (`ListSkeleton`), bo'sh holat (`EmptyState` + birinchi amal), xato (`ErrorState` + qayta urinish). Oflayn banner — `Layout`da.

## API qatlami (`src/api/`)

- `client.js`: `Authorization: Bearer` va `X-Tenant-Id` (`user.tenant_id`). 401 → `clearLocalData()` va `/login`. Fayllar (Excel, faktura) `downloadFile`/`openFile` bilan blob orqali — token URL'ga qo'yilmaydi.
- Komponentlar `axios`ni to'g'ridan-to'g'ri chaqirmaydi, faqat `xxxApi` orqali. Xato matni — `lib/errors.js` (`errorMessage`, `fieldErrors`, javobdagi `reason`).
- Ro'yxatlar: `per_page` faqat `page` bilan (max 100); javob `{ data, meta }`. Tarix va mijoz tarixi — kursor (`next_cursor`).
- Saqlashdan keyin `emitChange()` (`lib/hooks.js`) — ochiq sahifalar `useOnChange` bilan qayta yuklaydi.
- `/api/public/settings` (oferta, maxfiylik) v1 prefiksisiz: `settingsApi.publicSettings`.

## Auth, huquqlar, do'kon

- Kirish: kod bilan (`otpRequest` → `otpVerify`), ikkilamchi — parol (`/auth/login`, kerak bo'lsa SMS tasdiq). Yangi raqam → `/onboarding`.
- Telegram: Mini App ichida `LoginPage` `init_data` bilan avtomatik kiradi (kerak bo'lsa `requestContact`); bot havolasi `/telegram/web-login?phone&ts&sig` (imzo bilan). Yalang'och telefon bilan kirish yo'q.
- `session.signIn(token, user)` — oldingi foydalanuvchi keshlarini tozalab kiradi. `logout()` — server tokeni + qurilmadagi barcha ma'lumot (`theme` va yuborilmagan eski `supplier_*` yozuvlaridan tashqari).
- Huquqlar: `GET /settings → permissions` (backend TZ 28.8). UI'da `session.can('debt.delete')` — tugmani yashirish uchun; tekshiruv baribir backend'da (403). Egasi — `staff.manage` bor.
- Faol do'kon: `user.tenant_id` → `X-Tenant-Id`; almashtirish `PUT /tenants/active` (`ShopsPage`). Kesh kalitlari foydalanuvchi+do'kon bo'yicha (`lib/cache.js`).
- Obuna tugasa (`session.readOnly`): ilova ochiladi, yozish tugmalari o'chadi, tepada banner (backend yozishni 403 qiladi).

## Routing

Hammasi `App.jsx`da. Ochiq: `/login`, `/forgot-password`, `/telegram/web-login`, `/install`, `/legal/:type`, `/delete-account`. `/onboarding` — token bilan, layout'siz. Qolganlari `Private > Layout`.
Eski manzillar (`/register`, `/terms`, `/privacy-policy`, `/debts`, `/payments`, `/profile`, `/admin/legal`) yangilariga yo'naltiriladi. Noma'lum yo'l → `/`.
`LoginPage` va `HomePage` asosiy bundle'da, qolganlari `lazyPage()` bilan. Yangi sahifa qo'shsangiz `lazyPage` ishlating.

## Responsive (telefon / planshet / kompyuter)

- Telefon `< md`: pastki menyu (Asosiy · Mijozlar · Hisobot · Yana), qolgan bo'limlar `/more`da. Planshet `md`: tor yon panel. Kompyuter `lg`: 248px yon menyu (do'kon almashtirgich, badge'lar, obuna qutisi). Bo'limlar — `app/nav.js`.
- Sahifa ildizi `.page` (`index.css`). Mijozlar: `md+` da `/customers/:id` chapda ro'yxat, o'ngda karta (peshtaxta rejimi).
- Oynalar `ui/Sheet.jsx` (native `<dialog>`): telefonda pastdan, planshet/kompyuterda markazda; `Esc` yopadi, `Enter` saqlaydi.
- Kompyuter tugmalari (`Layout` → `Shortcuts`): `N` nasiya, `T` to'lov, `M` yangi mijoz, `/` yoki `Ctrl+K` qidiruv (`data-search` atributli input).
- Sticky ishlashi uchun ota elementlarda `overflow-x-hidden` emas, `clip`. Tekshirish: 360, 390, 768, 1024, 1440px (`e2e/layout.spec.js`, `SHOTS=1` — skrinshotlar).

## Xavfsizlik

- CSP build'da (`vite.config.js` → `cspPlugin`): skript faqat o'zimizdan va `telegram.org`, `connect-src` — API origin. Inline skript yozmang.
- Admin'dan keladigan HTML (`LegalPage`) faqat `sanitizeHtml` orqali; tashqi havolalar `safeUrl` (faqat https).
- Parol, kod, token'ni `localStorage`/log'ga yozmang (eski versiya xodim parollarini saqlagan — olib tashlandi). SW API javoblarini keshlamaydi.

## Kod uslubi

- 4 bo'shliq, nuqta-vergulsiz, bitta qo'shtirnoq, funksional komponentlar + hook'lar, `export default function XxxPage()`.
- Izohlar va UI matnlari o'zbekcha. Xatolar — `toast.error(errorMessage(err))`, 422 maydon xatolari — maydon ostida.
- **Sanalar:** API'ga `YYYY-MM-DD`, Toshkent vaqti (UTC+5). `toISOString().slice(0, 10)` ishlatmang — `utils/date.js` (`todayYmd`, `toYmd`, `addDaysYmd`). API sanasini ko'rsatishdan oldin `toYmd`/`formatDate`.
- Ma'lumot yuklash — `useResource(fetcher, deps, { cacheKey })` (avval keshdan, keyin fonda yangilash).
- Production'da soxta/dummy ma'lumot ko'rsatmang.

## Telegram Mini App

- `public/boot.js` SDK'ni faqat Telegram ichida async yuklaydi va `telegram-sdk-loaded` chiqaradi; `utils/telegram.js` — `waitTelegram`, `initTelegramWebApp`, `requestTelegramContact`.
- Bot menyu tugmasi `web.daftaron.uz/telegram/web-login` ni parametrsiz ochadi → `/login` → `init_data` bilan kirish.

## Ochiq vazifalar

1. Backend'da yo'q: Xazna va Uzum to'lovlari (tugmalar «tez orada»), qurilma shahri (`city: null`), rus/kirill UI tarjimasi.
2. Javob shakli hujjatlashtirilmagan joylar (UI ehtiyotkor o'qiydi): `GET /shops` → `usage`, `GET /debts/{id}/reminders` → `sent[]`, `GET /staff/{id}` → `recent_debts`/`recent_payments`.

## Deploy

`/deploy-web` skill (`.claude/skills/deploy-web/`): build → serverda backup → `dist/`ni rsync → `document_errors/404.html` yangilash → tekshirish. Prod'ga chiqarish — **har safar foydalanuvchidan tasdiq oling**.

- Server: HestiaCP `ruslan.firstcoders.uz`, user `xurshidbek1`, docroot `~/web/web.daftaron.uz/public_html` (backend TZ.md, 26-bo'lim).
- Nginx config root'da: SPA fallback (`try_files`) yo'q. Vaqtincha `document_errors/404.html` = `index.html` (deep link'lar ishlaydi, status 404). **Har deploy'da 404.html ham yangilanishi shart**, aks holda deep link eski bundle'ni ochadi.
- `sw.js` nginx'da uzoq keshlanadi; shuning uchun `main.jsx` SW yangilanishini o'zi tekshiradi. `vite.config.js`dagi `skipWaiting`/`clientsClaim`ni olib tashlamang.
- Eski hashlangan chunk'lar serverda qoldiriladi (rsync `--delete`siz): ochiq turgan eski sahifalar ishlashda davom etadi.
- `dist/` git'da saqlanadi va odatda manba o'zgarishi bilan birga commit qilinadi.
- `daftaron.vercel.app` — eski, prod emas. "Kodda bor, prod'da yo'q" muammosida avval `web.daftaron.uz`dagi jonli bundle'ni tekshiring.
