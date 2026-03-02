# Daftaron — To‘liq texnik topshiriq (TZ)

## 1. Umumiy ma’lumot

| Parametr | Qiymat |
|----------|--------|
| Loyiha nomi | Daftaron |
| Texnologiya | Laravel (PHP), MySQL, Blade, Sanctum |
| API versiya | v1 |
| API base URL | `https://<domen>/api/v1` |
| Vaqt zonasi | Asia/Tashkent |

**Maqsad:** Do‘konlar (tenant) uchun nasiya (qarz), to‘lovlar, obuna/ta’rif boshqaruvi, balans to‘ldirish va Click orqali to‘lov. Web ilova + REST API. Admin panel faqat Web da.

---

## 2. Rollar va foydalanuvchilar

| Rol | Tavsif |
|-----|--------|
| `shop_owner` | Do‘kon egasi, bitta yoki bir nechta do‘kon, balans user da |
| `shop_worker` | Do‘kon xodimi |
| `manager` | Bir nechta do‘konlarga tayinlangan menejer |
| `admin` | To‘liq admin panel kirishi |

- **Balans** — do‘kon egasining `users.balance` da saqlanadi (tenant emas).
- Bitta user bir nechta do‘kon ochishi mumkin (ta’rif bo‘yicha cheklov: Oddiy ta’rifda 1 ta).

---

## 3. Foydalanuvchi identifikatori (public_id)

- **Bazadagi ID:** `users.id` (1, 2, 3, ...).
- **Ko‘rinadigan ID (public_id):** `id + 1000` (1001, 1002, ...).
- Profil sahifasida va **Click** to‘lovida foydalanuvchini aniqlash uchun **public_id** yoki telefon ishlatiladi.
- API javoblarida `user` obyektida `public_id` ham qaytarilishi mumkin (accessor).

---

## 4. Autentifikatsiya

### 4.1. Web

- **Login:** `GET/POST /login` — telefon + parol. SMS tasdiqlash yoqilgan bo‘lsa verify sahifasiga yo‘naltiriladi.
- **Ro‘yxatdan o‘tish:**  
  1) `GET/POST /register` — ism + telefon (ma’lumot 30 daqiqa cache da);  
  2) `GET/POST /verify` — 4 xonali kod (type=register);  
  3) `GET/POST /register/complete` — do‘kon nomi, category_id, viloyat/tuman/ko‘cha, parol. Shundan keyin user va tenant yaratiladi, login qilinadi.
- **Parolni tiklash:** `/password/forgot` → SMS kod → `/password/verify` → `/password/new` → yangi parol.
- **Remember:** Login da “eslab qolish” yoqilgan (sessiya 30 kun).
- **Admin kirish:** `GET/POST /admin/login` — faqat `admin` roli bilan.

### 4.2. API

- **Bearer token:** Barcha himoyalangan endpointlar `Authorization: Bearer <token>` talab qiladi.
- **Token olish:**
  - `POST /api/v1/auth/login` — telefon + parol (SMS o‘chiq bo‘lsa darhol token).
  - Yoki `POST /api/v1/auth/register` → `POST /api/v1/auth/verify` (type=register) → `POST /api/v1/auth/register/complete` — token.
- **Parolni tiklash (API):**  
  `POST /auth/password/forgot` → `POST /auth/password/verify` (reset_token qaytadi) → `POST /auth/password/reset`.

### 4.3. Telefon formati

- Bazada: `+998XXXXXXXXX`.
- API/Web kiritish: `+998...` yoki `998...` (9 ta raqam 9 bilan boshlansa avtomatik 998 qo‘shiladi).

---

## 5. Profil

- **Web:** `GET /profile`, `GET /profile/edit`, `PUT /profile`, parol o‘zgartirish.
- **API:** `GET /api/v1/profile`, `PUT /api/v1/profile`, `PUT /api/v1/profile/password`.
- Profil sahifasida **ID** (public_id), ism, telefon, do‘kon, sinov muddati ko‘rsatiladi.

---

## 6. Obuna (subscription) va balans

### 6.1. Umumiy

- **Trial:** Sozlamada `trial_days` (0 bo‘lishi mumkin — sinovsiz).
- **Balans:** `users.balance`. Balans to‘ldirish Click (yoki boshqa tizim) orqali.
- **Ta’rif tanlash:** Narx balansdan yechiladi; yetmasa 422 "Mablag' yetarli emas".

### 6.2. Web

| URL | Metod | Tavsif |
|-----|--------|--------|
| `/subscription/status` | GET | Balans, trial, tariflar, tranzaksiyalar |
| `/subscription/choose/{plan}` | POST | Tarif tanlash (balansdan) |
| `/subscription/balance-topup` | POST | Balans to‘ldirish — to‘lov tizimini tanlash, redirect |
| `/subscription/plan-pay/{plan}` | POST | Tarifni to‘lov tizimi orqali to‘lash |
| `/payment/return`, `/payment/cancel` | GET | To‘lovdan keyin qaytish |

