import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BellRing, ChevronLeft, MessageSquare, Pencil, Phone, Plus, Check, ArrowDown, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { customersApi } from '../api/customers.api'
import { debtsApi, overdueApi, paymentsApi, smsApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { useActions } from '../app/actions'
import { emitChange, useOnChange, useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { DebtCard, SmsRow, paymentLine } from '../features/debt-ui'
import DebtEditSheet from '../features/DebtEditSheet'
import { Avatar, Card, EmptyState, ErrorState, KpiCard, List, ListSkeleton, Money, Pill, Row, Skeleton } from '../ui/display'
import { Button, Chips } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { dueInfo, formatDate } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'
import { t } from '../i18n'

export default function CustomerPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const session = useSession()
    const actions = useActions()
    const [tab, setTab] = useState('debts')
    const [showClosed, setShowClosed] = useState(false)
    const [cancelPay, setCancelPay] = useState(null)
    const [retrying, setRetrying] = useState(null)
    const [remind, setRemind] = useState(null)
    const [editDebt, setEditDebt] = useState(null) // { debt, paid }

    const res = useResource(() => customersApi.get(id), [id], { cacheKey: `customer_${id}` })
    const timeline = useResource(() => customersApi.timeline(id, { limit: 100 }), [id], { enabled: tab === 'payments' })
    const sms = useResource(() => smsApi.list({ customer_id: id, per_page: 50 }), [id], { enabled: tab === 'sms' })
    useOnChange(() => { res.reload(); if (tab === 'payments') timeline.reload() })

    const c = res.data
    if (res.error && !c) {
        return res.error?.response?.status === 404 || res.error?.response?.status === 403
            ? <EmptyState title={t('Mijoz topilmadi')} text={t("U o'chirilgan yoki boshqa do'konga tegishli.")} action={<Button onClick={() => navigate('/customers')}>{t('Mijozlar')}</Button>} />
            : <ErrorState onRetry={res.reload} />
    }
    if (!c) return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-32" /><ListSkeleton rows={3} /></div>

    const summary = c.summary || {}
    const debts = [...(c.debts || [])].sort((a, b) => b.id - a.id)
    const openDebts = debts.filter((d) => d.status === 'open')
    const closedDebts = debts.filter((d) => d.status !== 'open')
    const due = summary.nearest_due_date && dueInfo(summary.nearest_due_date)
    const customer = { id: c.id, name: c.name, phone: c.phone, total_debt: summary.total_debt, credit_limit: c.credit_limit }
    const payments = (timeline.data?.data || []).flatMap((day) => day.items || []).filter((i) => i.kind === 'payment')

    const retry = async (m) => {
        setRetrying(m.id)
        try {
            await smsApi.retry(m.id)
            toast.success(t('SMS qayta yuborildi'))
            sms.reload()
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setRetrying(null)
        }
    }

    // «Eslatish»: avval narxi (dry_run), tasdiqlansa — muddati o'tgan qarz haqida SMS (UserFlow 22.3)
    const askRemind = async () => {
        try {
            const est = await overdueApi.bulkSms([c.id], true)
            if (!est.will_send) return toast.error(t("Eslatma ketmaydi: muddati o'tgan qarz yo'q yoki bugun eslatma yuborilgan"))
            setRemind(est)
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }
    const sendRemind = async () => {
        try {
            const r = await overdueApi.bulkSms([c.id], false)
            toast.success(r.sent ? t('Eslatma SMS yuborildi') : t('SMS yuborilmadi'))
            setRemind(null)
            if (tab === 'sms') sms.reload()
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    const doCancelPayment = async (reason) => {
        try {
            const r = await paymentsApi.cancel(cancelPay.id, reason || undefined)
            toast.success(t("To'lov bekor qilindi: {amount}", { amount: formatMoney(r.cancelled_amount) }))
            setCancelPay(null)
            emitChange('payments')
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    const actionButtons = (
        <div className="grid grid-cols-4 gap-2">
            {[
                [t('Nasiya'), Plus, 'bg-ink text-card', () => actions.openDebt({ customer })],
                [t("To'lov"), Check, 'bg-pay-strong text-white', () => actions.openPayment({ customer })],
                [t("Qo'ng'iroq"), Phone, 'bg-card text-ink', () => { window.location.href = `tel:${c.phone}` }],
                [t('Eslatish'), BellRing, 'bg-card text-ink', askRemind]
            ].map(([label, Icon, cls, onClick]) => (
                <button key={label} type="button" onClick={onClick} className={`flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[13px] font-bold ${cls}`}>
                    <Icon size={22} strokeWidth={2.4} aria-hidden />{label}
                </button>
            ))}
        </div>
    )

    return (
        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
            {/* Chap: mijoz ma'lumoti (kompyuterda yopishqoq) */}
            <div className="lg:sticky lg:top-6">
                <div className="flex items-center justify-between md:hidden">
                    <button type="button" aria-label={t('Orqaga')} onClick={() => navigate('/customers')} className="-ml-2.5 flex h-11 w-11 items-center justify-center"><ChevronLeft size={26} aria-hidden /></button>
                    {session.can('customer.edit') && <Link to={`/customers/${c.id}/edit`} aria-label={t('Tahrirlash')} className="flex h-11 w-11 items-center justify-center"><Pencil size={20} aria-hidden /></Link>}
                </div>
                <div className="flex items-center gap-3.5">
                    <Avatar name={c.name} size={56} />
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-[22px] font-extrabold">{c.name}</h1>
                        <a href={`tel:${c.phone}`} className="whitespace-nowrap text-[15px] text-ink-2">{formatPhone(c.phone)}</a>
                    </div>
                    {session.can('customer.edit') && (
                        <Link to={`/customers/${c.id}/edit`} className="hidden h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-line-2 px-3 text-sm font-bold md:inline-flex lg:hidden">
                            <Pencil size={16} aria-hidden /> {t('Tahrirlash')}
                        </Link>
                    )}
                </div>

                <Card className="mt-4 p-[18px] lg:hidden">
                    <div className="text-sm font-semibold text-ink-2">{t('Jami qarzi')}</div>
                    <Money value={summary.total_debt} tone={summary.total_debt > 0 ? 'debt' : 'pay'} suffix className="text-[34px] tracking-tight" />
                    {due && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                            <Pill tone={due.tone === 'muted' ? 'warn' : due.tone}>{due.label}</Pill>{t('Qaytarish:')} {formatDate(summary.nearest_due_date)}
                        </div>
                    )}
                    {summary.balance > 0 && <p className="mt-2 text-sm font-semibold text-pay">{t('Balansda:')} {formatMoney(summary.balance)}</p>}
                </Card>

                <div className="mt-3 lg:hidden">{actionButtons}</div>

                <Card className="mt-4 hidden space-y-3 p-4 text-[15px] lg:block">
                    {[
                        [t('Manzil'), c.address],
                        [t('Nasiya limiti'), c.credit_limit ? formatMoney(c.credit_limit) : t('Cheksiz')],
                        [t('Izoh'), c.note],
                        [t("Qo'shilgan"), c.created_at && formatDate(c.created_at)]
                    ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k}><div className="text-[13px] text-ink-2">{k}</div><div className="font-semibold">{v}</div></div>
                    ))}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button variant="secondary" size="sm" icon={Phone} onClick={() => { window.location.href = `tel:${c.phone}` }}>{t("Qo'ng'iroq")}</Button>
                        <Button variant="secondary" size="sm" icon={MessageSquare} onClick={() => { window.location.href = `sms:${c.phone}` }}>{t('SMS yozish')}</Button>
                        <Button variant="secondary" size="sm" icon={BellRing} className="col-span-2" onClick={askRemind}>{t('Qarzni eslatish (SMS)')}</Button>
                        {session.can('customer.edit') && (
                            <Link to={`/customers/${c.id}/edit`} className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] text-sm font-bold text-brand-strong hover:bg-brand-soft">
                                <Pencil size={16} aria-hidden /> {t('Tahrirlash')}
                            </Link>
                        )}
                    </div>
                </Card>
            </div>

            {/* O'ng: ko'rsatkichlar va tarix */}
            <div className="min-w-0">
                <div className="hidden gap-3 lg:grid lg:grid-cols-3">
                    <KpiCard size="sm" label={t('Jami qarzi')} value={summary.total_debt} tone="debt"
                        hint={due ? `${due.label} · ${formatDate(summary.nearest_due_date)}` : summary.balance > 0 ? `${t('Balansda:')} ${formatNumber(summary.balance)}` : undefined} />
                    <KpiCard size="sm" label={t('Jami berildi')} value={summary.total_given} />
                    <KpiCard size="sm" label={t("To'landi")} value={summary.total_paid} tone="pay" hint={summary.written_off > 0 ? `${t('Hisobdan chiqarilgan:')} ${formatNumber(summary.written_off)}` : undefined} />
                </div>
                <div className="mt-3 hidden gap-2 lg:flex">
                    <Button variant="dark" icon={Plus} onClick={() => actions.openDebt({ customer })}>{t('Nasiya')}</Button>
                    <Button variant="pay" icon={Check} onClick={() => actions.openPayment({ customer })}>{t("To'lov olish")}</Button>
                </div>

                <Chips className="mt-5" ariaLabel={t("Bo'lim")} value={tab} onChange={setTab} options={[
                    { value: 'debts', label: `${t('Nasiyalar')} · ${summary.debts_count ?? debts.length}` },
                    { value: 'payments', label: t("To'lovlar") },
                    { value: 'sms', label: t('SMS tarixi') }
                ]} />

                <div className="mt-3 space-y-2.5">
                    {tab === 'debts' && (debts.length === 0 ? (
                        <EmptyState icon={ArrowDown} title={t("Hali nasiya yo'q")} action={<Button icon={Plus} onClick={() => actions.openDebt({ customer })}>{t('Nasiya yozish')}</Button>} />
                    ) : (
                        <>
                            {openDebts.map((d) => <DebtCard key={d.id} debt={d} canPay={session.can('payment.create')} onPay={(debt) => actions.openPayment({ customer, debt })}
                                onEdit={session.can('debt.delete') && !session.readOnly ? (debt, paid) => setEditDebt({ debt, paid }) : undefined} />)}
                            {openDebts.length === 0 && <Card className="p-4 text-[15px] text-ink-2">{t("Ochiq nasiya yo'q — hammasi to'langan.")}</Card>}
                            {closedDebts.length > 0 && (showClosed
                                ? closedDebts.map((d) => <DebtCard key={d.id} debt={d} />)
                                : <Button variant="secondary" block onClick={() => setShowClosed(true)}>{t("Yopilgan nasiyalarni ko'rsatish ({n})", { n: closedDebts.length })}</Button>)}
                        </>
                    ))}

                    {tab === 'payments' && (timeline.loading && !timeline.data ? <ListSkeleton rows={3} /> : timeline.error ? <ErrorState onRetry={timeline.reload} /> : payments.length === 0 ? (
                        <EmptyState icon={ArrowUp} title={t("Hali to'lov yo'q")} />
                    ) : (
                        <List>
                            {payments.map((p) => (
                                <Row key={`${p.id}`} left={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-pay-soft text-pay"><ArrowUp size={16} aria-hidden /></span>}
                                    title={t("To'lov")} subtitle={paymentLine(p)}
                                    right={<span className="flex items-center gap-2">
                                        <Money value={p.amount} tone="pay" sign="−" className="text-[15px]" />
                                        {session.can('payment.delete') && <Button size="sm" variant="danger-ghost" onClick={() => setCancelPay(p)}>{t('Bekor')}</Button>}
                                    </span>} />
                            ))}
                        </List>
                    ))}

                    {tab === 'sms' && (sms.loading && !sms.data ? <ListSkeleton rows={3} /> : sms.error ? <ErrorState onRetry={sms.reload} /> : (sms.data?.data || []).length === 0 ? (
                        <EmptyState icon={MessageSquare} title={t('SMS yuborilmagan')} />
                    ) : (
                        <List>{sms.data.data.map((m) => <SmsRow key={m.id} sms={m} onRetry={retry} retrying={retrying === m.id} />)}</List>
                    ))}
                </div>
            </div>

            {editDebt && <DebtEditSheet open debt={editDebt.debt} paid={editDebt.paid} onClose={() => setEditDebt(null)}
                onSave={(payload) => debtsApi.update(editDebt.debt.id, { customer_id: c.id, ...payload })
                    .then(() => { toast.success(t('Saqlandi')); setEditDebt(null); emitChange('debts') })
                    .catch((err) => toast.error(errorMessage(err)))} />}
            <Confirm open={!!remind} onClose={() => setRemind(null)} onConfirm={sendRemind} title={t('Qarzni eslatish')} confirmText={t('Yuborish')}
                text={remind && [
                    t("{name}ga muddati o'tgan qarz haqida SMS ketadi.", { name: c.name }),
                    remind.free_count ? t('Bepul SMS hisobidan.') : remind.estimated_cost ? t('Balansdan {amount} yechiladi.', { amount: formatMoney(remind.estimated_cost) }) : ''
                ].filter(Boolean).join(' ')} />
            <Confirm
                open={!!cancelPay}
                onClose={() => setCancelPay(null)}
                onConfirm={doCancelPayment}
                danger
                reason
                title={t("To'lovni bekor qilish")}
                text={cancelPay && t("{amount} to'lov (butun kvitansiya) bekor qilinadi, nasiyalar qayta ochiladi.", { amount: formatMoney(cancelPay.amount) })}
                confirmText={t('Bekor qilish')}
            />
        </div>
    )
}
