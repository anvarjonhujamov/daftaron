# Daftaron — Mobile ilova uchun UserFlow

Bu hujjat mobil ilova dasturchisi uchun foydalanuvchi oqimlari va API chaqiriqlar ketma-ketligini tavsiflaydi. Barcha endpointlar **API v1** asosida: `BASE_URL = https://<domen>/api/v1`.

**Autentifikatsiya:** Bearer token. Token olgach har bir so‘rovga `Authorization: Bearer <token>` header qo‘shiladi.

**Telefon formati:** `+998901234567` yoki `998901234567` yoki 9 xonali `901234567` (avtomatik 998 qo‘shiladi).

---

## 1. Ilova ishga tushganda (Cold start)

```
┌─────────────────────────────────────────────────────────────────┐
│  Token saqlanganmi? (localStorage / SecureStore)                  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ HA                                  │ YO‘Q
         ▼                                    ▼
  GET /auth/me                         Ekran: Login yoki
  (Authorization: Bearer <token>)      Ro‘yxatdan o‘tish
         │
         ├── 200: user ma’lumotlari
         │         → GET /subscription/status (obuna holati)
         │         → trial_info.is_expired === true bo‘lsa → Obuna/Ta’rif sahifasi
         │         → trial_info.is_expired === false → Asosiy ilova (Dashboard)
         │
         ├── 401: token eskirgan/noto‘g‘ri
         │         → Token o‘chiriladi, Login ekrani
         │
         └── 403: "Bepul muddat tugagan. Ta'rif tanlang."
                  → Obuna/Ta’rif tanlash sahifasi (subscription flow)
```

**Muhim:** `GET /subscription/status` **trial tekshiruvsiz** ishlaydi — token bo‘lsa muddati tugagan foydalanuvchi ham balans, ta’riflar ro‘yxati va tranzaksiyalarni ko‘radi va ta’rif tanlashi mumkin. Boshqa endpointlar (dashboard, customers, debts, …) uchun trial faol bo‘lishi kerak; aks holda **403** qaytadi.

---

## 2. Login (oddiy)

**Ekran:** Telefon + parol.

| Qadam | Metod | Endpoint | Body | Javob |
|-------|--------|----------|------|--------|
| 1 | POST | `/auth/login` | `phone`, `password`, ixtiyoriy `device_name` | **200:** `token`, `user` — asosiy ilovaga o‘tish. **401:** Telefon/parol xato. **200** (ba’zi sozlamalarda): `requires_verification: true` — keyin verify qadamiga o‘tish. |

Token saqlanadi, keyin `GET /subscription/status` chaqiriladi va `trial_info.is_expired` ga qarab Obuna sahifasi yoki Dashboard ko‘rsatiladi.

---

## 3. Telegram orqali login

Foydalanuvchi Telegram Mini App / bot orqali kirdi va backend telefon raqamni yubordi.

| Qadam | Metod | Endpoint | Body | Javob |
|-------|--------|----------|------|--------|
| 1 | POST | `/auth/telegram-login` | `phone` (majburiy), ixtiyoriy `device_name` (masalan `"telegram"`) | **200:** `token`, `user` — darhol asosiy ilova. **404:** `requires_registration: true` — bu raqam ro‘yxatda yo‘q, Ro‘yxatdan o‘tish flow ga yo‘naltirish. |

---

## 4. Ro‘yxatdan o‘tish (3 bosqich)

### 4.1. Bosqich 1 — Ism va telefon

| Metod | Endpoint | Body | Javob |
|-------|----------|------|--------|
| POST | `/auth/register` | `name`, `phone`, ixtiyoriy `device_name` | **200:** `phone`, `requires_verification: true` — SMS (yoki standart 1234) yuboriladi. **422:** Telefon allaqachon band. **500:** SMS xatosi. |

### 4.2. Bosqich 2 — SMS tasdiq

| Metod | Endpoint | Body | Javob |
|-------|----------|------|--------|
| POST | `/auth/verify` | `phone`, `code` (4 raqam), `type: "register"` | **200:** Tasdiq muvaffaqiyatli — keyin register/complete ga o‘tish (token hali yo‘q). **404:** Cache muddati tugagan — qayta register. **422:** Kod noto‘g‘ri. |

