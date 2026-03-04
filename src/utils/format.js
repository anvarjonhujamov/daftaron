// UZS uchun oddiy raqam formatlash helper
// 123000 -> "123 000"

export const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0'

    let num

    if (typeof value === 'number') {
        num = value
    } else {
        const cleaned = String(value)
            .replace(/\s/g, '')
            .replace(',', '.')
        const parsed = parseFloat(cleaned)
        num = Number.isFinite(parsed) ? parsed : 0
    }

    const rounded = Math.round(num)
    const absStr = Math.abs(rounded).toString()

    let result = ''
    let counter = 0

    for (let i = absStr.length - 1; i >= 0; i--) {
        result = absStr[i] + result
        counter++
        if (counter === 3 && i !== 0) {
            result = ' ' + result
            counter = 0
        }
    }

    return rounded < 0 ? `-${result}` : result
}

export const parseCurrency = (value) => {
    if (value === null || value === undefined) return 0
    const cleaned = String(value)
        .replace(/\s/g, '')
        .replace(',', '.')
    const num = parseFloat(cleaned)
    if (!Number.isFinite(num)) return 0
    return Math.round(num)
}

