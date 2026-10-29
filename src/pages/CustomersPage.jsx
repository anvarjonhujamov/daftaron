import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { customersApi } from '../api/customers.api'
import { useSession } from '../app/session'
import { useDebounced, useOnChange, useResource } from '../lib/hooks'
import { Avatar, EmptyState, ErrorState, List, ListSkeleton, Money, PageHeader, Pill, Row, Table } from '../ui/display'
import { Button, Chips, cx } from '../ui/controls'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'

const SORTS = [
    { value: 'debt', label: "Qarz bo'yicha, ko'pdan kamga" },
    { value: 'overdue_first', label: "Muddati o'tganlar avval" },
    { value: 'last_activity', label: 'Oxirgi amal' },
    { value: 'newest', label: "Yangi qo'shilgan" },
    { value: 'name', label: 'Ism (A–Z)' }
]

const status = (c) => c.overdue_debt > 0
    ? <Pill tone="danger">Muddati o'tgan</Pill>
    : c.total_debt > 0 ? null : <Pill tone="success">To'langan</Pill>

// /customers — ro'yxat; /customers/:id — planshetda (900px+) chapda ro'yxat, o'ngda karta; kompyuterda karta to'liq
export default function CustomersPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const session = useSession()
    const [params, setParams] = useSearchParams()
    const [q, setQ] = useState(params.get('q') || '')
    const filter = params.get('filter') || 'all'
    const sort = params.get('sort') || 'debt'
    const query = useDebounced(q.trim(), 300)
    const [pages, setPages] = useState(1)
    const [extra, setExtra] = useState([])

    const setParam = (key, value) => setParams((p) => {
        const next = new URLSearchParams(p)
        value ? next.set(key, value) : next.delete(key)
        return next
    }, { replace: true })

    useEffect(() => { setParam('q', query) }, [query])

    const res = useResource(
        () => customersApi.list({ q: query || undefined, sort, with_debt: filter === 'debt' ? 1 : undefined, page: 1 }),
        [query, sort, filter],
        { cacheKey: !query && filter === 'all' && sort === 'debt' ? 'customers_first' : undefined }
    )
    useOnChange(() => res.reload())
    useEffect(() => { setPages(1); setExtra([]) }, [query, sort, filter])

    const loadMore = async () => {
        const next = pages + 1
        const r = await customersApi.list({ q: query || undefined, sort, with_debt: filter === 'debt' ? 1 : undefined, page: next })
        setExtra((e) => [...e, ...(r.data || [])])
        setPages(next)
    }

    const list = [...(res.data?.data || []), ...extra]
    const meta = res.data?.meta
    const hasMore = meta && pages < meta.last_page
    const split = !!id

    const listView = (
        <>
            <label className="flex h-12 items-center gap-2.5 rounded-ctl border-[1.5px] border-line-2 bg-card px-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <Search size={20} className="shrink-0 text-ink-3" aria-hidden />
                <input data-search value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon yoki oxirgi 4 raqam" aria-label="Mijozni qidirish"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-ink-3" />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chips size="sm" ariaLabel="Filtr" value={filter} onChange={(v) => setParam('filter', v === 'all' ? '' : v)} className="flex-none"
                    options={[{ value: 'all', label: 'Barchasi' }, { value: 'debt', label: 'Qarzdor' }]} wrap />
                <Link to="/overdue" className="inline-flex h-9 items-center rounded-xl border-[1.5px] border-line-2 bg-card px-3.5 text-sm font-semibold hover:bg-soft">Muddati o'tgan</Link>
                <select value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Saralash"
                    className={cx('h-9 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm font-semibold text-ink', !split && 'md:ml-auto')}>
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
            <div className="mt-3">
                {res.error && !res.data ? <ErrorState onRetry={res.reload} /> : res.loading && !res.data ? <ListSkeleton /> : list.length === 0 ? (
                    <EmptyState icon={Users} title={query ? 'Mijoz topilmadi' : "Hali mijoz yo'q"}
                        text={query ? "Boshqa ism yoki raqam bilan qidirib ko'ring." : "Birinchi mijozni qo'shing — keyin unga nasiya yozasiz."}
                        action={session.can('customer.edit') && <Button icon={Plus} onClick={() => navigate('/customers/new')}>Mijoz qo'shish</Button>} />
                ) : (
                    <>
                        <List className={cx(!split && 'lg:hidden')}>
                            {list.map((c) => (
                                <Row key={c.id} to={`/customers/${c.id}${window.location.search}`} left={<Avatar name={c.name} />} title={c.name} subtitle={formatPhone(c.phone)}
                                    className={cx(String(c.id) === id && 'bg-brand-soft')}
                                    right={<>{c.total_debt > 0 && <Money value={c.total_debt} tone="debt" className="block text-[15px]" />}{status(c)}</>} />
                            ))}
                        </List>
                        {!split && (
                            <Table
                                className="hidden lg:block"
                                rows={list}
                                onRowClick={(c) => navigate(`/customers/${c.id}`)}
                                columns={[
                                    { key: 'name', label: 'Mijoz', render: (c) => <span className="flex items-center gap-3 font-bold"><Avatar name={c.name} size={32} />{c.name}</span> },
                                    { key: 'phone', label: 'Telefon', render: (c) => <span className="text-ink-2">{formatPhone(c.phone)}</span> },
                                    { key: 'total_debt', label: "Qarz, so'm", align: 'right', render: (c) => c.total_debt > 0 ? <Money value={c.total_debt} tone="debt" /> : <span className="text-ink-3">0</span> },
                                    { key: 'overdue_debt', label: "Muddati o'tgan", align: 'right', render: (c) => c.overdue_debt > 0 ? <Money value={c.overdue_debt} tone="debt" /> : <span className="text-ink-3">—</span> },
                                    { key: 'last', label: 'Oxirgi amal', render: (c) => <span className="text-ink-2">{formatDate(c.last_activity_at)}</span> }
                                ]}
                            />
                        )}
                        {hasMore && <Button variant="secondary" block className="mt-3" onClick={loadMore}>Yana ko'rsatish</Button>}
                    </>
                )}
            </div>
        </>
    )

    return (
        <div className={cx('page', split && 'min-[900px]:flex min-[900px]:max-w-none min-[900px]:gap-6 lg:block lg:max-w-6xl')}>
            <section className={cx(split && 'hidden min-[900px]:block min-[900px]:w-[300px] min-[900px]:shrink-0 lg:hidden')} aria-label="Mijozlar ro'yxati">
                <PageHeader
                    title={<>Mijozlar {meta?.total !== undefined && <span className="text-ink-3">{formatNumber(meta.total)}</span>}</>}
                    actions={session.can('customer.edit') && <Button icon={Plus} onClick={() => navigate('/customers/new')}>Mijoz</Button>}
                />
                {listView}
            </section>
            {split && <section className="min-w-0 flex-1"><Outlet /></section>}
        </div>
    )
}
