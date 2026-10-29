import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, PencilLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { debtsApi, smsApi } from '../api/debts.api'
import { customersApi } from '../api/customers.api'
import { useSession } from '../app/session'
import { emitChange } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { Sheet, AmountPad } from '../ui/Sheet'
import { Avatar } from '../ui/display'
import { Button, Chips, Toggle, cx } from '../ui/controls'
import CustomerPicker from './CustomerPicker'
import { addDaysYmd, addMonthsYmd, formatDate, todayYmd } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'

const GIVEN_MAX_DAYS_BACK = 30 // backend: berilgan sana bugundan 30 kundan oldin bo'lmaydi

const smsText = (sms) => {
    if (!sms) return null
    if (sms.status === 'sent') return 'Mijozga SMS yuborildi'
    if (sms.skipped_reason === 'disabled' || sms.skipped_reason === 'not_applicable') return 'SMS yuborilmadi (o\'chirilgan)'
    if (sms.skipped_reason === 'quota_exhausted') return "SMS ketmadi: SMS limiti tugagan va balans yetmaydi"
    if (sms.skipped_reason === 'no_phone') return "SMS ketmadi: mijozning raqami yo'q"
    return `SMS ketmadi${sms.error ? `: ${sms.error}` : ''}`
}

// Nasiya yozish: bitta oyna. customer berilsa (mijoz kartasidan) — mijoz tanlangan va almashtirilmaydi
export default function DebtSheet({ open, onClose, customer: lockedCustomer }) {
    const session = useSession()
    const navigate = useNavigate()
    const settings = session.notifications
    const [customer, setCustomer] = useState(null)
    const [summary, setSummary] = useState(null)
    const [amount, setAmount] = useState(0)
    const [givenMode, setGivenMode] = useState('today')
    const [givenOther, setGivenOther] = useState('')
    const [dueMode, setDueMode] = useState(null)
    const [dueCustom, setDueCustom] = useState('')
    const [note, setNote] = useState('')
    const [noteOpen, setNoteOpen] = useState(false)
    const [sendSms, setSendSms] = useState(true)
    const [quota, setQuota] = useState(null)
    const [saving, setSaving] = useState(false)
    const [overLimit, setOverLimit] = useState(null)
    const [result, setResult] = useState(null)

    const today = todayYmd()
    const reset = (keepCustomer) => {
        if (!keepCustomer) setCustomer(lockedCustomer || null)
        setAmount(0)
        setGivenMode('today')
        setGivenOther('')
        setDueMode(null)
        setDueCustom('')
        setNote('')
        setNoteOpen(false)
        setSendSms(settings.sms_on_debt ?? true)
        setOverLimit(null)
        setResult(null)
    }

    useEffect(() => {
        if (!open) return
        reset(false)
        smsApi.quota().then(setQuota).catch(() => setQuota(null))
    }, [open])

    useEffect(() => {
        setSummary(null)
        if (customer?.id) customersApi.summary(customer.id).then(setSummary).catch(() => {})
    }, [customer?.id])

    const givenAt = givenMode === 'today' ? today : givenMode === 'yesterday' ? addDaysYmd(today, -1) : givenOther
    const presets = useMemo(() => {
        const base = givenAt || today
        return { '1w': addDaysYmd(base, 7), '2w': addDaysYmd(base, 14), '1m': addMonthsYmd(base, 1) }
    }, [givenAt, today])
    const dueDate = dueMode === 'custom' ? dueCustom : dueMode ? presets[dueMode] : ''

    const currentDebt = summary?.total_debt ?? customer?.total_debt ?? 0
    const newTotal = currentDebt + (amount || 0)
    const limit = summary?.credit_limit ?? customer?.credit_limit ?? null
    const limitLeft = limit !== null ? limit - newTotal : null

    const valid = customer && amount > 0 && givenAt && (!dueMode || dueDate)

    const save = async (force = false) => {
        if (!valid || saving) return
        setSaving(true)
        try {
            const res = await debtsApi.create({
                customer_id: customer.id,
                amount,
                given_at: givenAt,
                due_date: dueDate || null,
                note: note.trim() || null,
                send_sms: sendSms,
                force: force || undefined
            })
            setOverLimit(null)
            setResult({ ...res, amount, dueDate, customer })
            emitChange('debts')
        } catch (err) {
            const d = err?.response?.data
            if (d?.reason === 'limit_exceeded') setOverLimit(d)
            else toast.error(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    if (result) {
        return (
            <Sheet
                open={open}
                onClose={onClose}
                title="Nasiya yozildi"
                width={520}
                footer={
                    <div className="flex gap-2">
                        <Button variant="secondary" size="lg" className="flex-1" onClick={() => reset(true)}>Yana yozish</Button>
                        <Button size="lg" className="flex-1" onClick={() => { onClose(); navigate(`/customers/${result.customer.id}`) }}>Mijoz kartasi</Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center py-4 text-center">
                    <CheckCircle2 size={56} className="text-pay" aria-hidden />
                    <p className="mt-3 text-[30px] font-extrabold text-debt">{formatMoney(result.amount)}</p>
                    <p className="mt-1 text-[15px] text-ink-2">
                        {result.customer.name}{result.dueDate && ` · ${formatDate(result.dueDate)} gacha`}
                    </p>
                    {result.customer_total_debt !== undefined && (
                        <p className="mt-1 text-[15px] text-ink-2">Jami qarzi: <strong className="text-ink">{formatMoney(result.customer_total_debt)}</strong></p>
                    )}
                    {result.applied_from_balance > 0 && (
                        <p className="mt-1 text-[15px] text-pay">Balansdan yechildi: {formatMoney(result.applied_from_balance)}</p>
                    )}
                    {result.sms && (
                        <p className={cx('mt-3 rounded-xl px-3 py-2 text-sm font-semibold', result.sms.status === 'sent' ? 'bg-pay-soft text-pay' : 'bg-warn-soft text-warn')}>
                            {smsText(result.sms)}
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
            title={customer ? (lockedCustomer ? `${customer.name}ga nasiya` : 'Yangi nasiya') : 'Yangi nasiya'}
            subtitle={customer ? `${formatPhone(customer.phone)} · qarzi ${formatNumber(currentDebt)}` : undefined}
            onSubmit={() => save(false)}
            footer={customer && (
                <Button type="submit" size="lg" block loading={saving} disabled={!valid}>
                    Saqlash{amount > 0 && ` — ${formatMoney(amount)}`}
                </Button>
            )}
        >
            {!customer ? (
                <CustomerPicker onSelect={setCustomer} />
            ) : (
                <div className="space-y-3">
                    {!lockedCustomer && (
                        <button type="button" onClick={() => setCustomer(null)} className="flex w-full items-center gap-3 rounded-ctl border-2 border-brand bg-brand-soft px-3 py-2 text-left">
                            <Avatar name={customer.name} size={32} />
                            <span className="min-w-0 flex-1 truncate font-bold text-brand-strong">{customer.name}</span>
                            <span className="text-sm font-semibold text-brand-strong">Almashtirish</span>
                        </button>
                    )}
                    <AmountPad
                        value={amount}
                        onChange={setAmount}
                        autoFocus
                        hint={amount > 0 && `Jami qarzi bo'ladi: ${formatNumber(newTotal)}${limitLeft !== null ? ` · limit ${formatNumber(limit)}` : ''}`}
                    />
                    {limitLeft !== null && amount > 0 && limitLeft < 0 && (
                        <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-sm font-semibold text-warn">
                            Limitdan {formatNumber(-limitLeft)} so'm oshadi
                        </p>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="w-[72px] shrink-0 text-[13px] font-bold text-ink-2">Berildi</span>
                        <Chips
                            ariaLabel="Nasiya berilgan sana"
                            value={givenMode}
                            onChange={(v) => { setGivenMode(v); if (v === 'other' && !givenOther) setGivenOther(addDaysYmd(today, -2)) }}
                            className="flex-1"
                            options={[
                                { value: 'today', label: 'Bugun' },
                                { value: 'yesterday', label: 'Kecha' },
                                { value: 'other', label: 'Boshqa', icon: CalendarDays }
                            ]}
                        />
                    </div>
                    {givenMode === 'other' && (
                        <input
                            type="date"
                            aria-label="Berilgan sana"
                            value={givenOther}
                            min={addDaysYmd(today, -GIVEN_MAX_DAYS_BACK)}
                            max={today}
                            onChange={(e) => setGivenOther(e.target.value)}
                            className="ml-[80px] h-11 w-[calc(100%-80px)] rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-ink"
                        />
                    )}

                    <div className="flex items-center gap-2">
                        <span className="w-[72px] shrink-0 text-[13px] font-bold text-ink-2">Qaytaradi</span>
                        <Chips
                            ariaLabel="Qaytarish muddati"
                            value={dueMode}
                            onChange={(v) => { setDueMode(v === dueMode ? null : v); if (v === 'custom' && !dueCustom) setDueCustom(presets['2w']) }}
                            className="flex-1"
                            options={[
                                { value: '1w', label: '1 hafta', disabled: presets['1w'] < today },
                                { value: '2w', label: '2 hafta', disabled: presets['2w'] < today },
                                { value: '1m', label: '1 oy', disabled: presets['1m'] < today },
                                { value: 'custom', label: <CalendarDays size={18} aria-label="Sana tanlash" />, narrow: true }
                            ]}
                        />
                    </div>
                    {dueMode === 'custom' && (
                        <input
                            type="date"
                            aria-label="Qaytarish sanasi"
                            value={dueCustom}
                            min={givenAt > today ? givenAt : today}
                            onChange={(e) => setDueCustom(e.target.value)}
                            className="ml-[80px] h-11 w-[calc(100%-80px)] rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-ink"
                        />
                    )}

                    {noteOpen || note ? (
                        <label className="flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-line-2 px-3 focus-within:border-brand">
                            <PencilLine size={18} className="shrink-0 text-ink-3" aria-hidden />
                            <input
                                autoFocus={noteOpen && !note}
                                value={note}
                                maxLength={500}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Izoh: nima oldi? (un, yog', shakar…)"
                                aria-label="Izoh"
                                className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                            />
                        </label>
                    ) : (
                        <button type="button" onClick={() => setNoteOpen(true)} className="flex items-center gap-2 text-[15px] font-semibold text-brand-strong">
                            <PencilLine size={18} aria-hidden /> Izoh qo'shish
                        </button>
                    )}

                    <Toggle
                        checked={sendSms}
                        onChange={setSendSms}
                        label="Mijozga SMS yuborish"
                        description={[
                            dueDate && settings.reminder_enabled !== false && `Eslatma: ${formatDate(dueDate)}, ${settings.reminder_time || '09:00'}`,
                            quota && (quota.free_remaining !== null ? `Qolgan SMS: ${formatNumber(quota.free_remaining)} ta` : 'SMS cheksiz')
                        ].filter(Boolean).join(' · ') || undefined}
                    />

                    {overLimit && (
                        <div role="alert" className="rounded-ctl border-[1.5px] border-warn bg-warn-soft p-3.5 text-[15px] text-ink">
                            <p className="font-bold">Nasiya limiti oshadi</p>
                            <p className="mt-1 text-sm text-ink-2">
                                Limit {formatMoney(overLimit.credit_limit)}, yangi jami {formatMoney(overLimit.new_total)} — {formatMoney(overLimit.exceeded_by)} ortiq.
                            </p>
                            {overLimit.can_force && session.can('debt.over_limit') ? (
                                <Button variant="dark" className="mt-3 w-full" loading={saving} onClick={() => save(true)}>Baribir yozish</Button>
                            ) : (
                                <p className="mt-2 text-sm font-semibold">Limitdan oshirishga huquqingiz yo'q.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Sheet>
    )
}
