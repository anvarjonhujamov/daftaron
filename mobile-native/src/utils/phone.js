export const PHONE_PREFIX = '+998'

export function formatPhoneNumber(value) {
  if (!value) return PHONE_PREFIX

  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('998')) {
    digits = digits.slice(3)
  }

  digits = digits.slice(0, 9)

  let formatted = PHONE_PREFIX
  if (digits.length > 0) formatted += ` ${digits.slice(0, 2)}`
  if (digits.length > 2) formatted += ` ${digits.slice(2, 5)}`
  if (digits.length > 5) formatted += ` ${digits.slice(5, 7)}`
  if (digits.length > 7) formatted += ` ${digits.slice(7, 9)}`

  return formatted
}

export function getRawPhoneNumber(formattedPhone) {
  if (!formattedPhone) return ''
  const digits = formattedPhone.replace(/\D/g, '')
  if (digits.startsWith('998')) return `+${digits}`
  return `+998${digits}`
}
