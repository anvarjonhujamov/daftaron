// Payme checkout URL builder (TZ.md section 13.3)
// Format: https://checkout.paycom.uz/BASE64(m=MERCHANT_ID;ac.user_id=USER_ID;a=AMOUNT_TIYIN;c=RETURN_URL)

export function buildPaymeUrl(user, amount) {
  const merchantId = import.meta.env.VITE_PAYME_MERCHANT_ID ?? '699c0a9d882f0c65c9213c26'

  if (!user || !user.id) {
    throw new Error("Foydalanuvchi ma'lumotlari topilmadi.")
  }

  // Summa tiyinda (×100). Masalan 29000 so'm = 2900000 tiyin
  const amountTiyin = Math.round(Number(amount) * 100)
  if (!amountTiyin || amountTiyin <= 0) {
    throw new Error("Noto'g'ri summa")
  }

  const returnUrl = import.meta.env.VITE_PAYME_RETURN_URL || 'https://daftaron.firstcoder.uz/payment/return'

  // Payme docs: parametrlar ; bilan ajratiladi
  const raw = `m=${merchantId};ac.user_id=${user.id};a=${amountTiyin};c=${returnUrl}`
  const encoded = btoa(raw)

  return `https://checkout.paycom.uz/${encoded}`
}
