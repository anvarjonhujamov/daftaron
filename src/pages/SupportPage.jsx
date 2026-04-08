import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, ChevronRight, Loader2, MessageCircle, Send, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportApi } from '../api/support.api'

const TELEGRAM_SUPPORT_URL = 'https://t.me/backend_php_dev'
const TELEGRAM_DISCUSSION_URL = 'https://t.me/+_Vv2x0u1HmE5Nzhi'

export default function SupportPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState('menu') // 'menu' or 'chat'
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        if (mode === 'chat') {
            loadHistory()
        }
    }, [mode])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const chatMessages = useMemo(() => {
        if (!Array.isArray(messages)) return []
        return messages.map((item, idx) => {
            const userText = item?.message || item?.question || item?.user_message || item?.prompt
            const botText = item?.reply || item?.answer || item?.assistant_message || item?.response
            if (!userText && !botText) return null
            return {
                id: item?.id || idx,
                userText,
                botText
            }
        }).filter(Boolean)
    }, [messages])

    const loadHistory = async () => {
        try {
            setLoadingHistory(true)
            const data = await supportApi.getHistory()
            const list = Array.isArray(data) ? data : (data?.data || data?.history || [])
            setMessages(Array.isArray(list) ? list : [])
        } catch (err) {
            console.error('Failed to load support history:', err)
            setMessages([])
        } finally {
            setLoadingHistory(false)
        }
    }

    const sendMessage = async () => {
        const text = message.trim()
        if (!text || sending) return

        setSending(true)
        const optimistic = { id: Date.now(), message: text, reply: null }
        setMessages((prev) => [...prev, optimistic])
        setMessage('')

        try {
            const response = await supportApi.sendMessage(text)
            const replyText =
                response?.reply ||
                response?.data?.reply ||
                response?.answer ||
                response?.message ||
                "Javob olinmadi. Keyinroq urinib ko'ring."

            setMessages((prev) => [
                ...prev.filter((m) => m.id !== optimistic.id),
                { id: optimistic.id, message: text, reply: replyText }
            ])
        } catch (err) {
            console.error('Failed to send support message:', err)
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
            toast.error(err.response?.data?.message || "AI ChatBotga yuborishda xatolik")
        } finally {
            setSending(false)
            // Refocus the input after send
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    const clearHistory = async () => {
        try {
            await supportApi.clearHistory()
            setMessages([])
            toast.success('Chat tarixi tozalandi')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tozalashda xatolik')
        }
    }

    const openLink = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    // ========== CHAT MODE ==========
    if (mode === 'chat') {
        return (
            <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
                {/* Chat Header */}
                <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
                    <button
                        onClick={() => setMode('menu')}
                        className="text-[15px] text-blue-500 font-semibold flex items-center gap-1"
                    >
                        <ArrowLeft size={18} />
                        Orqaga
                    </button>
                    <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
                        AI ChatBot
                    </h2>
                    <button
                        onClick={clearHistory}
                        className="text-[13px] text-red-500 font-medium flex items-center gap-1"
                    >
                        <Trash2 size={14} />
                        Tozalash
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingHistory ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-8">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                                <Bot size={28} className="text-indigo-500" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed">
                                AI ChatBotga savol yozing.
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-[13px] mt-1">
                                Masalan: "Qarz tarixini qanday ko'raman?"
                            </p>
                        </div>
                    ) : (
                        <>
                            {chatMessages.map((item) => (
                                <div key={item.id} className="space-y-2">
                                    {item.userText && (
                                        <div className="flex justify-end">
                                            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-500 text-white text-[14px] px-4 py-2.5 shadow-sm">
                                                {item.userText}
                                            </div>
                                        </div>
                                    )}
                                    {item.botText && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 text-[14px] text-gray-900 dark:text-gray-100 px-4 py-2.5">
                                                {item.botText}
                                            </div>
                                        </div>
                                    )}
                                    {!item.botText && item.userText && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center gap-2">
                                                <Loader2 size={14} className="animate-spin text-gray-400" />
                                                <span className="text-[13px] text-gray-400">Javob kutilmoqda...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Chat Input — pinned to bottom */}
                <div
                    className="shrink-0 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
                    style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
                >
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-full text-[16px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent focus:border-blue-400"
                            placeholder="Savolingizni yozing..."
                            autoComplete="off"
                            enterKeyHint="send"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={sending || !message.trim()}
                            className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-90 transition-transform shadow-lg shadow-blue-500/20"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ========== MENU MODE ==========
    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
                    Qo'llab-quvvatlash
                </h1>
            </div>

            {/* Info */}
            <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-6 px-1">
                Sizga qulay usulni tanlang
            </p>

            {/* Options */}
            <div className="space-y-3">
                <button
                    onClick={() => setMode('chat')}
                    className="w-full card flex items-center justify-between !p-4 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <Bot size={24} className="text-indigo-500" />
                        </div>
                        <div className="text-left">
                            <span className="text-[16px] font-semibold text-gray-900 dark:text-white block">
                                Tezkor AI ChatBot
                            </span>
                            <span className="text-[12px] text-gray-400">Tezkor javob oling</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                </button>

                <button
                    onClick={() => openLink(TELEGRAM_SUPPORT_URL)}
                    className="w-full card flex items-center justify-between !p-4 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                            <MessageCircle size={24} className="text-sky-500" />
                        </div>
                        <div className="text-left">
                            <span className="text-[16px] font-semibold text-gray-900 dark:text-white block">
                                Telegramdan yozish
                            </span>
                            <span className="text-[12px] text-gray-400">Operator bilan bog'laning</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                </button>

                <button
                    onClick={() => openLink(TELEGRAM_DISCUSSION_URL)}
                    className="w-full card flex items-center justify-between !p-4 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <Users size={24} className="text-emerald-500" />
                        </div>
                        <div className="text-left">
                            <span className="text-[16px] font-semibold text-gray-900 dark:text-white block">
                                Muhokama guruhi
                            </span>
                            <span className="text-[12px] text-gray-400">Foydalanuvchilar jamoasi</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                </button>
            </div>
        </div>
    )
}