### 4.3. Bosqich 3 — Do‘kon va parol

Avval **viloyat/tuman/ko‘cha** ro‘yxatlari kerak bo‘ladi (locations — authsiz):

- `GET /locations/regions` — viloyatlar
- `GET /locations/districts/{regionId}` — tumanlar
- `GET /locations/streets/{districtId}` — ko‘chalar

Keyin:

| Metod | Endpoint | Body | Javob |
|-------|----------|------|--------|
| POST | `/auth/register/complete` | `phone`, `shop_name`, `category_id`, `region_id`, `district_id`, `street_id`, `password`, `password_confirmation` | **201:** `token`, `user` — ro‘yxatdan o‘tish tugadi, token saqlanadi. **404:** Verify muddati tugagan. **422:** Validatsiya xatosi. |

**Eslatma:** Kategoriyalar ro‘yxati uchun API v1 da hozircha alohida public endpoint yo‘q (admin panelda CRUD). Ro‘yxatdan o‘tish va do‘kon qo‘shish uchun backend bilan kelishib `GET /locations/categories` yoki shunga o‘xshash endpoint qo‘shish mumkin; yoki ilova birinchi marta so‘rovda backend dan olib cache qilishi mumkin (agar kelajakda bunday endpoint chiqsa).

Ro‘yxatdan o‘tishdan keyin yana `GET /subscription/status` chaqirib, trial va ta’rif holatini ko‘rsatish mumkin.

---

## 5. Obuna (subscription) va trial

Trial tugagach yoki hisob faol emas bo‘lsa, barcha asosiy endpointlar (dashboard, customers, debts, payments, profile va h.k.) **403** qaytaradi: `"Bepul muddat tugagan. Ta'rif tanlang."` yoki `"Hisob faol emas. Obuna kerak."`. Shuning uchun ilova **obuna sahifasi**ni ko‘rsatadi.

### 5.1. Obuna holati (har doim token bilan chaqiriladi)

| Metod | Endpoint | Auth | Javob |
|-------|----------|------|--------|
| GET | `/subscription/status` | Bearer | **200:** `balance`, `trial_info`, `plans`, `transactions` (oxirgi 10). |

**trial_info:**

| Maydon | Tavsif |
|--------|--------|
| `trial_ends_at` | Obuna tugash sanasi (ISO8601), nullable |
| `days_remaining` | Qolgan kunlar; tugaganda 0 |
| **`is_expired`** | **true** — obuna/trial tugagan, ta’rif tanlash kerak |
| `status` | 1 — faol, 0 — bloklangan |

**plans:** Ta’riflar ro‘yxati. Obuna tugaganda **barcha** ta’riflar qaytariladi; trial davrida faqat **Oddiy**. Har bir plan: `id`, `name`, `price`, `description`, `low_amount_limit`, `high_amount_limit`, `sms_limit`, `low_amount_threshold`.

### 5.2. Ta’rif tanlash

| Metod | Endpoint | Body | Javob |
|-------|----------|------|--------|
| POST | `/subscription/choose/{plan}` | — (plan path da: plan ID) | **200:** `message`, `trial_ends_at`, `balance` — obuna yangilandi, asosiy ilovaga o‘tish mumkin. **422:** "Mablag' yetarli emas" — `plan_price`, `balance` ham qaytadi; yoki "Sinov muddati davomida faqat Oddiy ta'rifni tanlash mumkin." |

Trial davrida faqat **Oddiy** ta’rif ruxsat etiladi va Oddiy bepul. Trial tugagach yoki boshqa ta’rif tanlashda narx **balansdan** yechiladi; balans yetmasa 422.

Balans to‘ldirish mobil ilovada odatda **Click** orqali amalga oshiriladi (backend Web uchun redirect URL beradi). Mobil uchun: foydalanuvchiga **public_id** (user.id + 1000) yoki telefon raqamini ko‘rsatish va Click ilovasida to‘lov qilishni aytish mumkin; yoki kelajakda mobil SDK/Deep Link orqali integratsiya qo‘shilishi mumkin.

---

## 6. Asosiy ilova (trial faol)

