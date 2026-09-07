# Vazifalar ro'yxati (Tasks) — Supplier Xarid + To'lov

Har bir task AC ga moslangan, status, priority va local test requirements (TR) bilan.

---

## Task 1: suppliers.api.js kengaytirish — Purchase CRUD + Supplier Payment CRUD + LocalStorage fallback
**Priority**: high
**AC**: AC-2, AC-3, AC-8, NFR-2, NFR-4
**Status**: pending
**Bog'liq fayl**: `src/api/suppliers.api.js`

### Amallar:
1.1 `suppliersPURCHASE_ENDPOINTS` constant (8+ variant) — Purchase CRUD avto-detect
1.2 `suppliersPAYMENT_ENDPOINTS` constant (8+ variant) — Payment CRUD avto-detect
1.3 `getSupplierPurchases(supplierId)` + `getSupplierPayments(supplierId)` — GET array
1.4 `createSupplierPurchase(supplierId, data)` — POST, payload: supplier_id, amount, description, reference, purchase_date, paid_at fallback
1.5 `updateSupplierPurchase(id, data)` + `deleteSupplierPurchase(id)`
1.6 `createSupplierPayment(supplierId, data)` — POST, payload: supplier_id, amount, description, paid_at, payment_method (cash/transfer/card), mode (auto / balance), purchase_ids/allocation
1.7 `updateSupplierPayment(id, data)` + `deleteSupplierPayment(id)`
1.8 LocalStorage fallback: agar endpointlar 404/405 bo'lsa → `supplier_${id}_purchases` keyga write, next read from localStorage. Har bir CRUD update localStorage ham. Bu NFR-3 optimistic ishlashi uchun.
1.9 `tryEndpoints()` funksiyani ichki ikki marta ishlatish — 401/403/422 → stop, 404/405 → keyingi variant

### Test Requirements (TR)
- **TR 1.1 (rule)**: `createSupplierPurchase(1,{amount:100000,description:"test"})` → javob qaytaradi (endpoint bor yo'qligidan qat'i nazar, localStorage fallback ishlashi)
- **TR 1.2 (rule)**: `deleteSupplierPurchase(id)` mavjud purchase ni o'chiradi, keyingi get da ko'rinmaydi

---

## Task 2: SupplierDetailPage stats — local mock → real API + localStorage + initial balance sign logic
**Priority**: high
**AC**: AC-5
**Status**: pending
**Bog'liq fayl**: `src/pages/SupplierDetailPage.jsx`

### Amallar:
2.1 `useEffect` ga `await Promise.all([api.getSupplierPurchases(id), api.getSupplierPayments(id)])` qo'shish → `setPurchases`, `setPayments`
2.2 Oldingi `deterministicMockMovements` ni olib tashlash (lekin comment qilib saqlamang — butunlay olib tashlang)
2.3 `totalBought = purchases.reduce(s = sum(s.amount))`, `totalPaid = payments.reduce(s = sum(s.amount))`
2.4 `initialBalanceSign = (supplier.balance || supplier.current_debt) ?? 0`
2.5 hasDebt = totalBought + initialBalanceSign - totalPaid > 0, hasCredit = (totalBought - initialBalanceSign - totalPaid) < 0, absBalance = Math.abs(totalBought - totalPaid + initialBalanceSign)

### TR:
- **TR 2.1 (rule)**: Mock removed — `deterministicMockMovements` funksiya yo'q bo'lishi
- **TR 2.2 (rubric)**: 2 ta purchase va 1 ta payment qo'shilganda stats karta to'g'ri hisoblaydimi (0-2, threshold=2)

---

## Task 3: Action buttons — "Xarid qo'shish" + "To'lov qilish"
**Priority**: high
**AC**: AC-1
**Status**: pending
**Bog'liq fayl**: `src/pages/SupplierDetailPage.jsx` (hozirgi Call/SMS buttons qator)

### Amallar:
3.1 Call/SMS qatoridan oldingi YANGI 2-ustunli action row: Chap = "Xarid qo'shish" (ko'k, ShoppingCart ikon), O'ng = "To'lov qilish" (yashil, Wallet ikon)
3.2 2 ta yangi state: `showPurchaseDrawer = useState(false)`, `showPaymentDrawer = useState(false)`
3.3 Button onClick → `setShowPurchaseDrawer(true)` / `setShowPaymentDrawer(true)`
3.4 Hozirgi Call/SMS qatorini o'chirib yubormang, ular pastda qoladi (ikki qator: 1 row = Xarid/To'lov, 2 row = Call/SMS)

### TR:
- **TR 3.1 (rule)**: 2 ta yangi button render, Call/SMS hali ham mavjud

---

## Task 4: Purchase Drawer (Vaul Drawer) + Form validation + optimistic submit
**Priority**: high
**AC**: AC-2, AC-7, NFR-1, NFR-5
**Status**: pending
**Bog'liq fayl**: `src/pages/SupplierDetailPage.jsx` (inline), (agar kattaroq bo'lsa → `src/components/SupplierPurchaseDrawer.jsx` alohida — lekin inline qiling, customer singari)

