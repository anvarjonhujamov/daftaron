import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { emitChange, useDebounced } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { Sheet } from '../ui/Sheet'
import { Avatar } from '../ui/display'
import { Button, Chips, MoneyInput, Toggle, cx } from '../ui/controls'
import CustomerPicker from './CustomerPicker'
import { addDaysYmd, formatDate, todayYmd, toYmd } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'

export const PAYMENT_METHODS = [
    { value: 'cash', label: 'Naqd' },
    { value: 'card', label: 'Karta' },
    { value: 'transfer', label: "O'tkazma" }
]

// To'lov vaqti: bugun — hozirgi vaqt, boshqa kun — shu kun 12:00 (Toshkent, +05:00)
const paidAt = (ymd) => {
    if (ymd === todayYmd()) {
        const now = new Date(Date.now() + 5 * 3600 * 1000)
        return `${ymd}T${now.toISOString().slice(11, 19)}+05:00`
    }
    return `${ymd}T12:00:00+05:00`
}

// To'lov olish. customer berilmasa — qarzdorlar orasidan tanlanadi; debt berilsa — «Bitta nasiyaga» rejimi
export default function PaymentSheet({ open, onClose, customer: initialCustomer, debt: initialDebt }) {
    const session = useSession()
    const [customer, setCustomer] = useState(null)
    const [summary, setSummary] = useState(null)
    const [openDebts, setOpenDebts] = useState([])
    const [amount, setAmount] = useState(0)
    const [method, setMethod] = useState('cash')
    const [mode, setMode] = useState('auto')
    const [debtId, setDebtId] = useState(null)
    const [dateMode, setDateMode] = useState('today')
    const [dateOther, setDateOther] = useState('')
    const [sendSms, setSendSms] = useState(false)
    const [preview, setPreview] = useState(null)
    const [saving, setSaving] = useState(false)
    const [result, setResult] = useState(null)

    const today = todayYmd()

    useEffect(() => {
        if (!open) return
        setCustomer(initialCustomer || null)
        setAmount(0)
        setMethod('cash')
        setMode(initialDebt ? 'single' : 'auto')
        setDebtId(initialDebt?.id || null)
        setDateMode('today')
        setDateOther('')
        setSendSms(session.notifications.sms_on_payment ?? true)
        setPreview(null)
        setResult(null)
    }, [open])

    useEffect(() => {
        setSummary(null)
        setOpenDebts([])
        if (!customer?.id) return
        customersApi.summary(customer.id).then(setSummary).catch(() => {})
        debtsApi.list({ customer_id: customer.id, status: 'open', per_page: 100 })
            .then((r) => setOpenDebts(Array.isArray(r) ? r : r?.data || []))
            .catch(() => {})
    }, [customer?.id])

    const totalDebt = summary?.total_debt ?? customer?.total_debt ?? 0
    const selectedDebt = openDebts.find((d) => d.id === debtId) || (initialDebt?.id === debtId ? initialDebt : null)
    const fullAmount = mode === 'single' ? Number(selectedDebt?.remaining_amount || 0) : totalDebt
    const date = dateMode === 'today' ? today : dateMode === 'yesterday' ? addDaysYmd(today, -1) : dateOther

    // Taqsimotni jonli ko'rsatish (saqlamasdan)
    const debounced = useDebounced(`${amount}|${mode}|${debtId}`, 350)
    useEffect(() => {
        setPreview(null)
        if (!customer?.id || !(amount > 0) || (mode === 'single' && !debtId)) return
        let alive = true
        customersApi.paymentPreview(customer.id, { amount, mode, debt_id: mode === 'single' ? debtId : undefined, method })
            .then((p) => alive && setPreview(p))
            .catch(() => {})
        return () => { alive = false }
    }, [debounced, customer?.id])

    const valid = customer && amount > 0 && date && (mode === 'auto' || debtId)

    const save = async () => {
        if (!valid || saving) return
        setSaving(true)
        try {
            const res = await customersApi.pay(customer.id, {
                amount,
                method,
                mode,
                debt_id: mode === 'single' ? debtId : undefined,
                paid_at: paidAt(date),
                send_sms: sendSms
            })
            setResult(res)
            emitChange('payments')
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    if (result) {
        const closed = (result.allocations || []).filter((a) => a.closed).length
        return (
            <Sheet open={open} onClose={onClose} title="To'lov qabul qilindi" width={520} footer={<Button size="lg" block onClick={onClose}>Tayyor</Button>}>
                <div className="flex flex-col items-center py-4 text-center">
                    <CheckCircle2 size={56} className="text-pay" aria-hidden />
                    <p className="mt-3 text-[30px] font-extrabold text-pay">{formatMoney(result.payment?.amount ?? amount)}</p>
                    <p className="mt-1 text-[15px] text-ink-2">{customer.name} · {PAYMENT_METHODS.find((m) => m.value === method)?.label}</p>
                    <p className="mt-2 text-[15px] text-ink-2">
                        Qolgan qarzi: <strong className="text-ink">{formatMoney(result.customer?.total_debt)}</strong>
                    </p>
                    {closed > 0 && <p className="text-[15px] text-ink-2">{closed} ta nasiya yopildi</p>}
                    {result.to_balance > 0 && <p className="text-[15px] text-pay">Balansga yozildi: {formatMoney(result.to_balance)}</p>}
                    {result.sms && result.sms.status !== 'skipped' && (
                        <p className={cx('mt-3 rounded-xl px-3 py-2 text-sm font-semibold', result.sms.status === 'sent' ? 'bg-pay-soft text-pay' : 'bg-warn-soft text-warn')}>
                            {result.sms.status === 'sent' ? 'Mijozga SMS yuborildi' : 'SMS yuborilmadi'}
                        </p>
                    )}
                </div>
            </Sheet>
        )
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="To'lov olish"
            subtitle={customer ? `${customer.name} · qarzi ${formatMoney(totalDebt)}` : 'Kim to\'ladi?'}
            onSubmit={save}
            footer={customer && (
                <Button type="submit" variant="pay" size="lg" block loading={saving} disabled={!valid}>
                    To'lovni saqlash{amount > 0 && ` — ${formatMoney(amount)}`}
                </Button>
            )}
        >
            {!customer ? (
                <CustomerPicker withDebt allowCreate={false} onSelect={setCustomer} />
            ) : (
                <div className="space-y-4">
                    {!initialCustomer && (
                        <button type="button" onClick={() => setCustomer(null)} className="flex w-full items-center gap-3 rounded-ctl bg-soft px-3 py-2 text-left">
                            <Avatar name={customer.name} size={32} />
                            <span className="min-w-0 flex-1 truncate font-bold">{customer.name}</span>
                            <span className="text-sm font-semibold text-brand-strong">Almashtirish</span>
                        </button>
                    )}

                    <div>
                        <MoneyInput label="Qancha to'ladi?" value={amount} onChange={setAmount} autoFocus big />
                        <div className="mt-2 flex gap-2">
                            {fullAmount > 0 && (
                                <Button size="sm" variant="soft" onClick={() => setAmount(Math.round(fullAmount))}>To'liq · {formatNumber(fullAmount)}</Button>
                            )}
                            {fullAmount > 1 && (
                                <Button size="sm" variant="soft" onClick={() => setAmount(Math.round(fullAmount / 2))}>Yarmi · {formatNumber(Math.round(fullAmount / 2))}</Button>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold">Qanday?</p>
                        <Chips ariaLabel="To'lov usuli" value={method} onChange={setMethod} options={PAYMENT_METHODS} />
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold">Qachon?</p>
                        <Chips
                            ariaLabel="To'lov sanasi"
                            value={dateMode}
                            onChange={(v) => { setDateMode(v); if (v === 'other' && !dateOther) setDateOther(addDaysYmd(today, -2)) }}
                            options={[{ value: 'today', label: 'Bugun' }, { value: 'yesterday', label: 'Kecha' }, { value: 'other', label: 'Boshqa', icon: CalendarDays }]}
                        />
                        {dateMode === 'other' && (
                            <input type="date" aria-label="To'lov sanasi" value={dateOther} max={today} onChange={(e) => setDateOther(e.target.value)}
                                className="mt-2 h-11 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-ink" />
                        )}
                    </div>

                    <div>
                        <div role="radiogroup" aria-label="Taqsimot" className="grid grid-cols-2 gap-1 rounded-ctl bg-soft p-1">
                            {[['auto', 'Avtomatik — eng yangi qarzdan'], ['single', 'Bitta nasiyaga']].map(([v, l]) => (
                                <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                                    className={cx('min-h-[42px] rounded-[10px] px-2 text-[13px] font-semibold leading-tight', mode === v ? 'bg-card text-ink shadow-sm' : 'text-ink-2')}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        {mode === 'single' && (
                            <div className="mt-2 space-y-1.5">
                                {openDebts.length === 0 && <p className="text-sm text-ink-2">Ochiq nasiya yo'q.</p>}
                                {openDebts.map((d) => (
                                    <label key={d.id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5', debtId === d.id ? 'border-brand bg-brand-soft' : 'border-line')}>
                                        <input type="radio" name="debt" checked={debtId === d.id} onChange={() => setDebtId(d.id)} className="h-5 w-5 accent-[rgb(var(--brand))]" />
                                        <span className="min-w-0 flex-1 text-[15px]">
                                            <strong>{formatDate(d.debt_date)}</strong>
                                            {d.description && <span className="text-ink-2"> · {d.description}</span>}
                                        </span>
                                        <span className="font-bold text-debt">{formatNumber(d.remaining_amount)}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {preview && (
                        <div className="rounded-ctl bg-soft/70 p-3.5 text-[15px]" aria-live="polite">
                            {(preview.allocations || []).map((a) => (
                                <div key={a.debt_id} className="flex justify-between gap-3 py-1">
                                    <span className="text-ink-2">{formatDate(toYmd(a.debt_date))} nasiyasi</span>
                                    <span className="text-right font-semibold">
                                        {formatNumber(a.amount)} · {a.closes ? <span className="text-pay">yopiladi</span> : `${formatNumber(a.remaining_after)} qoladi`}
                                    </span>
                                </div>
                            ))}
                            {preview.to_balance > 0 && (
                                <div className="flex justify-between gap-3 py-1 text-pay">
                                    <span>Mijoz balansiga</span><span className="font-semibold">{formatNumber(preview.to_balance)}</span>
                                </div>
                            )}
                            <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2 font-bold">
                                <span>To'lovdan keyin qarzi</span><span>{formatMoney(preview.debt_after)}</span>
                            </div>
                        </div>
                    )}
                    {amount > fullAmount && fullAmount > 0 && !preview?.to_balance && (
                        <p className="text-[13px] text-ink-2">Qarzdan ortiq to'lansa, farq mijoz balansiga yoziladi.</p>
                    )}

                    <Toggle checked={sendSms} onChange={setSendSms} label="Mijozga SMS" description="«To'lov qabul qilindi» va qolgan qarz" />
                </div>
            )}
        </Sheet>
    )
}
