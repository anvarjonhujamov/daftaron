import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, Eraser, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { shopsApi } from '../api/shops.api'
import { customersApi } from '../api/customers.api'
import { locationsApi } from '../api/settings.api'
import { useSession } from '../app/session'
import { emitChange, useResource } from '../lib/hooks'
import { setUser } from '../lib/session'
import { errorMessage, fieldErrors } from '../lib/errors'
import LocationFields from '../features/LocationFields'
import { Card, EmptyState, ErrorState, ListSkeleton, Money, PageHeader, Pill } from '../ui/display'
import { Button, Checkbox, Chips, Input, Select } from '../ui/controls'
import { Confirm, Sheet } from '../ui/Sheet'
import { CodeInput } from './LoginPage'
import { formatNumber } from '../utils/format'

// Ta'rif bo'yicha do'konlar limiti (javob shakli: used / total_limit yoki shunga o'xshash)
const usageText = (u) => {
    if (!u) return null
    const used = u.used ?? u.shop_used
    const total = u.total_limit ?? u.total ?? u.shop_total_limit
    if (used === undefined) return null
    return total === null || total === undefined ? `Do'konlar: ${used} ta (cheksiz)` : `Ta'rifingizda ${total} tagacha do'kon. Hozir: ${used} ta.`
}

