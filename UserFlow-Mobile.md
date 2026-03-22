# Daftaron — Mobile ilova uchun UserFlow

> So'nggi yangilanish: 2026-03-22

Bu hujjat **mobil ilova dasturchisi** uchun yozilgan. Har bir ekran, API chaqiriq va xato holatlari batafsil tavsiflangan.

**API base URL:** `https://<domen>/api/v1`
**Autentifikatsiya:** Bearer token (Sanctum). Token olgach har bir so'rovga `Authorization: Bearer <token>` header qo'shiladi.
**Telefon formati:** `+998901234567` yoki `998901234567` yoki 9 xonali `901234567` (avtomatik `998` qo'shiladi).

---

## Mundarija

1. [Ilova ishga tushganda](#1-ilova-ishga-tushganda-cold-start)
2. [Login](#2-login)
3. [Telegram orqali login](#3-telegram-orqali-login)
4. [Ro'yxatdan o'tish](#4-royxatdan-otish)
5. [Parolni tiklash](#5-parolni-tiklash)
6. [Obuna va trial](#6-obuna-va-trial)
7. [Dashboard](#7-dashboard)
8. [Profil](#8-profil)
9. [Mijozlar](#9-mijozlar)
10. [Nasiyalar](#10-nasiyalar)
11. [To'lovlar](#11-tolovlar)
12. [Muddati o'tgan qarzdorlar](#12-muddati-otgan-qarzdorlar)
13. [Do'kon qo'shish](#13-dokon-qoshish)
14. [Bildirishnomalar](#14-bildirishnomalar)
15. [AI SupportBot](#15-ai-supportbot)
16. [Balans to'ldirish](#16-balans-toldirish)
17. [Chiqish](#17-chiqish)
18. [Xato kodlari va umumiy ishlov](#18-xato-kodlari-va-umumiy-ishlov)
19. [Endpoint qisqa jadvali](#19-endpoint-qisqa-jadvali)

---

## 1. Ilova ishga tushganda (Cold start)

```
┌──────────────────────────────────────────────────────┐
│  Token saqlanganmi? (SecureStore / Keychain)         │
└──────────────────────────────────────────────────────┘
         │                              │
         │ HA                           │ YO'Q
         ▼                              ▼
  GET /auth/me                    ┌──────────────┐
  (Bearer token)                  │ Login ekrani │
         │                        └──────────────┘
         │
    ┌────┼──────────────┐
    │    │              │
   200  401            403
    │    │              │
    ▼    ▼              ▼
  User  Token        Trial
  data  eskirgan     tugagan
    │    │              │
    ▼    ▼              ▼
  GET    Token       Obuna
  /sub   o'chirish   sahifasi
  scri   → Login     (plan
  ption  ekrani      tanlash)
  /status
    │
    ├── is_expired = false → Dashboard (asosiy ilova)
    └── is_expired = true  → Obuna sahifasi
```

**Muhim:**
- `GET /subscription/status` **trial tekshiruvsiz** ishlaydi — muddati tugagan foydalanuvchi ham balans, ta'riflar va tranzaksiyalarni ko'radi.
- Boshqa barcha endpointlar (dashboard, customers, debts, ...) uchun trial faol bo'lishi kerak — aks holda **403** qaytadi.

---

## 2. Login

**Ekran:** Telefon + parol

```
┌──────────────────────────┐
│       DAFTARON            │
│                          │
│  📱 Telefon raqam        │
│  ┌──────────────────┐    │
│  │ +998 90 123 45 67│    │
│  └──────────────────┘    │
│                          │
│  🔒 Parol               │
│  ┌──────────────────┐    │
│  │ ••••••           │    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │     KIRISH        │    │
│  └──────────────────┘    │
│                          │
│  Ro'yxatdan o'tish →     │
│  Parolni unutdim →       │
└──────────────────────────┘
```

| Qadam | Metod | Endpoint | Body | Javob |
|-------|-------|----------|------|-------|
| 1 | POST | `/auth/login` | `phone`, `password`, `device_name` | Quyiga qarang |

**Javob variantlari:**

| Holat | Javob | Ilova harakati |
|-------|-------|---------------|
| Muvaffaqiyat | `200`: `{ token, user }` | Token saqlash → `GET /subscription/status` → Dashboard yoki Obuna |
| SMS talab | `200`: `{ requires_verification: true }` | Verify ekraniga o'tish (`type: "login"`) |
| Xato | `401`: telefon/parol noto'g'ri | Xato xabar ko'rsatish |
| Validatsiya | `422`: maydon xatolari | Xato xabarlarini ko'rsatish |

---

## 3. Telegram orqali login

Telegram Mini App / bot orqali foydalanuvchi kirganda.

| Qadam | Metod | Endpoint | Body | Javob |
|-------|-------|----------|------|-------|
| 1 | POST | `/auth/telegram-login` | `phone`, `device_name` | Quyiga qarang |

| Holat | Javob | Ilova harakati |
|-------|-------|---------------|
| Topildi | `200`: `{ token, user }` | Token saqlash → Dashboard |
| Topilmadi | `404`: `{ requires_registration: true }` | Ro'yxatdan o'tish flow'ga yo'naltirish |

---

## 4. Ro'yxatdan o'tish

### 4.1. Bosqich 1 — Ism va telefon

```
┌──────────────────────────┐
│    RO'YXATDAN O'TISH     │
│                          │
│  👤 Ismingiz             │
│  ┌──────────────────┐    │
│  │ Abdulaziz        │    │
│  └──────────────────┘    │
│                          │
│  📱 Telefon raqam        │
│  ┌──────────────────┐    │
│  │ +998 90 123 45 67│    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │    DAVOM ETISH    │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| POST | `/auth/register` | `name`, `phone`, `device_name` | `200`: `{ phone, requires_verification: true }` — SMS yuborildi |

| Xato | Tavsif |
|------|--------|
| 422 | Telefon allaqachon band |
| 500 | SMS yuborish xatosi |

### 4.2. Bosqich 2 — SMS tasdiq

```
┌──────────────────────────┐
│    SMS TASDIQLASH         │
│                          │
│  +998901234567 raqamga   │
│  yuborilgan kodni kiriting│
│                          │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│  │1 │ │2 │ │3 │ │4 │    │
│  └──┘ └──┘ └──┘ └──┘    │
│                          │
│  ┌──────────────────┐    │
│  │   TASDIQLASH      │    │
│  └──────────────────┘    │
│                          │
│  Qayta yuborish (0:59)   │
└──────────────────────────┘
```

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| POST | `/auth/verify` | `phone`, `code` (4 raqam), `type: "register"` | `200`: tasdiq muvaffaqiyatli |

| Xato | Tavsif |
|------|--------|
| 422 | Kod noto'g'ri |
| 404 | Cache muddati tugagan → qayta register |

### 4.3. Bosqich 3 — Do'kon va parol

**Avval lokatsiya va kategoriya ro'yxatlarini olish (authsiz):**

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/locations/regions` | Viloyatlar ro'yxati |
| GET | `/locations/categories` | Do'kon kategoriyalari |
| GET | `/locations/districts/{regionId}` | Tanlangan viloyat tumanlari |
| GET | `/locations/streets/{districtId}` | Tanlangan tuman ko'chalari |

```
┌──────────────────────────┐
│    DO'KON MA'LUMOTLARI    │
│                          │
│  🏪 Do'kon nomi          │
│  ┌──────────────────┐    │
│  │ MTP Market       │    │
│  └──────────────────┘    │
│                          │
│  📂 Kategoriya           │
│  ┌──────────────────┐    │
│  │ Oziq-ovqat ▼     │    │
│  └──────────────────┘    │
│                          │
│  📍 Viloyat              │
│  ┌──────────────────┐    │
│  │ Toshkent ▼       │    │
│  └──────────────────┘    │
│                          │
│  📍 Tuman                │
│  ┌──────────────────┐    │
│  │ Yunusobod ▼      │    │
│  └──────────────────┘    │
│                          │
│  📍 Ko'cha               │
│  ┌──────────────────┐    │
│  │ Amir Temur ▼     │    │
│  └──────────────────┘    │
│                          │
│  🔒 Parol               │
│  ┌──────────────────┐    │
│  │ ••••••           │    │
│  └──────────────────┘    │
│                          │
│  🔒 Parol (qayta)       │
│  ┌──────────────────┐    │
│  │ ••••••           │    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │    YAKUNLASH      │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| POST | `/auth/register/complete` | `phone`, `shop_name`, `category_id`, `region_id`, `district_id`, `street_id`, `password`, `password_confirmation` | `201`: `{ token, user }` |

| Xato | Tavsif |
|------|--------|
| 404 | Verify muddati tugagan → qayta register |
| 422 | Validatsiya xatosi |

**Ro'yxatdan keyin:** Token saqlash → `GET /subscription/status` → Dashboard.

---

## 5. Parolni tiklash

Token talab qilinmaydi.

```
Bosqich 1                Bosqich 2               Bosqich 3
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│ Telefon      │         │ SMS kod      │        │ Yangi parol  │
│ kiritish     │ ──200──►│ kiritish     │──200──►│ kiritish     │
│              │         │              │        │              │
│ POST forgot  │         │ POST verify  │        │ POST reset   │
└──────────────┘         └──────────────┘        └──────────────┘
```

| Qadam | Metod | Endpoint | Body | Javob |
|-------|-------|----------|------|-------|
| 1 | POST | `/auth/password/forgot` | `phone` | `200`: SMS yuborildi. `404`: raqam yo'q |
| 2 | POST | `/auth/password/verify` | `phone`, `code` | `200`: `{ reset_token }` (10 daqiqa). `422`: kod noto'g'ri |
| 3 | POST | `/auth/password/reset` | `reset_token`, `password`, `password_confirmation` | `200`: parol yangilandi → Login ekrani |

---

## 6. Obuna va trial

### 6.1. Obuna holati (har doim chaqirish mumkin)

| Metod | Endpoint | Auth | Tavsif |
|-------|----------|------|--------|
| GET | `/subscription/status` | Bearer | Trial tugaganda ham ishlaydi (403 bermaydi) |

**Javob:**

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
      "description": "Kichik do'konlar uchun",
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
  "transactions": [
    {
      "id": 1,
      "amount": 50000,
      "type": "deposit",
      "description": "Click orqali to'ldirish",
      "created_at": "2026-03-20T10:00:00Z"
    }
  ]
}
```

**`trial_info` qanday ishlatiladi:**

| Maydon | Tavsif | Ilova harakati |
|--------|--------|---------------|
| `is_expired: false` | Obuna/trial faol | Dashboard ko'rsatish |
| `is_expired: true` | Obuna tugagan | Ta'rif tanlash ekranini ko'rsatish |
| `status: 0` | Hisob bloklangan | "Hisob faol emas" xabari |
| `days_remaining: 0` | Qolgan kun yo'q | Obuna sahifasi |

**`usage` — joriy ta'rif limiti va ishlatilgan miqdorlar:**

| Maydon | Tavsif | Ilova harakati |
|--------|--------|---------------|
| `subscription_status` | `active` yoki `expired` | Expired bo'lsa ogohlantirish ko'rsatish |
| `plan_name` | Joriy ta'rif nomi (`null` = tanlanmagan) | Ta'rif nomini ko'rsatish |
| `plan_price` | Ta'rif narxi (so'm/oy) | Narxni ko'rsatish |
| `debt_base_limit` | Ta'rifdagi nasiya limiti. `null` = cheksiz | |
| `debt_extra_limit` | Sotib olingan qo'shimcha nasiya miqdori | Agar > 0: "(70 ta'rif + 50 qo'shimcha)" |
| `debt_total_limit` | Umumiy nasiya limiti (base + extra). `null` = cheksiz | "17 / 120" formatda ko'rsatish |
| `debt_used` | Ishlatilgan nasiyalar soni | |
| `debt_remaining` | Qolgan nasiya limiti (`null` = cheksiz) | "Qoldi: 53 ta" |
| `sms_base_limit` | Ta'rifdagi bepul SMS limiti | |
| `sms_extra_limit` | Sotib olingan qo'shimcha SMS miqdori | Agar > 0: "(20 ta'rif + 50 qo'shimcha)" |
| `sms_total_limit` | Umumiy SMS limiti (base + extra) | "8 / 70" formatda ko'rsatish |
| `sms_used` | Ishlatilgan SMS soni | |
| `sms_remaining` | Qolgan SMS | "Qoldi: 12 ta" |
| `extra_sms_price` | Limitdan keyingi SMS narxi (so'm) | "190 so'm/SMS" ko'rsatish |

**Muhim:** `debt_extra_limit` va `sms_extra_limit` obuna tugagandan keyin ham saqlanib qoladi. Obuna qayta faollashtirilganda limitlar qayta hisobga olinadi.

**`extra_packages` — sotib olish mumkin bo'lgan qo'shimcha paketlar:**

| Maydon | Tavsif | Ilova harakati |
|--------|--------|---------------|
| `id` | Paket ID | Sotib olish uchun ID |
| `type` | `debt` yoki `sms` | Turi bo'yicha guruhlash |
| `quantity` | Miqdori | "50 ta nasiya" ko'rsatish |
| `price` | Narxi (so'm) | "15 000 so'm" ko'rsatish |

**Paket sotib olish:** `POST /subscription/buy-extra/{extra_package_id}` — balansdan yechiladi.

**Muvaffaqiyat (200):**
```json
{
  "message": "Qo'shimcha 50 ta nasiya paketi sotib olindi!",
  "purchase": { "id": 1, "type": "debt", "quantity": 50, "price": 15000 },
  "balance": 35000
}
```

**422 — Mablag' yetarli emas:**
```json
{
  "message": "Mablag' yetarli emas.",
  "package_price": 15000,
  "balance": 5000
}
```

**`plans` qoidalari:**
- Trial davrida → faqat **Oddiy** ta'rif qaytadi
- Trial tugaganda → **barcha** ta'riflar qaytadi

### 6.2. Ta'rif tanlash

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| POST | `/subscription/choose/{plan_id}` | — | Quyiga qarang |

**Muvaffaqiyat (200):**
```json
{
  "message": "Ta'rif muvaffaqiyatli tanlandi",
  "trial_ends_at": "2026-05-05T10:30:00Z",
  "balance": 21000
}
```

**Xatolar (422):**

| Xabar | Tavsif | Ilova harakati |
|-------|--------|---------------|
| `"Mablag' yetarli emas."` | Balans yetmaydi (+ `plan_price`, `balance`) | Balans to'ldirish sahifasiga |
| `"Ushbu ta'rif allaqachon faol."` | Shu ta'rif faol | Xabar ko'rsatish |
| `"Sinov muddati davomida faqat Oddiy ta'rifni tanlash mumkin."` | Trial davri cheklov | Oddiy tanlash yoki kutish |

### 6.3. Trial/Obuna logika diagrammasi

```
┌─────────────────────────────────────────────────────────┐
│                    FOYDALANUVCHI                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Ro'yxatdan o'tish   │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Trial boshlanadi    │
              │  (15 kun, bepul)     │
              │  Oddiy ta'rif faol   │
              └─────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
    Trial davomida            Trial tugaganda
    ┌──────────────┐         ┌──────────────┐
    │ Barcha funk- │         │ Read-only    │
    │ siyalar      │         │ rejim:       │
    │ ishlaydi     │         │ GET — ruxsat  │
    │              │         │ POST — 403   │
    │ Oddiy bepul  │         │ remaining_   │
    │              │         │ limit bilan  │
    └──────────────┘         └──────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ Ta'rif tanlash    │
                          │ (balansdan to'lov)│
                          └──────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                   Balans bor            Balans yo'q
                   ┌──────────┐         ┌──────────┐
                   │ Ta'rif   │         │ Balans   │
                   │ faollash │         │ to'ldiri │
                   │ +1 oy    │         │ sh kerak │
                   └──────────┘         └──────────┘
```

---

## 7. Dashboard

| Metod | Endpoint | Auth | Javob |
|-------|----------|------|-------|
| GET | `/dashboard` | Bearer + trial | `200`: statistikalar |

**Javob maydonlari:**

| Maydon | Tavsif |
|--------|--------|
| `total_customers` | Jami mijozlar soni |
| `total_debts` | Jami nasiyalar |
| `remaining_debts` | Ochiq qarzlar summasi |
| `total_payments` | Jami to'lovlar |
| `payments_this_month` | Shu oydagi to'lovlar |
| `payments_last_month` | O'tgan oydagi to'lovlar |
| `average_debt` | O'rtacha nasiya summasi |
| `expired_debts_count` | Muddati o'tgan nasiyalar |
| `payments_count_this_month` | Shu oy to'lovlar soni |
| `recent_customers` | Oxirgi 5 ta mijoz |
| `recent_debts` | Oxirgi 5 ta nasiya |
| `trial_days_left` | Trial qolgan kunlar |

---

## 8. Profil

```
┌──────────────────────────┐
│        PROFIL             │
│                          │
│  ID: 1042                │
│  👤 Abdulaziz            │
│  📱 +998901234567        │
│  📧 user@email.com       │
│  🏪 MTP Market           │
│  📅 Trial: 14 kun qoldi  │
│                          │
│  [Tahrirlash]  [Parol]   │
└──────────────────────────┘
```

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| GET | `/profile` | — | `200`: user (id, public_id, name, phone, email, tenant_id, status, trial_ends_at) |
| PUT | `/profile` | `name`, `email` (ixtiyoriy) | `200`: yangilangan user |
| PUT | `/profile/password` | `current_password`, `password`, `password_confirmation` | `200`: muvaffaqiyat. `422`: parol noto'g'ri |

---

## 9. Mijozlar

### 9.1. Ro'yxat

```
┌──────────────────────────┐
│      MIJOZLAR             │
│  ┌────────────────────┐  │
│  │ 🔍 Qidirish...     │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ Abdulaziz          │  │
│  │ 📱 +998901234567   │  │
│  │ 💰 Qarz: 540 000  │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Bobur             │  │
│  │ 📱 +998907654321   │  │
│  │ 💰 Qarz: 120 000  │  │
│  └────────────────────┘  │
│                          │
│        [+ Qo'shish]      │
└──────────────────────────┘
```

### 9.2. API

| Metod | Endpoint | Body / Param | Javob |
|-------|----------|-------------|-------|
| GET | `/customers` | — | `200`: mijozlar ro'yxati (tenant bo'yicha) |
| POST | `/customers` | `name`, `phone` (ixtiyoriy), `address` (ixtiyoriy), `description` (ixtiyoriy) | `201`: yaratilgan mijoz |
| GET | `/customers/{id}` | — | `200`: bitta mijoz. `404`: topilmadi |
| PUT | `/customers/{id}` | `name`, `phone`, ... | `200`: yangilangan |
| DELETE | `/customers/{id}` | — | `200/204`: o'chirildi |

---

## 10. Nasiyalar

### 10.1. Ro'yxat

```
┌──────────────────────────┐
│      NASIYALAR            │
│                          │
│  ┌────────────────────┐  │
│  │ Abdulaziz          │  │
│  │ 📅 2026-03-15      │  │
│  │ 💰 540 000 so'm    │  │
│  │ 📉 Qoldi: 300 000  │  │
│  │ 🟢 Ochiq           │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Bobur             │  │
│  │ 📅 2026-03-10      │  │
│  │ 💰 120 000 so'm    │  │
│  │ 📉 Qoldi: 0        │  │
│  │ 🔴 Yopilgan        │  │
│  └────────────────────┘  │
│                          │
│       [+ Nasiya yozish]  │
└──────────────────────────┘
```

### 10.2. API

| Metod | Endpoint | Body / Param | Javob |
|-------|----------|-------------|-------|
| GET | `/debts` | `customer_id` (ixtiyoriy filter) | `200`: nasiyalar ro'yxati |
| POST | `/debts` | `customer_id`, `total_amount`, `debt_date` (ixtiyoriy, YYYY-MM-DD), `description` (ixtiyoriy), `send_sms` (boolean, ixtiyoriy) | `201`: quyiga qarang |
| GET | `/debts/{id}` | — | `200`: bitta nasiya |
| PUT | `/debts/{id}` | `customer_id`, `total_amount`, `debt_date`, `description` | `200`: yangilangan |
| DELETE | `/debts/{id}` | — | `200/204`: o'chirildi |
| PATCH | `/debts/{id}/close` | — | `200`: nasiya yopildi |

### 10.3. Nasiya yaratish javobi (201)

```json
{
  "debt": {
    "id": 42,
    "customer_id": 5,
    "total_amount": 540000,
    "remaining_amount": 540000,
    "debt_date": "2026-03-22",
    "status": "open",
    "description": "Un, yog'",
    "sms_sent": true
  },
  "sms_sent": true,
  "sms_info": "SMS muvaffaqiyatli yuborildi",
  "sms_error": null
}
```

### 10.4. SMS yuborish (nasiya yaratishda)

`send_sms: true` — mijozga SMS yuboriladi.

**SMS shablon:**
```
Abdulaziz aka siz 22.03.2026 sanasida MTP Market dan 540 000 so'm
qarzdor bo'ldingiz. Qarzni vaqtida qaytarishni unutmang !
Do'kon raqami : +998901234567
```

**Narxlash:**
| Holat | Narx |
|-------|------|
| Ta'rif + paket limiti ichida (Oddiy: 20 ta + sotib olingan SMS paketlari) | Bepul |
| Limitdan keyin | `extra_sms_price` (190 so'm) balansdan yechiladi |
| Balans yetmasa | SMS yuborilmaydi, `sms_error` qaytadi, nasiya yaratiladi |

### 10.5. Sana qoidalari

| Qoida | Tavsif |
|-------|--------|
| `debt_date` yuborilmasa | Bugungi sana avtomatik qo'yiladi |
| Minimal sana | 1 oy oldin (bugundan) |
| Maksimal sana | Bugun |
| Format | `YYYY-MM-DD` |

### 10.6. Limit tekshiruvi

Nasiya yaratishda ta'rif limiti tekshiriladi:
1. Obuna holati tekshiriladi — expired bo'lsa → **403** (`remaining_limit` bilan)
2. `total_limit = debt_base_limit + debt_extra_limit` hisoblanadi
3. Umumiy nasiyalar soni `total_limit` bilan solishtiriladi
4. Limit tugasa → **403**: `remaining_limit: 0`
5. `debt_base_limit = null` bo'lsa — cheksiz

**Muvaffaqiyatli yaratilganda (201):**
```json
{
  "success": true,
  "message": "Nasiya muvaffaqiyatli qo'shildi",
  "debt": { ... },
  "remaining_limit": 4,
  "sms_sent": false,
  "sms_info": null,
  "sms_error": null
}
```

**Limit tugaganda (403):**
```json
{
  "error": true,
  "message": "Sizning nasiya limitingiz tugadi. Qo'shimcha limit sotib oling yoki Pro tarifga o'ting.",
  "remaining_limit": 0
}
```

**Obuna expired (403):**
```json
{
  "error": true,
  "message": "Obunangiz tugagan. Sizda hali 7 ta nasiya limiti mavjud. Yo'qotmaslik uchun obunani yangilang.",
  "remaining_limit": 7
}
```

---

## 11. To'lovlar

### 11.1. Ekran

```
┌──────────────────────────┐
│    TO'LOV YOZISH          │
│                          │
│  Nasiya: Abdulaziz       │
│  Jami: 540 000 so'm      │
│  Qoldi: 300 000 so'm     │
│                          │
│  💰 To'lov summasi       │
│  ┌──────────────────┐    │
│  │ 100 000          │    │
│  └──────────────────┘    │
│                          │
│  ☐ Mijozga SMS yuborish  │
│                          │
│  ┌──────────────────┐    │
│  │    SAQLASH        │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

### 11.2. API

| Metod | Endpoint | Body / Param | Javob |
|-------|----------|-------------|-------|
| GET | `/payments` | `debt_id` (ixtiyoriy filter) | `200`: to'lovlar ro'yxati |
| POST | `/payments` | `debt_id`, `amount`, `paid_at` (ixtiyoriy, ISO8601), `send_sms` (boolean, ixtiyoriy) | `201`: yaratilgan to'lov |

### 11.3. To'lov SMS (ixtiyoriy)

`send_sms: true` bo'lsa mijozga SMS yuboriladi:

```
Abdulaziz aka 22.03.2026 sanasida MTP Market uchun sizdan
300 000 so'm to'lov qabul qilindi. Qolgan miqdor : 240 000 so'm.
Do'kon raqami : +998901234567
```

**"Qolgan miqdor"** — mijozning shu do'kondagi **barcha ochiq nasiyalaridan** `remaining_amount` lar yig'indisi.

### 11.4. Nasiya yopilishi

- To'lov yozilganda `debt.remaining_amount` kamayadi
- `remaining_amount = 0` bo'lganda nasiya avtomatik **closed** bo'lishi mumkin
- Qo'lda yopish: `PATCH /debts/{id}/close` — qolgan summa to'lov sifatida yoziladi

---

## 12. Muddati o'tgan qarzdorlar

### 12.1. Ekran

```
┌──────────────────────────┐
│  MUDDATI O'TGAN           │
│  QARZDORLAR               │
│                          │
│  Filter: [10 kun ▼]      │
│                          │
│  ┌────────────────────┐  │
│  │ Abdulaziz          │  │
│  │ 📅 Birinchi qarz:  │  │
│  │    2026-02-15       │  │
│  │ ⏰ 35 kun o'tgan    │  │
│  │ 💰 Jami: 840 000   │  │
│  │ 📩 SMS: 2 marta    │  │
│  │                    │  │
│  │ [SMS yuborish]     │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### 12.2. API

| Metod | Endpoint | Param | Javob |
|-------|----------|-------|-------|
| GET | `/debts/overdue` | `days` (default 10, oraliq 5–30) | `200`: qarzdorlar ro'yxati |

**Javob:**

```json
[
  {
    "customer_id": 5,
    "name": "Abdulaziz",
    "phone": "+998901234567",
    "first_debt_date": "2026-02-15",
    "total_remaining": 840000,
    "days_overdue": 35,
    "overdue_sms_count": 2,
    "overdue_sms_last_sent_at": "2026-03-20T10:00:00Z"
  }
]
```

**Qoidalar:**
- Har bir mijoz uchun **bitta satr** (bir nechta nasiya bo'lsa umumiy summa)
- Tartib: eng ko'p kun o'tganlar birinchi
- `days` — necha kundan keyin "muddati o'tgan" deb hisoblanadi

---

## 13. Do'kon qo'shish

| Metod | Endpoint | Body | Javob |
|-------|----------|------|-------|
| POST | `/tenants` | `name`, `category_id`, `region_id`, `district_id`, `street_id` | `201`: yangi do'kon |

**Lokatsiya endpointlari (authsiz):**

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/locations/regions` | Viloyatlar |
| GET | `/locations/categories` | Kategoriyalar |
| GET | `/locations/districts/{regionId}` | Tumanlar |
| GET | `/locations/streets/{districtId}` | Ko'chalar |

**Cheklov (Oddiy ta'rifda):**

```json
{
  "message": "Basic (Oddiy) ta'rifda faqat bitta do'kon mumkin. Yangi do'kon qo'shish uchun boshqa ta'rifga o'ting.",
  "requires_upgrade": true
}
```

---

## 14. Bildirishnomalar

### 14.1. API

| Metod | Endpoint | Javob |
|-------|----------|-------|
| GET | `/notifications` | `200`: bildirishnomalar ro'yxati |
| GET | `/notifications/{id}` | `200`: bitta bildirishnoma (ochilganda `read_at` belgilanadi) |

### 14.2. Notification turlari

| `data.type` | Tavsif | Qo'shimcha maydonlar |
|-------------|--------|---------------------|
| `debt_created` | Yangi nasiya qo'shildi | `tenant_name`, `amount`, `debt_id` |
| `debt_payment` | Nasiyaga to'lov qilindi | `tenant_name`, `amount`, `debt_id` |
| `balance_topped_up` | Balans to'ldirildi | `amount`, `source` (`click`/`payme`/`admin`) |
| `subscription_purchased` | Obuna sotib olindi | `amount` |

### 14.3. UI tavsiya

- `data.message` ni asosiy matn sifatida ko'rsatish
- `read_at = null` → o'qilmagan (bold yoki badge)
- `read_at != null` → o'qilgan (oddiy ko'rsatish)
- Ochilganda avtomatik `read_at` belgilanadi

---

## 15. AI SupportBot

### 15.1. Ekran

```
┌──────────────────────────┐
│     YORDAM (AI)      [🗑] │
│                          │
│  🤖 Salom! Daftaron      │
│     bo'yicha qanday      │
│     yordam bera olaman?   │
│                          │
│  👤 Nasiya qanday         │
│     yoziladi?             │
│                          │
│  🤖 Qarzlar bo'limiga    │
│     o'ting, Yangi qarz   │
│     tugmasini bosing.     │
│     Mijozni tanlang,     │
│     summani kiriting va   │
│     saqlang.              │
│                          │
│  ┌──────────────────┐    │
│  │ Savol yozing...   │ ► │
│  └──────────────────┘    │
└──────────────────────────┘
```

> [🗑] — chat tarixini tozalash tugmasi (`DELETE /support/history`)

### 15.2. API

| Metod | Endpoint | Auth | Tavsif |
|-------|----------|------|--------|
| POST | `/support/chat` | Bearer | Xabar yuborish |
| GET | `/support/history` | Bearer | Chat tarixini yuklash |
| DELETE | `/support/history` | Bearer | Tarixni tozalash |

**POST /support/chat — Request:**

```json
{
  "message": "Nasiya qanday yoziladi?"
}
```

- `message` — hozirgi savol (majburiy)
- `history` serverda (DB) saqlanadi — client yuborishi shart emas

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

### 15.3. Ilova logikasi

1. Ekran ochilganda `GET /support/history` dan oldingi xabarlarni yuklash
2. Xabar yuborganda faqat `message` yuborish (`POST /support/chat`)
3. Javob kelgach `reply` ni ekranga qo'shish
4. [🗑] tugmasi bosilganda `DELETE /support/history` chaqirish va ekranni tozalash
5. Bot faqat Daftaron mavzulari bo'yicha javob beradi (maks 2–3 gap)

---

## 16. Balans to'ldirish

Mobil ilovada balans to'ldirish uchun ikkita usul:

### 16.1. Click/Payme ilovasidan to'g'ridan-to'g'ri

Foydalanuvchiga **public_id** (masalan 1042) yoki **telefon raqam** ni ko'rsating.
Foydalanuvchi Click yoki Payme ilovasida Daftaron xizmatini topib, shu ID yoki telefon bilan to'lov qiladi.

```
┌──────────────────────────┐
│   BALANS TO'LDIRISH       │
│                          │
│  Sizning ID: 1042        │
│  Telefon: +998901234567  │
│                          │
│  Click yoki Payme        │
│  ilovasida "Daftaron"    │
│  xizmatini toping va     │
│  yuqoridagi ID yoki      │
│  telefon raqam bilan     │
│  to'lov qiling.          │
│                          │
│  Joriy balans: 50 000    │
└──────────────────────────┘
```

### 16.2. Web redirect (kelajakda mobil SDK)

Hozircha backend Web uchun redirect URL beradi. Mobil ilovada kelajakda Click/Payme SDK yoki Deep Link integratsiyasi qo'shilishi mumkin.

---

## 17. Chiqish

| Metod | Endpoint | Auth | Tavsif |
|-------|----------|------|--------|
| POST | `/auth/logout` | Bearer | Token serverda bekor qilinadi |

**Ilova harakati:**
1. Token o'chiriladi (SecureStore dan)
2. Login ekrani ko'rsatiladi

---

## 18. Xato kodlari va umumiy ishlov

### 18.1. HTTP kodlari

| Kod | Tavsif | Ilova harakati |
|-----|--------|---------------|
| **200** | Muvaffaqiyat | Ma'lumotni ko'rsatish |
| **201** | Yaratildi | Muvaffaqiyat + yangi ma'lumot |
| **401** | Token eskirgan / noto'g'ri | Token o'chirish → Login ekrani |
| **403** | Obuna expired (POST/PUT/DELETE) yoki limit tugagan | Javobdagi `remaining_limit` ni ko'rsatish, obuna sahifasiga yo'naltirish |
| **404** | Resurs topilmadi | "Ma'lumot topilmadi" xabari |
| **422** | Validatsiya xatosi | Maydon xatolarini ko'rsatish |
| **500** | Server xatosi | "Xatolik yuz berdi. Keyinroq urinib ko'ring." |

### 18.2. 403 maxsus ishlov

```
403 qaytganda:
  1. Javobdan `remaining_limit` ni o'qish
  2. `remaining_limit > 0` bo'lsa → "Sizda hali X ta limit mavjud" ko'rsatish
  3. GET /subscription/status chaqirish (GET — har doim ishlaydi, 403 bermaydi)
  4. usage.subscription_status === "expired" bo'lsa → obuna yangilash ekrani
  5. Limit tugagan bo'lsa → qo'shimcha paket sotib olish taklifi
```

**Muhim:** Expired holatda GET requestlar (ro'yxatlar, ma'lumotlar) ishlaydi — faqat POST/PUT/PATCH/DELETE bloklangan.

### 18.3. 422 javob formati

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "phone": ["Telefon raqam majburiy."],
    "amount": ["Summa 0 dan katta bo'lishi kerak."]
  }
}
```

Yoki maxsus xato (obuna):

```json
{
  "message": "Mablag' yetarli emas.",
  "plan_price": 29000,
  "balance": 5000
}
```

### 18.4. Umumiy interceptor logikasi

```
Har bir API javobda:
  ├── 401 → clearToken() → navigateToLogin()
  ├── 403 → navigateToSubscription()
  ├── 422 → showValidationErrors(response.errors)
  ├── 404 → showNotFound()
  ├── 500 → showGenericError()
  └── 200/201 → handleSuccess()
```

---

## 19. Endpoint qisqa jadvali

### Authsiz

| Maqsad | Metod | Endpoint |
|--------|-------|----------|
| Login | POST | `/auth/login` |
| Telegram login | POST | `/auth/telegram-login` |
| Ro'yxat 1 | POST | `/auth/register` |
| SMS tasdiq | POST | `/auth/verify` |
| Ro'yxat 2 | POST | `/auth/register/complete` |
| Parol tiklash 1 | POST | `/auth/password/forgot` |
| Parol tiklash 2 | POST | `/auth/password/verify` |
| Parol tiklash 3 | POST | `/auth/password/reset` |
| Viloyatlar | GET | `/locations/regions` |
| Kategoriyalar | GET | `/locations/categories` |
| Tumanlar | GET | `/locations/districts/{regionId}` |
| Ko'chalar | GET | `/locations/streets/{districtId}` |

### Bearer (trial tekshiruvsiz)

| Maqsad | Metod | Endpoint |
|--------|-------|----------|
| Obuna holati + limitlar | GET | `/subscription/status` |
| Ta'rif tanlash | POST | `/subscription/choose/{plan}` |
| Qo'shimcha paket sotib olish | POST | `/subscription/buy-extra/{extra_package}` |
| AI support — xabar | POST | `/support/chat` |
| AI support — tarix | GET | `/support/history` |
| AI support — tozalash | DELETE | `/support/history` |

### Bearer + trial

| Maqsad | Metod | Endpoint |
|--------|-------|----------|
| Joriy user | GET | `/auth/me` |
| Chiqish | POST | `/auth/logout` |
| Dashboard | GET | `/dashboard` |
| Mijozlar ro'yxati | GET | `/customers` |
| Mijoz yaratish | POST | `/customers` |
| Bitta mijoz | GET | `/customers/{id}` |
| Mijoz yangilash | PUT | `/customers/{id}` |
| Mijoz o'chirish | DELETE | `/customers/{id}` |
| Nasiyalar ro'yxati | GET | `/debts` |
| Nasiya yaratish | POST | `/debts` |
| Bitta nasiya | GET | `/debts/{id}` |
| Nasiya yangilash | PUT | `/debts/{id}` |
| Nasiya o'chirish | DELETE | `/debts/{id}` |
| Nasiyani yopish | PATCH | `/debts/{id}/close` |
| Muddati o'tganlar | GET | `/debts/overdue` |
| To'lovlar ro'yxati | GET | `/payments` |
| To'lov yaratish | POST | `/payments` |
| Profil | GET | `/profile` |
| Profil yangilash | PUT | `/profile` |
| Parol o'zgartirish | PUT | `/profile/password` |
| Bildirishnomalar | GET | `/notifications` |
| Bitta bildirishnoma | GET | `/notifications/{id}` |
| Do'kon qo'shish | POST | `/tenants` |

---

*Hujjat TZ.md va kodga asosan tuzilgan. API o'zgarishi bo'lsa ushbu UserFlow ham yangilanadi.*
*So'nggi yangilanish: 2026-03-22*
