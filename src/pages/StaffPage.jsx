import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Pause, Pencil, Play, Plus, Trash2, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'
import { staffApi } from '../api/staff.api'
import { shopsApi } from '../api/shops.api'
import { useSession } from '../app/session'
import { useResource } from '../lib/hooks'
import { errorMessage, fieldErrors } from '../lib/errors'
import { passwordProblem } from './ForgotPasswordPage'
import { Avatar, Card, EmptyState, ErrorState, ListSkeleton, Money, PageHeader, Pill, SectionTitle } from '../ui/display'
import { Button, Checkbox, Chips, Input, PhoneInput } from '../ui/controls'
import { Confirm, Sheet } from '../ui/Sheet'
import { formatDate, formatDateTime } from '../utils/date'
import { formatNumber } from '../utils/format'
import { formatPhone, isValidPhone, toApiPhone } from '../utils/phone'
import { t, tk, tOpts } from '../i18n'

const ROLES = [
    { value: 'cashier', label: tk('Kassir') },
    { value: 'seller', label: tk('Sotuvchi') },
    { value: 'shop_manager', label: tk('Menejer') }
]
const roleLabel = (r) => t(ROLES.find((x) => x.value === r)?.label) || r
const STATUS = {
    active: { tone: 'success', label: tk('Faol') },
    invited: { tone: 'info', label: tk('Taklif yuborildi') },
    suspended: { tone: 'warn', label: tk("To'xtatilgan") },
    removed: { tone: 'muted', label: tk("O'chirilgan") }
}
// Faqat egasiga tegishli huquqlar xodimga berilmaydi (TZ 28.8)
const OWNER_ONLY = ['staff.manage', 'settings.manage']

