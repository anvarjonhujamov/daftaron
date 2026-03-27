import { ArrowLeft, Trash2, Mail, Clock, ShieldAlert, Database } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DeleteAccountPage() {
    const navigate = useNavigate()

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
        } else {
            const hasToken = localStorage.getItem('token')
            navigate(hasToken ? '/profile' : '/login')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 mb-6 text-blue-500 font-medium active:opacity-60 transition-opacity"
                >
                    <ArrowLeft size={18} />
                    <span className="text-[16px] font-semibold">Orqaga</span>
                </button>

                <div className="card dark:bg-gray-800 p-6 sm:p-8 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 dark:text-white">
                            Foydalanuvchi akkauntini o'chirish
                        </h1>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 text-[14px] mb-6 leading-relaxed">
                        Agar siz Daftaron ilovasidagi akkauntingizni o'chirmoqchi bo'lsangiz, quyidagi usuldan foydalanishingiz mumkin:
                    </p>

                    {/* Step 1 */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
                        <h2 className="text-[15px] font-bold text-gray-800 dark:text-white mb-3">
                            1. Qo'lda so'rov yuborish
                        </h2>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-2">
                            <Mail size={16} className="text-blue-500 flex-shrink-0" />
                            <div>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400">Email:</p>
                                <a
                                    href="mailto:muminovxurshidbek@gmail.com"
                                    className="text-[14px] font-medium text-blue-500"
                                >
                                    muminovxurshidbek@gmail.com
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <Mail size={16} className="text-gray-400 flex-shrink-0" />
                            <div>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400">Mavzu:</p>
                                <p className="text-[14px] font-medium text-gray-800 dark:text-white">
                                    Account deletion request
                                </p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-700 my-5" />

                    {/* Data deletion info */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                            <Database size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[14px] font-semibold text-red-700 dark:text-red-400 mb-1">
                                    Ma'lumotlarni o'chirish
                                </p>
                                <ul className="text-[13px] text-red-600 dark:text-red-400/80 space-y-1 list-disc pl-4">
                                    <li>Barcha shaxsiy ma'lumotlar o'chiriladi</li>
                                    <li>Qarzdorlik yozuvlari ham o'chiriladi</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                            <ShieldAlert size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[14px] font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                                    Saqlanishi mumkin
                                </p>
                                <p className="text-[13px] text-yellow-600 dark:text-yellow-400/80">
                                    Qonuniy talablar asosida ba'zi loglar vaqtincha saqlanishi mumkin
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                            <Clock size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[14px] font-semibold text-blue-700 dark:text-blue-400 mb-1">
                                    O'chirish muddati
                                </p>
                                <p className="text-[13px] text-blue-600 dark:text-blue-400/80">
                                    3–5 ish kuni ichida amalga oshiriladi
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