Barcha quyidagi endpointlar **Bearer** va **trial tekshiruvdan** o‘tadi. Trial tugasa 403.

### 6.1. Dashboard

| Metod | Endpoint | Javob |
|-------|----------|--------|
| GET | `/dashboard` | **200:** Statistikalar (mijozlar, qarzlar, to‘lovlar va h.k.). |

### 6.2. Profil

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/profile` | **200:** user (id, public_id, name, phone, email, tenant_id, status, trial_ends_at va boshqalar). |
| PUT | `/profile` | Body: `name`, `email` (ixtiyoriy). **200:** yangilangan user. |
| PUT | `/profile/password` | Body: `current_password`, `password`, `password_confirmation`. **200:** muvaffaqiyat. **422:** parol noto‘g‘ri. |

### 6.3. Mijozlar (Customers)

| Metod | Endpoint | Body / Param | Javob |
|-------|----------|--------------|--------|
| GET | `/customers` | — | **200:** mijozlar ro‘yxati (tenant bo‘yicha). |
| POST | `/customers` | `name`, `phone`, ixtiyoriy `address`, `description` | **201:** yaratilgan mijoz. **422:** validatsiya. |
| GET | `/customers/{id}` | — | **200:** bitta mijoz. **404:** topilmadi. |
| PUT | `/customers/{id}` | `name`, `phone`, … | **200:** yangilangan mijoz. |
| DELETE | `/customers/{id}` | — | **200/204:** o‘chirildi. |

### 6.4. Nasiyalar (Debts)

| Metod | Endpoint | Body / Param | Javob |
|-------|----------|--------------|--------|
| GET | `/debts` | ixtiyoriy `customer_id`, filterlar | **200:** nasiyalar ro‘yxati. |
| POST | `/debts` | `customer_id`, `total_amount`, ixtiyoriy `debt_date` (YYYY-MM-DD), `description`, **`send_sms`** (boolean, ixtiyoriy) | **201:** `debt`, `sms_sent`, `sms_info`, `sms_error`. debt_date bo‘lmasa — bugungi sana. Sana oxirgi 1 oy oralig‘ida (bugundan 1 oy oldin — bugun). |
| GET | `/debts/{id}` | — | **200:** bitta nasiya. |
| PUT | `/debts/{id}` | `customer_id`, `total_amount`, ixtiyoriy `debt_date`, `description` | **200:** yangilangan nasiya. |
| DELETE | `/debts/{id}` | — | **200/204:** o‘chirildi. |
| PATCH | `/debts/{id}/close` | — | **200:** nasiya yopildi (qolgan summa to‘lov sifatida yoziladi). |

**SMS:** `send_sms: true` bo‘lsa mijozga SMS yuboriladi. Ta’rif bo‘yicha bepul SMS limiti (masalan Oddiy da 15 ta) bor; limitdan keyin har bir SMS 200 so‘m — balansdan yechiladi. Balans yetmasa `sms_error` qaytadi, lekin qarz yozuvi yaratiladi.

### 6.5. To‘lovlar (Payments)

| Metod | Endpoint | Body / Param | Javob |
|-------|----------|--------------|--------|
| GET | `/payments` | ixtiyoriy `debt_id` | **200:** to‘lovlar ro‘yxati. |
| POST | `/payments` | `debt_id`, `amount`, ixtiyoriy `paid_at` (ISO8601) | **201:** yaratilgan to‘lov. **422:** validatsiya. |

### 6.6. Do‘kon qo‘shish (tenant)

| Metod | Endpoint | Body | Javob |
|-------|----------|------|--------|
| POST | `/tenants` | `name`, `category_id`, `region_id`, `district_id`, `street_id` | **201:** yangi do‘kon. **422:** Oddiy ta’rifda allaqachon 1 do‘kon bo‘lsa — "Basic (Oddiy) ta'rifda faqat bitta do'kon mumkin…", `requires_upgrade: true`. |

Locations: `GET /locations/regions`, `GET /locations/districts/{regionId}`, `GET /locations/streets/{districtId}` (authsiz ham ishlaydi).

### 6.7. Bildirishnomalar

| Metod | Endpoint | Javob |
|-------|----------|--------|
| GET | `/notifications` | **200:** bildirishnomalar ro‘yxati. |
| GET | `/notifications/{id}` | **200:** bitta bildirishnoma. **404:** topilmadi. |

---

## 7. Parolni tiklash (Password reset)

Token talab qilinmaydi.

| Qadam | Metod | Endpoint | Body | Javob |
|-------|--------|----------|------|--------|
| 1 | POST | `/auth/password/forgot` | `phone` | **200:** SMS yuborildi (raqam bazada bo‘lsa). **404:** raqam ro‘yxatda yo‘q. |
| 2 | POST | `/auth/password/verify` | `phone`, `code` (4 raqam) | **200:** `reset_token` (10 min amal qiladi). **422:** kod noto‘g‘ri. **404:** muddat tugagan. |
| 3 | POST | `/auth/password/reset` | `reset_token`, `password`, `password_confirmation` (min 6) | **200:** parol yangilandi — Login ekraniga o‘tish. **422:** token eskirgan yoki validatsiya. |

---

## 8. Chiqish (Logout)

| Metod | Endpoint | Auth | Tavsif |
|-------|----------|------|--------|
| POST | `/auth/logout` | Bearer | **200:** token serverda bekor qilinadi. Ilovada token o‘chiriladi, Login ekrani. |

---

## 9. Xato kodlari va ilova harakati

| Kod | Ma’nosi | Ilova harakati |
|-----|---------|-----------------|
| **401** | Token yo‘q / eskirgan / noto‘g‘ri | Token o‘chirish, Login ekrani. |
| **403** | Trial tugagan / ta’rif tanlanmagan / hisob bloklangan | Xabar: "Bepul muddat tugagan. Ta'rif tanlang." yoki "Hisob faol emas. Obuna kerak." — Obuna/Ta’rif sahifasiga yo‘naltirish. `GET /subscription/status` chaqirish mumkin (403 bermaydi). |
| **404** | Resurs topilmadi | "Ma’lumot topilmadi" va tegishli ekranda orqaga / ro‘yxatga qaytish. |
| **422** | Validatsiya xatosi | `message` va maydon xatolarini ko‘rsatish (masalan `plan_price`, `balance`). |
| **500** | Server xatosi | "Xatolik yuz berdi. Keyinroq urinib ko‘ring." |

---

## 10. Qisqa endpoint ro‘yxati (Mobile)

| Maqsad | Metod | Endpoint |
|--------|--------|----------|
| Login | POST | `/auth/login` |
| Telegram login | POST | `/auth/telegram-login` |
| Ro‘yxat 1 | POST | `/auth/register` |
| SMS tasdiq | POST | `/auth/verify` |
| Ro‘yxat 2 (do‘kon + parol) | POST | `/auth/register/complete` |
| Joriy user | GET | `/auth/me` |
| Chiqish | POST | `/auth/logout` |
| Parol tiklash 1 | POST | `/auth/password/forgot` |
| Parol tiklash 2 | POST | `/auth/password/verify` |
| Parol tiklash 3 | POST | `/auth/password/reset` |
| Obuna holati | GET | `/subscription/status` |
| Ta’rif tanlash | POST | `/subscription/choose/{plan}` |
| Viloyatlar | GET | `/locations/regions` |
| Tumanlar | GET | `/locations/districts/{regionId}` |
| Ko‘chalar | GET | `/locations/streets/{districtId}` |
| Dashboard | GET | `/dashboard` |
| Profil | GET / PUT | `/profile`, `/profile/password` |
| Mijozlar | GET / POST / GET / PUT / DELETE | `/customers`, `/customers/{id}` |
| Nasiyalar | GET / POST / GET / PUT / DELETE / PATCH | `/debts`, `/debts/{id}`, `/debts/{id}/close` |
| To‘lovlar | GET / POST | `/payments` |
| Do‘kon qo‘shish | POST | `/tenants` |
| Bildirishnomalar | GET / GET | `/notifications`, `/notifications/{id}` |

---

*Hujjat TZ (TZ.md), README va OpenAPI (public/docs/openapi.yaml) asosida tuzilgan. API o‘zgarishi bo‘lsa ushbu UserFlow ham yangilanadi.*