export default function StaffPage() {
    const session = useSession()
    const navigate = useNavigate()
    const res = useResource(() => staffApi.list(), [], { cacheKey: 'staff', enabled: session.can('staff.manage') })
    const catalog = useResource(() => staffApi.permissions(), [], { cacheKey: 'staff_catalog', enabled: session.can('staff.manage') })
    const shops = useResource(() => shopsApi.overview(), [], { cacheKey: 'shops', enabled: session.can('staff.manage') })
    const [form, setForm] = useState(null) // {} — yangi, staff — tahrirlash
    const [details, setDetails] = useState(null)
    const [confirm, setConfirm] = useState(null)

    if (!session.can('staff.manage')) {
        return <div className="page"><PageHeader back title={t('Xodimlar')} /><EmptyState icon={UserCog} title={t("Xodimlarni faqat do'kon egasi boshqaradi")} /></div>
    }

    const list = res.data?.data || []
    // Ta'rif bo'yicha xodim limiti: GET /staff → usage { total, used }, null — cheksiz
    const usage = res.data?.usage
    const workerTotal = usage ? usage.total : session.subscription?.usage?.worker_total_limit
    const workerUsed = usage ? usage.used : session.subscription?.usage?.worker_used
    const canAdd = workerTotal === null || workerTotal === undefined || workerUsed === undefined || Number(workerUsed) < Number(workerTotal)
    const addButton = (label) => (canAdd
        ? <Button icon={Plus} onClick={() => setForm({})}>{label}</Button>
        : <Button variant="secondary" icon={Lock} onClick={() => navigate('/subscription')}>{label}</Button>)
    const labels = Object.fromEntries((catalog.data?.permissions || []).map((p) => [p.key, p.label]))

    const run = async (fn, msg) => {
        try { await fn(); toast.success(msg); res.reload() } catch (err) { toast.error(errorMessage(err)) } finally { setConfirm(null) }
    }

    return (
        <div className="page">
            <PageHeader back title={t('Xodimlar')} actions={!session.readOnly && addButton(t('Xodim'))} />
            {!canAdd && !session.readOnly && (
                <p className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-ink">
                    <span>{Number(workerTotal) === 0 ? t("Joriy ta'rifda xodim qo'shib bo'lmaydi.") : t("Ta'rifingizda {n} tagacha xodim — limit tugagan.", { n: formatNumber(workerTotal) })} {t("Yuqoriroq ta'rifga o'ting.")}</span>
                    <Button size="sm" onClick={() => navigate('/subscription')}>{t("Ta'riflar")}</Button>
                </p>
            )}
            {res.error && !res.data ? <ErrorState onRetry={res.reload} /> : res.loading && !res.data ? <ListSkeleton rows={3} /> : list.length === 0 ? (
                <EmptyState icon={UserCog} title={t("Hali xodim yo'q")} text={t("Xodim o'z raqami bilan kod orqali kiradi. Parol bermaysiz.")} action={!session.readOnly && addButton(t("Xodim qo'shish"))} />
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {list.map((s) => {
                        const st = STATUS[s.status] || STATUS.active
                        return (
                            <Card key={s.id} className="p-4">
                                <button type="button" onClick={() => setDetails(s)} className="flex w-full items-center gap-3 text-left">
                                    <Avatar name={s.name} size={44} />
                                    <span className="min-w-0 flex-1 leading-snug">
                                        <span className="block truncate text-base font-bold">{s.name}</span>
                                        <span className="block text-[13px] text-ink-2">{formatPhone(s.phone)} · {roleLabel(s.staff_role)}</span>
                                    </span>
                                    <Pill tone={st.tone}>{t(st.label)}</Pill>
                                </button>
                                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-soft/70 p-3 text-sm">
                                    <div><div className="text-ink-2">{t('Nasiya')}</div><strong>{t('{n} ta', { n: formatNumber(s.stats?.debt_count) })}</strong></div>
                                    <div><div className="text-ink-2">{t('Berdi')}</div><Money value={s.stats?.debt_total} tone="debt" /></div>
                                    <div><div className="text-ink-2">{t('Undirdi')}</div><Money value={s.stats?.payment_total} tone="pay" /></div>
                                </div>
                                <p className="mt-2.5 text-[13px] text-ink-2">{(s.permissions || []).map((p) => labels[p] || p).join(' · ') || t("Huquq berilmagan")}</p>
                                {!session.readOnly && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setForm(s)}>{t('Tahrirlash')}</Button>
                                        {s.status === 'suspended'
                                            ? <Button size="sm" variant="secondary" icon={Play} onClick={() => run(() => staffApi.activate(s.id), t('Faollashtirildi'))}>{t('Faollashtirish')}</Button>
                                            : <Button size="sm" variant="secondary" icon={Pause} onClick={() => setConfirm({ kind: 'suspend', s })}>{t("To'xtatish")}</Button>}
                                        <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setConfirm({ kind: 'remove', s })}>{t("O'chirish")}</Button>
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}
            <p className="mt-4 text-[13px] text-ink-2">{t("Xodim o'z raqami bilan kod orqali kiradi. Ko'rsatkichlar — joriy oy.")}</p>

            <StaffFormSheet open={!!form} staff={form?.id ? form : null} catalog={catalog.data} tenants={shops.data?.data || []} activeTenantId={session.user?.tenant_id}
                onClose={() => setForm(null)} onSaved={() => { setForm(null); res.reload() }} />
            <StaffDetailsSheet staff={details} onClose={() => setDetails(null)} />
            <Confirm open={!!confirm} onClose={() => setConfirm(null)} danger={confirm?.kind === 'remove'}
                title={confirm?.kind === 'remove' ? t("Xodimni o'chirish") : t("Vaqtincha to'xtatish")}
                text={confirm?.kind === 'remove'
                    ? t("{name} endi kira olmaydi. U yozgan nasiya va to'lovlar saqlanadi.", { name: confirm.s.name })
                    : confirm && t('{name} barcha qurilmalardan chiqariladi va qayta faollashtirilguncha kira olmaydi.', { name: confirm.s.name })}
                confirmText={confirm?.kind === 'remove' ? t("O'chirish") : t("To'xtatish")}
                onConfirm={() => confirm.kind === 'remove'
                    ? run(() => staffApi.remove(confirm.s.id), t("Xodim o'chirildi"))
                    : run(() => staffApi.suspend(confirm.s.id), t("To'xtatildi"))} />
        </div>
    )
}

function StaffFormSheet({ open, staff, catalog, tenants, activeTenantId, onClose, onSaved }) {
    const editing = !!staff
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState('seller')
    const [perms, setPerms] = useState([])
    const [shops, setShops] = useState([])
    const [method, setMethod] = useState('otp')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    const defaults = (r) => catalog?.roles?.find((x) => x.key === r)?.default_permissions || []

    useEffect(() => {
        if (!open) return
        setErrors({})
        setName(staff?.name || '')
        setPhone('')
        setRole(staff?.staff_role || 'seller')
        setPerms(staff?.permissions || defaults('seller'))
        setShops(activeTenantId ? [activeTenantId] : [])
        setMethod('otp')
        setPassword('')
    }, [open, staff])

    const ownShops = tenants.filter((t) => t.is_owner !== false)
    const permissions = (catalog?.permissions || []).filter((p) => !OWNER_ONLY.includes(p.key))

    const submit = async () => {
        const errs = {}
        if (!name.trim()) errs.name = t('Ismni kiriting')
        if (!editing && !isValidPhone(phone)) errs.phone = t("Raqam to'liq emas")
        if (!editing && method === 'password' && passwordProblem(password)) errs.password = passwordProblem(password)
        setErrors(errs)
        if (Object.keys(errs).length) return
        setBusy(true)
        try {
            if (editing) {
                await staffApi.update(staff.id, { name: name.trim(), staff_role: role, permissions: perms })
                toast.success(t('Saqlandi'))
            } else {
                const r = await staffApi.invite({
                    name: name.trim(), phone: toApiPhone(phone), staff_role: role, permissions: perms,
                    shop_ids: shops.length ? shops : undefined, login_method: method, password: method === 'password' ? password : undefined
                })
                toast.success(r.invite_sms?.status === 'sent' ? t("Xodim qo'shildi, taklif SMS'i yuborildi") : t("Xodim qo'shildi. U o'z raqami bilan kirishi mumkin"))
            }
            onSaved()
        } catch (err) {
            if (err?.response?.status === 402) toast((tst) => <span>{errorMessage(err)} <Link to="/subscription" className="font-bold underline" onClick={() => toast.dismiss(tst.id)}>{t("Ta'rif")}</Link></span>)
            else if (err?.response?.data?.errors) setErrors(fieldErrors(err))
            else toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title={editing ? t('Xodimni tahrirlash') : t('Yangi xodim')} onSubmit={submit} width={680}
            footer={<div className="flex gap-2">
                <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>{t('Bekor qilish')}</Button>
                <Button type="submit" size="lg" className="flex-1" loading={busy}>{editing ? t('Saqlash') : t("Xodimni qo'shish")}</Button>
            </div>}>
            <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Input label={t('F.I.SH.')} required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoFocus maxLength={255} />
                    {editing
                        ? <div><p className="mb-2 text-sm font-semibold">{t('Telefon')}</p><p className="flex h-12 items-center font-semibold text-ink-2">{formatPhone(staff.phone)}</p></div>
                        : <PhoneInput label={t('Telefon')} required value={phone} onChange={setPhone} error={errors.phone} />}
                </div>
                <div>
                    <p className="mb-2 text-sm font-semibold">{t('Lavozim')}</p>
                    <Chips ariaLabel={t('Lavozim')} value={role} onChange={(r) => { setRole(r); setPerms(defaults(r)) }} options={tOpts(ROLES)} />
                </div>
                {!editing && ownShops.length > 1 && (
                    <div>
                        <p className="mb-2 text-sm font-semibold">{t("Qaysi do'kon")}</p>
                        <div className="flex flex-wrap gap-2">
                            {ownShops.map((shop) => (
                                <Checkbox key={shop.id} className="rounded-xl border-[1.5px] border-line px-3" label={shop.name} checked={shops.includes(shop.id)}
                                    onChange={(on) => setShops((x) => (on ? [...x, shop.id] : x.filter((i) => i !== shop.id)))} />
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <p className="mb-1 text-sm font-semibold">{t('Huquqlar')}</p>
                    <div className="divide-y divide-line rounded-ctl border-[1.5px] border-line px-3.5">
                        {permissions.map((p) => (
                            <Checkbox key={p.key} className="py-2.5" label={p.label} checked={perms.includes(p.key)}
                                onChange={(on) => setPerms((x) => (on ? [...x, p.key] : x.filter((k) => k !== p.key)))} />
                        ))}
                        {!permissions.length && <p className="py-3 text-sm text-ink-2">{t('Yuklanmoqda…')}</p>}
                    </div>
                </div>
                {!editing && (
                    <div>
                        <p className="mb-2 text-sm font-semibold">{t('Kirish usuli')}</p>
                        <div className="space-y-2">
                            {[['otp', t('Kod bilan (tavsiya)'), t("Xodim o'z raqamiga kelgan kod bilan kiradi — parol kerak emas")], ['password', t('Parol'), t('Kamida 8 belgi, xodimga o\'zingiz aytasiz')]].map(([v, l, d]) => (
                                <label key={v} className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-line p-3">
                                    <input type="radio" name="login_method" checked={method === v} onChange={() => setMethod(v)} className="mt-1 h-5 w-5 accent-[rgb(var(--brand))]" />
                                    <span className="text-[15px]"><strong>{l}</strong><br /><span className="text-[13px] text-ink-2">{d}</span></span>
                                </label>
                            ))}
                        </div>
                        {method === 'password' && <Input className="mt-3" size="md" type="password" autoComplete="new-password" label={t('Parol')} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint={t('Kamida 8 belgi · harf va raqam')} />}
                    </div>
                )}
            </div>
        </Sheet>
    )
}

function StaffDetailsSheet({ staff, onClose }) {
    const res = useResource(() => staffApi.get(staff.id), [staff?.id], { enabled: !!staff })
    const d = res.data
    const recent = [
        ...(d?.recent_debts || []).map((x) => ({ ...x, kind: 'debt' })),
        ...(d?.recent_payments || []).map((x) => ({ ...x, kind: 'payment' }))
    ].sort((a, b) => String(b.created_at || b.paid_at).localeCompare(String(a.created_at || a.paid_at))).slice(0, 20)
    return (
        <Sheet open={!!staff} onClose={onClose} title={staff?.name || ''} subtitle={staff && `${formatPhone(staff.phone)} · ${roleLabel(staff.staff_role)}`} width={560}>
            {!d ? <ListSkeleton rows={3} /> : (
                <>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                        {[[t('Nasiyalar'), t('{n} ta', { n: formatNumber(d.stats?.debt_count) })], [t('Berdi'), formatNumber(d.stats?.debt_total)], [t('Undirdi'), formatNumber(d.stats?.payment_total)],
                            [t('Qolgan qarz'), formatNumber(d.stats?.debt_remaining)], [t('Mijozlar'), formatNumber(d.stats?.customer_count)], [t('Oxirgi faollik'), formatDateTime(d.last_active_at)]
                        ].map(([k, v]) => <div key={k} className="rounded-xl bg-soft/70 p-2.5"><div className="text-ink-2">{k}</div><strong>{v}</strong></div>)}
                    </div>
                    {d.shops?.length > 0 && <p className="mt-3 text-sm text-ink-2">{t("Do'konlar:")} {d.shops.map((s) => s.name).join(', ')}</p>}
                    <SectionTitle>{t('Oxirgi amallar')}</SectionTitle>
                    {recent.length === 0 ? <p className="text-sm text-ink-2">{t("Amal yo'q.")}</p> : (
                        <ul className="divide-y divide-line">
                            {recent.map((x) => (
                                <li key={`${x.kind}${x.id}`} className="flex justify-between gap-3 py-2.5 text-[15px]">
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold">{x.customer_name || x.customer?.name || '—'} · {x.kind === 'debt' ? t('nasiya') : t("to'lov")}</span>
                                        <span className="text-[13px] text-ink-3">{formatDate(x.debt_date || x.paid_at || x.created_at)}</span>
                                    </span>
                                    <Money value={x.total_amount ?? x.amount} tone={x.kind === 'debt' ? 'debt' : 'pay'} />
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </Sheet>
    )
}