export default function ShopsPage() {
    const session = useSession()
    const navigate = useNavigate()
    const res = useResource(() => shopsApi.overview(), [], { cacheKey: 'shops' })
    const [form, setForm] = useState(null)
    const [switching, setSwitching] = useState(null)
    const [confirm, setConfirm] = useState(null)
    const [purge, setPurge] = useState(null)
    const [transfer, setTransfer] = useState(false)

    const shops = res.data?.data || []
    const activeId = res.data?.active_tenant_id ?? session.user?.tenant_id
    const totalDebt = shops.reduce((s, x) => s + Number(x.stats?.total_debt || 0), 0)

    // Do'kon almashtirish: butun ilova shu do'konga o'tadi (X-Tenant-Id)
    const switchTo = async (shop) => {
        setSwitching(shop.id)
        try {
            await shopsApi.setActive(shop.id)
            setUser({ ...session.user, tenant_id: shop.id })
            await session.refresh()
            emitChange('shop')
            toast.success(`${shop.name} tanlandi`)
            navigate('/')
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setSwitching(null)
        }
    }

    const remove = async () => {
        try {
            await shopsApi.remove(confirm.id)
            toast.success("Do'kon o'chirildi")
            setConfirm(null)
            await session.refresh()
            res.reload()
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    if (!session.isOwner) return <div className="page"><PageHeader back title="Do'konlar" /><EmptyState icon={Store} title="Do'konlarni faqat egasi boshqaradi" /></div>

    return (
        <div className="page">
            <PageHeader back title="Do'konlar" subtitle="Do'konni tanlang — butun ilova shu do'konga o'tadi."
                actions={!session.readOnly && <Button icon={Plus} onClick={() => setForm({})}>Do'kon</Button>} />
            {usageText(res.data?.usage) && <p className="mb-3 rounded-xl bg-brand-soft px-3.5 py-2.5 text-sm font-semibold text-brand-strong">{usageText(res.data.usage)}</p>}
            {res.error && !res.data ? <ErrorState onRetry={res.reload} /> : res.loading && !res.data ? <ListSkeleton rows={2} /> : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {shops.map((s) => {
                        const active = s.id === activeId
                        return (
                            <Card key={s.id} className={active ? 'border-2 border-brand p-4' : 'p-4'}>
                                <div className="flex items-start gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Store size={22} aria-hidden /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-base font-bold">{s.name}</p>
                                        <p className="text-[13px] text-ink-2">{s.address || 'Manzil kiritilmagan'} · SMS'da: «{s.sms_name || s.name}»</p>
                                    </div>
                                    {active && <Pill tone="info">Hozir tanlangan</Pill>}
                                </div>
                                <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-soft/70 p-3 text-sm">
                                    <div><div className="text-ink-2">Mijoz</div><strong>{formatNumber(s.stats?.customers)}</strong></div>
                                    <div className="col-span-1"><div className="text-ink-2">Qarz</div><Money value={s.stats?.total_debt} tone="debt" /></div>
                                    <div><div className="text-ink-2">Xodim</div><strong>{formatNumber(s.stats?.staff)}</strong></div>
                                    <div><div className="text-ink-2">Kechikkan</div><strong className={s.stats?.overdue_count ? 'text-debt' : ''}>{formatNumber(s.stats?.overdue_count)}</strong></div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {!active && <Button size="sm" loading={switching === s.id} onClick={() => switchTo(s)}>O'tish</Button>}
                                    {s.is_owner !== false && !session.readOnly && (
                                        <>
                                            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setForm(s)}>Tahrirlash</Button>
                                            {active && shops.length > 1 && <Button size="sm" variant="secondary" icon={ArrowRightLeft} onClick={() => setTransfer(true)}>Mijozlarni ko'chirish</Button>}
                                            <Button size="sm" variant="danger-ghost" icon={Eraser} onClick={() => setPurge(s)}>Ma'lumotlarni tozalash</Button>
                                            {!active && <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setConfirm(s)}>O'chirish</Button>}
                                        </>
                                    )}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
            {shops.length > 1 && <p className="mt-4 text-[15px] text-ink-2">Barcha do'konlar bo'yicha jami qarz: <strong className="text-ink">{formatNumber(totalDebt)} so'm</strong></p>}

            <ShopFormSheet open={!!form} shop={form?.id ? form : null} onClose={() => setForm(null)} onSaved={async () => { setForm(null); await session.refresh(); res.reload() }} />
            <TransferSheet open={transfer} from={activeId} shops={shops.filter((s) => s.id !== activeId)} onClose={() => setTransfer(false)} onDone={() => { setTransfer(false); res.reload(); emitChange('customers') }} />
            <PurgeSheet shop={purge} onClose={() => setPurge(null)} onDone={() => { setPurge(null); res.reload(); emitChange('shop') }} />
            <Confirm open={!!confirm} onClose={() => setConfirm(null)} onConfirm={remove} danger title="Do'konni o'chirish"
                text={confirm && `«${confirm.name}» va undagi barcha mijoz, nasiya va to'lovlar o'chiriladi.`} confirmText="O'chirish" />
        </div>
    )
}

function ShopFormSheet({ open, shop, onClose, onSaved }) {
    const editing = !!shop
    const [f, setF] = useState({})
    const [categories, setCategories] = useState([])
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!open) return
        setErrors({})
        setF({ name: shop?.name || '', sms_sender_name: shop?.sms_sender_name || '', address: shop?.address || '',
            category_id: shop?.category_id || null, region_id: shop?.region_id || null, district_id: shop?.district_id || null })
        if (!categories.length) locationsApi.categories().then((r) => setCategories(Array.isArray(r) ? r : r?.data || [])).catch(() => {})
    }, [open, shop])

    const set = (patch) => { setF((x) => ({ ...x, ...patch })); setErrors({}) }

    const submit = async () => {
        const errs = {}
        if (!f.name?.trim()) errs.name = "Do'kon nomini kiriting"
        if (!editing && !f.category_id) errs.category_id = 'Faoliyat turini tanlang'
        if (!editing && !f.region_id) errs.region_id = 'Viloyatni tanlang'
        if (!editing && !f.district_id) errs.district_id = 'Tumanni tanlang'
        setErrors(errs)
        if (Object.keys(errs).length) return
        setBusy(true)
        const payload = { name: f.name.trim(), sms_sender_name: f.sms_sender_name.trim() || null, address: f.address.trim() || null,
            category_id: f.category_id ? Number(f.category_id) : undefined, region_id: f.region_id || undefined, district_id: f.district_id || undefined }
        try {
            if (editing) await shopsApi.update(shop.id, payload)
            else await shopsApi.create(payload)
            toast.success(editing ? 'Saqlandi' : "Do'kon qo'shildi")
            onSaved()
        } catch (err) {
            if (err?.response?.data?.reason === 'plan_limit') toast.error(errorMessage(err))
            else if (err?.response?.data?.errors) setErrors(fieldErrors(err))
            else toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    const smsName = f.sms_sender_name?.trim() || f.name?.trim() || "Do'kon"
    return (
        <Sheet open={open} onClose={onClose} title={editing ? "Do'konni tahrirlash" : "Yangi do'kon"} onSubmit={submit}
            footer={<Button type="submit" size="lg" block loading={busy}>{editing ? 'Saqlash' : "Do'konni qo'shish"}</Button>}>
            <div className="space-y-4">
                <Input label="Do'kon nomi" required value={f.name || ''} onChange={(e) => set({ name: e.target.value })} error={errors.name} autoFocus maxLength={255} />
                <Input size="md" label="SMS'dagi nom" value={f.sms_sender_name || ''} onChange={(e) => set({ sms_sender_name: e.target.value })} maxLength={40}
                    placeholder={f.name || ''} hint={`SMS'da shu nom chiqadi: «${smsName}: qarzingiz…»`} error={errors.sms_sender_name} />
                <Select label="Faoliyat turi" options={categories.map((c) => ({ value: c.id, label: c.name }))} value={f.category_id} onChange={(v) => set({ category_id: v })} error={errors.category_id} />
                <LocationFields value={f} withStreet={false} errors={errors} onChange={(loc) => set(loc)} />
                <Input size="md" label="Manzil" placeholder="Ko'cha, uy, mo'ljal" value={f.address || ''} onChange={(e) => set({ address: e.target.value })} maxLength={500} />
            </div>
        </Sheet>
    )
}

// Mijozlarni (nasiyalari bilan) joriy do'kondan boshqasiga ko'chirish
function TransferSheet({ open, from, shops, onClose, onDone }) {
    const [to, setTo] = useState(null)
    const [selected, setSelected] = useState([])
    const [busy, setBusy] = useState(false)
    const list = useResource(() => customersApi.list({ sort: 'name', per_page: 100 }), [open], { enabled: open })
    useEffect(() => { if (open) { setTo(shops[0]?.id || null); setSelected([]) } }, [open])

    const submit = async () => {
        if (!to || !selected.length) return
        setBusy(true)
        try {
            const r = await shopsApi.transferCustomers(from, to, selected)
            toast.success(`${r.moved?.length || 0} ta mijoz ko'chirildi${r.skipped?.length ? `, ${r.skipped.length} tasi o'tkazib yuborildi (shu raqam u yerda bor)` : ''}`)
            onDone()
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Mijozlarni ko'chirish" subtitle="Nasiya va to'lovlari bilan birga" onSubmit={submit}
            footer={<Button type="submit" size="lg" block loading={busy} disabled={!to || !selected.length}>Ko'chirish ({selected.length})</Button>}>
            <p className="mb-2 text-sm font-semibold">Qaysi do'konga</p>
            <Chips wrap ariaLabel="Qaysi do'konga" value={to} onChange={setTo} options={shops.map((s) => ({ value: s.id, label: s.name }))} />
            <p className="mb-1 mt-4 text-sm font-semibold">Mijozlar</p>
            <div className="divide-y divide-line">
                {(list.data?.data || []).map((c) => (
                    <Checkbox key={c.id} className="py-2.5" label={c.name} description={c.total_debt > 0 ? `qarzi ${formatNumber(c.total_debt)}` : undefined}
                        checked={selected.includes(c.id)} onChange={(on) => setSelected((x) => (on ? [...x, c.id] : x.filter((i) => i !== c.id)))} />
                ))}
                {list.loading && <p className="py-3 text-sm text-ink-2">Yuklanmoqda…</p>}
            </div>
        </Sheet>
    )
}

// Do'kon ma'lumotlarini tozalash: SMS-kod bilan tasdiqlanadi (TZ 17.6)
function PurgeSheet({ shop, onClose, onDone }) {
    const [sent, setSent] = useState(false)
    const [code, setCode] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { setSent(false); setCode('') }, [shop])

    const request = async () => {
        setBusy(true)
        try { await shopsApi.purgeRequest(shop.id); setSent(true) } catch (err) { toast.error(errorMessage(err)) } finally { setBusy(false) }
    }
    const confirm = async (value = code) => {
        setBusy(true)
        try {
            await shopsApi.purgeConfirm(shop.id, value)
            toast.success("Do'kon ma'lumotlari tozalandi")
            onDone()
        } catch (err) {
            toast.error(errorMessage(err))
            setCode('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={!!shop} onClose={onClose} title="Ma'lumotlarni tozalash" width={480}
            footer={sent
                ? <Button variant="danger" size="lg" block loading={busy} disabled={code.length < 4} onClick={() => confirm()}>Tozalash</Button>
                : <Button variant="danger" size="lg" block loading={busy} onClick={request}>SMS-kod olish</Button>}>
            <p className="text-[15px] leading-relaxed text-ink-2">
                «{shop?.name}» do'konidagi barcha mijozlar, nasiyalar va to'lovlar o'chiriladi. Do'konning o'zi qoladi. Tasdiqlash uchun telefoningizga kod yuboriladi.
            </p>
            {sent && <div className="mt-5"><CodeInput value={code} onChange={setCode} onComplete={confirm} /></div>}
        </Sheet>
    )
}
