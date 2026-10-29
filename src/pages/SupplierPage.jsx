import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Paperclip, Pencil, Phone, Plus, Check, Trash2, Truck, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { suppliersApi } from '../api/suppliers.api'
import { useSession } from '../app/session'
import { emitChange, useOnChange, useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { SUPPLIER_METHODS, SupplierFormSheet, SupplierTxSheet } from '../features/SupplierSheets'
import { Card, EmptyState, ErrorState, KpiCard, List, ListSkeleton, Money, PageHeader, Pill, Skeleton } from '../ui/display'
import { Button, Chips, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { dueInfo, formatDate, toYmd } from '../utils/date'
import { formatMoney } from '../utils/format'
import { formatPhone } from '../utils/phone'

export default function SupplierPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const session = useSession()
    const sup = useResource(() => suppliersApi.get(id), [id], { cacheKey: `supplier_${id}` })
    const tx = useResource(() => suppliersApi.transactions(id), [id])
    const [tab, setTab] = useState('all')
    const [txType, setTxType] = useState(null)
    const [editing, setEditing] = useState(false)
    const [confirm, setConfirm] = useState(null) // 'delete' | transaction
    const [opening, setOpening] = useState(null)
    useOnChange(() => { sup.reload(); tx.reload() })

    const s = sup.data
    const items = useMemo(() => [...(tx.data || [])].sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)) || b.id - a.id), [tx.data])
    const nextDue = useMemo(() => items
        .filter((t) => t.type === 'debt' && t.status === 'open' && t.due_date && Number(t.remaining_amount) > 0)
        .sort((a, b) => toYmd(a.due_date).localeCompare(toYmd(b.due_date)))[0], [items])

    if (sup.error && !s) return <div className="page"><ErrorState onRetry={sup.reload} /></div>
    if (!s) return <div className="page space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><ListSkeleton rows={3} /></div>

    const canManage = session.can('suppliers.manage') && !session.readOnly
    const shown = items.filter((t) => tab === 'all' || t.type === tab)
    const due = nextDue && dueInfo(nextDue.due_date)

    const openAttachment = async (t, i) => {
        setOpening(`${t.id}-${i}`)
        try { await suppliersApi.openAttachment(t.id, i) } catch (err) { toast.error(errorMessage(err)) } finally { setOpening(null) }
    }

    const doConfirm = async () => {
        try {
            if (confirm === 'delete') {
                await suppliersApi.remove(s.id)
                toast.success("Ta'minotchi o'chirildi")
                emitChange('suppliers')
                navigate('/suppliers', { replace: true })
            } else {
                await suppliersApi.cancelTransaction(confirm.id)
                toast.success('Bekor qilindi')
                emitChange('suppliers')
            }
            setConfirm(null)
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    return (
        <div className="page">
            <PageHeader back="/suppliers" title={s.name} subtitle={[formatPhone(s.phone), s.product_type].filter((v) => v && v !== '—').join(' · ')}
                actions={canManage && <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}><span className="hidden sm:inline">Tahrirlash</span></Button>} />

            <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
                <div className="space-y-3 lg:sticky lg:top-6">
                    <Card className="p-5">
                        <div className="text-sm font-semibold text-ink-2">Bizning qarzimiz</div>
                        <Money value={s.current_debt} tone={Number(s.current_debt) > 0 ? 'supp' : 'muted'} suffix className="text-[32px] tracking-tight" />
                        {nextDue && (
                            <div className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-sm">
                                <div className="text-ink-2">Kelishilgan to'lov sanasi</div>
                                <div className="flex items-center gap-2 font-bold">{formatDate(nextDue.due_date)} {due && <Pill tone={due.tone === 'muted' ? 'info' : due.tone}>{due.label}</Pill>}</div>
                            </div>
                        )}
                    </Card>
                    <div className="grid grid-cols-2 gap-2">
                        <KpiCard label="Jami xarid" value={s.total_bought} />
                        <KpiCard label="Jami to'lov" value={s.total_paid} tone="pay" />
                    </div>
                    {canManage && (
                        <div className="grid grid-cols-2 gap-2">
                            <Button size="lg" icon={Plus} onClick={() => setTxType('debt')}>Xarid</Button>
                            <Button size="lg" variant="pay" icon={Check} disabled={!(Number(s.current_debt) > 0)} onClick={() => setTxType('payment')}>To'lov qildim</Button>
                        </div>
                    )}
                    <Card className="space-y-2.5 p-4 text-[15px]">
                        {[['Kompaniya', s.company_name], ['INN', s.inn], ['Manzil', s.address], ['Izoh', s.note]].filter(([, v]) => v).map(([k, v]) => (
                            <div key={k}><div className="text-[13px] text-ink-2">{k}</div><div className="font-semibold">{v}</div></div>
                        ))}
                        <div className="flex gap-2 pt-1">
                            {s.phone && <Button size="sm" variant="secondary" icon={Phone} onClick={() => { window.location.href = `tel:${s.phone}` }}>Qo'ng'iroq</Button>}
                            {canManage && <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setConfirm('delete')}>O'chirish</Button>}
                        </div>
                    </Card>
                </div>

                <div className="mt-5 min-w-0 lg:mt-0">
                    <Chips ariaLabel="Operatsiyalar" value={tab} onChange={setTab} options={[
                        { value: 'all', label: 'Hammasi' }, { value: 'debt', label: 'Xaridlar' }, { value: 'payment', label: "To'lovlar" }
                    ]} />
                    <div className="mt-3">
                        {tx.error && !tx.data ? <ErrorState onRetry={tx.reload} /> : tx.loading && !tx.data ? <ListSkeleton rows={3} /> : shown.length === 0 ? (
                            <EmptyState icon={Truck} title="Operatsiya yo'q" />
                        ) : (
                            <List>
                                {shown.map((t) => {
                                    const canceled = t.status === 'canceled'
                                    const isDebt = t.type === 'debt'
                                    return (
                                        <div key={t.id} className={cx('flex gap-3 px-3.5 py-3', canceled && 'opacity-60')}>
                                            <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', isDebt ? 'bg-supp-soft text-supp' : 'bg-pay-soft text-pay')}>
                                                {isDebt ? <Truck size={16} aria-hidden /> : <ArrowUp size={16} aria-hidden />}
                                            </span>
                                            <div className="min-w-0 flex-1 text-[15px] leading-snug">
                                                <div className="font-bold">
                                                    {isDebt ? 'Xarid' : "To'lov"}{t.payment_method && ` · ${SUPPLIER_METHODS[t.payment_method] || t.payment_method}`}{t.doc_number && ` · ${t.doc_number}`}
                                                    {canceled && <Pill tone="muted" className="ml-2">Bekor qilingan</Pill>}
                                                </div>
                                                <div className="text-[13px] text-ink-3">
                                                    {formatDate(t.transaction_date)}{isDebt && t.due_date && ` · muddat ${formatDate(t.due_date)}`}{t.description && ` · ${t.description}`}
                                                </div>
                                                {(t.attachments || []).length > 0 && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {t.attachments.map((a, i) => (
                                                            <Button key={i} size="sm" variant="soft" icon={Paperclip} loading={opening === `${t.id}-${i}`} onClick={() => openAttachment(t, i)}>
                                                                {a.name || `Fayl ${i + 1}`}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <Money value={t.amount} tone={isDebt ? 'supp' : 'pay'} sign={isDebt ? '+' : '−'} className={cx('text-[15px]', canceled && 'line-through')} />
                                                {!canceled && canManage && <button type="button" onClick={() => setConfirm(t)} className="mt-1 block text-[13px] font-semibold text-debt">Bekor qilish</button>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </List>
                        )}
                    </div>
                </div>
            </div>

            <SupplierTxSheet open={!!txType} initialType={txType || 'debt'} supplier={s} onClose={() => setTxType(null)} />
            <SupplierFormSheet open={editing} supplier={s} onClose={() => setEditing(false)} />
            <Confirm open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doConfirm} danger
                title={confirm === 'delete' ? "Ta'minotchini o'chirish" : 'Operatsiyani bekor qilish'}
                text={confirm === 'delete'
                    ? "Ta'minotchi va unga tegishli barcha xarid va to'lovlar o'chiriladi."
                    : confirm && `${confirm.type === 'debt' ? 'Xarid' : "To'lov"} ${formatMoney(confirm.amount)} bekor qilinadi, qarzdorlik qayta hisoblanadi.`}
                confirmText={confirm === 'delete' ? "O'chirish" : 'Bekor qilish'} />
        </div>
    )
}
