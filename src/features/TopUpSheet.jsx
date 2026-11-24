import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Sheet } from '../ui/Sheet'
import { Button, Chips, MoneyInput } from '../ui/controls'
import { subscriptionApi } from '../api/subscription.api'
import { errorMessage } from '../lib/errors'
import { buildClickUrl } from '../utils/click'
import { buildPaymeUrl } from '../utils/payme'
import { formatNumber } from '../utils/format'
import { t } from '../i18n'

// To'lov tizimlari: Click, Payme ishlaydi; Uzum — shartnoma tuzilguncha «tez orada» (TZ 28.15)
// backendLink: havolani backend beradi va admin yoqmaguncha ko'rinmaydi (status.top_up_providers, TZ 13.8)
export const PROVIDERS = [
    { value: 'click', label: 'Click', icon: '/icons/click.png' },
    { value: 'payme', label: 'Payme', icon: '/icons/payme.png' },
    { value: 'xazna', label: 'Xazna', icon: '/icons/xazna.png', backendLink: true },
    { value: 'paynet', label: 'Paynet', backendLink: true },
    { value: 'uzum', label: 'Uzum', icon: '/icons/uzumbank.png', disabled: true }
]

const visibleProviders = (enabled) => PROVIDERS.filter((p) => !p.backendLink || enabled?.includes(p.value))

export function ProviderButtons({ onSelect, className, enabled }) {
    return (
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${className || ''}`}>
            {visibleProviders(enabled).map((p) => (
                <button key={p.value} type="button" disabled={p.disabled} onClick={() => onSelect(p.value)} aria-label={p.disabled ? `${p.label} — ${t('tez orada')}` : p.label}
                    className="relative flex h-14 items-center justify-center rounded-xl border-[1.5px] border-line bg-white px-3 transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-40">
                    {p.icon ? <img src={p.icon} alt="" className="max-h-7 max-w-[70%] object-contain" /> : <span className="text-[15px] font-bold text-ink">{p.label}</span>}
                    {p.disabled && <span className="absolute -top-2 right-1 rounded bg-soft px-1 text-[10px] font-bold text-ink-2">{t('tez orada')}</span>}
                </button>
            ))}
        </div>
    )
}

// Balansni to'ldirish: to'lov tizimi sahifasiga o'tadi (summa so'mda).
// Click/Payme havolasi shu yerda yasaladi, Xazna va Paynet'ga noyob invoys kerak — havolani backend beradi (TZ 13.6, 13.7)
export default function TopUpSheet({ open, onClose, user, provider: initial = 'click', suggested, enabled }) {
    const [provider, setProvider] = useState(initial)
    const [amount, setAmount] = useState(0)
    const [busy, setBusy] = useState(false)
    const providerLabel = PROVIDERS.find((p) => p.value === provider)?.label
    const selectable = visibleProviders(enabled).filter((p) => !p.disabled)
    useEffect(() => { if (open) { setProvider(selectable.some((p) => p.value === initial) ? initial : 'click'); setAmount(suggested > 0 ? Math.ceil(suggested / 1000) * 1000 : 0) } }, [open, initial, suggested])

    const go = async () => {
        if (!(amount >= 1000)) return toast.error(t("Kamida 1 000 so'm"))
        if (busy) return
        if (PROVIDERS.find((p) => p.value === provider)?.backendLink) {
            setBusy(true)
            try {
                const { redirect_url } = await subscriptionApi.topUp(amount, provider)
                window.location.href = redirect_url
            } catch (err) {
                toast.error(errorMessage(err))
                setBusy(false)
            }
            return
        }
        try {
            window.location.href = provider === 'payme' ? buildPaymeUrl(user, amount) : buildClickUrl(user, amount)
        } catch (err) {
            toast.error(err.message)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title={t("Balansni to'ldirish")} width={480} onSubmit={go}
            footer={<Button type="submit" size="lg" block disabled={!(amount >= 1000) || busy}>{t("{provider} orqali to'lash", { provider: providerLabel })}</Button>}>
            <div className="space-y-4">
                <Chips ariaLabel={t("To'lov tizimi")} value={provider} onChange={setProvider} options={selectable.map(({ value, label }) => ({ value, label }))} />
                <MoneyInput label={t('Summa')} value={amount} onChange={setAmount} autoFocus big />
                <div className="flex flex-wrap gap-2">
                    {[30000, 50000, 100000, 200000].map((v) => <Button key={v} size="sm" variant="soft" onClick={() => setAmount(v)}>+{formatNumber(v)}</Button>)}
                </div>
                <p className="text-[13px] text-ink-2">{t("To'lovdan keyin balans bir necha daqiqada yangilanadi.")}</p>
            </div>
        </Sheet>
    )
}
