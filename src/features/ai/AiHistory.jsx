import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { aiApi } from '../../api/ai.api'
import { Button, cx } from '../../ui/controls'
import { EmptyState, ErrorState, Skeleton } from '../../ui/display'
import { formatDateTime } from '../../utils/date'
import { t } from '../../i18n'

// Suhbatlar ro'yxati (GET /ai/conversations, eng yangisi birinchi). O'chirishni tasdiqlash oynasi panel tashqarisida
// (AiPanel) — Esc faqat o'sha oynani yopsin. removedId — o'chirilgan suhbat ro'yxatdan olib tashlanadi.
export default function AiHistory({ currentId, onOpen, onDelete, removedId }) {
    const [items, setItems] = useState([])
    const [page, setPage] = useState(0)
    const [lastPage, setLastPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const seq = useRef(0)

    const load = useCallback(async (next) => {
        const id = ++seq.current
        setLoading(true)
        setError(null)
        try {
            const r = await aiApi.conversations(next)
            if (id !== seq.current) return
            const list = Array.isArray(r?.data) ? r.data : []
            setItems((prev) => {
                const base = next === 1 ? [] : prev
                const seen = new Set(base.map((c) => c.id))
                return [...base, ...list.filter((c) => !seen.has(c.id))]
            })
            setPage(r?.meta?.current_page || next)
            setLastPage(r?.meta?.last_page || next)
        } catch (err) {
            if (id === seq.current) setError(err)
        } finally {
            if (id === seq.current) setLoading(false)
        }
    }, [])

    useEffect(() => { load(1) }, [load])
    useEffect(() => {
        if (removedId) setItems((list) => list.filter((c) => c.id !== removedId))
    }, [removedId])

    if (loading && !items.length) {
        return (
            <div className="space-y-2 p-3" aria-busy="true" aria-label={t('Yuklanmoqda')}>
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2 rounded-xl bg-card px-3 py-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
                ))}
            </div>
        )
    }
    if (error && !items.length) return <ErrorState text={t("Suhbatlarni yuklab bo'lmadi.")} onRetry={() => load(1)} />
    if (!items.length) {
        return <EmptyState icon={MessageSquare} title={t("Hali suhbat yo'q")} text={t('Savol bering — suhbatlar shu yerda saqlanadi.')} />
    }

    return (
        <div className="p-3">
            <ul className="space-y-1.5">
                {items.map((c) => {
                    const current = c.id === currentId
                    return (
                        <li key={c.id} className={cx('flex items-center rounded-xl border', current ? 'border-brand/40 bg-brand-soft' : 'border-line bg-card')}>
                            <button type="button" onClick={() => onOpen(c.id)} aria-current={current ? 'true' : undefined}
                                className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-left hover:bg-soft/60">
                                <span className="block truncate text-[15px] font-semibold text-ink">{c.title || t('Nomsiz suhbat')}</span>
                                <span className="block text-[13px] text-ink-3">{formatDateTime(c.updated_at || c.created_at)}</span>
                            </button>
                            <button type="button" onClick={() => onDelete(c)} aria-label={t("Suhbatni o'chirish")} title={t("Suhbatni o'chirish")}
                                className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-3 hover:bg-debt-soft hover:text-debt">
                                <Trash2 size={18} aria-hidden />
                            </button>
                        </li>
                    )
                })}
            </ul>
            {page < lastPage && (
                <Button variant="secondary" block className="mt-3" loading={loading} onClick={() => load(page + 1)}>{t("Ko'proq ko'rsatish")}</Button>
            )}
            {error && items.length > 0 && <p role="alert" className="mt-2 text-center text-[13px] text-debt">{t("Suhbatlarni yuklab bo'lmadi.")}</p>}
        </div>
    )
}
