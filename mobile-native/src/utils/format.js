export function formatCurrency(amount) {
  const value = Number(amount || 0)
  return new Intl.NumberFormat('uz-UZ').format(Number.isFinite(value) ? value : 0)
}

export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}
