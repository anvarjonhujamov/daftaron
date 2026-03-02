// Helper to build Click.uz payment URL based on openapi.yaml description.
// Uses Vite env variables:
// - VITE_CLICK_SERVICE_ID
// - VITE_CLICK_MERCHANT_ID
// - VITE_CLICK_RETURN_URL (optional, defaults to current origin + /payments)

export function buildClickUrl(user, amount) {
  const baseUrl = 'https://my.click.uz/services/pay'

  // Agar .env da bo'lmasa, siz bergan Click ma'lumotlari asosida fallback ishlatamiz.
  const serviceId = import.meta.env.VITE_CLICK_SERVICE_ID ?? 96745
  const merchantId = import.meta.env.VITE_CLICK_MERCHANT_ID ?? 57186
  const returnUrl =
    import.meta.env.VITE_CLICK_RETURN_URL || `${window.location.origin}/payments`

  if (!user) {
    throw new Error("Foydalanuvchi ma'lumotlari topilmadi.")
  }

  // As per openapi description: merchant_trans_id can be payment_orders.id, public_id or phone
  const merchantTransId =
    user.public_id != null
      ? String(user.public_id)
      : (user.phone || '').replace(/\s/g, '')

  if (!merchantTransId) {
    throw new Error(
      "Foydalanuvchi uchun public_id yoki telefon raqami topilmadi."
    )
  }

  const params = new URLSearchParams()
  params.set('service_id', String(serviceId))
  params.set('merchant_id', String(merchantId))
  params.set('transaction_param', merchantTransId)

  if (amount && Number(amount) > 0) {
    params.set('amount', String(amount))
  }

  params.set('return_url', returnUrl)

  return `${baseUrl}?${params.toString()}`
}

