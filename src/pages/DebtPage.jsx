import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarClock, Check, Pencil, Ban, Archive, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { debtsApi, paymentsApi, smsApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { useActions } from '../app/actions'
import { emitChange, useOnChange, useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { METHODS, Progress, SMS_STATUS, SMS_TYPES, debtState } from '../features/debt-ui'
import { Card, EmptyState, ErrorState, List, Money, PageHeader, Pill, Row, SectionTitle, Skeleton } from '../ui/display'
import { Button, Chips, MoneyInput, TextArea } from '../ui/controls'
import { Confirm, Sheet } from '../ui/Sheet'
import { addDaysYmd, addMonthsYmd, formatDate, formatDateTime, maxYmd, todayYmd, toYmd } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'

export default function DebtPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const session = useSession()
    const actions = useActions()
    const res = useResource(() => debtsApi.get(id), [id], { cacheKey: `debt_${id}` })
    const reminders = useResource(() => debtsApi.reminders(id), [id])
    const [sheet, setSheet] = useState(null) // extend | edit | writeoff | cancel | payment(obj)
    const [retrying, setRetrying] = useState(null)
    useOnChange(() => { res.reload(); reminders.reload() })

    const d = res.data
    if (res.error && !d) {
        return <div className="page">{[403, 404].includes(res.error?.response?.status)
            ? <EmptyState title="Nasiya topilmadi" text="U bekor qilingan yoki boshqa do'konga tegishli." action={<Button onClick={() => navigate(-1)}>Orqaga</Button>} />
            : <ErrorState onRetry={res.reload} />}</div>
    }
    if (!d) return <div className="page space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-48" /><Skeleton className="h-32" /></div>

    const st = debtState(d)
    const total = Number(d.total_amount || 0)
    const paid = Number(d.total_paid_amount ?? total - Number(d.remaining_amount || 0))
    const open = d.status === 'open'
    const canManage = session.can('debt.delete') && !session.readOnly
    const customer = d.customer ? { id: d.customer.id, name: d.customer.name, phone: d.customer.phone } : { id: d.customer_id, name: d.customer_name }
    const payments = [...(d.payments || [])].sort((a, b) => String(b.paid_at).localeCompare(String(a.paid_at)))
    const r = reminders.data

    const after = (msg) => () => { toast.success(msg); setSheet(null); emitChange('debts') }
    const fail = (err) => toast.error(errorMessage(err))

    const retry = async (m) => {
        setRetrying(m.id)
        try { await smsApi.retry(m.id); toast.success('SMS qayta yuborildi'); reminders.reload() } catch (err) { fail(err) } finally { setRetrying(null) }
    }

    const actionsList = (
        <div className="grid gap-2">
            {open && session.can('payment.create') && <Button variant="pay" size="lg" icon={Check} onClick={() => actions.openPayment({ customer, debt: d })}>To'lov olish</Button>}
            {canManage && open && <Button variant="secondary" size="lg" icon={CalendarClock} onClick={() => setSheet('extend')}>Muddatni uzaytirish</Button>}
            {canManage && open && <Button variant="secondary" size="lg" icon={Pencil} onClick={() => setSheet('edit')}>Tahrirlash</Button>}
            {canManage && open && <Button variant="secondary" size="lg" icon={Archive} onClick={() => setSheet('writeoff')}>Qo'lda yopish</Button>}
            {canManage && open && paid === 0 && <Button variant="danger-ghost" size="lg" icon={Ban} onClick={() => setSheet('cancel')}>Nasiyani bekor qilish</Button>}
        </div>
    )

    return (
        <div className="page">
            <PageHeader back title={`Nasiya · ${customer.name || ''}`} subtitle={<Link to={`/customers/${customer.id}`} className="text-brand-strong">Mijoz kartasi</Link>} />
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
                <div className="min-w-0 space-y-4">
                    <Card className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-ink-2">Nasiya summasi</div>
                                <Money value={total} tone="debt" suffix className="text-[32px] tracking-tight" />
                            </div>
                            <Pill tone={st.tone}>{st.label}</Pill>
                        </div>
                        <div className="mt-3"><Progress value={paid} total={total} /></div>
                        <div className="mt-2 flex justify-between text-[15px]">
                            <span>To'landi: <strong className="text-pay">{formatNumber(paid)}</strong></span>
                            <span>Qoldi: <strong className="text-debt">{formatNumber(d.remaining_amount)}</strong></span>
                        </div>
                        {d.written_off_amount > 0 && <p className="mt-1 text-sm text-ink-2">Hisobdan chiqarilgan: {formatMoney(d.written_off_amount)}{d.close_reason && ` — ${d.close_reason}`}</p>}
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-[15px]">
                            <div><dt className="text-[13px] text-ink-2">Berilgan</dt><dd className="font-semibold">{formatDate(d.debt_date)}</dd></div>
                            <div><dt className="text-[13px] text-ink-2">Qaytarish sanasi</dt><dd className="font-semibold">{formatDate(d.return_date)}{d.extended_count > 0 && <span className="text-ink-3"> · {d.extended_count} marta uzaytirilgan</span>}</dd></div>
                            <div><dt className="text-[13px] text-ink-2">Yozgan</dt><dd className="font-semibold">{d.created_by?.name || '—'}</dd></div>
                            {d.description && <div className="col-span-2"><dt className="text-[13px] text-ink-2">Izoh</dt><dd className="font-semibold">{d.description}</dd></div>}
                        </dl>
                    </Card>

                    <div className="lg:hidden">{actionsList}</div>

                    <div>
                        <SectionTitle>To'lovlar</SectionTitle>
                        {payments.length === 0 ? <Card className="p-4 text-[15px] text-ink-2">Hali to'lov yo'q.</Card> : (
                            <List>
                                {payments.map((p) => (
                                    <Row key={p.id} left={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-pay-soft text-pay"><ArrowUp size={16} aria-hidden /></span>}
                                        title={`To'lov${p.method ? ` · ${METHODS[p.method] || p.method}` : ''}`}
                                        subtitle={`${formatDateTime(p.paid_at)}${p.created_by?.name ? ` · ${p.created_by.name}` : ''}`}
                                        right={<span className="flex items-center gap-2">
                                            <Money value={p.amount} tone="pay" className="text-[15px]" />
                                            {session.can('payment.delete') && !session.readOnly && <Button size="sm" variant="danger-ghost" onClick={() => setSheet({ payment: p })}>Bekor</Button>}
                                        </span>} />
                                ))}
                            </List>
                        )}
                    </div>

                    <div>
                        <SectionTitle>SMS eslatmalar</SectionTitle>
                        <List>
                            {(r?.sent || []).map((m) => {
                                const s = SMS_STATUS[m.status] || SMS_STATUS.queued
                                return (
                                    <Row key={`s${m.id}`} title={SMS_TYPES[m.type] || 'SMS'} subtitle={formatDateTime(m.sent_at || m.created_at)}
                                        right={<span className="flex items-center gap-2"><Pill tone={s.tone}>{s.label}</Pill>
                                            {m.can_retry && <Button size="sm" variant="secondary" loading={retrying === m.id} onClick={() => retry(m)}>Qayta</Button>}</span>} />
                                )
                            })}
                            {(r?.planned || []).map((p, i) => (
                                <Row key={`p${i}`} title={SMS_TYPES[p.type] || 'Eslatma'}
                                    subtitle={p.repeat_every_days ? `har ${p.repeat_every_days} kunda, yana ${p.remaining_count} marta` : formatDateTime(p.at)}
                                    right={<Pill tone="muted">Rejalashtirilgan</Pill>} />
                            ))}
                            {r && !(r.sent || []).length && !(r.planned || []).length && <p className="px-3.5 py-3 text-[15px] text-ink-2">SMS yo'q.</p>}
                            {!r && <div className="p-3.5"><Skeleton className="h-10" /></div>}
                        </List>
                    </div>
                </div>
                <div className="hidden lg:sticky lg:top-6 lg:block">{actionsList}</div>
            </div>

            <ExtendSheet open={sheet === 'extend'} debt={d} onClose={() => setSheet(null)} onSave={(date, reason) => debtsApi.extend(d.id, date, reason).then(after('Muddat uzaytirildi')).catch(fail)} />
            <EditSheet open={sheet === 'edit'} debt={d} paid={paid} onClose={() => setSheet(null)}
                onSave={(payload) => debtsApi.update(d.id, { customer_id: d.customer_id, ...payload }).then(after('Saqlandi')).catch(fail)} />
            <Confirm open={sheet === 'writeoff'} onClose={() => setSheet(null)} reason reasonRequired title="Qo'lda yopish"
                text={`Qolgan ${formatMoney(d.remaining_amount)} hisobdan chiqariladi. To'lov sifatida yozilmaydi va tushumga qo'shilmaydi.`}
                confirmText="Yopish" onConfirm={(reason) => debtsApi.writeOff(d.id, reason).then(after('Nasiya yopildi')).catch(fail)} />
            <Confirm open={sheet === 'cancel'} onClose={() => setSheet(null)} reason danger title="Nasiyani bekor qilish"
                text="Nasiya bekor qilinadi va arxivga o'tadi. Faqat to'lov tushmagan nasiyani bekor qilish mumkin."
                confirmText="Bekor qilish" onConfirm={(reason) => debtsApi.cancel(d.id, reason).then(() => { toast.success('Nasiya bekor qilindi'); emitChange('debts'); navigate(`/customers/${customer.id}`, { replace: true }) }).catch(fail)} />
            <Confirm open={!!sheet?.payment} onClose={() => setSheet(null)} reason danger title="To'lovni bekor qilish"
                text={sheet?.payment && `${formatMoney(sheet.payment.amount)} to'lov (butun kvitansiya) bekor qilinadi, nasiya qayta ochiladi.`}
                confirmText="Bekor qilish" onConfirm={(reason) => paymentsApi.cancel(sheet.payment.id, reason || undefined).then(after("To'lov bekor qilindi")).catch(fail)} />
        </div>
    )
}

function ExtendSheet({ open, debt, onClose, onSave }) {
    const today = todayYmd()
    const base = maxYmd(toYmd(debt.return_date), today)
    const [mode, setMode] = useState('1w')
    const [custom, setCustom] = useState('')
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) { setMode('1w'); setCustom(addDaysYmd(base, 7)); setReason('') } }, [open, base])
    const date = mode === '1w' ? addDaysYmd(base, 7) : mode === '2w' ? addDaysYmd(base, 14) : mode === '1m' ? addMonthsYmd(base, 1) : custom
    const submit = async () => { setBusy(true); await onSave(date, reason.trim() || undefined); setBusy(false) }
    return (
        <Sheet open={open} onClose={onClose} title="Muddatni uzaytirish" subtitle={`Hozir: ${formatDate(debt.return_date)}`} width={520} onSubmit={submit}
            footer={<Button type="submit" size="lg" block loading={busy} disabled={!date}>Saqlash — {formatDate(date)}</Button>}>
            <Chips ariaLabel="Yangi muddat" value={mode} onChange={setMode} options={[
                { value: '1w', label: '+1 hafta' }, { value: '2w', label: '+2 hafta' }, { value: '1m', label: '+1 oy' }, { value: 'custom', label: 'Sana' }
            ]} />
            {mode === 'custom' && <input type="date" aria-label="Yangi qaytarish sanasi" value={custom} min={today} onChange={(e) => setCustom(e.target.value)}
                className="mt-3 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-ink" />}
            <TextArea className="mt-4" label="Sabab (ixtiyoriy)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Masalan: iltimos qildi" maxLength={500} />
            <p className="mt-3 text-[13px] text-ink-2">Eslatma SMS'lari yangi sanaga qayta rejalashtiriladi.</p>
        </Sheet>
    )
}

function EditSheet({ open, debt, paid, onClose, onSave }) {
    const today = todayYmd()
    const [amount, setAmount] = useState(0)
    const [given, setGiven] = useState('')
    const [due, setDue] = useState('')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!open) return
        setAmount(Math.round(Number(debt.total_amount || 0)))
        setGiven(toYmd(debt.debt_date))
        setDue(toYmd(debt.return_date))
        setNote(debt.description || '')
    }, [open, debt])
    const tooLow = amount < paid
    const submit = async () => {
        if (tooLow || !(amount > 0)) return
        setBusy(true)
        await onSave({ amount, given_at: given, due_date: due || null, note: note.trim() || null })
        setBusy(false)
    }
    return (
        <Sheet open={open} onClose={onClose} title="Nasiyani tahrirlash" width={560} onSubmit={submit}
            footer={<Button type="submit" size="lg" block loading={busy} disabled={tooLow || !(amount > 0)}>Saqlash</Button>}>
            <div className="space-y-4">
                <MoneyInput label="Summa" value={amount} onChange={setAmount} error={tooLow ? `To'langan qismdan (${formatNumber(paid)}) kam bo'lmaydi` : undefined} />
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-semibold">Berilgan
                        <input type="date" value={given} max={today} onChange={(e) => setGiven(e.target.value)} className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 font-normal text-ink" />
                    </label>
                    <label className="text-sm font-semibold">Qaytarish
                        <input type="date" value={due} min={given} onChange={(e) => setDue(e.target.value)} className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 font-normal text-ink" />
                    </label>
                </div>
                <TextArea label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
            </div>
        </Sheet>
    )
}
