# Daftaron — web SPA

Do'konlar uchun raqamli nasiya daftarining web ilovasi (`web.daftaron.uz`, PWA). Foydalanuvchilar uni mobil brauzerda, PWA sifatida yoki Telegram Mini App ichida ochadi. **Native Android ilova yo'q**: `app/`, `build.gradle`, `twa-manifest.json` (TWA) va `mobile-native/` (Expo) ishlatilmaydi, ularga tegmang.

Backend alohida repo: `/Applications/MAMP/htdocs/daftaron` (Laravel 12), API `https://daftaron.firstcoder.uz/api/v1`. Uning [CLAUDE.md](/Applications/MAMP/htdocs/daftaron/CLAUDE.md)'sida domen lug'ati (Tenant, Debt, Payment, Supplier...) va biznes qoidalari bor.

## API kontrakti — manba backend'da

- Endpointlar ro'yxati: backend `TZ.md`, **19-bo'lim**. So'rov/javob formatlari: **23-bo'lim** (ta'minotchilar — 24). Batafsil: `public/docs/openapi.yaml`.
- Har doim backend repodagi faylni o'qing: `/Applications/MAMP/htdocs/daftaron/TZ.md`. Bu repodagi `TZ.md`, `UserFlow-Mobile.md`, `openapi.yaml` — eskirishi mumkin bo'lgan nusxalar.
- Kontraktni bu yerda takrorlamang. Backend'da yo'q endpoint chaqirmang; kerak bo'lsa avval backend'ga qo'shilsin.

## Stek

- React 19 + Vite 6, JavaScript (TypeScript yo'q), `react-router-dom` 7 (`BrowserRouter`)
- Tailwind 3 (`darkMode: 'class'`, ranglar `tailwind.config.js`da: `primary`, `success`, `danger`...), shrift `@fontsource-variable/inter`
- `axios`, `react-hot-toast` (xabarlar), `lucide-react` (ikonlar), `vaul` (pastki drawer'lar)
- `vite-plugin-pwa` (workbox, `autoUpdate`)
- State kutubxonasi yo'q: `useState`/`useEffect` + `localStorage`, bitta context — `SubscriptionContext`
- i18n yo'q: barcha UI matnlari to'g'ridan-to'g'ri o'zbekcha (lotin) yozilgan

## Buyruqlar

```bash
npm run dev       # http://localhost:5173 (host: true), prod API'ga ulanadi
npm run build     # dist/ ga
npm run preview
```

Lint va test **yo'q** (ESLint, Vitest sozlanmagan). O'zgarishdan keyin kamida `npm run build` o'tishini tekshiring.
Dev server ham **prod backend**'ga so'rov yuboradi (`baseURL` qattiq yozilgan): dev'da yaratilgan mijoz/nasiya/to'lov haqiqiy bazaga tushadi, nasiya SMS'i haqiqiy mijozga ketadi.

## Tuzilma

```
src/
  main.jsx            # BrowserRouter, PWA SW ro'yxatdan o'tkazish (soatda bir yangilanish tekshiruvi)
  App.jsx             # barcha route'lar, lazyPage(), Telegram SDK init
  api/                # har bir resurs uchun <resurs>.api.js; axios.js — umumiy instance
  pages/              # sahifalar (<Nom>Page.jsx), bittasi = bitta route
  components/         # Layout, BottomNav, PrivateRoute, drawer/modal'lar, Skeleton
  contexts/           # SubscriptionContext
  utils/              # date.js, format.js, phoneMask.js, roleHelper.js, telegram.js, click.js, payme.js
public/               # ikonlar, logo (dist'ga nusxalanadi)
index.html            # Telegram SDK shartli yuklash shu yerda
```

## API qatlami (`src/api/`)

- `axios.js`: `baseURL` = prod API. Request interceptor `localStorage.token` → `Authorization: Bearer`, `localStorage.user.tenant_id` → `X-Tenant-Id` (tenant selector, backend TZ 2.2 / 4.3). 401 → token va user o'chiriladi, `window.location.href = '/login'`.
- Komponentlar `axios`ni to'g'ridan-to'g'ri chaqirmaydi, faqat `xxxApi` obyektlari orqali (`debtsApi.getDebts(params)`).
- Javob shakli turlicha bo'lgan joylarda unwrap qilinadi (`resp?.payment || resp?.data || resp`); yangi kodda backend TZ'dagi aniq shaklga tayaning.
- Ro'yxatlar: `per_page` faqat `page` bilan birga ishlaydi (max 100), `page`siz `per_page` → 422. `page` berilganda javob `{ data, meta: { current_page, per_page, total, last_page } }`.
- `/api/public/settings` v1 prefiksisiz: `app.api.js` `baseURL`dan `/v1`ni olib tashlaydi.
- 404/405 bo'lsa `PATCH`/`_method=delete` ga qayta urinadigan eski fallback'lar bor (`tenants`, `customers`, `payments`). Yangi kodda qo'shmang.

## Auth, rol, tenant

- Token va user `localStorage`da (`token`, `user`). Login: `LoginPage` → `authApi.login` → saqlab `/` ga.
- `PrivateRoute`: token bo'lmasa `/login`. Bo'lsa `/auth/me` va `/subscription/status` parallel: `user` yangilanadi, obuna holati `SubscriptionContext`ga (keshi `subscription_cache_v1`, token bilan bog'langan). Obuna bloklangan bo'lsa faqat `/subscription` va `/profile` ochiladi.
- Rollar: `shop_owner` / `shop_worker` (`/auth/me` → `roles`); `utils/roleHelper.js` (`isStaffFromUser`).
- Active do'kon: `user.tenant_id` (`ShopsPage`da almashtiriladi) → `X-Tenant-Id` header.

## Routing

Hammasi `App.jsx`da. Ochiq: `/login`, `/register`, `/forgot-password`, `/terms`, `/delete-account`. Qolganlari `PrivateRoute > Layout` ichida (pastki menyu `BottomNav`). Noma'lum yo'l → `/`.
`LoginPage` va `DashboardPage` asosiy bundle'da, qolganlari `lazyPage()` bilan (deploydan keyin eski chunk topilmasa sahifani bir marta qayta yuklaydi). Yangi sahifa qo'shsangiz `lazyPage` ishlating.

## Kod uslubi

- 4 bo'shliq, nuqta-vergulsiz, bitta qo'shtirnoq, funksional komponentlar + hook'lar, `export default function XxxPage()`.
- Izohlar va UI matnlari o'zbekcha, atrofdagi kodga mos. Xatolar foydalanuvchiga `toast.error("...")` bilan.
- Har bir rangli element uchun `dark:` varianti ham yozilsin.
- **Sanalar:** API'ga `YYYY-MM-DD`, Toshkent vaqti (UTC+5). `toISOString().slice(0, 10)` ishlatmang — `utils/date.js` (`todayYmd`, `toYmd`, `toTashkentYmd`). API'dan kelgan sanani (masalan supplier `transaction_date`, UTC ISO) ko'rsatish/solishtirishdan oldin `toYmd`dan o'tkazing.
- Pul: `utils/format.js` (`formatCurrency`, `parseCurrency`). Telefon: `utils/phoneMask.js` (`+998` format).
- Sahifa tez chizilishi uchun `localStorage` keshi (avval keshdan, keyin fonda yangilash) ko'p joyda ishlatiladi — shu naqshga amal qiling.
- Production'da soxta/dummy ma'lumot ko'rsatmang (masalan, xato bo'lganda o'ylab topilgan do'konlar).

## Telegram Mini App

- `index.html` Telegram SDK'ni faqat Telegram ichida (`tgWebApp` hash, `TelegramWebviewProxy`, iframe) async yuklaydi va `telegram-sdk-loaded` hodisasini chiqaradi; `App.jsx` shundan keyin `initTelegramWebApp()` (`ready`, `expand`, fon rangi) chaqiradi.
- Telegram login qoidasi (backend): faqat imzolangan `init_data` yoki bot imzosi (`phone`+`ts`+`sig`). Yalang'och telefon bilan kirish yo'q.

## Ochiq vazifalar

1. **Telegram Mini App'dan kelganda login sahifasi chiqadi.** SPA `window.Telegram.WebApp.initData`ni hech qayerga yubormaydi, shuning uchun token bo'lmasa `PrivateRoute` `/login`ga yo'naltiradi. Kerak: token yo'q va `initData` bor bo'lsa, `POST /auth/telegram-login` ga `{ init_data: WebApp.initData, device_name }` yuborish (backend TZ.md, 23.1 «Telegram Login»). `200` → `token`/`user` saqlab davom etish; `404 requires_registration` → `/register` (telefonni oldindan to'ldirib); `401` → login sahifasi. `initData`da `contact` bo'lmasa backend faqat avval bog'langan `telegram_id` bo'yicha kiritadi — kerak bo'lsa `WebApp.requestContact()` javobini yuborish. SDK async yuklanadi: `telegram-sdk-loaded` ni kutish kerak.
2. `index.html`dagi `/telegram/web-login?phone=` skripti — faqat telefon bo'yicha kirish urinishi, backend buni taqiqlaydi. 1-vazifa bilan birga olib tashlansin.
3. Backend bilan mos kelmaydigan chaqiruvlar (2026-10-27 holati):
   - `tenantsApi.setActiveTenant` aniqlanmagan — `ShopsPage`da do'kon almashtirish `TypeError` bilan yiqiladi, `PUT /tenants/active` chaqirilmaydi.
   - `tenantsApi.getTenants` `{ tenants, active_tenant_id }`dan faqat massivni qaytaradi — `active_tenant_id` yo'qoladi; xatoda `ShopsPage` dummy do'konlarni ko'rsatadi.
   - `GET /tenants/{id}` yo'q (404, xato yutiladi).
   - `GET/PUT /legal`, `/legal/{type}` yo'q — `TermsPage`, `PrivacyPolicyPage` doim ichki matnni ko'rsatadi, `LegalManagementPage` ishlamaydi. Matnlar `GET /api/public/settings`da (`appApi.getLegal`).
   - `POST /debts/{id}/send-return-sms`, `GET /debts/{id}/sms-status` yo'q (funksiyalar ishlatilmayapti).
   - `PUT/PATCH/DELETE /payments/{id}`, `PATCH /payments` yo'q — to'lovni tahrirlash/o'chirish API'da mavjud emas.
   - `POST /auth/telegram-login` ishlatilmaydi (1-vazifa).

## Deploy

`/deploy-web` skill (`.claude/skills/deploy-web/`): build → serverda backup → `dist/`ni rsync → `document_errors/404.html` yangilash → tekshirish. Prod'ga chiqarish — **har safar foydalanuvchidan tasdiq oling**.

- Server: HestiaCP `ruslan.firstcoders.uz`, user `xurshidbek1`, docroot `~/web/web.daftaron.uz/public_html` (backend TZ.md, 26-bo'lim).
- Nginx config root'da: SPA fallback (`try_files`) yo'q. Vaqtincha `document_errors/404.html` = `index.html` (deep link'lar ishlaydi, status 404). **Har deploy'da 404.html ham yangilanishi shart**, aks holda deep link eski bundle'ni ochadi.
- `sw.js` nginx'da uzoq keshlanadi; shuning uchun `main.jsx` SW yangilanishini o'zi tekshiradi. `vite.config.js`dagi `skipWaiting`/`clientsClaim`ni olib tashlamang.
- Eski hashlangan chunk'lar serverda qoldiriladi (rsync `--delete`siz): ochiq turgan eski sahifalar ishlashda davom etadi.
- `dist/` git'da saqlanadi va odatda manba o'zgarishi bilan birga commit qilinadi.
- `vercel.json` / `daftaron.vercel.app` — eski, prod emas. "Kodda bor, prod'da yo'q" muammosida avval `web.daftaron.uz`dagi jonli bundle'ni tekshiring.
