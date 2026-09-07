# Spetsifikatsiya: Postavchiklar (Suppliers) uchun Xarid va To'lov funksiyasi

## 1. Muammo
Hozirgi SupplierDetailPage da operatsiyalar tarixi faqat mock/deterministic generatsiya qilinadi, user haqiqiy "Xarid qo'shish" va "To'lov qilish" (biz supplierga) uchun hech qanday forma yoki action yopishmaydi. CustomerDetailPage da allaqachon Debt (nasiya) va Payment (mijozdan to'lov) funksiyalari mavjud, ular Supplier darajasida yo'q. Bu esa:
- Jami xarid / Jami to'lov kartalari **0 dan o'zgarmaydi** va user tomonidan qo'lda kiritib bo'lmaydi
- Balans avtomatik hisoblanmaydi, faqat qo'shilgan supplier fieldiga bog'liq
- Operatsiyalar tarixi haqiqiy emas, user o'z kiritganlarini ko'ra olmaydi

## 2. Foydalanuvchilar va Maqsadlar
### Foydalanuvchi rollari
- **shop_owner**: Xarid + To'lov qo'shish, tahrirlash, o'chirish — hamma huquq
- **staff / sotuvchi**: Xarid + To'lov qo'shish va ko'rish huquqi (o'zgartirish/o'chirish cheklangan bo'lishi mumkin, lekin hozir User role cheklovi o'chirilganligi sababli — owner bilan bir xil)

### Asosiy maqsadlar
1. SupplierDetailPage da ➕ **Xarid qo'shish** tugmasi → forma → backendda `purchase` yoki `supplier_invoice` kabi ob'ekt yaratish + supplier balansiga (+) qarz
2. SupplierDetailPage da ➕ **To'lov qilish** tugmasi → forma → backendda `supplier_payment` ob'ekt yaratish + supplier balansidan (-) ayirish
3. Stats kartalari (Jami xarid / Jami to'lov / Farq) real backend ma'lumotlaridan hisoblansin
4. Operatsiyalar tarixi (Hammasi / Xaridlar / To'lovlar) real yaratilgan ob'ektlarni ko'rsatsin, mock yo'q
5. CustomerDetailPage dagi to'liq ishlagan logic bilan deyarli bir xil → qo'llaniladigan patternlarni takrorlash (Drawer, Vaul, ikki hil payment rejimi, allocation preview, formatCurrency/parseCurrency helpers, 422 validation xatolarini joylashtirish)

## 3. Cheklovlar (Non-Goals)
- ❌ YANGI backend route/controlller yozmaslik (bu frontend repo, biz backendni o'zgartira olmaymiz). Frontendda faqat **avto-detect endpoint** approach + ular mavjud bo'lmasa, mock localstorage yoki `createSupplierDebt` emas balki **`optimistic local state write with fallback mock`**
- ❌ Mobile-native (mobile-native folder) papkasini o'zgartirmaslik — bu WEB UI spec
- ❌ PCI DSS kartalarni saqlash emasku, bizda faqat **summa + sana + izoh + to'lov turi (naqd/transfer)** — karta ma'lumotlari yo'q, shuning uchun PCI DSS talabi hisobiga Payment turi fieldi (naqd, plastik, o'tkazma) va ularni saqlashda hech qachon karta raqamini almashmaslik
- ❌ YANGI sahifalar route yaratmaslik (faol SupplierDetailPage da Drawer orqali barcha amallar)
- ❌ Documentatsiya yaratmaslik — oldindan mavjud TZ.md yoki README ga qo'shmaslik (faqat .trae ichidagi spec fayllar)

## 4. Funksional talablar (FR)
### FR 1: Xarid qo'shish (Purchase Create)
- **Trigger**: SupplierDetailPage da stats kartalari tagidagi action row da chap tomonda ko'k "Xarid qo'shish" tugmasi (ShoppingCart ikon)
- **Drawer (Vaul Drawer)**:
  - Majburiy maydonlar: `Summa (amount)`
  - Ixtiyoriy maydonlar: `Izoh`, `Sana (default = today)`, `Hisob raqami / INV nomeri (reference)`
  - Validatsiya: `amount > 0`, yozuv uchun 19.999.999.999 dan oshmaslik
  - Submit: avtomatik formatCurrency → parseCurrency
  - `Jami xarid` kartasi +1, `Farq` kartasi +amount (bizga qarz oshadi)
  - Tarix list boshiga yangi item optimistic qo'shiladi
  - Backend endpoint auto-detect: POST `{suppliersId}/purchases`, POST `/{suppliersId}/invoices`, POST `/purchases`, POST `/supplier_invoices`, POST `/debts` (debt_type=supplier bilan) — 6 variant

### FR 2: To'lov qilish (Supplier Payment Create)
- **Trigger**: stats tagidagi action row da o'ng tomonda yashil "To'lov qilish" tugmasi (Wallet/CreditCard ikon)
- **Drawer**:
  - Majburiy maydon: `Summa`
  - Ixtiyoriy: `Izoh`, `To'lov sanasi (paid_at)`, `To'lov turi` (Naqd, O'tkazma, Plastik)
  - **2 ta rejim** (Customer dagidek):
    - Rejim A (avtomatik taqsimlash = `auto`): summani eng yangi xarid (purchase) dan boshlab avtomatik taqsimlaydi, ortig'i = balansga (to'liq amalga oshirish uchun)
    - Rejim B (faqat balans = `balance`): summani faqat umumiy balansdan ayirish, hech qanday purchase ni yopmaslik
    - Allocation preview (useMemo): real vaqt rejimida taqsimlashni ko'rsatuvchi qatorlar
    - Maximum summa cheklovi: balans (joriy qarzdorlikdan) oshmasligi kerak — tekshiruv xato xabari bilan
  - Stats: Jami to'lov +amount, Farq -amount
  - Tarix boshiga optimistic qo'shiladi
  - Backend endpoint auto-detect: POST `{supplierId}/payments`, POST `{supplierId}/supplier_payments`, POST `/supplier_payments`, POST `/payments` (supplier_id bilan), POST `/transactions` (type=supplier_payment)

### FR 3: Edit va Delete (Xarid va To'lov uchun)
- Har bir tarix itemiga hover/long press uchun kebab menu (⋮) → Tahrirlash / O'chirish
- O'chirish: confirm dialog (Vaul Drawer pastdan chiqib, "O'chirilsinmi?")
- Update/delete endpointlar: purchases ning `PUT /purchases/:id`, `DELETE /purchases/:id` — payments uchun ham

### FR 4: Stats hisoblash (real)
- Avvalgi mock deterministic o'rniga:
  - `totalBought = sum(purchases.amount)` where purchase.supplier_id = id
  - `totalPaid = sum(payments.amount)` where payment.supplier_id = id
  - `absBalance = abs(totalBought - totalPaid + supplier.initialDebt)` (initialDebt = qo'shilgandagi supplier.balance/ current_debt field value)
  - hasDebt/hasCredit sign = (totalBought + initial_debt_sign - totalPaid) > 0 → hasDebt

### FR 5: Operatsiyalar tarixi (real)
- `allMovements = [..purchases, ..payments].sort(date desc)`
- `purchases` → blue ShoppingCart, `payments` → emerald CheckCircle2 (avvalgi mock bilan bir xil dizayn, shunchaki backenddan qaytgan payload)
- Empty state mavjud (hali xaridlar/to'lovlar yo'q) saqlanadi

### FR 6: Validatsiya va xatoliklar
- 401 → user avtomatik logout (axios interceptor allaqachon buni qiladi)
- 403 → toast emas, form error fieldga joylashtiriladi (supplier limit tugagandek xabarlar)
- 422 → server validation errors (amount required, amount invalid, etc.) individual field errors
- Xato bo'lsa **modal yopilmagan** holida qoladi (error throw hosil qilib, onClose() chaqirilmasligi)

## 5. Funksional bo'lmagan (NFR)
- **NFR 1 (rule)**: Responsiv: 360px-1280px gacha, scroll-x yo'q, Vaul Drawer phone da full width, desktop da 50% width
- **NFR 2 (rule)**: Endpoint avtomatik aniqlash (6+ variant) 404/405 bo'lganda keyingi variantni sinash, 403/401/422 to'xtash (endpoint mavjud, lekin ruxsat yo'q)
- **NFR 3 (rubric)**: Optimistic update — submit bo'lgandan so'ng UI darhol ko'rsatadi (100ms dan kamroq), keyin backend refresh ikkinchi darajali manba sifatida
- **NFR 4 (rubric)**: Kengaytirilish yangi endpointlar qo'shishni oson qilishi uchun purchases_api/payments_api o'zgaruvchan holatda, ularni alohida api fayl emas balki `suppliers.api.js` ichida endpoint array constant bilan
- **NFR 5 (rule)**: Umumiy formatCurrency / parseCurrency helpers (utils/format.js) ni ishlatish → yangi custom yozmang
- **NFR 6 (rule)**: Hech qachon kartani raqamini/exp/ccv formaga kiritmaslik — to'lov turi fieldi (Naqd/Plastik/O'tkazma) bilan cheklansin, bu PCI DSS ga mos kelish uchun minimal talab

## 6. Qo'llab-quvvatlanadigan endpoint ro'yxati (Constant)
```
const PURCHASE_ENDPOINTS = [
  `/${supplierId}/purchases`, `/${supplierId}/invoices`, `/${supplierId}/orders`,
  `/purchases`, `/supplier_invoices`, `/debts`
]
const PAYMENT_ENDPOINTS = [
  `/${supplierId}/payments`, `/${supplierId}/supplier_payments`,
  `/supplier_payments`, `/payments`, `/transactions`, `/${supplierId}/movements`
]
```
Agar backend ularni barchasi uchun 404/405 qaytaritsa → local optimistic state ni saqlash (localStorage da `supplier_{id}_purchases`, `supplier_{id}_payments` key bilan). Bu user uchun "backend yo'q bo'lsada UI ishlaydi" holati.

## 7. Qabul qilish mezonlari (Acceptance Criteria)
- **AC 1 (rule)**: SupplierDetailPage da "Xarid qo'shish" va "To'lov qilish" 2 ta yangi action button ko'rinadi va Drawerni ochadi
- **AC 2 (rule)**: Xarid submit qilinganda → summa>0 bolmasa error, summa kiritilgandan so'ng "Yangi xarid saqlandi" toast, list boshiga qo'shiladi, Jami xarid kartasi oshadi
- **AC 3 (rule)**: To'lov submit qilinganda → agarda summa jami qarzdorlikdan katta bo'lsa, forma error ko'rsatadi va yopilmagan qoladi; to'g'ri bo'lsa "To'lov muvaffaqiyatli qo'shildi" toast va Jami to'lov kartasi oshadi, Farq kamayadi
- **AC 4 (rule)**: Allocation preview rejim avtomatik bo'lganda, "Taqsimlanishi" ko'rinadi (har bir xarid uchun qancha ketgani)
- **AC 5 (rule)**: Stats kartalari page loadda real API data (yoki fallback localStorage) dan hisoblanadi, 0 emas
- **AC 6 (rubric)**: Dizayn CustomerDetailPage dagi To'lov/Nasiya drawer bilan singdar, 100% mos keluvchi Vaul Drawer + label+input stili (0-2 ball oralig'ida: 2=bir xil stili, 1=oz farqlar, 0=juda boshqacha). Pass threshold = 2.
- **AC 7 (rule)**: npm run build EXIT=0, diagnostics 0 xato
- **AC 8 (rule)**: Purchase delete/delete endpoint mavjud bo'lsa delete ishlaydi, bo'lmasa local optimistic delete