### Amallar:
4.1 Drawer ichida:
  - Sarlavha: "Yangi xarid qo'shish" (Buyurtma yoki Invoice emas)
  - Summa input: formatCurrency, majburiy, 0 dan katta → parseCurrency olib submit
  - Sana input: type="date", default = today, max = today
  - Reference / INV raqami input: ixtiyoriy, placeholder "INV-0001"
  - Izoh textarea: ixtiyoriy
  - Submit disabled (invalid bo'lganda)
4.2 Form error object field: formErrors.amount / formErrors.date ...
4.3 Submit handleSubmitPurchase(data):
  - `const created = await suppliersApi.createSupplierPurchase(id, payload)`
  - Optimistic: `setPurchases([{...payload, id: created.id || Date.now(), ...}, ...purchases])`
  - `setTotalBought`, `setAbsBalance` oldindan hisoblansin
  - `toast.success("Yangi xarid saqlandi")`
  - `setShowPurchaseDrawer(false); resetForm()`
  - Catch → `throw err` → drawer yopilmas, field error joylashtir
4.4 422 validation → response.data.errors → field larga map

### TR:
- **TR 4.1 (rule)**: amount = 0 submit → error, drawer yopilmas
- **TR 4.2 (rule)**: amount = 50000 submit → toast success, list boshiga qo'shiladi

---

## Task 5: Payment Drawer (Vaul Drawer) — 2 rejim, allocation preview, max sum validation
**Priority**: high
**AC**: AC-3, AC-4, NFR-5
**Status**: pending
**Bog'liq fayl**: `src/pages/SupplierDetailPage.jsx`

### Amallar:
5.1 Drawer ichida:
  - Tab (3 ta pill tabs / segment) → `Avtomatik taqsimlash` (rejim = auto default) | `Faqat balans` (rejim = balance)
  - Summa input: majburiy, 0 dan katta
  - MAX = Math.max(0, totalBought - totalPaid + initialBalanceSign) → if amount > MAX → formErrors.amount = "Jami qarzdorlikdan ortiq to'lay olmaysiz. Maksimal: X so'm"
  - To'lov turi: Select / chips: Naqd (cash), Plastik (card), O'tkazma (transfer)
  - Sana: paid_at, bugungi default
  - Izoh: ixtiyoriy
  - **Allocation preview** (faqat auto rejimda):
    - `const openPurchases = purchases.sort(date desc)` — each ni remaining = p.amount - (payments allocated to p?) hisoblash (yoki oddiy har bir purchase ga ketma-ket amount ni ayirish, qoldi topish)
    - Each row: purchase inv • qoldiq • allocated summa
    - Pastki qator: **Balansga** • qolgan summa (agar ortiq bo'lsa)
5.2 Submit handleSubmitPayment:
  - auto rejimda: for each allocated purchase → alohida createSupplierPayment(purchase_id) + last one for balance
  - balance rejimda → 1 ta createSupplierPayment(purchase_id = null)
  - Optimistic: payments list boshiga qo'sh
  - Stats darhol yangilanadi
  - Success toast → close
  - Error → formErrors + drawer yopilmas

### TR:
- **TR 5.1 (rule)**: amount > MAX → error, submit disabled
- **TR 5.2 (rule)**: auto mode → allocation preview kamida 1 ta purchase ko'rsatishi (agar mavjud bo'lsa)

---

## Task 6: Operatsiyalar tarixi — real data, Edit va Delete per item
**Priority**: medium-high
**AC**: AC-8
**Status**: pending
**Bog'liq fayl**: `src/pages/SupplierDetailPage.jsx`

### Amallar:
6.1 Har bir tarix item (allMovements) → o'ng tomonda ⋮ MoreVertical tugmasi (w-8 h-8, rounded-full, active:scale-90)
6.2 onClick → `setSelectedMovement(movement)` + `setShowHistoryOptionsDrawer(true)`
6.3 History Options Drawer pastdan: 2 ta row = Tahrirlash (Edit2 ikon) / O'chirish (Trash2 ikon)
6.4 Tahrirlash → selected movement purchase → PurchaseDrawer `mode='edit'` och, selected movement payment → PaymentDrawer `mode='edit'` och. Formani prefill qil
6.5 O'chirish → confirm Drawer → "Ushbu {type} o'chirilsinmi?" → PUT DELETE endpoint, optimistic delete → list dan chiqar
6.6 Each movement `updatedAt` uchun time format ishlatilsin (utils/format → formatDateShort)

### TR:
- **TR 6.1 (rule)**: Har bir movement item da ⋮ button bor
- **TR 6.2 (rule)**: Delete confirm → list dan chiqib ketadi, stats yangilanadi

---

## Task 7: Validation, test, build
**Priority**: high
**AC**: AC-7
**Status**: pending

### Amallar:
7.1 npm run build → EXIT=0
7.2 GetDiagnostics → 0 xatolar
7.3 Git commit va push
7.4 Har bir Drawer: test account (+998912801774) bilan live sinov:
  - Xarid 500 000 so'm → Jami xarid 500 000, Farq 500 000 (Qarzdor badge)
  - To'lov 200 000 → Jami to'lov 200 000, Farq 300 000
  - To'lov 300 001 → error, maksimal 300 000 deb ko'rsatishi kerak
  - Delete xarid → Jami xarid 0 ga qaytishi
  - To'lov 300 000 → Farq 0 → Balans nol badge

### TR:
- **TR 7.1 (rule)**: `npm run build` exit 0
- **TR 7.2 (rule)**: diagnostics 0 xato
