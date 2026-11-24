import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlarmClock, Search, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { overdueApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { emitChange, useDebounced, useOnChange, useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { Card, EmptyState, ErrorState, KpiCard, ListSkeleton, Money, PageHeader } from '../ui/display'
import { Button, Chips, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { formatDate } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'
import { t, tk } from '../i18n'

const SMS_FILTERS = [
    { value: '', label: tk('SMS: hammasi') },
    { value: 'sent', label: tk('Yuborilgan') },
    { value: 'not_sent', label: tk('Yuborilmagan') },
    { value: 'failed', label: tk('Xato') }
]

const smsCell = (c) => c.sms_status === 'failed'
    ? <span className="text-debt">{t('SMS xato')}</span>
    : c.last_sms_at ? `SMS: ${formatDate(c.last_sms_at).slice(0, 5)}` : t('SMS yuborilmagan')

export default function OverduePage() {
    const navigate = useNavigate()
    const session = useSession()
    const [days, setDays] = useState('')
    const [smsStatus, setSmsStatus] = useState('')
    const [q, setQ] = useState('')
    const query = useDebounced(q.trim(), 300)
    const [selected, setSelected] = useState(() => new Set())
    const [estimate, setEstimate] = useState(null)
    const [confirm, setConfirm] = useState(false)

    const res = useResource(() => overdueApi.list({ days, sms_status: smsStatus, q: query }), [days, smsStatus, query],
        { cacheKey: !days && !smsStatus && !query ? 'overdue_all' : undefined })
    useOnChange(() => res.reload())
    const list = res.data?.data || []
    const summary = res.data?.summary || {}
    const buckets = summary.buckets || {}

    // Default — hammasi tanlangan (UserFlow 22.6)
    useEffect(() => { setSelected(new Set((res.data?.data || []).map((c) => c.customer_id))) }, [res.data])

    // Tanlov o'zgarsa — nechta SMS ketishi va narxini oldindan hisoblash (dry_run)
    const ids = useMemo(() => [...selected], [selected])
    const debouncedIds = useDebounced(ids.join(','), 400)
    useEffect(() => {
        setEstimate(null)
        if (!ids.length) return
        let alive = true
        overdueApi.bulkSms(ids, true).then((r) => alive && setEstimate(r)).catch(() => {})
        return () => { alive = false }
    }, [debouncedIds])

    const toggle = (id) => setSelected((s) => {
        const next = new Set(s)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const allSelected = list.length > 0 && selected.size === list.length
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(list.map((c) => c.customer_id)))

    const send = async () => {
        try {
            const r = await overdueApi.bulkSms(ids, false)
            toast.success([t('{n} ta SMS yuborildi', { n: r.sent ?? 0 }), r.failed ? t('{n} tasi yuborilmadi', { n: r.failed }) : null].filter(Boolean).join(', '))
            setSelected(new Set())
            setConfirm(false)
            emitChange('sms')
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    const estimateText = estimate && [
        t('{n} ta SMS ketadi', { n: estimate.will_send }),
        estimate.free_count ? t('{n} tasi bepul', { n: estimate.free_count }) : null,
        estimate.estimated_cost ? t("{amount} so'm balansdan", { amount: formatNumber(estimate.estimated_cost) }) : null
    ].filter(Boolean).join(' · ')

    return (
        <div className="page">
            <PageHeader back title={t("Muddati o'tganlar")} subtitle={t('{n} mijoz · vaqtida qaytarmagan', { n: formatNumber(summary.count ?? 0) })} />

            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <KpiCard label={t('Jami summa')} value={summary.total_amount ?? null} tone="debt" />
                <KpiCard label={t('Mijozlar')} value={<span className="font-extrabold">{formatNumber(summary.count ?? 0)}</span>} />
                <KpiCard label={t("O'rtacha kechikish")} value={<span className="font-extrabold">{summary.avg_days_overdue !== undefined ? t('{n} kun', { n: Math.round(summary.avg_days_overdue) }) : '—'}</span>} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Chips size="sm" wrap ariaLabel={t('Kechikish')} value={days} onChange={setDays} options={[
                    { value: '', label: t('Hammasi') },
                    { value: '1-7', label: t('1–7 kun'), count: buckets['1-7'] },
                    { value: '8-30', label: t('8–30 kun'), count: buckets['8-30'] },
                    { value: '30+', label: '30+', count: buckets['30+'] }
                ]} />
                <select value={smsStatus} onChange={(e) => setSmsStatus(e.target.value)} aria-label={t('SMS holati')}
                    className="h-9 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm font-semibold text-ink">
                    {SMS_FILTERS.map((f) => <option key={f.value} value={f.value}>{t(f.label)}</option>)}
                </select>
                <label className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-card px-3 md:max-w-xs">
                    <Search size={16} className="text-ink-3" aria-hidden />
                    <input data-search value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Ism yoki telefon')} aria-label={t('Qidirish')} className="w-full bg-transparent text-sm outline-none" />
                </label>
            </div>

            <div className="mt-3">
                {res.error && !res.data ? <ErrorState onRetry={res.reload} /> : res.loading && !res.data ? <ListSkeleton /> : list.length === 0 ? (
                    <EmptyState icon={AlarmClock} title={t("Muddati o'tgan qarz yo'q")} text={t("Qaytarish sanasi o'tgan ochiq nasiyalar shu yerda ko'rinadi.")} />
                ) : (
                    <Card className="overflow-hidden">
                        <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 text-sm font-semibold text-ink-2">
                            <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label={t('Hammasini tanlash')} className="h-5 w-5 accent-[rgb(var(--brand))]" />
                            <span className="flex-1">{t('Hammasini tanlash')}</span>
                            <span className="hidden w-32 text-right md:block">{t('Telefon')}</span>
                            <span className="hidden w-28 md:block">{t('SMS')}</span>
                            <span className="w-28 text-right">{t('Qarz')}</span>
                        </div>
                        <ul className="divide-y divide-line">
                            {list.map((c) => (
                                <li key={c.customer_id} className={cx('flex items-center gap-3 px-3.5 py-3', selected.has(c.customer_id) && 'bg-brand-soft/60')}>
                                    <input type="checkbox" checked={selected.has(c.customer_id)} onChange={() => toggle(c.customer_id)} aria-label={t('{name}ni tanlash', { name: c.name })} className="h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" />
                                    <button type="button" onClick={() => navigate(`/customers/${c.customer_id}`)} className="min-w-0 flex-1 text-left text-[15px] leading-snug">
                                        <span className="block truncate font-bold">{c.name}</span>
                                        <span className="block text-[13px] text-ink-3">
                                            <span className="font-semibold text-debt">{t("{n} kun o'tdi", { n: c.days_overdue })}</span>
                                            <span className="md:hidden"> · {smsCell(c)}</span>
                                            {c.debts_count > 1 && ` · ${t('{n} nasiya', { n: c.debts_count })}`}
                                        </span>
                                    </button>
                                    <span className="hidden w-32 text-right text-sm text-ink-2 md:block">{formatPhone(c.phone)}</span>
                                    <span className="hidden w-28 text-sm text-ink-2 md:block">{smsCell(c)}{c.reminders_sent > 0 && ` · ${c.reminders_sent}×`}</span>
                                    <Money value={c.overdue_amount} tone="debt" className="w-28 text-right text-[15px]" />
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>

            {selected.size > 0 && (
                <div className="fixed inset-x-0 bottom-[68px] z-20 px-4 md:bottom-4 md:left-24 lg:left-[248px]">
                    <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-[18px] bg-ink p-3 text-card shadow-xl sm:flex-row sm:items-center">
                        <p className="flex-1 px-1 text-sm">
                            <strong>{t('{n} ta tanlandi.', { n: selected.size })}</strong> {estimate ? estimateText : t('Hisoblanmoqda…')}
                            {estimate?.insufficient_balance && <span className="mt-1 inline-block rounded-lg bg-debt-soft px-2 py-0.5 font-semibold text-debt">{t('Balans yetmaydi —')} <Link to="/subscription" className="underline">{t("to'ldirish")}</Link></span>}
                        </p>
                        <Button icon={Send} disabled={!estimate?.will_send || session.readOnly} onClick={() => setConfirm(true)}>
                            {t('Tanlanganlarga SMS ({n})', { n: estimate?.will_send ?? selected.size })}
                        </Button>
                    </div>
                </div>
            )}

            <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={send} title={t('Eslatma SMS yuborish')} confirmText={t('Yuborish')}
                text={estimate && [
                    `${estimateText}.`,
                    estimate.skipped?.length ? t("{n} mijozga yuborilmaydi (raqami yo'q yoki bugun eslatma ketgan).", { n: estimate.skipped.length }) : null,
                    estimate.estimated_cost ? t('Balansdan {amount} yechiladi.', { amount: formatMoney(estimate.estimated_cost) }) : null
                ].filter(Boolean).join(' ')} />
        </div>
    )
}

