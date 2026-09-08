import { Drawer } from 'vaul'
import { useState, useEffect } from 'react'
import { X, Building2, Phone, User, MapPin, FileText, Hash, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SupplierModal({ isOpen, onClose, onSave, supplier }) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [contactPerson, setContactPerson] = useState('')
    const [address, setAddress] = useState('')
    const [inn, setInn] = useState('')
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const phonePrefix = '+998'

    const normalizePhoneDigits = (value) => {
        let digits = String(value || '').replace(/\D/g, '')
        if (digits.startsWith('998')) digits = digits.substring(3)
        return digits.substring(0, 9)
    }

    useEffect(() => {
        if (supplier) {
            setName(supplier.name || '')
            setPhone(normalizePhoneDigits(supplier.phone))
            setContactPerson(supplier.contact_person || supplier.contactName || '')
            setAddress(supplier.address || '')
            setInn(supplier.inn || supplier.stir || '')
            setNote(supplier.note || '')
        } else {
            setName('')
            setPhone('')
            setContactPerson('')
            setAddress('')
            setInn('')
            setNote('')
        }
    }, [supplier, isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error("Tashkilot nomi kiritishi shart")
            return
        }
        if (phone.length > 0 && phone.length < 9) {
            toast.error("Telefon raqami noto'g'ri")
            return
        }

        setSubmitting(true)
        try {
            const fullPhone = phone.length === 9 ? `+998${phone}` : (supplier?.phone || null)
            const payload = {
                name: name.trim(),
                phone: fullPhone,
                contact_person: contactPerson.trim() || null,
                address: address.trim() || null,
                inn: inn.trim() || null,
                note: note.trim() || null
            }
            await onSave(payload)
            onClose()
        } catch (err) {
            // Error handled by parent
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} repositionInputs={true}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                <Drawer.Content className="fixed bg-white dark:bg-gray-900 bottom-0 left-0 right-0 max-h-[92vh] rounded-t-[32px] z-50 animate-in slide-in-from-bottom flex flex-col focus:outline-none">
                    <Drawer.Title className="sr-only">
                        {supplier ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi qo'shish"}
                    </Drawer.Title>
                    <Drawer.Description className="sr-only">
                        {supplier ? "Ta'minotchi ma'lumotlarini yangilang" : "Yangi ta'minotchi (hamkor) ma'lumotlarini kiriting"}
                    </Drawer.Description>
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 my-4" />
                    
                    <div className="max-w-md w-full mx-auto px-6 pb-10 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {supplier ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"}
                                </h2>
                                <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
                                    {supplier ? "Hamkor ma'lumotlarini o'zgartirish" : "Yangi hamkor (ta'minotchi) ma'lumotlarini kiriting"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Tashkilot nomi *
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <Building2 size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder="Masalan: Optom Uz MCHJ"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Telefon raqami
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder="+998 90 123 45 67"
                                            value={`${phonePrefix}${phone}`}
                                            onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
                                        />
                                        {phone.length === 9 && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in">
                                                <Check size={18} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 ml-1">
                                        Qo'ng'iroq qilish uchun asosiy raqam.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Mas'ul shaxs
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder="Masalan: Azizbek"
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Manzil
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <MapPin size={18} />
                                        </div>
                                        <textarea
                                            rows={2}
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all resize-none"
                                            placeholder="Toshkent sh., Chilonzor tumani..."
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        INN / STIR
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <Hash size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                                            placeholder="Masalan: 30987654321"
                                            value={inn}
                                            onChange={(e) => setInn(e.target.value.replace(/\D/g, '').substring(0, 14))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Izoh
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-4 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                            <FileText size={18} />
                                        </div>
                                        <textarea
                                            rows={2}
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all resize-none"
                                            placeholder="Qo'shimcha ma'lumotlar..."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !name.trim() || (phone.length > 0 && phone.length < 9)}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center font-bold text-[16px] transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 ${
                                        submitting || !name.trim() || (phone.length > 0 && phone.length < 9)
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
                                    }`}
                                >
                                    {submitting ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        supplier ? "O'zgarishlarni saqlash" : "Ta'minotchini qo'shish"
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
