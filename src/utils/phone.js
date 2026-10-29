// O'zbekiston raqami: ichkarida 9 raqam ("901234567"), API'ga "+998901234567",
// ko'rinishda "+998 90 123 45 67", kiritishda "90 123 45 67".

export const phoneDigits = (value) => {
    let d = String(value || '').replace(/\D/g, '')
    if (d.length > 9 && d.startsWith('998')) d = d.slice(3)
    return d.slice(0, 9)
}

// "901234567" -> "90 123 45 67" (yozish paytida)
export const formatLocal = (digits) => {
    const d = phoneDigits(digits)
    return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}

export const toApiPhone = (digits) => `+998${phoneDigits(digits)}`

export const isValidPhone = (digits) => phoneDigits(digits).length === 9

export const formatPhone = (value) => {
    if (!value) return '—'
    const d = phoneDigits(value)
    return d.length === 9 ? `+998 ${formatLocal(d)}` : String(value)
}
