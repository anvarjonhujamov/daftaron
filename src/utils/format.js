// UZS uchun oddiy raqam formatlash helper
// 123000 -> "123 000"

export const formatCurrency = (value) => {
    const num = Number(String(value).replace(/\D/g, '')) || 0
    const rounded = Math.round(num)
    const str = String(rounded)

    let result = ''
    let counter = 0

    for (let i = str.length - 1; i >= 0; i--) {
        result = str[i] + result
        counter++
        if (counter === 3 && i !== 0) {
            result = ' ' + result
            counter = 0
        }
    }

    return result
}

export const parseCurrency = (value) => {
    if (value === null || value === undefined) return 0
    const digits = String(value).replace(/\D/g, '')
    if (!digits) return 0
    return Number(digits)
}

