// Admin paneldan keladigan hujjat (oferta, maxfiylik) HTML'ini xavfsiz qilish:
// faqat ruxsat etilgan teglar, atributlardan faqat xavfsiz href qoladi.
const ALLOWED = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'A', 'BLOCKQUOTE', 'SPAN', 'DIV', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SMALL', 'SUB', 'SUP'
])
const SAFE_HREF = /^(https?:|mailto:|tel:)/i

const clean = (node) => {
    for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.COMMENT_NODE) {
            child.remove()
            continue
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue
        if (!ALLOWED.has(child.tagName)) {
            // Xavfli teglar (script, style, iframe...) butunlay, qolganlari — ichidagi matn bilan almashtiriladi
            if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'SVG', 'MATH', 'FORM'].includes(child.tagName)) {
                child.remove()
            } else {
                clean(child)
                child.replaceWith(...child.childNodes)
            }
            continue
        }
        for (const attr of [...child.attributes]) {
            const keep = child.tagName === 'A' && attr.name === 'href' && SAFE_HREF.test(attr.value.trim())
            if (!keep) child.removeAttribute(attr.name)
        }
        if (child.tagName === 'A') {
            child.setAttribute('target', '_blank')
            child.setAttribute('rel', 'noopener noreferrer')
        }
        clean(child)
    }
}

export const sanitizeHtml = (html) => {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html')
    clean(doc.body)
    return doc.body.innerHTML
}

// Tashqi havola faqat https bo'lsa ochiladi (sozlamadan kelgan Telegram/aloqa havolalari)
export const safeUrl = (value) => {
    if (!value) return null
    const v = String(value).trim()
    if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`
    const withProto = /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, '')}`
    try {
        const url = new URL(withProto)
        return url.protocol === 'https:' ? url.href : null
    } catch {
        return null
    }
}
