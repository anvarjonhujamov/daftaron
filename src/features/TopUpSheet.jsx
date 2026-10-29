import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Sheet } from '../ui/Sheet'
import { Button, Chips, MoneyInput } from '../ui/controls'
import { buildClickUrl } from '../utils/click'
import { buildPaymeUrl } from '../utils/payme'
import { formatNumber } from '../utils/format'

// To'lov tizimlari: Click va Payme ishlaydi; Xazna, Uzum — shartnoma tuzilguncha «tez orada» (TZ 28.15)
export const PROVIDERS = [
    { value: 'click', label: 'Click', icon: '/icons/click.png' },
    { value: 'payme', label: 'Payme', icon: '/icons/payme.png' },
    { value: 'xazna', label: 'Xazna', icon: '/icons/xazna.png', disabled: true },
    { value: 'uzum', label: 'Uzum', icon: '/icons/uzumbank.png', disabled: true }
]

export function ProviderButtons({ onSelect, className }) {
    return (
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${className || ''}`}>
            {PROVIDERS.map((p) => (
                <button key={p.value} type="button" disabled={p.disabled} onClick={() => onSelect(p.value)} aria-label={p.disabled ? `${p.label} — tez orada` : p.label}
                    className="relative flex h-14 items-center justify-center rounded-xl border-[1.5px] border-line bg-white px-3 transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-40">
                    <img src={p.icon} alt="" className="max-h-7 max-w-[70%] object-contain" />
                    {p.disabled && <span className="absolute -top-2 right-1 rounded bg-soft px-1 text-[10px] font-bold text-ink-2">tez orada</span>}
                </button>
            ))}
        </div>
    )
}

// Balansni to'ldirish: Click/Payme sahifasiga o'tadi (summa so'mda)
export default function TopUpSheet({ open, onClose, user, provider: initial = 'click', suggested }) {
    const [provider, setProvider] = useState(initial)
    const [amount, setAmount] = useState(0)
    useEffect(() => { if (open) { setProvider(initial === 'payme' ? 'payme' : 'click'); setAmount(suggested > 0 ? Math.ceil(suggested / 1000) * 1000 : 0) } }, [open, initial, suggested])

    const go = () => {
        if (!(amount >= 1000)) return toast.error("Kamida 1 000 so'm")
        try {
            window.location.href = provider === 'payme' ? buildPaymeUrl(user, amount) : buildClickUrl(user, amount)
        } catch (err) {
            toast.error(err.message)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Balansni to'ldirish" width={480} onSubmit={go}
            footer={<Button type="submit" size="lg" block disabled={!(amount >= 1000)}>{provider === 'payme' ? 'Payme' : 'Click'} orqali to'lash</Button>}>
            <div className="space-y-4">
                <Chips ariaLabel="To'lov tizimi" value={provider} onChange={setProvider} options={PROVIDERS.filter((p) => !p.disabled)} />
                <MoneyInput label="Summa" value={amount} onChange={setAmount} autoFocus big />
                <div className="flex flex-wrap gap-2">
                    {[30000, 50000, 100000, 200000].map((v) => <Button key={v} size="sm" variant="soft" onClick={() => setAmount(v)}>+{formatNumber(v)}</Button>)}
                </div>
                <p className="text-[13px] text-ink-2">To'lovdan keyin balans bir necha daqiqada yangilanadi.</p>
            </div>
        </Sheet>
    )
}
