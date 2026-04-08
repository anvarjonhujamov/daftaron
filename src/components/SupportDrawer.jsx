import { useEffect, useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { Bot, ChevronRight, Loader2, MessageCircle, Send, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportApi } from '../api/support.api'

const TELEGRAM_SUPPORT_URL = 'https://t.me/backend_php_dev'
const TELEGRAM_DISCUSSION_URL = 'https://t.me/+_Vv2x0u1HmE5Nzhi'

export default function SupportDrawer({ isOpen, onClose }) {
    const [mode, setMode] = useState('menu')
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])

    useEffect(() => {
        if (!isOpen) {
            setMode('menu')
            setMessage('')
            return
        }
        if (mode === 'chat') {
            loadHistory()
        }
    }, [isOpen, mode])

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
        }
    }

    const openLink = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer')
        onClose()
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={onClose} shouldScaleBackground={false}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
                <Drawer.Content
                    className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 z-[70] outline-none ${
                        mode === 'chat' ? 'top-0 rounded-none' : 'rounded-t-[32px]'
                    }`}
                >
                    {mode === 'menu' ? (
                        <div className="p-4 pt-2">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />

                            <div className="flex items-center justify-between mb-5 px-2">
                                <div>
                                    <h2 className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Qo'llab-quvvatlash
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-[14px]">
                                        Sizga qulay usulni tanlang
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-90 transition-transform"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-3 pb-5">
                                <button
                                    onClick={() => setMode('chat')}
                                    className="w-full flex items-center justify-between p-4 rounded-[20px] border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-[14px] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                            <Bot size={22} className="text-indigo-500" />
                                        </div>
                                        <span className="text-[16px] font-semibold text-gray-900 dark:text-white">
                                            Tezkor AI ChatBot
                                        </span>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400" />
                                </button>

                                <button
                                    onClick={() => openLink(TELEGRAM_SUPPORT_URL)}
                                    className="w-full flex items-center justify-between p-4 rounded-[20px] border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-[14px] bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                                            <MessageCircle size={22} className="text-sky-500" />
                                        </div>
                                        <span className="text-[16px] font-semibold text-gray-900 dark:text-white">
                                            Telegramdan yozish
                                        </span>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400" />
                                </button>

                                <button
                                    onClick={() => openLink(TELEGRAM_DISCUSSION_URL)}
                                    className="w-full flex items-center justify-between p-4 rounded-[20px] border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-[14px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                            <Users size={22} className="text-emerald-500" />
                                        </div>
                                        <span className="text-[16px] font-semibold text-gray-900 dark:text-white">
                                            Muhokama guruhi
                                        </span>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-[100dvh]">
                            {/* Chat Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
                                <button
                                    onClick={() => setMode('menu')}
                                    className="text-[15px] text-blue-500 font-semibold"
                                >
                                    ← Orqaga
                                </button>
                                <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
                                    AI ChatBot
                                </h2>
                                <button
                                    onClick={async () => {
                                        try {
                                            await supportApi.clearHistory()
                                            setMessages([])
                                            toast.success('Chat tarixi tozalandi')
                                        } catch (err) {
                                            toast.error(err.response?.data?.message || 'Tozalashda xatolik')
                                        }
                                    }}
                                    className="text-[13px] text-red-500 font-medium"
                                >
                                    Tozalash
                                </button>
                            </div>

                            {/* Chat Messages - scrollable area fills remaining space */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loadingHistory ? (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <Loader2 size={20} className="animate-spin" />
                                    </div>
                                ) : chatMessages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400 text-[14px] px-4">
                                        AI ChatBotga savol yozing. Masalan: "Qarz tarixini qanday ko'raman?"
                                    </div>
                                ) : (
                                    chatMessages.map((item) => (
                                        <div key={item.id} className="space-y-2">
                                            {item.userText && (
                                                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue-500 text-white text-[14px] px-4 py-2.5">
                                                    {item.userText}
                                                </div>
                                            )}
                                            {item.botText && (
                                                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 dark:bg-gray-700 text-[14px] text-gray-900 dark:text-gray-100 px-4 py-2.5">
                                                    {item.botText}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Chat Input - fixed at bottom, above keyboard */}
                            <div className="shrink-0 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 pb-safe">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                sendMessage()
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-full text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Savolingizni yozing..."
                                    />
                                    <button
                                        type="button"
                                        onClick={sendMessage}
                                        disabled={sending || !message.trim()}
                                        className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 active:scale-90 transition-transform"
                                    >
                                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