### 6.3. API

| URL | Metod | Auth | Tavsif |
|-----|--------|------|--------|
| `/api/v1/subscription/status` | GET | Bearer | Balans, trial_info, plans, transactions (oxirgi 10) |
| `/api/v1/subscription/choose/{plan}` | POST | Bearer | Tarif tanlash; 422 mablag‘ yetmasa |

---

## 7. Click to‘lov tizimi

### 7.1. Sozlamalar

- `.env`: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID`.
- **APP_URL** public bo‘lishi kerak; Click kabinetida Prepare va Complete URL lar shu domen bilan ro‘yxatdan o‘tkaziladi.

### 7.2. Redirect (ilovadan to‘lov)

- Balans yoki tarif to‘lovi uchun backend `https://my.click.uz/services/pay?...` URL generatsiya qiladi.
- Parametrlar: `service_id`, `merchant_id`, `amount`, `transaction_param` (= `payment_orders.id`), `return_url`, `merchant_user_id` (ixtiyoriy).

### 7.3. Callback (Click server chaqiradi)

- **Prepare:** `POST /payment/click/prepare`  
  - Sign tekshiriladi.  
  - Agar `merchant_trans_id` bo‘yicha `PaymentOrder` (pending) topilsa — summa tekshiriladi, `merchant_prepare_id` = order.id qaytariladi.  
  - Topilmasa: `merchant_trans_id` foydalanuvchi identifikatori deb qabul qilinadi:  
    - **Raqam** va ≥1001 bo‘lsa: `public_id - 1000` = user_id bo‘yicha user qidiriladi.  
    - **Telefon:** `+998...` yoki `998...` (12 raqam) — `PhoneHelper::normalize` orqali user qidiriladi.  
  - User topilsa yangi `PaymentOrder` (type=balance_deposit, status=pending) yaratiladi va `merchant_prepare_id` shu order id qaytariladi.
- **Complete:** `POST /payment/click/complete`  
  - Sign tekshiriladi, `merchant_prepare_id` bo‘yicha order topiladi.  
  - Order completed qilinadi, user balansiga summa qo‘shiladi, `transactions` yozuvi yaratiladi.
- Javob formati: **JSON** (application/json).  
  Prepare: `click_trans_id`, `merchant_trans_id`, `merchant_prepare_id`, `error`, `error_note`.  
  Complete: `click_trans_id`, `merchant_trans_id`, `merchant_confirm_id`, `error`, `error_note`.

### 7.4. Click ilovasidan to‘g‘ridan-to‘g‘ri to‘lov

- **merchant_trans_id** ga: **public_id** (1001, 1002, ...) yoki **telefon** (`+998...` yoki `998...`) kiritiladi.
- 9 xonali format (`991112233`) qo‘llab-quvvatlanmaydi.

---

## 8. Mijozlar (Customers)

- Har bir mijoz `tenant_id` ga bog‘langan.
- **Web:** CRUD `/customers`, qidiruv `/api/customers/search?q=...`.
- **API:** `GET/POST /api/v1/customers`, `GET/PUT/DELETE /api/v1/customers/{id}`.

---

## 9. Nasiya (Debts) va debt_date

### 9.1. Maydon

- **debt_date** — nasiya sanasi (faqat sana, vaqt shart emas).  
  Format: YYYY-MM-DD. Bazada `debt_date` (DATE) ustuni.

### 9.2. Sana qoidalari

- **Tanlanmasa:** bugungi sana.
- **Oraliq:** oxirgi 1 oy (bugundan 1 oy oldingi sanadan bugungi kungacha).
- **Validatsiya:** `nullable|date|after_or_equal:<1 oy oldin>|before_or_equal:today`.

### 9.3. Web

- **Qo‘shish:** `GET/POST /debts/create` — forma da sana tanlash (min 1 oy oldin, max bugun).
- **Tahrirlash:** `GET/PUT /debts/{id}/edit` — debt_date ni o‘zgartirish mumkin.
- **Yopish:** `PATCH /debts/{id}/close` — qolgan summa to‘lov sifatida yoziladi, status=closed.

### 9.4. API

- **POST** `/api/v1/debts` — body: `customer_id`, `total_amount`, ixtiyoriy `debt_date`, `description`.  
  `debt_date` yuborilmasa — bugungi sana.
- **PUT** `/api/v1/debts/{id}` — body: `customer_id`, `total_amount`, ixtiyoriy `debt_date`, `description`.
- **PATCH** `/api/v1/debts/{id}/close` — nasiyani yopish.

---

## 10. To‘lovlar (Payments) — nasiya bo‘yicha

- Nasiya bo‘yicha to‘lovlar `payments` jadvalida (debt_id, amount, paid_at).
- **Web:** `GET/POST /payments` va boshqalar (resource).
- **API:** `GET /api/v1/payments` (ixtiyoriy `debt_id` filter), `POST /api/v1/payments` (body: debt_id, amount, ixtiyoriy paid_at).

