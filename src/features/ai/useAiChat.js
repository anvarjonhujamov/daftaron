import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AI_MAX_LENGTH, AiChatError, aiApi, aiLocale, streamChat } from '../../api/ai.api'
import { readCache, writeCache } from '../../lib/cache'
import { errorMessage } from '../../lib/errors'
import { t } from '../../i18n'

// Yordamchi suhbati holati. Panel yopilsa ham, sahifa almashsa ham saqlanadi (komponent Layout'da turadi);
// joriy suhbat raqami keshda (foydalanuvchi+do'kon bo'yicha) — sahifa qayta yuklansa tarix serverdan tiklanadi.
//
// Xabar: { key, id (server), role: user|assistant, text, status, feedback, error, retryable, lookingUp }
// assistant status: waiting (birinchi bo'lak kutilmoqda) → streaming → done | error | stopped

const CONV_KEY = 'ai_conversation'
let seq = 0
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

const fromServer = (m) => ({
    key: `s${m.id}`,
    id: m.id,
    role: m.role === 'user' ? 'user' : 'assistant',
    text: m.text || '',
    feedback: m.feedback || null,
    status: 'done'
})

export function useAiChat() {
    const saved = readCache(CONV_KEY)
    const [messages, setMessages] = useState([])
    const [conversationId, setConversationId] = useState(saved?.id || null)
    const [title, setTitle] = useState(saved?.title || null)
    const [draft, setDraft] = useState('')
    const [busy, setBusy] = useState(false)
    const [loading, setLoading] = useState(false)
    // { enabled, limit, used, left, resets_at } — GET /ai/usage va done.usage_left
    const [usage, setUsage] = useState(null)
    // Yozish yopiq: { type: 'limit' } (429 ai_daily_limit) | { type: 'disabled' } (503 ai_disabled)
    const [blocked, setBlocked] = useState(null)

    const abortRef = useRef(null)
    const convRef = useRef(conversationId)
    const messagesRef = useRef(messages)
    messagesRef.current = messages
    const restoredRef = useRef(false)
    const refreshUsageRef = useRef(null)

    useEffect(() => {
        writeCache(CONV_KEY, conversationId ? { id: conversationId, title } : null)
    }, [conversationId, title])

    // Komponent o'chsa (chiqish, do'kon almashishi) oqim to'xtatiladi
    useEffect(() => () => abortRef.current?.abort(), [])

    const setConversation = useCallback((id, nextTitle) => {
        convRef.current = id || null
        setConversationId(id || null)
        if (!id) setTitle(null)
        else if (nextTitle !== undefined) setTitle(nextTitle || null)
    }, [])

    const update = useCallback((key, patch) => {
        setMessages((list) => list.map((m) => (m.key === key ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)))
    }, [])

    // Savol umuman qabul qilinmadi (limit, yordamchi o'chiq): xabarlar olib tashlanadi, matn kiritish maydoniga qaytadi
    const dropPending = useCallback((user, botKey) => {
        setMessages((list) => list.filter((m) => m.key !== user.key && m.key !== botKey))
        setDraft((d) => d || user.text)
    }, [])

    const run = useCallback(async (user, botKey, context, allowRestart = true) => {
        const controller = new AbortController()
        abortRef.current = controller
        setBusy(true)
        try {
            await streamChat({
                conversationId: convRef.current,
                message: user.text,
                locale: aiLocale(),
                context,
                signal: controller.signal,
                onEvent: ({ event, data }) => {
                    if (event === 'start') {
                        if (data?.conversation_id) setConversation(data.conversation_id)
                        if (data?.user_message_id) update(user.key, { id: data.user_message_id })
                    } else if (event === 'status') {
                        update(botKey, { lookingUp: data?.state === 'looking_up' })
                    } else if (event === 'delta') {
                        if (typeof data?.text === 'string') update(botKey, (m) => ({ text: m.text + data.text, status: 'streaming', lookingUp: false }))
                    } else if (event === 'done') {
                        update(botKey, (m) => ({ id: data?.message_id ?? null, status: m.text ? 'done' : 'error', error: m.text ? null : t("Yordamchi javob bera olmadi. Qayta urinib ko'ring."), retryable: !m.text, lookingUp: false }))
                        if (data?.conversation_id) setConversation(data.conversation_id, data.title)
                        if (Number.isFinite(data?.usage_left)) setUsage((u) => ({ ...(u || {}), left: data.usage_left }))
                    } else if (event === 'error') {
                        update(botKey, {
                            status: 'error',
                            error: data?.message || t("Yordamchi javob bera olmadi. Qayta urinib ko'ring."),
                            retryable: true,
                            lookingUp: false
                        })
                    }
                }
            })
        } catch (err) {
            if (err?.name === 'AbortError') {
                update(botKey, { status: 'stopped', lookingUp: false })
            } else if (err instanceof AiChatError && err.network) {
                update(botKey, {
                    status: 'error',
                    error: navigator.onLine === false ? t("Internet yo'q. Ulanishni tekshiring.") : t("Aloqa uzildi. Javob to'liq kelmadi."),
                    retryable: true,
                    network: true,
                    lookingUp: false
                })
            } else if (err instanceof AiChatError) {
                const { status, reason, body } = err
                if (status === 429 && reason === 'ai_daily_limit') {
                    setUsage((u) => ({ ...(u || {}), left: 0, limit: body?.limit ?? u?.limit, resets_at: body?.resets_at ?? u?.resets_at }))
                    setBlocked({ type: 'limit' })
                    dropPending(user, botKey)
                } else if (status === 503 && reason === 'ai_disabled') {
                    setBlocked({ type: 'disabled' })
                    dropPending(user, botKey)
                } else if (status === 404 && convRef.current && allowRestart) {
                    // Suhbat o'chirilgan (boshqa qurilmada): shu savol bilan yangi suhbat
                    setConversation(null)
                    run(user, botKey, context, false)
                } else if (status === 404) {
                    // /ai/chat yo'q — backend hali yangilanmagan
                    setBlocked({ type: 'disabled' })
                    dropPending(user, botKey)
                } else {
                    update(botKey, {
                        status: 'error',
                        error: err.message || errorMessage({ response: { status, data: body || {} } }),
                        retryable: status !== 422 && status !== 403,
                        lookingUp: false
                    })
                }
            } else {
                update(botKey, { status: 'error', error: t("Xatolik yuz berdi. Qayta urinib ko'ring."), retryable: true, lookingUp: false })
            }
        } finally {
            if (abortRef.current === controller) {
                abortRef.current = null
                setBusy(false)
            }
        }
    }, [setConversation, update, dropPending])

    // value — yuboriladigan matn (tezkor savol); berilmasa kiritish maydonidagi matn
    const send = useCallback((value, context) => {
        const fromDraft = value === undefined
        const text = String(fromDraft ? draft : value).trim().slice(0, AI_MAX_LENGTH)
        if (!text || abortRef.current || blocked) return false
        const user = { key: uid(), role: 'user', text }
        const bot = { key: uid(), role: 'assistant', text: '', status: 'waiting' }
        setMessages((list) => [...list, user, bot])
        if (fromDraft) setDraft('')
        run(user, bot.key, context)
        return true
    }, [draft, blocked, run])

    const retry = useCallback(async (botKey, context) => {
        if (abortRef.current || blocked) return
        const list = messagesRef.current
        const i = list.findIndex((m) => m.key === botKey)
        const user = list.slice(0, i).reverse().find((m) => m.role === 'user')
        if (i === -1 || !user) return
        const failed = list[i]
        update(botKey, { text: '', status: 'waiting', error: null, retryable: false, network: false, id: null, feedback: null })
        // Oqim uzilgan, lekin savol serverga yetgan (start kelgan): server javobni baribir oxirigacha yozib saqlaydi.
        // Avval suhbatdan qidiramiz — bor bo'lsa qayta so'ramaymiz (takror xabar va limit sarfi bo'lmaydi)
        if (failed.network && user.id && convRef.current) {
            const probe = new AbortController()
            abortRef.current = probe
            setBusy(true)
            let answer = null
            try {
                const r = await aiApi.conversation(convRef.current)
                const msgs = r?.messages || []
                const at = msgs.findIndex((m) => m.id === user.id)
                answer = at === -1 ? null : msgs.slice(at + 1).find((m) => m.role === 'assistant' && m.text) || null
            } catch { /* topilmadi — qayta yuboramiz */ }
            if (abortRef.current === probe) {
                abortRef.current = null
                setBusy(false)
            }
            // Tekshiruv paytida «To'xtatish» yoki boshqa suhbat ochilgan
            if (probe.signal.aborted) {
                update(botKey, { status: 'error', error: failed.error, retryable: true, network: true })
                return
            }
            if (answer) {
                update(botKey, { ...fromServer(answer), key: botKey })
                refreshUsageRef.current?.()
                return
            }
        }
        run(user, botKey, context)
    }, [blocked, run, update])

    const stop = useCallback(() => abortRef.current?.abort(), [])

    const newChat = useCallback(() => {
        abortRef.current?.abort()
        restoredRef.current = true
        setMessages([])
        setConversation(null)
    }, [setConversation])

    const openConversation = useCallback(async (id, { silent } = {}) => {
        abortRef.current?.abort()
        restoredRef.current = true
        setLoading(true)
        try {
            const r = await aiApi.conversation(id)
            setMessages((r?.messages || []).map(fromServer))
            setConversation(r?.conversation?.id || id, r?.conversation?.title ?? null)
            return true
        } catch (err) {
            if (err?.response?.status === 404) setConversation(null)
            if (!silent) toast.error(errorMessage(err))
            return false
        } finally {
            setLoading(false)
        }
    }, [setConversation])

    // Panel birinchi ochilganda: oldingi suhbat (sahifa qayta yuklangan bo'lsa) serverdan tiklanadi
    const restore = useCallback(() => {
        if (restoredRef.current) return
        restoredRef.current = true
        if (convRef.current && !messagesRef.current.length) openConversation(convRef.current, { silent: true })
    }, [openConversation])

    const refreshUsage = useCallback(() => {
        aiApi.usage()
            .then((u) => {
                setUsage(u || null)
                if (u?.enabled === false) setBlocked({ type: 'disabled' })
                else if (u && u.left === 0) setBlocked({ type: 'limit' })
                else setBlocked(null)
            })
            .catch((err) => {
                const status = err?.response?.status
                if (status === 404) setBlocked({ type: 'disabled' })
                else if (status === 503 && err.response.data?.reason === 'ai_disabled') setBlocked({ type: 'disabled' })
            })
    }, [])

    refreshUsageRef.current = refreshUsage

    const feedback = useCallback((message, rating) => {
        if (!message.id || message.feedback === rating) return
        const prev = message.feedback || null
        update(message.key, { feedback: rating })
        aiApi.feedback(message.id, rating).catch((err) => {
            update(message.key, { feedback: prev })
            toast.error(errorMessage(err))
        })
    }, [update])

    const forget = useCallback((id) => {
        if (id === convRef.current) newChat()
    }, [newChat])

    return {
        messages, conversationId, title, draft, setDraft, busy, loading, usage, blocked,
        send, retry, stop, newChat, openConversation, restore, refreshUsage, feedback, forget
    }
}
