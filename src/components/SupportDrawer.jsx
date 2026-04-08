import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Drawer } from 'vaul'
import { Bot, ChevronRight, MessageCircle, Users, X } from 'lucide-react'

const TELEGRAM_SUPPORT_URL = 'https://t.me/backend_php_dev'
const TELEGRAM_DISCUSSION_URL = 'https://t.me/+_Vv2x0u1HmE5Nzhi'

export default function SupportDrawer({ isOpen, onClose }) {
    const navigate = useNavigate()

    const openLink = (url) => {
        window.open(url, '_blank', 'noopener,noreferrer')
        onClose()
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={onClose} shouldScaleBackground={false}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 z-[70] outline-none rounded-t-[32px]">
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
                            {/* AI ChatBot — navigates to /support page */}
                            <button
                                onClick={() => {
                                    onClose()
                                    setTimeout(() => navigate('/support'), 150)
                                }}
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

                            {/* Telegram support */}
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

                            {/* Discussion group */}
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
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