---

## 11. Boshqa tenant (Web) funksiyalari

- **Dashboard:** `/dashboard` — statistikalar.
- **Muddati o‘tganlar:** `/overdue` — qarzlar bo‘yicha filter (5–30 kun), tartib.
- **To‘lovlar tarixi:** `/transaction-history` — tranzaksiyalar + ta’rif sotib olish tarixi.
- **Do‘kon qo‘shish:** `/shops/create`, `POST /shops` — ta’rif bo‘yicha cheklov (Oddiy da 1 ta).
- **Bildirishnomalar:** `/notifications`, `/notifications/{id}`.

---

## 12. Admin panel

- **Kirish:** `/admin/login`. Barcha route lar `prefix('admin')`, `middleware(['admin.auth', 'role:admin'])`.
- **Asosiy:** Dashboard (yangi foydalanuvchilar), tenants (do‘konlar), users, users/expired, users/new.
- **CRUD:** Tenants, Managers, Expenses, Plans, Categories, Payment systems (ko‘rsatish/tahrirlash).
- **Boshqaruv:** `POST /admin/tenants/{tenant}/balance` — tenant egasining balansini to‘ldirish.
- **Sozlamalar:** `/admin/settings` (trial_days va boshqalar).
- **To‘lovlar tarixi:** `/admin/payments`.
- **Profil / bildirishnomalar:** `/admin/profile`, `/admin/notifications`.

---

## 13. API endpointlar — qisqa ro‘yxat

| Metod | Endpoint | Auth | Qisqa tavsif |
|-------|----------|------|----------------|
| POST | `/auth/login` | — | Login |
| POST | `/auth/register` | — | Ro‘yxat 1-bosqich |
| POST | `/auth/verify` | — | SMS tasdiq |
| POST | `/auth/register/complete` | — | Ro‘yxat 2-bosqich, token |
| GET | `/auth/me` | Bearer | Joriy user |
| POST | `/auth/logout` | Bearer | Chiqish |
| POST | `/auth/password/forgot` | — | Parol tiklash 1 |
| POST | `/auth/password/verify` | — | Parol tiklash 2, reset_token |
| POST | `/auth/password/reset` | — | Parol tiklash 3 |
| GET | `/subscription/status` | Bearer | Balans, trial, plans, transactions |
| POST | `/subscription/choose/{plan}` | Bearer | Tarif tanlash |
| GET | `/dashboard` | Bearer | Dashboard |
| GET/POST | `/customers` | Bearer | Mijozlar |
| GET/PUT/DELETE | `/customers/{id}` | Bearer | Mijoz bitta |
| GET/POST | `/debts` | Bearer | Nasiyalar (POST da debt_date ixtiyoriy) |
| GET/PUT/DELETE | `/debts/{id}` | Bearer | Nasiya bitta |
| PATCH | `/debts/{id}/close` | Bearer | Nasiyani yopish |
| GET/POST | `/payments` | Bearer | To‘lovlar |
| GET/PUT | `/profile` | Bearer | Profil |
| PUT | `/profile/password` | Bearer | Parol o‘zgartirish |
| GET/GET | `/notifications`, `/notifications/{id}` | Bearer | Bildirishnomalar |
| POST | `/tenants` | Bearer | Yangi do‘kon |
| GET | `/locations/regions` | — | Viloyatlar |
| GET | `/locations/districts/{regionId}` | — | Tumanlar |
| GET | `/locations/streets/{districtId}` | — | Ko‘chalar |

---

## 14. Web route lar — qisqa guruhlar

- **Auth:** `/login`, `/register`, `/verify`, `/register/complete`, `/password/forgot`, `/password/verify`, `/password/new`, `/password/reset`, `/admin/login`, `/logout`.
- **Click callback (authsiz):** `POST /payment/click/prepare`, `POST /payment/click/complete`.
- **Auth + trial:** `/dashboard`, `/profile`, `/subscription/*`, `/payment/return`, `/payment/cancel`, `/customers`, `/debts`, `/payments`, `/overdue`, `/shops`, `/notifications`, `/transaction-history`, `/plan-purchase-history`.
- **Admin:** `/admin/*` — dashboard, tenants, users, managers, expenses, plans, categories, payment-systems, payments, settings, profile, notifications.

---

## 15. Hujjatlar va qo‘shimcha

- **OpenAPI (Swagger):** `public/docs/openapi.yaml` — API spec; `/docs` orqali ko‘rsatish mumkin.
- **Postman:** `public/docs/daftaron.postman_collection.json`.
- **README:** `README.md` — API va Click qisqacha.

*TZ oxirgi o‘zgarishlar (debt_date, Click, public_id, subscription/status va boshqalar) bo‘yicha yangilangan.*
