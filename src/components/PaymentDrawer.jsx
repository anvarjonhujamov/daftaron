import { Drawer } from 'vaul'
import { useState } from 'react'
import { X } from 'lucide-react'
import { formatCurrency, parseCurrency } from '../utils/format'
import { buildClickUrl } from '../utils/click'
import toast from 'react-hot-toast'

export default function PaymentDrawer({ isOpen, onClose, user, provider }) {
    const [amount, setAmount] = useState('')

    const handleTopUp = () => {
        if (provider !== 'click') {
            toast.error("Hozircha faqat Click orqali to'lov qabul qilinadi")
            return
        }

        const amountNumber = parseCurrency(amount)
        if (!amountNumber || isNaN(amountNumber) || amountNumber <= 0) {
            toast.error("Iltimos, to'g'ri summa kiriting.")
            return
        }
        try {
            const url = buildClickUrl(user, amountNumber)
            window.location.href = url
        } catch (err) {
            toast.error(err.message || "Xatolik yuz berdi")
        }
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} repositionInputs={false}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                <Drawer.Content className="fixed bg-white dark:bg-gray-900 bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl z-50 animate-in slide-in-from-bottom flex flex-col">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 my-4" />
                    <div className="max-w-md w-full mx-auto px-4 pb-8 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                                {provider} orqali to'ldirish
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Summani kiriting (so'm)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="input text-lg font-semibold"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '')
                                        setAmount(formatCurrency(clean))
                                    }}
                                />
                            </div>

                            <button
                                onClick={handleTopUp}
                                className={`w-full py-4 rounded-xl flex items-center justify-center font-bold text-[15px] transition-transform active:scale-95 ${amount ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                                    }`}
                                disabled={!amount}
                            >
                                To'lovga o'tish
                            </button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
