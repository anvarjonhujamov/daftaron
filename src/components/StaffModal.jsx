import { Drawer } from 'vaul'
import { useState, useEffect } from 'react'
import { X, User, Phone, Lock, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StaffModal({ isOpen, onClose, onSave, staff }) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const phonePrefix = '+998'

    const normalizePhoneDigits = (value) => {
        let digits = String(value || '').replace(/\D/g, '')
        if (digits.startsWith('998')) digits = digits.substring(3)
        return digits.substring(0, 9)
    }

    useEffect(() => {
        if (staff) {
            setName(staff.name || '')
            setPhone(normalizePhoneDigits(staff.phone))
            setPassword('')
        } else {
            setName('')
            setPhone('')
            setPassword('')
        }
    }, [staff, isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error("Ism kiritishi shart")
            return
        }
        if (phone.length < 9) {
            toast.error("Telefon raqami noto'g'ri")
            return
        }
        if (!staff && password.length < 6) {
            toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
            return
        }

        setSubmitting(true)
        try {
            // Backend +998901234567 formatida kutadi
            const fullPhone = `+998${phone}`
            const payload = { name, phone: fullPhone }
            if (password && password.length >= 6) payload.password = password
            await onSave(payload)
            onClose()
        } catch (err) {
            // Error handling will be done by the parent
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} repositionInputs={true}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                <Drawer.Content className="fixed bg-white dark:bg-gray-900 bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[32px] z-50 animate-in slide-in-from-bottom flex flex-col focus:outline-none">
                    <Drawer.Title className="sr-only">
                        {staff ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}
                    </Drawer.Title>
                    <Drawer.Description className="sr-only">
                        {staff ? "Xodim ma'lumotlarini yangilang" : "Yangi xodim ma'lumotlarini kiriting va parol belgilang"}
                    </Drawer.Description>
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 my-4" />
                    
                    <div className="max-w-md w-full mx-auto px-6 pb-10 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {staff ? "Xodimni tahrirlash" : "Yangi xodim"}
                                </h2>
                                <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
                                    {staff ? "Xodim ma'lumotlarini o'zgartirish" : "Yangi xodim ma'lumotlarini kiriting"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        F.I.SH.
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder="Masalan: Anvarjon Hujamov"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Phone Input */}
                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Telefon raqami
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder="+998 90 123 45 67"
                                            value={`${phonePrefix}${phone}`}
                                            onChange={(e) => {
                                                setPhone(normalizePhoneDigits(e.target.value))
                                            }}
                                        />
                                        {phone.length === 9 && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in">
                                                <Check size={18} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 ml-1">
                                        Xodim ushbu raqam orqali tizimga kira oladi.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        {staff ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder={staff ? "Parolni saqlamoqchi bo'lsangiz kiriting" : "Kamida 6 ta belgi"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 ml-1">
                                        {staff
                                            ? "Tahrirlashda parolni kiritmasangiz eski parol saqlanadi. Yangi parol kamida 6 ta belgi."
                                            : "Xodim tizimga kirishda shu paroldan foydalanadi."
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !name.trim() || phone.length < 9 || (password.length > 0 && password.length < 6)}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center font-bold text-[16px] transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 ${
                                        submitting || !name.trim() || phone.length < 9 || (password.length > 0 && password.length < 6)
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {submitting ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        staff ? "O'zgarishlarni saqlash" : "Xodimni qo'shish"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
