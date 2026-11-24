import { t } from '../i18n'
// Pul: 1250000 -> "1 250 000". Qiymat yo'q yoki noto'g'ri bo'lsa "—" (hech qachon NaN yoki bo'sh joy emas)
export const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '—'
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(num)) return '—'
    const rounded = Math.round(num)
    const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return rounded < 0 ? `−${digits}` : digits
}

export const formatMoney = (value) => {
    const n = formatNumber(value)
    return n === '—' ? n : `${n} ${t("so'm")}`
}

// Kiritilgan matndan butun so'm: "1 250 000" -> 1250000
export const parseCurrency = (value) => {
    if (value === null || value === undefined) return 0
    const num = parseInt(String(value).replace(/\D/g, ''), 10)
    return Number.isFinite(num) ? num : 0
}

// Ism bosh harfi (avatar uchun)
export const initials = (name) => (String(name || '').trim()[0] || '?').toUpperCase()

// Avatar rangi ism bo'yicha barqaror (dizayndagi pastel juftliklar)
const AVATARS = [
    'bg-[#E0E7FF] text-[#3730A3] dark:bg-[#312E81] dark:text-[#E0E7FF]',
    'bg-[#FCE7F3] text-[#9D174D] dark:bg-[#831843] dark:text-[#FCE7F3]',
    'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D] dark:text-[#DCFCE7]',
    'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03] dark:text-[#FCD34D]',
    'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E3A8A] dark:text-[#DBEAFE]'
]
export const avatarClass = (name) => {
    const s = String(name || '')
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return AVATARS[h % AVATARS.length]
}

// Obuna nomi: bepul sinovda do'konga Oddiy ta'rif biriktirilgan bo'lsa ham «Bepul sinov» (limitlari boshqa)
export const planLabel = (usage) => (usage?.is_trial ? t('Bepul sinov') : usage?.plan_name || t('Sinov'))

// SMS kvotasi: bepul qolgani va limitdan keyingi narx (balansdan yechiladi)
export const smsQuotaText = (quota) => {
    if (quota.free_remaining === null || quota.free_remaining === undefined) return t('SMS cheksiz')
    const price = quota.extra_sms_price > 0 ? `${formatMoney(quota.extra_sms_price)}` : null
    if (quota.free_remaining > 0) {
        const after = quota.overage_allowed === false ? t("keyin SMS to'xtaydi") : price ? t('keyin {price}/SMS', { price }) : null
        return [t('Bepul SMS: {n} ta', { n: formatNumber(quota.free_remaining) }), after].filter(Boolean).join(' · ')
    }
    if (quota.overage_allowed === false) return t("Bepul SMS tugagan · sinovda keyingi SMS yuborilmaydi")
    if (quota.blocked) return t('Bepul SMS tugagan · balans yetmaydi ({price}/SMS)', { price: price || '—' })
    return t('Bepul SMS tugagan · {price} balansdan yechiladi', { price: price || '—' })
}
