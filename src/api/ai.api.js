import api, { API_URL, TRIAL_EXPIRED_EVENT, data } from './client'
import { clearLocalData, getToken, getUser } from '../lib/session'
import { getLang } from '../i18n'

// AI yordamchi (backend /api/v1/ai/*). Javob oqimi — POST /ai/chat, SSE (text/event-stream).
// POST bo'lgani uchun EventSource emas: fetch + ReadableStream bilan o'qiladi.

// Ilova tili → backend locale: uz | uz_Cyrl | ru
const LOCALES = { uz_latn: 'uz', uz_cyrl: 'uz_Cyrl', ru: 'ru' }
export const aiLocale = (lang = getLang()) => LOCALES[lang] || 'uz'

export const AI_MAX_LENGTH = 2000

export const aiApi = {
    // { enabled, plan, limit, used, left, resets_at }
    usage: () => data(api.get('/ai/usage')),
    // { data: [{ id, title, locale, created_at, updated_at }], meta } — eng yangisi birinchi
    conversations: (page = 1, perPage = 20) => data(api.get('/ai/conversations', { params: { page, per_page: perPage } })),
    // { conversation, messages: [{ id, role, text, feedback, created_at }] }
    conversation: (id) => data(api.get(`/ai/conversations/${id}`)),
    deleteConversation: (id) => data(api.delete(`/ai/conversations/${id}`)),
    // rating: up | down (qayta yuborilsa yangilanadi)
    feedback: (messageId, rating) => data(api.post(`/ai/messages/${messageId}/feedback`, { rating }))
}

// Oqim xatosi. network — aloqa uzildi (javob kelmadi yoki oqim done/error'siz tugadi);
// status/reason — oqim boshlanishidan oldingi JSON xato (429 ai_daily_limit, 503 ai_disabled ...)
export class AiChatError extends Error {
    constructor(message, { status = 0, reason = null, body = null, network = false } = {}) {
        super(message || '')
        this.name = 'AiChatError'
        this.status = status
        this.reason = reason
        this.body = body
        this.network = network
    }
}

// Bitta SSE bloki: "event: delta\ndata: {...}". data qatorlari \n bilan qo'shiladi, izoh (":") e'tiborsiz
const parseBlock = (block) => {
    let event = 'message'
    const lines = []
    for (const line of block.split('\n')) {
        if (!line || line.startsWith(':')) continue
        const i = line.indexOf(':')
        const field = i === -1 ? line : line.slice(0, i)
        const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '')
        if (field === 'event') event = value
        else if (field === 'data') lines.push(value)
    }
    if (!lines.length) return null
    try {
        return { event, data: JSON.parse(lines.join('\n')) }
    } catch {
        return null
    }
}

// So'rov va javob oqimi. onEvent({ event, data }) — start, status, delta, done, error (noma'lumlari ham keladi).
// Oqim done yoki error bilan tugamasa — AiChatError({ network: true }). To'xtatilsa — AbortError.
export async function streamChat({ conversationId, message, locale = aiLocale(), context, signal, onEvent }) {
    const headers = {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        // client.js bilan bir xil: backend xabarlari shu tilda (uz_latn | uz_cyrl | ru)
        'X-Locale': getLang()
    }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const tenantId = getUser()?.tenant_id
    if (tenantId) headers['X-Tenant-Id'] = String(tenantId)

    let res
    try {
        res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ conversation_id: conversationId || null, message, locale, context }),
            signal,
            cache: 'no-store'
        })
    } catch (err) {
        if (err?.name === 'AbortError') throw err
        throw new AiChatError('', { network: true })
    }

    if (!res.ok) {
        let body = null
        try { body = await res.json() } catch { /* JSON emas */ }
        // client.js interceptor'i bilan bir xil: token eskirgan / sinov tugagan
        if (res.status === 401 && getToken()) {
            clearLocalData()
            if (!window.location.pathname.startsWith('/login')) window.location.replace('/login')
        }
        if (res.status === 403 && body?.reason === 'trial_expired') window.dispatchEvent(new Event(TRIAL_EXPIRED_EVENT))
        const first = body?.errors && Object.values(body.errors).flat()[0]
        throw new AiChatError(first || body?.message || '', { status: res.status, reason: body?.reason || null, body })
    }

    if (!res.body) throw new AiChatError('', { network: true })
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false

    const flush = (final) => {
        // \r\n va \r — \n ga. Chunk oxiridagi \r keyingi chunk'dagi \n bilan juft bo'lishi mumkin — qoldiramiz
        buffer = buffer.replace(/\r\n/g, '\n')
        const tail = !final && buffer.endsWith('\r') ? '\r' : ''
        buffer = (tail ? buffer.slice(0, -1) : buffer).replace(/\r/g, '\n') + tail
        let i
        while ((i = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, i)
            buffer = buffer.slice(i + 2)
            const evt = parseBlock(block)
            if (!evt) continue
            if (evt.event === 'done' || evt.event === 'error') finished = true
            onEvent?.(evt)
            if (finished) return
        }
        if (final && buffer.trim()) {
            const evt = parseBlock(buffer)
            buffer = ''
            if (evt) {
                if (evt.event === 'done' || evt.event === 'error') finished = true
                onEvent?.(evt)
            }
        }
    }

    try {
        while (!finished) {
            const { value, done } = await reader.read()
            if (done) {
                buffer += decoder.decode()
                flush(true)
                break
            }
            buffer += decoder.decode(value, { stream: true })
            flush(false)
        }
    } catch (err) {
        if (err?.name === 'AbortError') throw err
        if (!finished) throw new AiChatError('', { network: true })
    } finally {
        if (finished) reader.cancel().catch(() => {})
    }
    if (!finished) throw new AiChatError('', { network: true })
}
