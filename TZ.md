# Daftaron — Texnik Topshiriq (TZ)

> So'nggi yangilanish: 2026-03-22

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

### 4.3. Telefon formati

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

**Limit tekshiruvi (DebtService):**
- Barcha nasiyalar umumiy hisoblanadi — `debt_limit` bilan solishtiriladi
- Limit tugasa — 422 xato, yangi nasiya yozib bo'lmaydi
- `debt_limit = null` bo'lsa — cheksiz

### 6.3. Ta'rif tanlash qoidalari

| Holat | Qoida |
|-------|-------|
| Trial davrida | Faqat **Oddiy** ta'rif, bepul |
| Trial tugagandan keyin | Barcha ta'riflar, narx **balansdan** yechiladi |
| Shu ta'rif allaqachon faol | **422** — muddat uzaytirilmaydi |
| Balans yetmasa | **422** — `"Mablag' yetarli emas"` + `plan_price`, `balance` |
| Muvaffaqiyatli tanlash | `trial_ends_at` 1 oyga uzayadi, `PlanPurchase` yozuvi yaratiladi |

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
    "extra_sms_price": 190
  },
  "plans": [
    {
      "id": 1,
      "name": "Oddiy",
      "price": 29000,
      "debt_limit": 70,
      "sms_limit": 20
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

| `extra_packages` maydon | Tavsif |
|--------------------------|--------|
| `id` | Paket ID |
| `type` | `debt` yoki `sms` |
| `quantity` | Paketdagi miqdor |
| `price` | Narxi (so'm) |
| `is_active` | Faolmi |
| `sort_order` | Tartib raqami |

### 6.6. Qo'shimcha paketlar tizimi

Admin panelda **Qo'shimcha paketlar** (`/admin/extra-packages`) bo'limida istalgan miqdor va narxda paketlar yaratiladi.

**Paket turlari:** `debt` (nasiya) va `sms`.

**Sotib olish:**
- **Web:** `POST /subscription/buy-extra/{extra_package}` — balansdan yechiladi
- **API:** `POST /v1/subscription/buy-extra/{extra_package}` — balansdan yechiladi

Sotib olingan paketlar `extra_purchases` jadvaliga yoziladi va foydalanuvchining umumiy limitiga qo'shiladi:
- Nasiya limiti = `plan.debt_limit` + sotib olingan `debt` paketlar `quantity` yig'indisi
- SMS limiti = `plan.sms_limit` + sotib olingan `sms` paketlar `quantity` yig'indisi

**Tranzaksiya turi:** `transactions.type = "extra_package"`

### 6.7. SMS narxi (sozlamalar)

Admin panelda `Sozlamalar` bo'limida:

| Sozlama | Default | Tavsif |
|---------|---------|--------|
| `extra_sms_price` | 190 so'm | Bepul + paket limiti tugagandan keyin har bir SMS narxi |

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
| `subscription` | `trial_ends_at` 1 oyga uzaytirish, `user.status = 1`, `PlanPurchase` yaratish, `tenant.plan_id` yangilash (balansdan yechilmaydi) |

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
| `PAYME_CHECKOUT_ACCOUNT_FIELD` | `order_id` (Payme kabinetidagi account maydoni nomi) |

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
  ac.order_id={payment_orders.id};
  a={summa_tiyinda};
  c={APP_URL}/payment/return;
  l=uz
)
```

> **Muhim:** Summa **tiyin** da (×100). Masalan 29 000 so'm = 2 900 000 tiyin.

### 13.4. Merchant API (JSON-RPC 2.0)

**Endpoint:** `POST /api/payme/merchant`

**Autentifikatsiya:** HTTP Basic Auth
- Login: `merchant_id`, `Paycom`, yoki `paycom`
- Password: `test_key` (test) yoki `key` (production)

#### Metodlar

| Metod | Tavsif |
|-------|--------|
| `CheckPerformTransaction` | Tranzaksiyani bajarish mumkinmi — order mavjudligi, status va summa tekshiriladi |
| `CreateTransaction` | Tranzaksiya yaratish — PaymentOrder bilan bog'lash |
| `PerformTransaction` | Tranzaksiyani yakunlash — balans/obuna yangilash |
| `CancelTransaction` | Bekor qilish (faqat pending holatda) |
| `CheckTransaction` | Tranzaksiya holatini tekshirish |

#### Account maydonlari (foydalanuvchini aniqlash)

| Maydon | Tavsif |
|--------|--------|
| `account.order_id` | `PaymentOrder.id` (web checkout) — **asosiy usul** |
| `account.user_id` | `User.id` (legacy) |
| `account.public_id` | `User.id + 1000` |
| `account.phone` | Telefon raqam (normalizatsiya) |

#### Xato kodlari

| Kod | Tavsif |
|-----|--------|
| `-31001` | Foydalanuvchi topilmadi |
| `-31003` | Noto'g'ri summa |
| `-31008` | Tranzaksiya yakunlanmaydi |
| `-32504` | Autentifikatsiya xatosi |

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
    "code": -31001,
    "message": { "uz": "Foydalanuvchi topilmadi", "ru": "...", "en": "..." },
    "data": "user_not_found"
  }
}
```

### 13.5. Click va Payme taqqoslash

| Xususiyat | Click | Payme |
|-----------|-------|-------|
| Autentifikatsiya | MD5 sign har chaqiriqda | HTTP Basic Auth |
| Summa formati | Float (so'm) | Integer (tiyin, ×100) |
| Redirect | GET parametrlar | BASE64 kodlangan |
| Callback | 2 bosqich (Prepare → Complete) | 5 metod (JSON-RPC) |
| Account ID | `merchant_trans_id` | `account.order_id` / `phone` / `public_id` |

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

### 17.3. Joylashuv ma'lumotlari (authsiz API)

| Endpoint | Tavsif |
|----------|--------|
| `GET /api/v1/locations/regions` | Viloyatlar |
| `GET /api/v1/locations/categories` | Do'kon kategoriyalari |
| `GET /api/v1/locations/districts/{regionId}` | Tumanlar |
| `GET /api/v1/locations/streets/{districtId}` | Ko'chalar |

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
| `tenants` | Do'konlar (soft delete) |
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
| POST | `/subscription/choose/{plan}` | Ta'rif tanlash |
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
PAYME_CHECKOUT_ACCOUNT_FIELD=order_id

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

*TZ oxirgi yangilanish: 2026-03-22. Loyiha versiyasi: Laravel 12, API v1.*
