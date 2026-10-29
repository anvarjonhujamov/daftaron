import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Search, AlertTriangle } from 'lucide-react'
import { suppliersApi, clearUnsyncedSupplierRecords, getUnsyncedSupplierRecords, SUPPLIER_MIGRATION_EVENT } from '../api/suppliers.api'
import { useSession } from '../app/session'
import { useOnChange, useResource } from '../lib/hooks'
import { SupplierFormSheet, SupplierTxSheet } from '../features/SupplierSheets'
import { Avatar, Card, EmptyState, ErrorState, KpiCard, List, ListSkeleton, Money, PageHeader, Row, Table } from '../ui/display'
import { Button } from '../ui/controls'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'
import { useEffect } from 'react'

const balance = (s) => (Number(s.current_debt) > 0
    ? <><Money value={s.current_debt} tone="supp" className="block text-[15px]" /><span className="text-xs text-ink-2">{s.is_overdue ? <span className="font-semibold text-debt">muddati o'tgan</span> : 'qarzimiz'}</span></>
    : <span className="text-sm font-semibold text-ink-2">Hisob teng</span>)

export default function SuppliersPage() {
    const navigate = useNavigate()
    const session = useSession()
    const list = useResource(() => suppliersApi.list(), [], { cacheKey: 'suppliers' })
    const stats = useResource(() => suppliersApi.statistics(), [], { cacheKey: 'suppliers_stats' })
    const [q, setQ] = useState('')
    const [form, setForm] = useState(false)
    const [purchaseFor, setPurchaseFor] = useState(null)
    const [unsynced, setUnsynced] = useState(getUnsyncedSupplierRecords)
    useOnChange(() => { list.reload(); stats.reload() })
    useEffect(() => {
        const h = () => { setUnsynced(getUnsyncedSupplierRecords()); list.reload(); stats.reload() }
        window.addEventListener(SUPPLIER_MIGRATION_EVENT, h)
        return () => window.removeEventListener(SUPPLIER_MIGRATION_EVENT, h)
    }, [])

    const canManage = session.can('suppliers.manage') && !session.readOnly
    const s = stats.data || {}
    const rows = useMemo(() => {
        const term = q.trim().toLowerCase()
        const digits = term.replace(/\D/g, '')
        return (list.data || [])
            .filter((x) => !term || x.name?.toLowerCase().includes(term) || (digits && (String(x.phone || '').includes(digits) || String(x.inn || '').includes(digits))))
            .sort((a, b) => Number(b.current_debt || 0) - Number(a.current_debt || 0))
    }, [list.data, q])

    return (
        <div className="page">
            <PageHeader back title="Ta'minotchilar" actions={canManage && <Button icon={Plus} onClick={() => setForm(true)}>Qo'shish</Button>} />

            {unsynced.length > 0 && (
                <Card className="mb-4 border-[1.5px] border-warn p-4">
                    <p className="flex items-center gap-2 font-bold text-warn"><AlertTriangle size={18} aria-hidden /> {unsynced.length} ta eski yozuv serverga yuborilmadi</p>
                    <ul className="mt-2 space-y-1 text-sm text-ink-2">
                        {unsynced.slice(0, 5).map((r, i) => <li key={i}>{r.supplier_name || `#${r.supplier_id}`}: {r.kind === 'debt' ? 'xarid' : "to'lov"} {formatNumber(r.amount)} ({formatDate(r.transaction_date)}) — {r.reason}</li>)}
                    </ul>
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => { clearUnsyncedSupplierRecords(); setUnsynced([]) }}>Ko'rdim, yashirish</Button>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                <KpiCard label="Bizning qarzimiz" value={s.total_debt ?? null} tone="supp" hint={`${formatNumber(s.in_debt_suppliers ?? 0)} ta ta'minotchiga`} />
                <KpiCard label="Muddati o'tgan" value={s.overdue_debt ?? null} tone="debt" hint={`${formatNumber(s.overdue_suppliers ?? 0)} ta`} />
                <KpiCard label="7 kunda to'lash kerak" value={s.due_soon_amount ?? null} hint={s.due_soon_count !== undefined ? `${s.due_soon_count} ta` : undefined} />
                <KpiCard label="Jami xarid" value={s.total_bought ?? null} hint={`To'langan: ${formatNumber(s.total_paid)}`} />
            </div>

            <label className="mt-4 flex h-12 items-center gap-2.5 rounded-ctl border-[1.5px] border-line-2 bg-card px-3.5 focus-within:border-brand">
                <Search size={20} className="text-ink-3" aria-hidden />
                <input data-search value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, telefon yoki INN" aria-label="Qidirish" className="w-full bg-transparent text-base outline-none" />
            </label>

            <div className="mt-3">
                {list.error && !list.data ? <ErrorState onRetry={list.reload} /> : list.loading && !list.data ? <ListSkeleton /> : rows.length === 0 ? (
                    <EmptyState icon={Package} title={q ? 'Topilmadi' : "Hali ta'minotchi yo'q"} text={!q && "Mol oladigan ta'minotchilarni qo'shing — kimga qancha qarzingiz borligi ko'rinib turadi."}
                        action={canManage && !q && <Button icon={Plus} onClick={() => setForm(true)}>Ta'minotchi qo'shish</Button>} />
                ) : (
                    <>
                        <List className="lg:hidden">
                            {rows.map((x) => (
                                <Row key={x.id} to={`/suppliers/${x.id}`} left={<Avatar name={x.name} />} title={x.name}
                                    subtitle={[formatPhone(x.phone), x.product_type].filter((v) => v && v !== '—').join(' · ')} right={balance(x)} />
                            ))}
                        </List>
                        <Table className="hidden lg:block" rows={rows} onRowClick={(x) => navigate(`/suppliers/${x.id}`)} columns={[
                            { key: 'name', label: "Ta'minotchi", render: (x) => <span className="flex items-center gap-3 font-bold"><Avatar name={x.name} size={32} />{x.name}</span> },
                            { key: 'phone', label: 'Telefon', render: (x) => <span className="text-ink-2">{formatPhone(x.phone)}</span> },
                            { key: 'inn', label: 'INN', render: (x) => <span className="text-ink-2">{x.inn || '—'}</span> },
                            { key: 'product', label: 'Mahsulot', render: (x) => <span className="text-ink-2">{x.product_type || '—'}</span> },
                            { key: 'debt', label: "Qarzimiz, so'm", align: 'right', render: balance }
                        ]} />
                    </>
                )}
            </div>

            <SupplierFormSheet open={form} onClose={() => setForm(false)} onSaved={(saved, andPurchase) => andPurchase ? setPurchaseFor(saved) : navigate(`/suppliers/${saved.id}`)} />
            <SupplierTxSheet open={!!purchaseFor} supplier={purchaseFor} onClose={() => setPurchaseFor(null)} />
        </div>
    )
}
