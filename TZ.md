# Daftaron — Texnik Topshiriq (TZ)

> So'nggi yangilanish: 2026-04-23

## Mundarija

1. [Umumiy ma'lumot](#1-umumiy-malumot)
2. [Arxitektura](#2-arxitektura)
3. [Rollar va foydalanuvchilar](#3-rollar-va-foydalanuvchilar)
4. [Autentifikatsiya](#4-autentifikatsiya)
5. [Profil](#5-profil)
6. [Obuna va balans tizimi](#6-obuna-va-balans-tizimi)
7. [Mijozlar (Customers)](#7-mijozlar-customers)
8. [Nasiya (Debts)](#8-nasiya-debts)
9. [To'lovlar (Payments)](#9-tolovlar-payments)
10. [Muddati o'tgan qarzdorlar (Overdue)](#10-muddati-otgan-qarzdorlar-overdue)
11. [SMS tizimi](#11-sms-tizimi)
12. [To'lov tizimlari — Click](#12-tolov-tizimlari--click)
13. [To'lov tizimlari — Payme](#13-tolov-tizimlari--payme)
14. [Bildirishnomalar (Notifications)](#14-bildirishnomalar-notifications)
15. [AI SupportBot](#15-ai-supportbot)
16. [Admin panel (Web)](#16-admin-panel-web)
17. [Do'kon (Tenant) boshqaruvi](#17-dokon-tenant-boshqaruvi)
18. [Ma'lumotlar bazasi sxemasi](#18-malumotlar-bazasi-sxemasi)
19. [API endpointlar — to'liq ro'yxat](#19-api-endpointlar--toliq-royxat)
20. [Web route'lar — to'liq ro'yxat](#20-web-routelar--toliq-royxat)
21. [Xato kodlari](#21-xato-kodlari)
22. [Muhim konfiguratsiyalar](#22-muhim-konfiguratsiyalar)
23. [API Endpointlar va Javob Formatlar](#23-api-endpointlar-va-javob-formatlar)

---

## 1. Umumiy ma'lumot

| Parametr | Qiymat |
|----------|--------|
| Loyiha nomi | **Daftaron** |
| Maqsad | Do'konlar uchun nasiya (qarz) boshqaruv tizimi — raqamli daftar |
| Texnologiya | Laravel 12, PHP 8.2+, MySQL, Blade + Tailwind CSS 4, Vite |
| API | REST API v1 (Laravel Sanctum) |
| API base URL | `https://<domen>/api/v1` |
| Vaqt zonasi | `Asia/Tashkent` |
| Til | O'zbek tili |
| Valyuta | UZS (so'm) |

### Platforma taqsimoti

| Platforma | Texnologiya | Maqsad |
|-----------|-------------|--------|
| **Web (Admin panel)** | Laravel Blade + Tailwind CSS | Admin boshqaruvi, do'kon egasi web interfeys |
| **Mobil ilova** | REST API (Sanctum Bearer token) | Do'kon egasi asosiy ishlash joyi |

> **Muhim:** Admin panel **faqat Web** da ishlaydi. Mobil ilova faqat **API** orqali ishlaydi.

---

## 2. Arxitektura

```
┌─────────────────────────────────────────────────────────────┐
│                        DAFTARON                              │
├──────────────────────┬──────────────────────────────────────┤
│   WEB (Blade)        │   REST API (Sanctum)                 │
│   ├─ Admin panel     │   ├─ Auth (login, register, verify)  │
│   ├─ Do'kon egasi    │   ├─ Customers CRUD                  │
│   └─ To'lov callback │   ├─ Debts CRUD + close              │
│                      │   ├─ Payments CRUD                    │
│                      │   ├─ Subscription/Balance             │
│                      │   ├─ Profile                          │
│                      │   ├─ Notifications                    │
│                      │   ├─ Support Bot (AI)                 │
│                      │   └─ Payme Merchant API               │
├──────────────────────┴──────────────────────────────────────┤
│                     SERVISLAR                                │
│   DebtService · EskizSmsService · PaymentGatewayService     │
│   OverdueDebtorsService · TenantStatsService                │
├─────────────────────────────────────────────────────────────┤
│                     MODELLAR (18 ta)                         │
│   User · Tenant · Customer · Debt · Payment · Plan          │
│   Transaction · PaymentOrder · PaymentSystem · PlanPurchase  │
│   Region · District · Street · Category · Expense · Setting │
│   AgentConversation · Notification                           │
├─────────────────────────────────────────────────────────────┤
│                     TASHQI XIZMATLAR                         │
│   Click (to'lov) · Payme (to'lov) · Eskiz (SMS)            │
│   Groq (AI SupportBot) · Telegram Bot                       │
└─────────────────────────────────────────────────────────────┘
```

### Multi-tenant storage modeli (amaldagi)

#### 2.1. Model tanlovi

Tanlangan model: **Shared DB + Shared Schema + `tenant_id` isolation**.

**Struktura:**
- Bitta MySQL cluster,
- Bitta schema,
- Tenantga tegishli barcha biznes jadvallarda `tenant_id` ustuni,
- Servis/controller qatlamida qat'iy tenant scope (data isolation).

**Nega shu model?**
- `Database-per-user` modeli hozircha optimal emas: 50k+ tenantda 50k+ DB lifecycle boshqarish murakkab (backup, restore, migration, incident management), infra xarajati keskin oshadi.
- Shared-schema modeli tez implementatsiya, stabil ishlash beradi, API contract saqlangan holda o'sishga imkon beradi, va keyinchalik shardlashga (tenant hash strategiyasi) ochiq qoladi.

#### 2.2. API contract va tenant selector

API endpointlar backward-compatible saqlangan va active tenant uchun qo'shimcha endpointlar qo'shildi.

**Tenant selector (priority tartibi):**
- Query/body: `tenant_id`
- Header: `X-Tenant-Id`

**Active tenant endpointlari:**
- `GET /api/v1/tenants` — foydalanuvchiga ruxsat etilgan do'konlar ro'yxati + active do'kon
- `PUT /api/v1/tenants/active` — `tenant_id` ni active qilib saqlash (`users.tenant_id` da)

**Qoidalar:**
- Tenantga bog'liq endpointlar (`/customers`, `/debts`, `/payments`, `/dashboard`, `/debts/overdue`, `/workers`):
  - `shop_owner/shop_worker` faqat o'z tenantini tanlay oladi
  - Ruxsatsiz tenantni tanlasa **403** (`Bu do'konga kirish huquqingiz yo'q.`)
  - Administrator/manager uchun cheklov yo'q
- Selector berilmasa backward-compatible xulq: oddiy user → joriy tenant, admin/manager → global ko'rinish

#### 2.3. Migration strategiyasi

Loyiha reset qilinadigan holat bo'lgani uchun migrationlar konsolidatsiya qilindi:
- `add_*` va `update_*` incremental migrationlar olib tashlandi
- Yakuniy ustunlar va indekslar to'g'ridan-to'g'ri `create_*` migratsiyalarga ko'chirildi

**Natija:** Noldan bir xil, predictible schema ko'tariladi, migration chain qisqa va tushunarli, drift xavfi kamayadi.

#### 2.4. Performance va 50k+ obunachiga tayyorlash

**Indekslar:**
- `debts`, `payments`, `customers`, `transactions`, `payment_orders` uchun kompozit indekslar
- Tenant-heavy querylar uchun `tenant_id + status + date` indekslar

**Data tiplari:**
- Monetary ustunlar: `DECIMAL(18,2)` (katta summalar uchun)
- Paket modelida string `feature_type` (enum o'rniga) — kengaytiriladigan model

**Tavsiya etilgan operatsion qo'shimchalar:**
- MySQL read-replica (reporting/dashboard GET lar uchun)
- Queue worker scaling (SMS/notification/background tasklar)
- Slow query log + APM (monitoring)
- Connection pool tuning

#### 2.5. Ma'lumotlar xavfsizligi va backup

Arxitektura tarafidan qo'llab-quvvatlanadigan production amaliyat:
- Kunlik full backup + binlog asosida point-in-time restore
- Haftalik restore drill (test restore imkon-salomatligi tekshiruvi)
- Critical jadvallar uchun accidental delete himoyasi (soft delete mumkin bo'lgan joylarda)

*Eslatma: Backup policy infra/devops darajasida yoqilishi kerak.*

#### 2.6. I18n (Tillarni qo'shish — kelajak)

Quyidagi jadvallarga `*_translations` JSON ustunlari qo'shildi:
- `plans.name_translations`, `plans.description_translations`
- `categories.name_translations`
- `regions.name_translations`, `districts.name_translations`, `streets.name_translations`
- `tenants.name_translations`
- `payment_systems.name_translations`

**Moslik:** Hozirgi API ni buzmaydi — `name` va `description` maydonlari saqlangan, lekin qiymat locale-ga mos qaytadi.

**Implementatsiya:**
- Eloquent model darajasida `HasLocalizedAttributes` trait
- API/web tarafida `name` va `description` oldingi shakli saqlangan
- Lokatsiya seedlari `regions.json + districts.json + villages.json` orqali to'liq yuritiladi

#### 2.7. Keyingi bosqichlar (xohishga ko'ra)

1. DB-level RLS o'rniga app-level tenant guard qat'iyligi uchun policy/middleware audit
2. Reporting read model (materialized summary) qo'shish
3. Sharding readiness: tenant-id hash strategiyasi va shard router abstraction

---

## 3. Rollar va foydalanuvchilar

| Rol | Tavsif | Platforma |
|-----|--------|-----------|
| `shop_owner` | Do'kon egasi — asosiy foydalanuvchi | Web + Mobil |
| `shop_worker` | Do'kon xodimi (cheklangan) | Mobil |
| `manager` | Bir nechta do'konlarga tayinlangan menejer | Web |
| `admin` | To'liq admin panel kirishi | Faqat Web |

### Muhim qoidalar

- **Balans** foydalanuvchi (`users.balance`) da saqlanadi, tenant da emas.
- Bitta user bir nechta do'kon ochishi mumkin (ta'rif bo'yicha cheklov).
- Oddiy ta'rifda **faqat 1 ta** do'kon ruxsat.

### Foydalanuvchi identifikatori (public_id)

| Xususiyat | Qiymat |
|-----------|--------|
| Bazadagi ID | `users.id` (1, 2, 3, ...) |
| Ko'rinadigan ID | `public_id = id + 1000` (1001, 1002, ...) |
| Ishlatilishi | Profil sahifasi, Click to'lovida foydalanuvchini aniqlash |

---

## 4. Autentifikatsiya

### 4.1. Web autentifikatsiya (sessiya asosida)

| Amal | URL | Tavsif |
|------|-----|--------|
| Login | `GET/POST /login` | Telefon + parol. SMS yoqilgan bo'lsa → verify |
| Telegram login | `GET /telegram/web-login?phone=+998...` | Bazada bor → darhol `/dashboard`. Yo'q → `/register?phone=...` |
| Ro'yxatdan o'tish 1 | `GET/POST /register` | Ism + telefon (30 daqiqa cache) |
| SMS tasdiqlash | `POST /verify` | 4 xonali kod (type=register) |
| Ro'yxatdan o'tish 2 | `GET/POST /register/complete` | Do'kon nomi, category_id, viloyat/tuman/ko'cha, parol |
| Parol tiklash | `/password/forgot` → `/password/verify` → `/password/new` | SMS orqali |
| Admin kirish | `GET/POST /admin/login` | Faqat `admin` roli |
| Chiqish | `POST /logout` | Sessiya tugatish |

**Remember:** Login da "eslab qolish" — sessiya 30 kun.

### 4.2. API autentifikatsiya (Sanctum Bearer token)

Barcha himoyalangan endpointlar: `Authorization: Bearer <token>`

| Qadam | Endpoint | Body | Javob |
|-------|----------|------|-------|
| Login | `POST /auth/login` | `phone`, `password`, `device_name` | `token`, `user` yoki `requires_verification: true` |
| Telegram login | `POST /auth/telegram-login` | `phone`, `device_name` | `token`, `user` yoki `404 + requires_registration: true` |
| Ro'yxat 1 | `POST /auth/register` | `name`, `phone`, `device_name` | `requires_verification: true` |
| SMS tasdiq | `POST /auth/verify` | `phone`, `code`, `type: "register"` | Muvaffaqiyat (token hali yo'q) |
| Ro'yxat 2 | `POST /auth/register/complete` | `phone`, `shop_name`, `category_id`, `region_id`, `district_id`, `street_id`, `password`, `password_confirmation` | `token`, `user` |
| Parol tiklash 1 | `POST /auth/password/forgot` | `phone` | SMS yuboriladi |
| Parol tiklash 2 | `POST /auth/password/verify` | `phone`, `code` | `reset_token` (10 daqiqa) |
| Parol tiklash 3 | `POST /auth/password/reset` | `reset_token`, `password`, `password_confirmation` | Parol yangilandi |

### 4.3. API tenant selector (multi-tenant)

Tenantga bog'liq API endpointlar (`/customers`, `/debts`, `/payments`, `/dashboard`, `/debts/overdue`, `/workers`) uchun selector:

- Query/body: `tenant_id`
- Header: `X-Tenant-Id`
- Active tenant endpointlari:
  - `GET /api/v1/tenants` — foydalanuvchiga ruxsat etilgan do'konlar + active do'kon
  - `PUT /api/v1/tenants/active` — `tenant_id` ni active qilib saqlash (`users.tenant_id`)

Qoidalar:

1. `shop_owner/shop_worker` faqat o'z tenantini tanlay oladi.
2. Boshqa tenant yuborilsa **403** (`Bu do'konga kirish huquqingiz yo'q.`).
3. Selector berilmasa backward-compatible xulq saqlanadi:
   - oddiy user: joriy tenant,
   - admin/manager: global ko'rinish.

### 4.4. Telefon formati

| Kiritish | Natija (bazada) |
|----------|----------------|
| `+998901234567` | `+998901234567` |
| `998901234567` | `+998901234567` |
| `901234567` (9 xonali, 9 bilan boshlansa) | `+998901234567` |

---

## 5. Profil

| Platforma | Endpoint | Tavsif |
|-----------|----------|--------|
| Web | `GET /profile`, `GET /profile/edit`, `PUT /profile` | Profil ko'rish va tahrirlash |
| Web | `POST /profile/change-password` | Parol o'zgartirish |
| API | `GET /api/v1/profile` | Profil ma'lumotlari (id, public_id, name, phone, email, tenant_id, status, trial_ends_at) |
| API | `PUT /api/v1/profile` | Ism, email yangilash |
| API | `PUT /api/v1/profile/password` | `current_password`, `password`, `password_confirmation` |

---

## 6. Obuna va balans tizimi

### 6.1. Trial va obuna holatlari

- **Davomiyligi:** `Setting::get('trial_days')` — admin tomonidan sozlanadi (default 15 kun, 0 = sinovsiz).
- Ro'yxatdan o'tganda `trial_ends_at = now + trial_days`.

**Obuna holatlari:**

| Holat | Shart | Ruxsatlar |
|-------|-------|-----------|
| `active` | `trial_ends_at > now()` va `status = 1` | Barcha funksiyalar ishlaydi |
| `expired` | `trial_ends_at < now()` yoki `status = 0` | **Read-only rejim** — faqat GET ruxsat, POST/PUT/PATCH/DELETE bloklangan |

**CheckSubscription middleware (`check.subscription`):**
- GET requestlarga ruxsat (read-only) — expired bo'lsa ham ma'lumotlarni ko'rish mumkin
- POST/PUT/PATCH/DELETE — bloklash, 403 qaytarish
- Admin/manager uchun cheklov yo'q
- `subscription.*`, `payment.*`, `login`, `register`, `logout` route'lari o'tkazib yuboriladi

**Expired holatda 403 javob formati (API):**
```json
{
  "error": true,
  "message": "Obunangiz tugagan. Sizda hali 7 ta nasiya limiti mavjud. Yo'qotmaslik uchun obunani yangilang.",
  "remaining_limit": 7
}
```

**Muhim:** `remaining_limit` har doim qaytariladi — expired bo'lsa ham foydalanuvchiga qolgan limiti ko'rsatiladi. Qo'shimcha paketlar orqali sotib olingan limit obuna tugagandan keyin ham saqlanib qoladi.

### 6.2. Ta'riflar (Plans)

| Maydon | Tavsif | Misol (Oddiy) |
|--------|--------|---------------|
| `name` | Ta'rif nomi | Oddiy |
| `price` | Oylik narx (so'm) | 29 000 |
| `debt_limit` | Umumiy nasiya limiti (`null` = cheksiz) | 70 |
| `sms_limit` | Bepul SMS soni (oyiga) | 20 |
| `shop_limit` | Do'kon limiti (`null` = cheksiz) | 1 |
| `worker_limit` | Xodim limiti (`null` = cheksiz) | 0 |
| `allow_extra_debt_packages` | Qo'shimcha nasiya paketi ruxsati | false (Oddiy) |
| `allow_extra_sms_packages` | Qo'shimcha SMS paketi ruxsati | true |
| `allow_extra_shop_packages` | Qo'shimcha do'kon paketi ruxsati | false (Oddiy), true (Pro) |
| `allow_extra_worker_packages` | Qo'shimcha xodim paketi ruxsati | false (Oddiy), true (Pro) |

**Limit tekshiruvi (DebtService):**
- Barcha nasiyalar umumiy hisoblanadi — `debt_limit` bilan solishtiriladi
- Limit tugasa — 422 xato, yangi nasiya yozib bo'lmaydi
- `debt_limit = null` bo'lsa — cheksiz

### 6.3. Ta'rif tanlash qoidalari

| Holat | Qoida |
|-------|-------|
| Trial davrida | Istalgan ta'rifni tanlash mumkin (narx bo'lsa balansdan yechiladi) |
| Trial tugagandan keyin | Barcha ta'riflar, narx **balansdan** yechiladi |
| Shu ta'rif allaqachon faol | **422** — muddat uzaytirilmaydi |
| Balans yetmasa | **422** — `"Mablag' yetarli emas"` + `plan_price`, `balance` |
| Muvaffaqiyatli tanlash | `trial_ends_at` sotib olingan kundan **30 kun**, `PlanPurchase` yozuvi yaratiladi |

### 6.4. Obuna endpointlari

**Web:**

| URL | Metod | Tavsif |
|-----|-------|--------|
| `/subscription/status` | GET | Balans, trial, **usage limiti**, tariflar, tranzaksiyalar, `current_plan_id` |
| `/subscription/choose/{plan}` | POST | Ta'rif tanlash (balansdan) |
| `/subscription/balance-topup` | POST | Balans to'ldirish — to'lov tizimini tanlash, redirect |
| `/subscription/plan-pay/{plan}` | POST | Ta'rifni to'lov tizimi orqali to'lash (`payment_system_id` body da) |
| `/payment/return` | GET | To'lovdan keyin muvaffaqiyatli qaytish |
| `/payment/cancel` | GET | To'lov bekor qilinishi |

**API:**

| URL | Metod | Auth | Tavsif |
|-----|-------|------|--------|
| `/subscription/status` | GET | Bearer | Balans, trial_info, **usage**, plans, transactions, `current_plan_id` |
| `/subscription/choose/{plan}` | POST | Bearer | Ta'rif tanlash (balansdan yechiladi) |

### 6.5. Subscription status javobi

```json
{
  "balance": 50000,
  "current_plan_id": 1,
  "trial_info": {
    "trial_ends_at": "2026-04-05T10:30:00Z",
    "days_remaining": 14,
    "is_expired": false,
    "status": 1
  },
  "usage": {
    "subscription_status": "active",
    "plan_name": "Oddiy",
    "plan_price": 29000,
    "debt_base_limit": 70,
    "debt_extra_limit": 0,
    "debt_total_limit": 70,
    "debt_used": 17,
    "debt_remaining": 53,
    "sms_base_limit": 20,
    "sms_extra_limit": 0,
    "sms_total_limit": 20,
    "sms_used": 8,
    "sms_remaining": 12,
    "extra_sms_price": 190,
    "shop_base_limit": 1,
    "shop_extra_limit": 0,
    "shop_total_limit": 1,
    "shop_used": 1,
    "shop_remaining": 0,
    "worker_base_limit": 0,
    "worker_extra_limit": 0,
    "worker_total_limit": 0,
    "worker_used": 0,
    "worker_remaining": 0,
    "allowed_extra_package_types": ["sms"]
  },
  "plans": [
    {
      "id": 1,
      "name": "Oddiy",
      "price": 29000,
      "debt_limit": 70,
      "sms_limit": 20,
      "shop_limit": 1,
      "worker_limit": 0,
      "allow_extra_debt_packages": false,
      "allow_extra_sms_packages": true,
      "allow_extra_shop_packages": false,
      "allow_extra_worker_packages": false
    }
  ],
  "extra_packages": [
    {
      "id": 1,
      "type": "debt",
      "quantity": 50,
      "price": 15000,
      "is_active": true,
      "sort_order": 0
    },
    {
      "id": 2,
      "type": "sms",
      "feature_type": "sms",
      "quantity": 50,
      "price": 25000,
      "is_active": true,
      "sort_order": 0
    }
  ],
  "transactions": []
}
```

| `trial_info` maydon | Tavsif |
|---------------------|--------|
| `trial_ends_at` | Obuna tugash sanasi (ISO8601) |
| `days_remaining` | Qolgan kunlar; tugaganda `0` |
| `is_expired` | `true` → obuna/trial tugagan |
| `status` | `1` = faol, `0` = bloklangan |

| `usage` maydon | Tavsif |
|----------------|--------|
| `subscription_status` | Obuna holati: `active` yoki `expired` |
| `plan_name` | Joriy ta'rif nomi (`null` agar tanlanmagan) |
| `plan_price` | Ta'rif narxi (so'm/oy) |
| `debt_base_limit` | Ta'rifdagi nasiya limiti. `null` = cheksiz |
| `debt_extra_limit` | Sotib olingan qo'shimcha nasiya miqdori |
| `debt_total_limit` | Umumiy nasiya limiti (base + extra). `null` = cheksiz |
| `debt_used` | Ishlatilgan nasiyalar soni |
| `debt_remaining` | Qolgan nasiya limiti (total - used). `null` = cheksiz |
| `sms_base_limit` | Ta'rifdagi bepul SMS limiti |
| `sms_extra_limit` | Sotib olingan qo'shimcha SMS miqdori |
| `sms_total_limit` | Umumiy SMS limiti (base + extra) |
| `sms_used` | Ishlatilgan SMS soni |
| `sms_remaining` | Qolgan SMS (total - used) |
| `extra_sms_price` | Limitdan keyingi har bir SMS narxi (so'm) |
| `shop_base_limit`, `shop_extra_limit`, `shop_total_limit`, `shop_used`, `shop_remaining` | Do'kon capacity usage snapshot |
| `worker_base_limit`, `worker_extra_limit`, `worker_total_limit`, `worker_used`, `worker_remaining` | Xodim capacity usage snapshot |
| `allowed_extra_package_types` | Joriy plan sotib olishi mumkin bo'lgan paket turlari |

| `extra_packages` maydon | Tavsif |
|--------------------------|--------|
| `id` | Paket ID |
| `type` | Legacy moslik maydoni (`debt` yoki `sms`) |
| `feature_type` | Canonical capability turi (`debt`, `sms`, `shop`, `worker`) |
| `quantity` | Paketdagi miqdor |
| `price` | Narxi (so'm) |
| `is_active` | Faolmi |
| `sort_order` | Tartib raqami |

### 6.6. Qo'shimcha paketlar tizimi

Admin panelda **Qo'shimcha paketlar** (`/admin/extra-packages`) bo'limida istalgan miqdor va narxda paketlar yaratiladi.

**Paket turlari:** `debt` (nasiya), `sms`, `shop`, `worker`.

**Plan bo'yicha xarid qoidalari:**
- `Oddiy / Basic` faqat `sms` paketini sotib ola oladi.
- `Pro` va undan kattaroq planlarda ruxsatlar admin belgilagan capability flaglarga bog'liq.
- API va Web da sotib olishdan oldin shu capability tekshiriladi; ruxsat bo'lmasa **422** qaytadi.

**Sotib olish:**
- **Web:** `POST /subscription/buy-extra/{extra_package}` — balansdan yechiladi
- **API:** `POST /v1/subscription/buy-extra/{extra_package}` — balansdan yechiladi

Sotib olingan paketlar `extra_purchases` jadvaliga yoziladi va foydalanuvchining umumiy limitiga qo'shiladi:
- Nasiya limiti = `plan.debt_limit` + sotib olingan `debt` paketlar `quantity` yig'indisi
- SMS limiti = `plan.sms_limit` + sotib olingan `sms` paketlar `quantity` yig'indisi
- Do'kon limiti = `plan.shop_limit` + sotib olingan `shop` paketlar `quantity` yig'indisi
- Xodim limiti = `plan.worker_limit` + sotib olingan `worker` paketlar `quantity` yig'indisi

**Tranzaksiya turi:** `transactions.type = "extra_package"`

### 6.7. SMS narxi (sozlamalar)

Admin panelda `Sozlamalar` bo'limida:

| Sozlama | Default | Tavsif |
|---------|---------|--------|
| `extra_sms_price` | 190 so'm | Bepul + paket limiti tugagandan keyin har bir SMS narxi |

### 6.8. Promocodlar tizimi (2026-03-26)

Promocodlar managerga biriktiriladi va obuna sotib olishda chegirma beradi.

**Promocode maydonlari:**

| Maydon | Tur | Tavsif |
|--------|-----|--------|
| `manager_id` | FK users | Qaysi managerga biriktirilgan |
| `code` | string(50) | Unikal kod (uppercase) |
| `type` | enum | `percent` — foiz chegirma, `fixed` — aniq summa |
| `amount` | decimal | Chegirma miqdori (foiz yoki so'm) |
| `expires_at` | date, null | Amal qilish muddati. null = cheksiz |
| `usage_limit` | int, null | Necha marta foydalanish mumkin. null = cheksiz |
| `usage_count` | int | Necha marta foydalanilgan |
| `is_active` | bool | Faol/nofaol |

**Qoidalar:**
1. Bitta user bitta promocode dan faqat **1 marta** foydalana oladi (`promo_usages` jadvalda unique constraint)
2. `expires_at` sanasi o'tgan bo'lsa — amal qilmaydi
3. `usage_limit` ga yetgan bo'lsa — amal qilmaydi
4. `is_active = false` bo'lsa — amal qilmaydi
5. Chegirma faqat **ta'rif narxiga** qo'llanadi (balans to'ldirishga emas)
6. Foiz chegirmada: `discount = price * amount / 100`
7. Summa chegirmada: `discount = min(amount, price)` — narxdan oshmasligi kerak

**API endpointlar:**

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| POST | `/promo-codes/check` | `{code}` | `{valid, message, discount_label, type, amount}` |

Obuna sotib olishda (`/subscription/choose/{plan}`) `promo_code` parametri qo'shiladi:
```json
POST /subscription/choose/3
{ "promo_code": "SALE20" }
```

**Admin panel:** `/admin/promo-codes` — CRUD + foydalanish tarixi (show sahifasida).

---

## 7. Mijozlar (Customers)

Har bir mijoz bitta `tenant_id` ga bog'langan.

**Web:** `/customers` — to'liq CRUD (index, create, store, show, edit, update, destroy).

**API:**

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| GET | `/customers` | — | Mijozlar ro'yxati (tenant bo'yicha) |
| POST | `/customers` | `name`, `phone`, `address`, `description` | 201: yaratilgan mijoz |
| GET | `/customers/{id}` | — | Bitta mijoz |
| PUT | `/customers/{id}` | `name`, `phone`, ... | Yangilangan mijoz |
| DELETE | `/customers/{id}` | — | O'chirildi |

**Qidiruv (Web):** `GET /api/customers/search?q=...`

---

## 8. Nasiya (Debts)

### 8.1. Maydonlar

| Maydon | Tur | Tavsif |
|--------|-----|--------|
| `customer_id` | FK | Mijoz |
| `total_amount` | decimal | Umumiy qarz summasi |
| `remaining_amount` | decimal | Qolgan summa (to'lovlar bilan kamayadi) |
| `debt_date` | date | Nasiya sanasi (YYYY-MM-DD) |
| `status` | enum | `open` / `closed` |
| `description` | text | Izoh |
| `sms_sent` | boolean | SMS yuborilganmi |

### 8.2. Sana qoidalari

| Qoida | Tavsif |
|-------|--------|
| Tanlanmasa | Bugungi sana |
| Oraliq | Oxirgi 1 oy (bugundan 1 oy oldin — bugun) |
| Validatsiya | `nullable|date|after_or_equal:<1 oy oldin>|before_or_equal:today` |

### 8.3. Endpointlar

**Web:** `/debts` — to'liq CRUD + `PATCH /debts/{debt}/close`

**API:**

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| GET | `/debts` | `customer_id` (ixtiyoriy filter) | Nasiyalar ro'yxati |
| POST | `/debts` | `customer_id`, `total_amount`, `debt_date`, `description`, `send_sms` | 201: `success`, `message`, `debt`, `remaining_limit`, `sms_sent`, `sms_info`, `sms_error`; 403: `error`, `message`, `remaining_limit` |
| GET | `/debts/{id}` | — | Bitta nasiya |
| PUT | `/debts/{id}` | `customer_id`, `total_amount`, `debt_date`, `description` | Yangilangan nasiya |
| DELETE | `/debts/{id}` | — | O'chirildi (bog'liq to'lovlar ham) |
| PATCH | `/debts/{id}/close` | — | Yopildi (qolgan summa to'lov sifatida yoziladi) |

### 8.4. Limit tekshiruvi

Nasiya yaratishda `DebtService::checkDebtLimit()` ishlaydi:
1. Obuna holati tekshiriladi — expired bo'lsa 403 (`remaining_limit` bilan)
2. Ta'rif va plan topiladi
3. `total_limit = plan.debt_limit + extra_purchases(debt).sum(quantity)` hisoblanadi
4. Umumiy nasiyalar soni `total_limit` bilan solishtiriladi
5. Limit tugagan bo'lsa → **403**: `"Sizning nasiya limitingiz tugadi..."`, `remaining_limit: 0`
6. `debt_limit = null` bo'lsa — cheksiz, limit tekshiruvi o'tkazib yuboriladi

**Muhim:** Qo'shimcha paketlar orqali sotib olingan limit obuna tugagandan keyin ham saqlanib qoladi va obuna qayta faollashtirilganda qayta hisobga olinadi.

---

## 9. To'lovlar (Payments)

Nasiya bo'yicha to'lovlar — `payments` jadvalida.

| Maydon | Tur | Tavsif |
|--------|-----|--------|
| `debt_id` | FK | Qaysi nasiyaga |
| `amount` | decimal | To'lov summasi |
| `paid_at` | datetime | To'lov sanasi |

**Web:** `/payments` — to'liq CRUD.

**API:**

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| GET | `/payments` | `debt_id` (ixtiyoriy) | To'lovlar ro'yxati |
| POST | `/payments` | `debt_id`, `amount`, `paid_at`, `send_sms` | 201: yaratilgan to'lov |

**Qoidalar:**
- To'lov yozilganda `debt.remaining_amount` kamayadi
- `remaining_amount = 0` bo'lganda nasiya avtomatik `closed` holatga o'tishi mumkin
- `send_sms: true` — mijozga SMS yuboriladi (11-bo'limga qarang)

---

## 10. Muddati o'tgan qarzdorlar (Overdue)

**Web:** `GET /overdue` — muddati o'tgan qarzdorlar ro'yxati.

**API:** `GET /debts/overdue` — `days` query parametri (default 10, oraliq 5–30).

### Mantiq

- `debt_date` dan bugungi kungacha farq > `days` kun → muddati o'tgan
- Har bir mijoz uchun bitta satr: **umumiy qolgan summa** ko'rsatiladi
- Tartib: eng ko'p kuni o'tganlar birinchi (eng eski nasiya sanasi bo'yicha)

### Javob maydonlari

| Maydon | Tavsif |
|--------|--------|
| `customer_id` | Mijoz ID |
| `name`, `phone` | Mijoz ma'lumotlari |
| `first_debt_date` | Eng eski nasiya sanasi |
| `total_remaining` | Barcha ochiq nasiyalardan qolgan summa |
| `days_overdue` | Necha kun muddati o'tgan |
| `overdue_sms_count` | Yuborilgan eslatma SMS soni |
| `overdue_sms_last_sent_at` | Oxirgi eslatma SMS sanasi |

### SMS yuborish

**Web:** `POST /overdue/{customer}/send-sms`
**API:** `POST /debts/overdue/{customer}/send-sms?days=10`

- Mijozga eslatma SMS yuboriladi
- `customer.overdue_sms_count` oshiriladi
- `customer.overdue_sms_last_sent_at` yangilanadi

**API javob (200):**
```json
{
  "success": true,
  "message": "SMS muvaffaqiyatli yuborildi.",
  "overdue_sms_count": 3,
  "overdue_sms_last_sent_at": "2026-03-23T14:00:00Z"
}
```

---

## 11. SMS tizimi

### 11.1. Provayder — Eskiz

| Parametr | Qiymat |
|----------|--------|
| API | `notify.eskiz.uz` |
| Auth | Bearer token (23 soat cache) |
| Telefon formati | `998XXXXXXXXX` (+ belgisiz) |
| Tasdiqlash kodi | 4 xonali |
| Sender | `4546` (default) |

### 11.2. SMS turlari

| Tur | Qachon | Shablon |
|-----|--------|---------|
| **Nasiya SMS** | Nasiya yaratishda `send_sms: true` | `{ism} aka siz {sana} sanasida {do'kon} dan {summa} so'm qarzdor bo'ldingiz. Qarzni vaqtida qaytarishni unutmang ! Do'kon raqami : {telefon}` |
| **To'lov SMS** | To'lov yozishda `send_sms: true` | `{ism} aka {sana} sanasida {do'kon} uchun sizdan {summa} so'm to'lov qabul qilindi. Qolgan miqdor : {qolgan} so'm. Do'kon raqami : {telefon}` |
| **Eslatma SMS** | Muddati o'tgan qarzdorga | Overdue sahifasidan qo'lda yuboriladi |
| **Tasdiqlash SMS** | Login/register | `Tasdiqlash kodi: {4 raqam}` |

### 11.3. SMS narxlash

| Holat | Narx |
|-------|------|
| Ta'rif + paket limiti ichida (masalan Oddiy da 20 ta + sotib olingan SMS paketlari) | **Bepul** |
| Limitdan keyin har bir SMS | `extra_sms_price` (default **190 so'm**) balansdan yechiladi |
| Balans yetmasa | SMS yuborilmaydi, `sms_error` qaytadi, lekin nasiya/to'lov yaratiladi |
| Admin/Manager | SMS uchun to'lov olinmaydi |

**Tranzaksiya turi:** SMS to'lovi `transactions.type = "sms"` sifatida yoziladi.

---

## 12. To'lov tizimlari — Click

### 12.1. Konfiguratsiya

| `.env` kalit | Tavsif |
|-------------|--------|
| `CLICK_SERVICE_ID` | Xizmat ID (masalan 96745) |
| `CLICK_MERCHANT_ID` | Merchant ID (masalan 57186) |
| `CLICK_SECRET_KEY` | **Maxfiy kalit** (majburiy) |
| `CLICK_MERCHANT_USER_ID` | Merchant user ID (masalan 78591) |

### 12.2. To'lov oqimi (redirect)

```
Foydalanuvchi                    Backend                         Click
    │                              │                              │
    ├── Balans to'ldirish ─────────►                              │
    │   (yoki ta'rif to'lash)      │                              │
    │                              ├── PaymentOrder yaratish      │
    │                              │   (type, amount, status=     │
    │                              │    pending)                  │
    │                              │                              │
    │   ◄── Redirect URL ─────────┤                              │
    │                              │                              │
    ├── Click sahifasida to'lov ──────────────────────────────────►
    │                              │                              │
    │                              │◄── POST /payment/click/      │
    │                              │    prepare                   │
    │                              ├── Sign tekshirish            │
    │                              ├── Order topish/yaratish      │
    │                              ├── merchant_prepare_id ──────►│
    │                              │                              │
    │                              │◄── POST /payment/click/      │
    │                              │    complete                  │
    │                              ├── Sign tekshirish            │
    │                              ├── Order completed            │
    │                              ├── Balans/obuna yangilash     │
    │                              ├── merchant_confirm_id ──────►│
    │                              │                              │
    │   ◄── /payment/return ───────┤                              │
```

### 12.3. Redirect URL formati

```
https://my.click.uz/services/pay
  ?service_id={CLICK_SERVICE_ID}
  &merchant_id={CLICK_MERCHANT_ID}
  &amount={summa}
  &transaction_param={payment_orders.id}
  &return_url={APP_URL}/payment/return
  &merchant_user_id={CLICK_MERCHANT_USER_ID}
```

### 12.4. Callback endpointlari (Click server chaqiradi, authsiz)

#### Prepare: `POST /payment/click/prepare`

1. **Sign tekshirish:** `MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)`
2. `merchant_trans_id` bo'yicha `PaymentOrder` (pending) qidirish
3. **Topilmasa** — foydalanuvchini aniqlash:
   - Raqam va ≥1001 → `public_id - 1000 = user_id`
   - Telefon (`+998...`, `998...`, 9 xonali) → `PhoneHelper::normalize` → user qidirish
4. User topilsa → yangi `PaymentOrder` (type=balance_deposit, pending) yaratish
5. `merchant_prepare_id = order.id` qaytarish

#### Complete: `POST /payment/click/complete`

1. **Sign tekshirish:** `MD5(click_trans_id + service_id + secret_key + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)`
2. `merchant_prepare_id` bo'yicha order topish
3. Order → `completed` qilish
4. **Order turiga qarab:**

| Order turi | Amal |
|-----------|------|
| `balance_deposit` | User balansiga summa qo'shish, `Transaction` (type=deposit) yaratish, `BalanceToppedUp` notification |
| `subscription` | `trial_ends_at` = sotib olingan kundan **30 kun**, `user.status = 1`, `PlanPurchase` yaratish, `tenant.plan_id` yangilash (balansdan yechilmaydi) |

### 12.5. Click ilovasidan to'g'ridan-to'g'ri to'lov

Click ilovasida `merchant_trans_id` ga quyidagilarni kiritish mumkin:
- **public_id** — 1001, 1002, ... (id + 1000)
- **Telefon** — `+998...`, `998...`, yoki 9 xonali (`901234567` → avtomatik `998` qo'shiladi)

---

## 13. To'lov tizimlari — Payme

### 13.1. Konfiguratsiya

| `.env` kalit | Tavsif |
|-------------|--------|
| `PAYME_MERCHANT_ID` | Merchant ID (majburiy) |
| `PAYME_MERCHANT_TEST_KEY` | Test muhit kaliti |
| `PAYME_MERCHANT_KEY` | Production kaliti |
| `PAYME_CHECKOUT_URL` | `https://checkout.paycom.uz` |
| `PAYME_CHECKOUT_ACCOUNT_FIELD` | `user_id` (Payme kabinetidagi account maydoni nomi) |

### 13.2. Web checkout oqimi (redirect)

```
Foydalanuvchi                    Backend                         Payme
    │                              │                              │
    ├── To'lov tanlash ───────────►│                              │
    │                              ├── PaymentOrder yaratish      │
    │                              ├── Checkout URL yaratish      │
    │   ◄── Redirect ─────────────┤                              │
    │                              │                              │
    ├── Payme checkout ──────────────────────────────────────────►│
    │   (to'lov amalga oshadi)     │                              │
    │                              │◄── POST /api/payme/merchant  │
    │                              │    (JSON-RPC 2.0)            │
    │                              ├── CheckPerformTransaction    │
    │                              ├── CreateTransaction          │
    │                              ├── PerformTransaction         │
    │                              ├── Balans/obuna yangilash     │
    │                              │                              │
    │   ◄── /payment/return ───────┤                              │
```

### 13.3. Checkout URL formati

```
https://checkout.paycom.uz/BASE64(
  m={PAYME_MERCHANT_ID};
  ac.user_id={users.id};
  a={summa_tiyinda};
  c={APP_URL}/payment/return
)
```

> **Muhim:** `ac.user_id` — Payme kabinetida sozlangan account maydoni. Checkout URL da
> `user_id` yuboriladi, Merchant API da Payme shu qiymatni `account.user_id` sifatida qaytaradi.
> Backend pending `PaymentOrder` ni `user_id + amount` orqali topadi.

> **Muhim:** Summa **tiyin** da (×100). Masalan 29 000 so'm = 2 900 000 tiyin.

### 13.4. Merchant API (JSON-RPC 2.0)

**Endpoint:** `POST /api/payme/merchant`

**Autentifikatsiya:** HTTP Basic Auth
- Login: `merchant_id`, `Paycom`, yoki `paycom`
- Password: `test_key` (test) yoki `key` (production)

#### Metodlar

| Metod | Tavsif |
|-------|--------|
| `CheckPerformTransaction` | Tranzaksiyani bajarish mumkinmi — user mavjudligi va summa tekshiriladi. Pending order topilmasa **avtomatik yaratadi** (mobile/API to'lov uchun) |
| `CreateTransaction` | Tranzaksiya yaratish — PaymentOrder bilan bog'lash (external_id yozish) |
| `PerformTransaction` | Tranzaksiyani yakunlash — balans/obuna yangilash |
| `CancelTransaction` | Bekor qilish — pending (`state: -1`) yoki completed (`state: -2`, balansdan refund) |
| `CheckTransaction` | Tranzaksiya holatini tekshirish (`state`, `reason`, `perform_time`, `cancel_time`) |
| `GetStatement` | Vaqt oralig'idagi barcha tranzaksiyalar ro'yxati (`from`, `to` — millisekund) |

#### Account maydonlari (foydalanuvchini aniqlash)

| Maydon | Tavsif |
|--------|--------|
| `account.user_id` | `User.id` (web checkout) — **asosiy usul**. Payme kabinetida shu nom bilan sozlangan. Backend `user_id + amount` orqali pending `PaymentOrder` ni topadi |
| `account.order_id` | `PaymentOrder.id` (legacy/backup) — to'g'ridan-to'g'ri order ID bilan ishlaydi |
| `account.public_id` | `User.id + 1000` |
| `account.phone` | Telefon raqam (normalizatsiya) |

#### Tranzaksiya holatlari (state)

| State | Tavsif |
|-------|--------|
| `1` | Yaratilgan (pending) |
| `2` | Yakunlangan (completed) |
| `-1` | Bekor qilingan (pending dan) — `reason: 3` |
| `-2` | Bekor qilingan (completed dan) — `reason: 5`, balansdan refund |

#### CheckPerformTransaction — avtomatik order yaratish

Mobile ilovadan to'lov qilganda (Payme ilovasi orqali), foydalanuvchi `account.user_id` va `amount` bilan keladi. Agar mos pending order topilmasa, `CheckPerformTransaction` **avtomatik yangi PaymentOrder yaratadi**:

```
PaymentOrder::create([
    'user_id'           => $user->id,
    'payment_system_id' => payme_id,
    'type'              => 'balance_deposit',
    'amount'            => amount / 100,
    'status'            => 'pending',
])
```

Keyin `CreateTransaction` shu orderni topib `external_id` ni yozadi.

#### CancelTransaction — completed tranzaksiya bekor qilish

Completed tranzaksiya bekor qilinganda:
1. Foydalanuvchi balansidan summa ayiriladi (`max(0, balance - amount)`)
2. Refund tranzaksiya yoziladi (`type: refund`, `amount: -X`)
3. `cancelled_after_complete = true` belgilanadi
4. `state: -2`, `reason: 5` qaytariladi

#### GetStatement

Ma'lum vaqt oralig'idagi barcha tranzaksiyalar ro'yxati:

**Request:**
```json
{
  "method": "GetStatement",
  "params": { "from": 1774354361000, "to": 1774354861000 }
}
```

**Response:**
```json
{
  "result": {
    "transactions": [
      {
        "id": "payme_transaction_id",
        "time": 1774354250000,
        "amount": 5000000,
        "account": { "order_id": "70" },
        "create_time": 1774354250000,
        "perform_time": 1774354254000,
        "cancel_time": 0,
        "transaction": "70",
        "state": 2,
        "reason": null
      }
    ]
  }
}
```

#### Xato kodlari

| Kod | Tavsif |
|-----|--------|
| `-31001` | Noto'g'ri summa |
| `-31003` | Tranzaksiya topilmadi |
| `-31008` | Tranzaksiya yakunlanmaydi / ichki xatolik |
| `-31050` | Foydalanuvchi topilmadi |
| `-32504` | Autentifikatsiya xatosi |
| `-32601` | Metod topilmadi |

#### Javob formati

```json
{
  "id": "<request_id>",
  "result": { "allow": true }
}
```

```json
{
  "id": "<request_id>",
  "error": {
    "code": -31050,
    "message": "Пользователь не найден",
    "data": null
  }
}
```

> **Muhim:** Success javobda `error` kaliti bo'lmasligi, error javobda `result` kaliti bo'lmasligi kerak (JSON-RPC 2.0 spec).

### 13.5. Click va Payme taqqoslash

| Xususiyat | Click | Payme |
|-----------|-------|-------|
| Autentifikatsiya | MD5 sign har chaqiriqda | HTTP Basic Auth |
| Summa formati | Float (so'm) | Integer (tiyin, ×100) |
| Redirect | GET parametrlar | BASE64 kodlangan |
| Callback | 2 bosqich (Prepare → Complete) | 6 metod (JSON-RPC) |
| Account ID | `merchant_trans_id` | `account.user_id` / `order_id` / `phone` / `public_id` |

---

## 14. Bildirishnomalar (Notifications)

### 14.1. Qachon yuboriladi

| Hodisa | Notification turi | Kimga |
|--------|-------------------|-------|
| Nasiya qo'shilganda | `debt_created` | Do'kon egasi |
| Nasiyaga to'lov qilinganda | `debt_payment` | Do'kon egasi |
| Balans to'ldirilganda | `balance_topped_up` | Foydalanuvchi |
| Obuna sotib olinganda | `subscription_purchased` | Foydalanuvchi |

### 14.2. Data tuzilishi

```json
{
  "type": "debt_created",
  "message": "Yangi nasiya qo'shildi",
  "tenant_name": "MTP Market",
  "amount": 500000,
  "debt_id": 42,
  "source": "click|payme|admin"
}
```

### 14.3. Endpointlar

| Platforma | Endpoint | Tavsif |
|-----------|----------|--------|
| Web | `GET /notifications` | Barcha bildirishnomalar |
| Web | `GET /notifications/{id}` | Bitta (ochilganda `read_at` belgilanadi) |
| API | `GET /api/v1/notifications` | Barcha bildirishnomalar |
| API | `GET /api/v1/notifications/{id}` | Bitta (ochilganda `read_at` belgilanadi) |

---

## 15. AI SupportBot

### 15.1. Umumiy

| Parametr | Qiymat |
|----------|--------|
| Provayder | Groq (HTTP to'g'ridan-to'g'ri) |
| Model | `llama-3.3-70b-versatile` |
| Til | O'zbek |
| Maqsad | Daftaron bo'yicha foydalanuvchiga yordam |
| Chat tarixi | DB (`support_chat_messages` jadval) |

### 15.2. Endpointlar

| Platforma | Metod | Endpoint | Auth | Tavsif |
|-----------|-------|----------|------|--------|
| Web | POST | `/support/chat` | Session | Xabar yuborish |
| Web | GET | `/support/history` | Session | Chat tarixini ko'rish |
| Web | DELETE | `/support/history` | Session | Tarixni tozalash |
| API | POST | `/api/v1/support/chat` | Bearer | Xabar yuborish |
| API | GET | `/api/v1/support/history` | Bearer | Chat tarixini ko'rish |
| API | DELETE | `/api/v1/support/history` | Bearer | Tarixni tozalash |

### 15.3. Request/Response

**POST /support/chat — Request:**
```json
{
  "message": "Nasiya qanday yoziladi?"
}
```
> `history` endi serverda (DB) saqlanadi, client yuborishi shart emas.

**POST /support/chat — Response:**
```json
{
  "message": "Nasiya qanday yoziladi?",
  "reply": "Qarzlar bo'limiga o'ting, Yangi qarz tugmasini bosing. Mijozni tanlang, summani kiriting va saqlang."
}
```

**GET /support/history — Response:**
```json
{
  "history": [
    { "id": 1, "role": "user", "content": "Salom", "created_at": "2026-03-22T10:00:00Z" },
    { "id": 2, "role": "assistant", "content": "Salom! Qanday yordam bera olaman?", "created_at": "2026-03-22T10:00:01Z" }
  ]
}
```

**DELETE /support/history — Response:**
```json
{
  "message": "Chat tarixi tozalandi."
}
```

### 15.4. Chat tarixi saqlash

| Parametr | Qiymat |
|----------|--------|
| Jadval | `support_chat_messages` |
| Ustunlar | `id`, `user_id`, `role` (user/assistant), `content`, `created_at` |
| Kontekst | Oxirgi 20 ta xabar (10 juftlik) har so'rovda yuboriladi |
| Saqlash | Har bir savol-javob juftligi DB ga yoziladi |

### 15.5. Bot qoidalari

- Faqat **Daftaron** funksiyalari bo'yicha javob beradi
- Qisqa javoblar — **maksimum 2–3 gap**
- Foydalanuvchi tizimga kirgan deb faraz qilinadi
- Boshqa mavzularda: "Men faqat Daftaron ilovasi bo'yicha yordam bera olaman"
- HTML, jadval, emoji ishlatmaydi

---

## 16. Admin panel (Web)

> **Faqat Web da ishlaydi.** Kirish: `GET/POST /admin/login` (admin roli talab qilinadi).

### 16.1. Endpointlar

| URL | Tavsif |
|-----|--------|
| `/admin` | Dashboard — yangi foydalanuvchilar, statistika |
| `/admin/tenants` | Do'konlar CRUD |
| `/admin/tenants/{tenant}/balance` (POST) | Do'kon egasi balansini to'ldirish |
| `/admin/users` | Barcha foydalanuvchilar |
| `/admin/users/expired` | Obunasi tugagan foydalanuvchilar |
| `/admin/users/new` | Yangi ro'yxatdan o'tganlar |
| `/admin/managers` | Menejerlar CRUD |
| `/admin/expenses` | Xarajatlar CRUD |
| `/admin/plans` | Ta'riflar CRUD |
| `/admin/categories` | Kategoriyalar CRUD |
| `/admin/payment-systems` | To'lov tizimlari (ko'rish, tahrirlash) |
| `/admin/payments` | To'lovlar tarixi |
| `/admin/extra-packages` | Qo'shimcha paketlar CRUD (nasiya/SMS) |
| `/admin/promo-codes` | Promocodlar CRUD + foydalanish tarixi (2026-03-26) |
| `/admin/settings` | Tizim sozlamalari (trial_days, SMS narxi) |
| `/admin/profile` | Admin profil |
| `/admin/notifications` | Admin bildirishnomalari |

### 16.2. Dashboard statistikasi

- Faol foydalanuvchilar soni
- Obunasi tugagan foydalanuvchilar
- Yangi ro'yxatdan o'tganlar
- Daromad (ta'rif sotib olishlardan)

### 16.3. Foydalanuvchi holati

| `activity_status_label` | Tavsif |
|------------------------|--------|
| Faol | Trial/obuna faol |
| Obunasiz | Hech qachon obuna sotib olmagan |
| Obunasi tugagan | Obuna muddati o'tgan |

---

## 17. Do'kon (Tenant) boshqaruvi

### 17.1. Maydonlar

| Maydon | Tavsif |
|--------|--------|
| `name` | Do'kon nomi |
| `owner_id` | Egasi (FK users) |
| `manager_id` | Tayinlangan menejer (nullable) |
| `category_id` | Do'kon kategoriyasi |
| `region_id`, `district_id`, `street_id` | Manzil |
| `plan_id` | Joriy ta'rif |
| `balance` | Do'kon balansi (hozircha ishlatilmaydi) |
| `status` | `active` / `inactive` |
| `platform` | `web` (default) |

### 17.2. Yangi do'kon qo'shish

**Web:** `GET /shops/create`, `POST /shops`
**API:** `POST /api/v1/tenants`

Body: `name`, `category_id`, `region_id`, `district_id`, `street_id`

**Cheklov:** Oddiy ta'rifda faqat 1 ta do'kon. Yangi qo'shmoqchi bo'lsa:
- **422** — `"Basic (Oddiy) ta'rifda faqat bitta do'kon mumkin."` + `requires_upgrade: true`

### 17.3. Active do'konni tanlash

- **Web:** `POST /shops/switch` (`tenant_id`) — topbar do'kon selectori shu endpointga yuboradi.
- **API:** `GET /api/v1/tenants`, `PUT /api/v1/tenants/active` (`tenant_id`).
- Tanlov `users.tenant_id` da saqlanadi va tenant selector (`tenant_id`/`X-Tenant-Id`) yuborilmagan so'rovlarda default scope bo'ladi.
- Xodim CRUD (`/workers`) doim active do'kon scope ida ishlaydi.

### 17.4. Do'konni o'chirish

- **Web:** `DELETE /shops/{tenant}` — do'kon egasi active yoki o'ziga tegishli boshqa do'konni o'chira oladi.
- **API:** `DELETE /api/v1/tenants/{tenant}` — faqat `shop_owner` va faqat o'z do'koni uchun.
- O'chirish **hard delete** tarzida bajariladi.
- Shu do'konga tegishli `shop_worker`, `customers`, `debts`, `payments`, `sms_dispatch_logs` yozuvlari birga o'chiriladi.
- Agar owner’da boshqa do'kon bo'lsa, `users.tenant_id` keyingi do'konga o'tkaziladi; qolmasa `null` bo'ladi.
- Admin paneldagi `/admin/tenants/{tenant}` delete ham shu servis logikasidan foydalanadi.

### 17.5. Joylashuv ma'lumotlari (authsiz API)

| Endpoint | Tavsif |
|----------|--------|
| `GET /api/v1/locations/regions` | Viloyatlar |
| `GET /api/v1/locations/categories` | Do'kon kategoriyalari |
| `GET /api/v1/locations/districts/{regionId}` | Tumanlar |
| `GET /api/v1/locations/streets/{districtId}` | Ko'chalar |

Qo'shimcha:
- `?locale=uz|en|ru|oz` query param berilsa `name` maydoni shu locale bo'yicha qaytadi (API contract o'zgarmaydi).
- `streets` jadvali synthetic emas, `database/data/villages.json` dan to'liq mahalla ro'yxati bilan seed qilinadi.

---

## 18. Ma'lumotlar bazasi sxemasi

### 18.1. ER diagramma (asosiy jadvallar)

```
users ──────────┐
  │ balance     │
  │ trial_ends_at│
  │ status      │
  │ tenant_id ──┼──► tenants ──────┐
  │             │     │ owner_id ──┘
  │             │     │ plan_id ──► plans
  │             │     │ category_id► categories
  │             │     │ region_id ─► regions ► districts ► streets
  │             │     │
  │             │     └──► customers
  │             │           │ total_debt
  │             │           │ overdue_sms_count
  │             │           │
  │             │           └──► debts
  │             │                 │ total_amount
  │             │                 │ remaining_amount
  │             │                 │ status (open/closed)
  │             │                 │ sms_sent
  │             │                 │
  │             │                 └──► payments
  │             │                       │ amount
  │             │                       │ paid_at
  │             │
  ├──► transactions
  │     │ type (deposit/subscription/sms/refund/expense)
  │     │ amount, status
  │     │ payment_order_id ──► payment_orders
  │     │                       │ type (balance_deposit/subscription)
  │     │                       │ status (pending/completed/failed/cancelled)
  │     │                       │ payment_system_id ──► payment_systems
  │     │                       │ plan_id ──► plans
  │     │                       │ external_id
  │     │
  ├──► plan_purchases
  │     │ plan_id ──► plans
  │     │ amount, paid_at
  │     │
  └──► notifications (database)
        │ type, data (JSON)
        │ read_at
```

### 18.2. Jadvallar ro'yxati

| Jadval | Tavsif |
|--------|--------|
| `users` | Foydalanuvchilar |
| `tenants` | Do'konlar (hard delete, owner/admin delete qo'llab-quvvatlanadi) |
| `customers` | Mijozlar |
| `debts` | Nasiyalar |
| `payments` | To'lovlar (nasiya bo'yicha) |
| `plans` | Ta'rif rejalari |
| `plan_purchases` | Ta'rif sotib olish tarixi |
| `transactions` | Balans harakatlari |
| `payment_orders` | To'lov buyurtmalari (Click/Payme) |
| `payment_systems` | To'lov tizimlari konfiguratsiyasi |
| `regions` | Viloyatlar |
| `districts` | Tumanlar |
| `streets` | Ko'chalar |
| `categories` | Do'kon kategoriyalari |
| `expenses` | Xarajatlar (admin) |
| `settings` | Tizim sozlamalari (key-value) |
| `extra_packages` | Qo'shimcha paketlar (type, quantity, price, is_active, sort_order) |
| `extra_purchases` | Foydalanuvchi sotib olgan paketlar (user_id, extra_package_id, type, quantity, price) |
| `promo_codes` | Promocodlar (manager_id, code, type, amount, expires_at, usage_limit, usage_count, is_active) — 2026-03-26 |
| `promo_usages` | Promocode foydalanish tarixi (promo_code_id, user_id, discount/original/final_amount) — 2026-03-26 |
| `agent_conversations` | AI chat tarixi |
| `notifications` | Bildirishnomalar |
| `personal_access_tokens` | Sanctum tokenlar |
| `roles` / `permissions` | Spatie rollar va ruxsatlar |

### 18.3. Transaction turlari

| Tur | Tavsif |
|-----|--------|
| `deposit` | Balans to'ldirish (Click/Payme/admin) |
| `subscription` | Ta'rif sotib olish |
| `sms` | SMS uchun to'lov |
| `extra_package` | Qo'shimcha paket sotib olish |
| `refund` | Qaytarish |
| `expense` | Xarajat |

### 18.4. PaymentOrder statuslari

| Status | Tavsif |
|--------|--------|
| `pending` | Kutilmoqda (yaratilgan, to'lov kutilmoqda) |
| `completed` | Muvaffaqiyatli tugagan |
| `failed` | Xatolik bilan tugagan |
| `cancelled` | Bekor qilingan |

---

## 19. API endpointlar — to'liq ro'yxat

> Barcha endpointlar `/api/v1` prefiksi bilan. Masalan: `POST /api/v1/auth/login`

### Ochiq endpointlar (authsiz)

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| POST | `/auth/login` | Login (phone, password) |
| POST | `/auth/telegram-login` | Telegram orqali login |
| POST | `/auth/register` | Ro'yxat 1-bosqich (name, phone) |
| POST | `/auth/verify` | SMS tasdiq (phone, code, type) |
| POST | `/auth/register/complete` | Ro'yxat 2-bosqich (do'kon + parol) |
| POST | `/auth/password/forgot` | Parol tiklash 1 |
| POST | `/auth/password/verify` | Parol tiklash 2 |
| POST | `/auth/password/reset` | Parol tiklash 3 |
| GET | `/locations/regions` | Viloyatlar |
| GET | `/locations/categories` | Kategoriyalar |
| GET | `/locations/districts/{regionId}` | Tumanlar |
| GET | `/locations/streets/{districtId}` | Ko'chalar |

### Himoyalangan (Bearer, trial tekshiruvsiz)

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/subscription/status` | Obuna holati + usage limiti (trial tugaganda ham ishlaydi) |
| POST | `/subscription/choose/{plan}` | Ta'rif tanlash (promo_code qo'llab-quvvatlanadi) |
| POST | `/subscription/buy-extra/{extra_package}` | Qo'shimcha paket sotib olish |
| POST | `/promo-codes/check` | Promocode tekshirish (2026-03-26) |
| GET | `/tenants` | Foydalanuvchiga ruxsat etilgan do'konlar + active tenant |
| PUT | `/tenants/active` | Active do'konni tanlash (`tenant_id`) |
| DELETE | `/tenants/{tenant}` | Owner o'z do'konini va unga tegishli ma'lumotlarni o'chiradi |
| POST | `/support/chat` | AI support bot — xabar yuborish |
| GET | `/support/history` | AI support bot — chat tarixi |
| DELETE | `/support/history` | AI support bot — tarixni tozalash |

### Himoyalangan (Bearer + trial)

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/auth/me` | Joriy foydalanuvchi |
| POST | `/auth/logout` | Chiqish |
| GET | `/dashboard` | Dashboard statistikalar |
| GET | `/customers` | Mijozlar ro'yxati |
| POST | `/customers` | Mijoz yaratish |
| GET | `/customers/{id}` | Bitta mijoz |
| PUT | `/customers/{id}` | Mijoz yangilash |
| DELETE | `/customers/{id}` | Mijoz o'chirish |
| GET | `/debts` | Nasiyalar ro'yxati |
| POST | `/debts` | Nasiya yaratish |
| GET | `/debts/{id}` | Bitta nasiya |
| PUT | `/debts/{id}` | Nasiya yangilash |
| DELETE | `/debts/{id}` | Nasiya o'chirish |
| PATCH | `/debts/{id}/close` | Nasiyani yopish |
| GET | `/debts/overdue` | Muddati o'tgan qarzdorlar |
| POST | `/debts/overdue/{customer}/send-sms` | Muddati o'tganga eslatma SMS |
| GET | `/payments` | To'lovlar ro'yxati |
| POST | `/payments` | To'lov yaratish |
| GET | `/workers` | Xodimlar ro'yxati + statistikalar |
| POST | `/workers` | Xodim yaratish (active do'konga biriktiriladi) |
| GET | `/workers/{id}` | Bitta xodim + statistikalar |
| PUT | `/workers/{id}` | Xodimni yangilash |
| DELETE | `/workers/{id}` | Xodimni o'chirish |
| GET | `/profile` | Profil |
| PUT | `/profile` | Profil yangilash |
| PUT | `/profile/password` | Parol o'zgartirish |
| GET | `/notifications` | Bildirishnomalar |
| GET | `/notifications/{id}` | Bitta bildirishnoma |
| POST | `/tenants` | Yangi do'kon qo'shish |

### Tashqi webhook

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| POST | `/api/payme/merchant` | Payme JSON-RPC 2.0 (authsiz, lekin Basic Auth) |

---

## 20. Web route'lar — to'liq ro'yxat

### Auth (ochiq)

| URL | Metod | Tavsif |
|-----|-------|--------|
| `/login` | GET/POST | Login |
| `/telegram/web-login` | GET | Telegram Web App login |
| `/register` | GET/POST | Ro'yxat 1-bosqich |
| `/register/phone` | GET | Telefon kiritish |
| `/verify` | POST | SMS tasdiq |
| `/register/complete` | GET/POST | Ro'yxat 2-bosqich |
| `/password/forgot` | GET/POST | Parol tiklash 1 |
| `/password/verify` | GET/POST | Parol tiklash 2 |
| `/password/new` | GET | Yangi parol kiritish |
| `/password/reset` | POST | Parol yangilash |
| `/admin/login` | GET/POST | Admin login |
| `/logout` | POST | Chiqish |
| `/oferta` | GET | Ommaviy oferta |

### Click callback (authsiz)

| URL | Metod | Tavsif |
|-----|-------|--------|
| `/payment/click/prepare` | POST | Click prepare callback |
| `/payment/click/complete` | POST | Click complete callback |

### Auth + trial tekshiruvsiz

| URL | Metod | Tavsif |
|-----|-------|--------|
| `/subscription/expired` | GET | Obuna tugagan sahifa |
| `/subscription/status` | GET | Obuna holati |
| `/subscription/choose/{plan}` | POST | Ta'rif tanlash |
| `/subscription/balance-topup` | POST | Balans to'ldirish |
| `/subscription/plan-pay/{plan}` | POST | Ta'rif to'lash (to'lov tizimi orqali) |
| `/shops/switch` | POST | Active do'konni almashtirish (`tenant_id`) |
| `/shops/{tenant}` | DELETE | Owner do'konni va uning barcha tenant ma'lumotlarini o'chiradi |
| `/payment/return` | GET | To'lovdan qaytish |
| `/payment/cancel` | GET | To'lov bekor |

### Auth + trial

| URL | Metod | Tavsif |
|-----|-------|--------|
| `/dashboard` | GET | Dashboard |
| `/profile` | GET | Profil |
| `/profile/edit` | GET | Profil tahrirlash |
| `/profile` | PUT | Profil yangilash |
| `/profile/change-password` | POST | Parol o'zgartirish |
| `/customers` | resource | Mijozlar CRUD |
| `/debts` | resource | Nasiyalar CRUD |
| `/debts/{debt}/close` | PATCH | Nasiyani yopish |
| `/overdue` | GET | Muddati o'tganlar |
| `/overdue/{customer}/send-sms` | POST | Eslatma SMS |
| `/payments` | resource | To'lovlar CRUD |
| `/workers` | resource | Xodimlar CRUD + statistika |
| `/shops/create` | GET | Do'kon yaratish formasi |
| `/shops` | POST | Do'kon yaratish |
| `/notifications` | GET | Bildirishnomalar |
| `/notifications/{id}` | GET | Bitta bildirishnoma |
| `/transaction-history` | GET | Tranzaksiyalar tarixi |
| `/plan-purchase-history` | GET | Ta'rif sotib olish tarixi |
| `/support/chat` | POST | AI support chat — xabar yuborish |
| `/support/history` | GET | Chat tarixi (DB dan) |
| `/support/history` | DELETE | Chat tarixini tozalash |

### Admin (`/admin` prefix)

| URL | Metod | Tavsif |
|-----|-------|--------|
| `/admin` | GET | Dashboard |
| `/admin/tenants` | resource | Do'konlar CRUD |
| `/admin/tenants/{tenant}/balance` | POST | Balans to'ldirish |
| `/admin/users` | GET | Foydalanuvchilar |
| `/admin/users/expired` | GET | Obunasi tugaganlar |
| `/admin/users/new` | GET | Yangi foydalanuvchilar |
| `/admin/managers` | resource | Menejerlar CRUD |
| `/admin/expenses` | resource | Xarajatlar CRUD |
| `/admin/plans` | resource | Ta'riflar CRUD |
| `/admin/categories` | resource | Kategoriyalar CRUD |
| `/admin/payment-systems` | index/edit/update | To'lov tizimlari |
| `/admin/payments` | GET | To'lovlar tarixi |
| `/admin/extra-packages` | resource | Qo'shimcha paketlar CRUD |
| `/admin/settings` | GET/PUT | Sozlamalar |
| `/admin/profile` | GET | Admin profil |
| `/admin/notifications` | GET | Admin bildirishnomalari |

---

## 21. Xato kodlari

| Kod | Tavsif | Foydalanuvchi harakati |
|-----|--------|----------------------|
| **200** | Muvaffaqiyatli | — |
| **201** | Yaratildi | — |
| **401** | Token yo'q / eskirgan | Token o'chirish → Login |
| **403** | Trial tugagan / hisob bloklangan | Obuna sahifasiga yo'naltirish |
| **404** | Topilmadi | "Ma'lumot topilmadi" |
| **422** | Validatsiya xatosi | Xato xabarlarni ko'rsatish |
| **500** | Server xatosi | "Xatolik yuz berdi" |

### 422 javob formati

```json
{
  "message": "Mablag' yetarli emas.",
  "plan_price": 29000,
  "balance": 5000
}
```

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "phone": ["Telefon raqam majburiy."],
    "amount": ["Summa 0 dan katta bo'lishi kerak."]
  }
}
```

---

## 22. Muhim konfiguratsiyalar

### .env (asosiy o'zgaruvchilar)

```env
# Ilova
APP_URL=https://your-domain.com
APP_TIMEZONE=Asia/Tashkent

# Ma'lumotlar bazasi
DB_DATABASE=daftaron

# SMS (Eskiz)
ESKIZ_EMAIL=...
ESKIZ_PASSWORD=...
SMS_VERIFICATION_ENABLED=true
SMS_VERIFICATION_LOGIN_ENABLED=true

# Telegram
TELEGRAM_BOT_TOKEN=...

# Click
CLICK_SERVICE_ID=96745
CLICK_MERCHANT_ID=57186
CLICK_SECRET_KEY=...
CLICK_MERCHANT_USER_ID=78591

# Payme
PAYME_MERCHANT_ID=...
PAYME_MERCHANT_TEST_KEY=...
PAYME_MERCHANT_KEY=...
PAYME_CHECKOUT_URL=https://checkout.paycom.uz
PAYME_CHECKOUT_ACCOUNT_FIELD=user_id

# AI
GROQ_API_KEY=...
```

### Dinamik sozlamalar (admin panel orqali)

| Kalit | Default | Tavsif |
|-------|---------|--------|
| `trial_days` | 15 | Sinov muddati (kun) |
| `extra_sms_price` | 190 | Limitdan keyingi har bir SMS narxi (so'm) |

> Qo'shimcha nasiya/SMS paketlari endi `extra_packages` jadvalida admin tomonidan boshqariladi (`/admin/extra-packages`).

---

## 23. API Endpointlar va Javob Formatlar

> **Eslatma:** Barcha API endpointlari `/api/v1` prefiksi bilan ishlaydi. Detailed OpenAPI 3.0 spesifikatsiyasi uchun [public/docs/openapi.yaml](../public/docs/openapi.yaml) faylini ko'ring.

### 23.1. Authentifikatsiya va Ruxsatlar

#### Login (API)

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "phone": "+998901234567",
  "password": "password123",
  "device_name": "iPhone 13 Pro"
}
```

**Response (200 — Muvaffaqiyatli):**
```json
{
  "token": "1|ABCDEFGHIJKLMNOPQRSTUVWXYZ...",
  "user": {
    "id": 1,
    "public_id": 1001,
    "name": "John Doe",
    "phone": "+998901234567",
    "email": "john@example.com",
    "balance": 50000,
    "trial_ends_at": "2026-04-05T10:30:00Z",
    "status": 1
  }
}
```

**Response (422 — SMS tasdiq talab qilinadi):**
```json
{
  "requires_verification": true,
  "message": "SMS tasdiqlash talab qilinadi."
}
```

#### Telegram Login

**Endpoint:** `POST /auth/telegram-login`

**Request:**
```json
{
  "phone": "+998901234567",
  "device_name": "Mobile App"
}
```

**Response (200):**
```json
{
  "token": "1|ABCDEFGHIJKLMNOPQRSTUVWXYZ...",
  "user": { ... }
}
```

**Response (404 — Ro'yxatdan o'tmagan):**
```json
{
  "requires_registration": true,
  "phone": "+998901234567",
  "message": "Bazada foydalanuvchi topilmadi. Ro'yxatdan o'ting."
}
```

#### Logout

**Endpoint:** `POST /auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Muvaffaqiyatli chiqildi."
}
```

### 23.2. Ro'yxatdan O'tish (Taqdimiy 3-bosqich)

#### Bosqich 1: Ism + Telefon

**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "phone": "+998901234567",
  "device_name": "Mobile"
}
```

**Response (200):**
```json
{
  "requires_verification": true,
  "message": "SMS kodi yuborildi."
}
```

#### Bosqich 2: SMS Kodi

**Endpoint:** `POST /auth/verify`

**Request:**
```json
{
  "phone": "+998901234567",
  "code": "1234",
  "type": "register"
}
```

**Response (200):**
```json
{
  "message": "Telefon tekshirildi. Do'kon ma'lumotlarini kiriting."
}
```

**Response (422 — Noto'g'ri kod):**
```json
{
  "message": "Kodi tekshiruvi muvaffaq bo'lmadi.",
  "errors": { "code": ["Noto'g'ri kod."] }
}
```

#### Bosqich 3: Do'kon + Parol

**Endpoint:** `POST /auth/register/complete`

**Request:**
```json
{
  "phone": "+998901234567",
  "shop_name": "Bozor Market",
  "category_id": 1,
  "region_id": 1,
  "district_id": 5,
  "street_id": 120,
  "password": "SecurePass123",
  "password_confirmation": "SecurePass123",
  "device_name": "Mobile"
}
```

**Response (201):**
```json
{
  "token": "1|ABCDEFGHIJKLMNOPQRSTUVWXYZ...",
  "user": { ... },
  "tenant": {
    "id": 1,
    "name": "Bozor Market",
    "category_id": 1,
    "region_id": 1,
    "district_id": 5,
    "street_id": 120
  }
}
```

### 23.3. Parol Tiklash

#### Qadim 1: Telefon

**Endpoint:** `POST /auth/password/forgot`

**Request:**
```json
{
  "phone": "+998901234567"
}
```

**Response (200):**
```json
{
  "message": "SMS kodi yuborildi."
}
```

#### Qadim 2: SMS Kodi

**Endpoint:** `POST /auth/password/verify`

**Request:**
```json
{
  "phone": "+998901234567",
  "code": "5678"
}
```

**Response (200):**
```json
{
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Qadim 3: Yangi Parol

**Endpoint:** `POST /auth/password/reset`

**Request:**
```json
{
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "NewPass456",
  "password_confirmation": "NewPass456"
}
```

**Response (200):**
```json
{
  "message": "Parol muvaffaqiyatli yangilandi."
}
```

### 23.4. Profil

#### Profil Ko'rish

**Endpoint:** `GET /profile`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "public_id": 1001,
  "name": "John Doe",
  "phone": "+998901234567",
  "email": "john@example.com",
  "balance": 50000,
  "tenant_id": 1,
  "status": 1,
  "trial_ends_at": "2026-04-05T10:30:00Z"
}
```

#### Profil Yangilash

**Endpoint:** `PUT /profile`

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response (200):** Yangilangan profil ma'lumotlari

#### Parol O'zgartirish

**Endpoint:** `PUT /profile/password`

**Request:**
```json
{
  "current_password": "OldPass123",
  "password": "NewPass456",
  "password_confirmation": "NewPass456"
}
```

**Response (200):**
```json
{
  "message": "Parol muvaffaqiyatli yangilandi."
}
```

### 23.5. Obuna va Balans

#### Obuna Holati

**Endpoint:** `GET /subscription/status`

**Headers:** `Authorization: Bearer <token>`

**Response (200):** [6.5 bo'limda batafsil formatni qarang]

#### Ta'rif Tanlash

**Endpoint:** `POST /subscription/choose/{plan_id}`

**Headers:** `Authorization: Bearer <token>`

**Request (ixtiyoriy promocode):**
```json
{
  "promo_code": "SALE20"
}
```

**Response (200):**
```json
{
  "message": "Ta'rif muvaffaqiyatli tanlandi.",
  "plan": { "id": 2, "name": "Pro", "price": 49000 },
  "new_trial_ends_at": "2026-05-05T10:30:00Z",
  "balance_after": 1000
}
```

**Response (422 — Balans yetmasa):**
```json
{
  "message": "Mablag' yetarli emas.",
  "plan_price": 49000,
  "balance": 5000
}
```

#### Promocode Tekshirish

**Endpoint:** `POST /promo-codes/check`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "code": "SALE20"
}
```

**Response (200 — Faol):**
```json
{
  "valid": true,
  "type": "percent",
  "amount": 20,
  "discount_label": "20% chegirma",
  "message": "Promocode faol."
}
```

**Response (422 — Nofaol):**
```json
{
  "valid": false,
  "message": "Promocode muddati o'tgan yoki faol emas."
}
```

#### Qo'shimcha Paket Sotib Olish

**Endpoint:** `POST /subscription/buy-extra/{extra_package_id}`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Paket muvaffaqiyatli sotib olingan.",
  "package": {
    "id": 2,
    "type": "sms",
    "quantity": 50,
    "price": 25000
  },
  "balance_after": 25000
}
```

### 23.6. Do'konlar (Tenants)

#### Do'konlar Ro'yxati

**Endpoint:** `GET /tenants`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "tenants": [
    {
      "id": 1,
      "name": "Bozor Market",
      "region": "Andijon viloyati",
      "district": "Andijon tumani",
      "street": "Navro'z MFY",
      "category": "Oziq-ovqat",
      "plan_id": 2,
      "status": "active",
      "balance": 0,
      "is_active": true
    }
  ],
  "active_tenant_id": 1
}
```

#### Active Do'konni Tanlash

**Endpoint:** `PUT /tenants/active`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "tenant_id": 1
}
```

**Response (200):**
```json
{
  "message": "Faol do'kon yangilandi.",
  "active_tenant": {
    "id": 1,
    "name": "Bozor Market"
  }
}
```

#### Yangi Do'kon Qo'shish

**Endpoint:** `POST /tenants`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Yangi Dukoni",
  "category_id": 2,
  "region_id": 2,
  "district_id": 8,
  "street_id": 200
}
```

**Response (201 — Muvaffaqiyatli):**
```json
{
  "message": "Do'kon qo'shildi.",
  "tenant": {
    "id": 2,
    "name": "Yangi Dukoni",
    "category_id": 2,
    "plan_id": 2,
    "status": "active"
  },
  "usage": {
    "base": 3,
    "extra": 0,
    "total": 3,
    "used": 2,
    "remaining": 1
  }
}
```

**Response (422 — Oddiy ta'rifda limit):**
```json
{
  "message": "Basic (Oddiy) ta'rifda faqat bitta do'kon mumkin.",
  "requires_upgrade": true
}
```

#### Do'konni O'chirish

**Endpoint:** `DELETE /tenants/{tenant}`

**Headers:** `Authorization: Bearer <token>`

**Qoidalar:**
- Faqat `shop_owner` o'ziga tegishli do'konni o'chira oladi.
- Do'kon bilan birga `shop_worker`, `customers`, `debts`, `payments`, `sms_dispatch_logs` ham o'chiriladi.
- Agar owner’da boshqa do'kon bo'lsa, `active_tenant_id` keyingi do'konga o'tadi.

**Response (200):**
```json
{
  "message": "Do'kon va unga tegishli ma'lumotlar o'chirildi.",
  "active_tenant_id": null,
  "tenants": []
}
```

### 23.7. Mijozlar (Customers)

#### Mijozlar Ro'yxati

**Endpoint:** `GET /customers`

**Headers:** `Authorization: Bearer <token>; X-Tenant-Id: 1` (yoki query: `?tenant_id=1`)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Aka Rajab",
      "phone": "+998901112233",
      "address": "Tashkent, Amir Temur ko'chasi, 45",
      "description": "Savdo miqdori 5-10 million",
      "total_debt": 1500000,
      "overdue_sms_count": 2,
      "overdue_sms_last_sent_at": "2026-03-20T14:00:00Z"
    }
  ]
}
```

#### Mijoz Qo'shish

**Endpoint:** `POST /customers`

**Request:**
```json
{
  "name": "Aka Rajab",
  "phone": "+998901112233",
  "address": "Tashkent, Amir Temur ko'chasi, 45",
  "description": "Yangi mijoz"
}
```

**Response (201):** Yaratilgan mijoz ma'lumotlari

#### Mijoz Yangilash

**Endpoint:** `PUT /customers/{id}`

**Request:** [Yuqoridagi kabi]

**Response (200):** Yangilangan ma'lumotlar

#### Mijoz O'chirish

**Endpoint:** `DELETE /customers/{id}`

**Response (200):**
```json
{
  "message": "Mijoz o'chirildi."
}
```

### 23.8. Nasiyalar (Debts)

#### Nasiyalar Ro'yxati

**Endpoint:** `GET /debts`

**Query parametrlar:** `?customer_id=1&tenant_id=1`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "total_amount": 500000,
      "remaining_amount": 200000,
      "debt_date": "2026-03-15",
      "status": "open",
      "description": "Baliqsimonning to'lovlari",
      "sms_sent": true,
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

#### Nasiya Qo'shish

**Endpoint:** `POST /debts`

**Request:**
```json
{
  "customer_id": 1,
  "total_amount": 500000,
  "debt_date": "2026-03-15",
  "description": "Baliqsimonning to'lovlari",
  "send_sms": true
}
```

**Response (201 — Muvaffaqiyatli):**
```json
{
  "success": true,
  "message": "Nasiya muvaffaqiyatli qo'shildi.",
  "debt": {
    "id": 1,
    "customer_id": 1,
    "total_amount": 500000,
    "remaining_amount": 500000
  },
  "remaining_limit": 69,
  "sms_sent": true,
  "sms_info": {
    "message": "Aka Rajab aka siz 2026-03-15 sanasida Bozor Market dan 500000 so'm qarzdor bo'ldingiz."
  }
}
```

**Response (403 — Limit tugagan):**
```json
{
  "error": true,
  "message": "Sizning nasiya limitingiz tugadi. 0 ta nasiya qo'shish ham mumkin.",
  "remaining_limit": 0
}
```

**Response (422 — SMS balans yetmasa):**
```json
{
  "success": true,
  "message": "Nasiya qo'shildi, lekin SMS yuborilmadi.",
  "debt": { ... },
  "sms_error": "Balans yetarli emas. 190 so'm kerak."
}
```

#### Nasiyani Yopish

**Endpoint:** `PATCH /debts/{id}/close`

**Response (200):**
```json
{
  "message": "Nasiya yopildi.",
  "debt": {
    "id": 1,
    "status": "closed",
    "remaining_amount": 0
  }
}
```

### 23.9. To'lovlar (Payments)

#### To'lovlar Ro'yxati

**Endpoint:** `GET /payments`

**Query parametrlar:** `?debt_id=1&tenant_id=1`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "debt_id": 1,
      "amount": 200000,
      "paid_at": "2026-03-18T15:30:00Z"
    }
  ]
}
```

#### To'lov Qo'shish

**Endpoint:** `POST /payments`

**Request:**
```json
{
  "debt_id": 1,
  "amount": 200000,
  "paid_at": "2026-03-18",
  "send_sms": true
}
```

**Response (201):**
```json
{
  "message": "To'lov muvaffaqiyatli qo'shildi.",
  "payment": {
    "id": 1,
    "debt_id": 1,
    "amount": 200000
  },
  "debt_remaining": 300000,
  "sms_sent": true
}
```

### 23.10. Muddati O'tgan Qarzdorlar (Overdue)

#### Muddati O'tganlar Ro'yxati

**Endpoint:** `GET /debts/overdue`

**Query parametrlar:** `?days=10&tenant_id=1`

**Response (200):**
```json
{
  "data": [
    {
      "customer_id": 1,
      "name": "Aka Rajab",
      "phone": "+998901112233",
      "first_debt_date": "2026-02-15",
      "total_remaining": 2500000,
      "days_overdue": 35,
      "overdue_sms_count": 3,
      "overdue_sms_last_sent_at": "2026-03-20T14:00:00Z"
    }
  ]
}
```

#### Eslatma SMS Yuborish

**Endpoint:** `POST /debts/overdue/{customer_id}/send-sms`

**Query parametrlar:** `?days=10&tenant_id=1`

**Response (200):**
```json
{
  "success": true,
  "message": "SMS muvaffaqiyatli yuborildi.",
  "overdue_sms_count": 4,
  "overdue_sms_last_sent_at": "2026-03-23T14:00:00Z"
}
```

### 23.11. Joylashuv Ma'lumotlari (Authsiz)

#### Viloyatlar

**Endpoint:** `GET /locations/regions`

**Query parametrlar:** `?locale=uz` (ixtiyoriy)

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Tashkent",
      "name_translations": { "uz": "Toshkent", "ru": "Ташкент", "en": "Tashkent" }
    }
  ]
}
```

#### Kategoriyalar

**Endpoint:** `GET /locations/categories`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Oziq-ovqat",
      "name_translations": { "uz": "Oziq-ovqat", "ru": "Продукты", "en": "Groceries" }
    }
  ]
}
```

#### Tumanlar

**Endpoint:** `GET /locations/districts/{region_id}`

**Response (200):**
```json
{
  "data": [
    {
      "id": 5,
      "region_id": 1,
      "name": "Shayxontohur",
      "name_translations": { "uz": "Shayxontoxur", ... }
    }
  ]
}
```

#### Ko'chalar

**Endpoint:** `GET /locations/streets/{district_id}`

**Response (200):**
```json
{
  "data": [
    {
      "id": 120,
      "district_id": 5,
      "name": "Amir Temur ko'chasi",
      "name_translations": { ... }
    }
  ]
}
```

### 23.12. AI SupportBot

#### Xabar Yuborish

**Endpoint:** `POST /support/chat`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "message": "Nasiya qanday qo'shiladi?"
}
```

**Response (200):**
```json
{
  "message": "Nasiya qanday qo'shiladi?",
  "reply": "Qarzlar bo'limiga o'ting, Yangi qarz tugmasini bosing. Mijozni tanlang, summani kiriting va saqlang."
}
```

#### Chat Tarixi

**Endpoint:** `GET /support/history`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "history": [
    {
      "id": 1,
      "role": "user",
      "content": "Salom",
      "created_at": "2026-03-22T10:00:00Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Salom! Qanday yordam bera olaman?",
      "created_at": "2026-03-22T10:00:01Z"
    }
  ]
}
```

#### Chat Tarixini Tozalash

**Endpoint:** `DELETE /support/history`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Chat tarixi tozalandi."
}
```

### 23.13. Bildirishnomalar (Notifications)

#### Bildirishnomalar Ro'yxati

**Endpoint:** `GET /notifications`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "type": "debt_created",
      "message": "Yangi nasiya qo'shildi",
      "data": {
        "tenant_name": "Bozor Market",
        "amount": 500000,
        "debt_id": 1
      },
      "read_at": null,
      "created_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

#### Bitta Bildirishnoma

**Endpoint:** `GET /notifications/{id}`

**Response (200):** [Yuqoridagi ma'lumotlar], `read_at` yangilangan bo'ladi

### 23.14. Xodimlar (Workers)

#### Xodimlar Ro'yxati

**Endpoint:** `GET /workers`

**Headers:** `Authorization: Bearer <token>`; Query: `?tenant_id=1`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Ali Karimov",
      "phone": "+998901234567",
      "role": "seller",
      "status": "active",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

#### Xodim Qo'shish

**Endpoint:** `POST /workers`

**Request:**
```json
{
  "name": "Ali Karimov",
  "phone": "+998901234567",
  "role": "seller"
}
```

**Response (201):** Yaratilgan xodim ma'lumotlari

#### Xodim Yangilash

**Endpoint:** `PUT /workers/{id}`

**Request:**
```json
{
  "name": "Ali Karimov Jr.",
  "status": "active"
}
```

**Response (200):** Yangilangan ma'lumotlar

#### Xodim O'chirish

**Endpoint:** `DELETE /workers/{id}`

**Response (200):**
```json
{
  "message": "Xodim o'chirildi."
}
```

### 23.15. Dashboard

#### Dashboard Statistikalaari

**Endpoint:** `GET /dashboard`

**Headers:** `Authorization: Bearer <token>`; Query: `?tenant_id=1`

**Response (200):**
```json
{
  "summary": {
    "total_customers": 45,
    "total_debts": 12,
    "total_debt_amount": 15000000,
    "total_payments": 8,
    "total_payment_amount": 5000000,
    "remaining_debt": 10000000,
    "overdue_amount": 2500000,
    "overdue_customers": 5
  },
  "recent_debts": [ ... ],
  "recent_payments": [ ... ]
}
```

### 23.16. Xato Javoblar

#### 401 — Autentifikatsiya Xatosi

```json
{
  "message": "Autentifikatsiya muvaffaq bo'lmadi.",
  "error": "Unauthorized"
}
```

#### 403 — Ruxsat Rad Etildi

```json
{
  "message": "Bu do'konga kirish huquqingiz yo'q.",
  "error": "Forbidden"
}
```

#### 404 — Topilmadi

```json
{
  "message": "Resurs topilmadi.",
  "error": "Not Found"
}
```

#### 422 — Validatsiya Xatosi

```json
{
  "message": "Kiritilgan ma'lumotlar noto'g'ri.",
  "errors": {
    "phone": ["Telefon raqam majburiy yoki noto'g'ri formatda."],
    "amount": ["Summa 0 dan katta bo'lishi kerak."]
  }
}
```

#### 500 — Server Xatosi

```json
{
  "message": "Server xatosi yuz berdi.",
  "error": "Internal Server Error"
}
```

### 23.17. Tashqi API — Payme Webhook

#### Payme Merchant API (JSON-RPC 2.0)

**Endpoint:** `POST /api/payme/merchant`

**Autentifikatsiya:** HTTP Basic Auth

- **Login:** `merchant_id` yoki `paycom` yoki `Paycom`
- **Password:** `.env` da `PAYME_MERCHANT_TEST_KEY` (test) yoki `PAYME_MERCHANT_KEY` (production)

**Request Misol (CheckPerformTransaction):**
```json
{
  "id": 1,
  "method": "CheckPerformTransaction",
  "params": {
    "account": {
      "user_id": 1
    },
    "amount": 2900000
  }
}
```

**Response (Success):**
```json
{
  "id": 1,
  "result": {
    "allow": true
  }
}
```

**Response (Error):**
```json
{
  "id": 1,
  "error": {
    "code": -31050,
    "message": "Foydalanuvchi topilmadi",
    "data": null
  }
}
```

#### Payme Metodlari

| Metod | Tavsif |
|-------|--------|
| `CheckPerformTransaction` | Tranzaksiyani bajarishdan oldin tekshirish |
| `CreateTransaction` | Tranzaksiyani yaratish |
| `PerformTransaction` | Tranzaksiyani yakunlash |
| `CancelTransaction` | Bekor qilish |
| `CheckTransaction` | Holatini tekshirish |
| `GetStatement` | Vaqt oralig'idagi tranzaksiyalar |

#### Click Callback Endpointlari

**Prepare:** `POST /payment/click/prepare` (MD5 sign bilan)

**Complete:** `POST /payment/click/complete` (MD5 sign bilan)

[Batafsil: 12-bo'limga qarang]

---

## Yangilanishlar tarixi

| Sana | Yangilanish | Tavsif |
|------|-------------|--------|
| 2026-04-23 | v1.1.0 | - Public Offer, Privacy Policy va aloqa ma'lumotlari admin panelda qo'shildi<br>- OpenAPI 3.0 spesifikatsiyasi yaratildi<br>- Tashkent mahalla seederini yangilandi (placeholder o'rniga haqiqiy nomlar)<br>- Admin sozlamalariga yangi maydonlar qo'shildi<br>- Public API endpointlari qo'shildi |
| 2026-04-01 | v1.0.0 | - Dastlabki versiya<br>- Laravel 12, PHP 8.2+, MySQL<br>- Multi-tenant arxitektura<br>- Click va Payme to'lov tizimlari<br>- Eskiz SMS integratsiyasi<br>- AI SupportBot (Groq)<br>- Admin panel<br>- Mobil API<br>- Promocodlar tizimi |
| 2026-03-26 | v0.9.0 | - Promocodlar tizimi qo'shildi<br>- Managerlar uchun chegirma boshqaruvi<br>- Promo usage tracking |
| 2026-03-22 | v0.8.0 | - UserFlow-Mobile.md hujjati yaratildi<br>- Mobil ilova uchun batafsil flow<br>- API endpointlar dokumentatsiyasi |
| 2026-03-15 | v0.7.0 | - Qo'shimcha paketlar tizimi<br>- Nasiya va SMS paketlari<br>- Limit boshqaruvi |
| 2026-03-01 | v0.6.0 | - Trial va obuna tizimi<br>- Balans to'ldirish<br>- Ta'riflar boshqaruvi |
| 2026-02-15 | v0.5.0 | - Mijozlar, nasiyalar, to'lovlar CRUD<br>- SMS bildirishnomalar<br>- Muddati o'tgan qarzdorlar |
| 2026-02-01 | v0.4.0 | - Autentifikatsiya tizimi<br>- Sanctum Bearer token<br>- Telegram login |
| 2026-01-15 | v0.3.0 | - Ma'lumotlar bazasi sxemasi<br>- Migrationlar<br>- Seedlar |
| 2026-01-01 | v0.2.0 | - Laravel loyihasi yaratildi<br>- Asosiy arxitektura<br>- Routing va controllerlar |
| 2025-12-15 | v0.1.0 | - TZ va UserFlow hujjatlari<br>- Loyiha rejalashtiruvi |

---

*So'nggi yangilanish: 2026-04-23* | **Muallif:** Daftaron Development Team
