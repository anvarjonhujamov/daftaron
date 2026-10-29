import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bot, ChevronRight, FileText, Lock, LogOut, MessageCircle, Moon, Palette, Phone, Send, Smartphone, Store, Trash2, Users, Wallet, BellRing } from 'lucide-react'
import toast from 'react-hot-toast'
import { applyTheme, logout, useSession } from '../app/session'
import { authApi } from '../api/auth.api'
import { locationsApi, profileApi, settingsApi, telegramApi } from '../api/settings.api'
import { useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { safeUrl } from '../lib/sanitize'
import { passwordProblem } from './ForgotPasswordPage'
import { CodeInput } from './LoginPage'
import TopUpSheet, { ProviderButtons } from '../features/TopUpSheet'
import { Avatar, Card, List, PageHeader, Pill, Row, Skeleton } from '../ui/display'
import { Button, Chips, Input, PhoneInput, Select, Toggle } from '../ui/controls'
import { Confirm, Sheet } from '../ui/Sheet'
import { formatDate, formatDateTime } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'
import { formatPhone, isValidPhone, toApiPhone } from '../utils/phone'
import { telegramInitData } from '../utils/telegram'

const SECTIONS = [
    { key: 'profile', label: "Profil va do'kon", icon: Store },
    { key: 'account', label: 'Hisob va balans', icon: Wallet },
    { key: 'reminders', label: 'Eslatmalar va SMS', icon: BellRing },
    { key: 'appearance', label: "Ko'rinish va til", icon: Palette },
    { key: 'security', label: 'Xavfsizlik', icon: Lock },
    { key: 'documents', label: 'Aloqa va hujjatlar', icon: FileText }
]

const TIMES = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)

export default function SettingsPage() {
    const { section } = useParams()
    const session = useSession()
    const fresh = useResource(() => settingsApi.get(), [])
    useEffect(() => { if (fresh.data) session.updateSettings(fresh.data) }, [fresh.data])

    const settings = session.settings
    const content = (key) => {
        if (!settings) return <Skeleton className="h-48" />
        switch (key) {
            case 'profile': return <ProfileSection settings={settings} session={session} />
            case 'account': return <AccountSection session={session} />
            case 'reminders': return <RemindersSection settings={settings} session={session} />
            case 'appearance': return <AppearanceSection settings={settings} session={session} />
            case 'security': return <SecuritySection settings={settings} session={session} />
            case 'documents': return <DocumentsSection settings={settings} />
            default: return null
        }
    }
    const current = SECTIONS.find((s) => s.key === section)

    return (
        <div className="page">
            {/* Telefon/planshet: bo'limlar ro'yxati yoki bitta bo'lim */}
            <div className="lg:hidden">
                {current ? (
                    <div className="md:mx-auto md:max-w-2xl">
                        <PageHeader back="/settings" title={current.label} />
                        {content(current.key)}
                    </div>
                ) : (
                    <div className="md:mx-auto md:max-w-2xl">
                        <PageHeader title="Sozlamalar" />
                        <MenuList session={session} />
                    </div>
                )}
            </div>

            {/* Kompyuter: chapda bo'limlar, o'ngda hammasi */}
            <div className="hidden lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
                <nav aria-label="Sozlamalar bo'limlari" className="sticky top-8 self-start">
                    <h1 className="mb-4 text-[26px] font-extrabold">Sozlamalar</h1>
                    {SECTIONS.map((s) => (
                        <a key={s.key} href={`#${s.key}`} className="flex h-11 items-center gap-3 rounded-xl px-3 font-semibold text-ink-2 hover:bg-soft hover:text-ink">
                            <s.icon size={18} aria-hidden />{s.label}
                        </a>
                    ))}
                    <button type="button" onClick={logout} className="mt-2 flex h-11 w-full items-center gap-3 rounded-xl px-3 font-semibold text-debt hover:bg-debt-soft">
                        <LogOut size={18} aria-hidden />Chiqish
                    </button>
                </nav>
                <div className="max-w-3xl space-y-10">
                    {SECTIONS.map((s) => (
                        <section key={s.key} id={s.key} className="scroll-mt-8">
                            <h2 className="mb-3 text-xl font-extrabold">{s.label}</h2>
                            {content(s.key)}
                        </section>
                    ))}
                    <p className="text-sm text-ink-3">DaftarOn · versiya {__APP_VERSION__}</p>
                </div>
            </div>
        </div>
    )
}

function MenuList({ session }) {
    const p = session.settings?.profile
    const sub = session.subscription
    const n = session.notifications
    return (
        <div className="space-y-4">
            <List>
                <Row to="/settings/profile" left={<Avatar name={p?.name || session.user?.name} size={44} />} title={p?.name || session.user?.name}
                    subtitle={`${session.tenant?.name || ''} · ${formatPhone(p?.phone || session.user?.phone)}`} chevron />
                <Row to="/subscription" left={<Wallet size={22} className="text-brand-strong" aria-hidden />} title={`Balans: ${formatMoney(sub?.balance)}`}
                    subtitle={`${sub?.usage?.plan_name || 'Sinov'} · ${formatDate(sub?.trial_info?.trial_ends_at)} gacha · SMS ${formatNumber(sub?.usage?.sms_remaining)}`} chevron />
            </List>
            <List>
                <Row to="/settings/reminders" left={<BellRing size={20} aria-hidden />} title="Eslatmalar va SMS"
                    subtitle={n.reminder_enabled === false ? "Avtomatik eslatma o'chiq" : `Qaytarish kuni ${n.reminder_time || '09:00'}, keyin har ${n.reminder_interval_days || 3} kunda`} chevron />
                <Row to="/settings/appearance" left={<Palette size={20} aria-hidden />} title="Ko'rinish va til" chevron />
                <Row to="/settings/security" left={<Lock size={20} aria-hidden />} title="Xavfsizlik" subtitle={session.settings?.profile?.login_method === 'password' ? 'Parol' : 'Kod bilan kirish'} chevron />
            </List>
            {session.isOwner && (
                <List>
                    <Row to="/shops" left={<Store size={20} aria-hidden />} title="Do'konlar" right={<span className="text-ink-2">{(session.tenants || []).length}</span>} chevron />
                    <Row to="/staff" left={<Users size={20} aria-hidden />} title="Xodimlar" chevron />
                </List>
            )}
            <List>
                <Row to="/support" left={<Bot size={20} aria-hidden />} title="Aloqa" subtitle="AI yordamchi, Telegram" chevron />
                <Row to="/settings/documents" left={<FileText size={20} aria-hidden />} title="Hujjatlar" subtitle="Oferta, maxfiylik" chevron />
            </List>
            <List><Row onClick={logout} left={<LogOut size={20} className="text-debt" aria-hidden />} title={<span className="text-debt">Chiqish</span>} /></List>
            <p className="text-center text-[13px] text-ink-3">Kompyuterda: web.daftaron.uz · v{__APP_VERSION__.split('+')[0]}</p>
        </div>
    )
}

function ProfileSection({ settings, session }) {
    const canShop = session.can('settings.manage')
    const [name, setName] = useState(settings.profile?.name || '')
    const [shop, setShop] = useState({ name: settings.shop?.name || '', category_id: settings.shop?.category_id || null, sms_sender_name: settings.shop?.sms_sender_name || '', address: settings.shop?.address || '' })
    const [categories, setCategories] = useState([])
    const [busy, setBusy] = useState(false)
    const [phoneSheet, setPhoneSheet] = useState(false)
    useEffect(() => { if (canShop) locationsApi.categories().then((r) => setCategories(Array.isArray(r) ? r : r?.data || [])).catch(() => {}) }, [canShop])

    const save = async () => {
        if (!name.trim()) return toast.error('Ismni kiriting')
        setBusy(true)
        try {
            await profileApi.update({ name: name.trim() })
            if (canShop && settings.shop) {
                if (!shop.name.trim()) throw new Error("Do'kon nomini kiriting")
                await settingsApi.updateShop({ name: shop.name.trim(), category_id: shop.category_id ? Number(shop.category_id) : null, sms_sender_name: shop.sms_sender_name.trim() || null, address: shop.address.trim() || null })
            }
            toast.success('Saqlandi')
            session.refresh()
        } catch (err) {
            toast.error(err.response ? errorMessage(err) : err.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card className="space-y-4 p-4 md:p-6">
            <Input label="Ism" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
            <div>
                <p className="mb-2 text-sm font-semibold">Telefon (kirish uchun)</p>
                <div className="flex items-center gap-3">
                    <span className="flex-1 text-[17px] font-semibold">{formatPhone(settings.profile?.phone)}</span>
                    <Button variant="secondary" size="sm" icon={Phone} onClick={() => setPhoneSheet(true)}>O'zgartirish</Button>
                </div>
            </div>
            {canShop && settings.shop && (
                <>
                    <div className="h-px bg-line" />
                    <Input label="Do'kon nomi" value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} maxLength={255} />
                    {categories.length > 0 && (
                        <div>
                            <p className="mb-2 text-sm font-semibold">Faoliyat turi</p>
                            <Chips wrap size="sm" ariaLabel="Faoliyat turi" value={shop.category_id} onChange={(v) => setShop({ ...shop, category_id: v })} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
                        </div>
                    )}
                    <Input size="md" label="SMS'dagi nom" value={shop.sms_sender_name} onChange={(e) => setShop({ ...shop, sms_sender_name: e.target.value })} maxLength={40}
                        hint={`SMS'da: «${shop.sms_sender_name.trim() || shop.name || "Do'kon"}: qarzingiz…»`} />
                    <Input size="md" label="Manzil" value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} maxLength={500} />
                </>
            )}
            <Button size="lg" loading={busy} onClick={save}>O'zgarishlarni saqlash</Button>
            <PhoneChangeSheet open={phoneSheet} onClose={() => setPhoneSheet(false)} onDone={() => { setPhoneSheet(false); session.refresh() }} />
        </Card>
    )
}

// Telefonni almashtirish: yangi raqamga SMS-kod (boshqa qurilmalardan chiqiladi)
function PhoneChangeSheet({ open, onClose, onDone }) {
    const [phone, setPhone] = useState('')
    const [sent, setSent] = useState(false)
    const [code, setCode] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) { setPhone(''); setSent(false); setCode('') } }, [open])

    const request = async () => {
        if (!isValidPhone(phone)) return toast.error("Raqam to'liq emas")
        setBusy(true)
        try { await profileApi.phoneRequest(toApiPhone(phone)); setSent(true) } catch (err) { toast.error(errorMessage(err)) } finally { setBusy(false) }
    }
    const verify = async (value = code) => {
        setBusy(true)
        try {
            await profileApi.phoneVerify(toApiPhone(phone), value)
            toast.success('Telefon raqam yangilandi')
            onDone()
        } catch (err) {
            toast.error(errorMessage(err))
            setCode('')
        } finally {
            setBusy(false)
        }
    }
    return (
        <Sheet open={open} onClose={onClose} title="Telefonni almashtirish" width={480} onSubmit={() => (sent ? verify() : request())}
            footer={<Button type="submit" size="lg" block loading={busy}>{sent ? 'Tasdiqlash' : 'Kod yuborish'}</Button>}>
            {!sent ? (
                <>
                    <PhoneInput label="Yangi raqam" value={phone} onChange={setPhone} autoFocus />
                    <p className="mt-3 text-[13px] text-ink-2">Yangi raqamga kod yuboriladi. Tasdiqlangach boshqa qurilmalardan chiqiladi.</p>
                </>
            ) : <CodeInput value={code} onChange={setCode} onComplete={verify} />}
        </Sheet>
    )
}

function AccountSection({ session }) {
    const sub = session.subscription || {}
    const usage = sub.usage || {}
    const [provider, setProvider] = useState(null)
    return (
        <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm text-ink-2">Joriy balans</div>
                    <div className="text-[28px] font-extrabold">{formatMoney(sub.balance)}</div>
                </div>
                <Link to="/subscription" className="flex items-center gap-1 text-sm font-semibold text-brand-strong">Obuna va to'lovlar <ChevronRight size={16} aria-hidden /></Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[['Ta\'rif', usage.plan_name || 'Sinov'], ['Muddati', `${formatDate(sub.trial_info?.trial_ends_at)} gacha`],
                    ['SMS qoldig\'i', formatNumber(usage.sms_remaining)], ['Nasiya qoldig\'i', usage.debt_remaining === null || usage.debt_remaining === undefined ? 'Cheksiz' : formatNumber(usage.debt_remaining)]
                ].map(([k, v]) => <div key={k} className="rounded-xl bg-soft/70 p-3"><div className="text-ink-2">{k}</div><strong>{v}</strong></div>)}
            </div>
            <p className="mb-2 mt-5 text-sm font-semibold">Balansni to'ldirish</p>
            <ProviderButtons onSelect={setProvider} />
            <TopUpSheet open={!!provider} provider={provider} user={session.user} onClose={() => setProvider(null)} />
        </Card>
    )
}

function RemindersSection({ settings, session }) {
    const canEdit = session.can('settings.manage') && !session.readOnly
    const [n, setN] = useState(settings.notifications || {})
    const [busy, setBusy] = useState(false)
    const chats = useResource(() => telegramApi.chats(), [], { enabled: canEdit })
    const [linking, setLinking] = useState(false)
    const [unlink, setUnlink] = useState(null)
    const set = (patch) => setN((x) => ({ ...x, ...patch }))

    const save = async () => {
        setBusy(true)
        try {
            await settingsApi.updateNotifications(n)
            session.updateSettings({ notifications: n })
            toast.success('Saqlandi')
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    const linkTelegram = async () => {
        setLinking(true)
        try {
            if (telegramInitData()) {
                await telegramApi.linkSelf()
                toast.success('Telegram ulandi')
                chats.reload()
            } else {
                const r = await telegramApi.linkToken()
                const url = safeUrl(r.url)
                if (url) window.open(url, '_blank', 'noopener,noreferrer')
                toast('Botda «Start» ni bosing — do\'kon shu chatga ulanadi')
            }
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setLinking(false)
        }
    }

    const list = Array.isArray(chats.data) ? chats.data : chats.data?.data || []
    return (
        <Card className="space-y-4 p-4 md:p-6">
            {!canEdit && <p className="rounded-xl bg-soft p-3 text-sm text-ink-2">Bu sozlamalarni faqat do'kon egasi o'zgartiradi.</p>}
            <Toggle disabled={!canEdit} checked={n.sms_on_debt !== false} onChange={(v) => set({ sms_on_debt: v })} label="Nasiya yozilganda mijozga SMS" description="Summa va qaytarish sanasi bilan (nasiya oynasida yoqiq turadi)" />
            <Toggle disabled={!canEdit} checked={!!n.sms_on_payment} onChange={(v) => set({ sms_on_payment: v })} label="To'lov qabul qilinganda SMS" description="Qolgan qarz bilan" />
            <div className="h-px bg-line" />
            <Toggle disabled={!canEdit} checked={n.reminder_enabled !== false} onChange={(v) => set({ reminder_enabled: v })} label="Muddat eslatmasi" description="Qaytarish kuni, keyin muddat o'tsa takroriy" />
            {n.reminder_enabled !== false && (
                <div className="grid gap-3 sm:grid-cols-3">
                    <Select label="Vaqti" disabled={!canEdit} value={n.reminder_time || '09:00'} onChange={(v) => set({ reminder_time: v || '09:00' })} options={TIMES.map((t) => ({ value: t, label: t }))} placeholder="09:00" />
                    <Select label="Har necha kunda" disabled={!canEdit} value={n.reminder_interval_days ?? 3} onChange={(v) => set({ reminder_interval_days: Number(v) || 3 })}
                        options={[1, 2, 3, 5, 7, 10, 14, 30].map((d) => ({ value: d, label: `${d} kun` }))} placeholder="3 kun" />
                    <Select label="Ko'pi bilan" disabled={!canEdit} value={n.reminder_max_count ?? 3} onChange={(v) => set({ reminder_max_count: Number(v) })}
                        options={[0, 1, 2, 3, 5, 7, 10].map((d) => ({ value: d, label: `${d} marta` }))} placeholder="3 marta" />
                </div>
            )}
            <div className="h-px bg-line" />
            <Toggle disabled={!canEdit} checked={!!n.digest_enabled} onChange={(v) => set({ digest_enabled: v })} label="Kechki xulosa Telegramga" description="Bugungi nasiya, to'lov, muddati o'tganlar · @daftaron_bot" />
            {n.digest_enabled && (
                <Select label="Xulosa vaqti" disabled={!canEdit} value={n.digest_time || '20:00'} onChange={(v) => set({ digest_time: v || '20:00' })}
                    options={['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map((t) => ({ value: t, label: t }))} placeholder="20:00" />
            )}
            <Toggle disabled={!canEdit} checked={n.owner_inactivity_reminder !== false} onChange={(v) => set({ owner_inactivity_reminder: v })} label="«3 kun nasiya yozilmadi» eslatmasi" />
            {canEdit && (
                <div className="rounded-ctl bg-soft/70 p-3.5">
                    <p className="text-sm font-semibold">Ulangan Telegram chatlar</p>
                    {list.length === 0 && <p className="mt-1 text-sm text-ink-2">Hali ulanmagan.</p>}
                    <ul className="mt-2 space-y-1.5">
                        {list.map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-2 text-[15px]">
                                <span className="flex items-center gap-2"><Send size={16} className="text-brand-strong" aria-hidden />{c.title || c.chat_id}</span>
                                <Button size="sm" variant="danger-ghost" onClick={() => setUnlink(c)}>Uzish</Button>
                            </li>
                        ))}
                    </ul>
                    <Button size="sm" variant="secondary" icon={Send} className="mt-3" loading={linking} onClick={linkTelegram}>Telegram'ga ulash</Button>
                </div>
            )}
            {canEdit && <Button size="lg" loading={busy} onClick={save}>Saqlash</Button>}
            <Confirm open={!!unlink} onClose={() => setUnlink(null)} title="Chatni uzish" text="Bu chatga xulosa va eslatmalar boshqa kelmaydi." confirmText="Uzish" danger
                onConfirm={async () => { try { await telegramApi.removeChat(unlink.id); chats.reload() } catch (err) { toast.error(errorMessage(err)) } setUnlink(null) }} />
        </Card>
    )
}

function AppearanceSection({ settings, session }) {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
    const [lang, setLang] = useState(settings.profile?.language || 'uz_latn')
    const save = (patch) => profileApi.update({ name: settings.profile?.name, ...patch })
        .then(() => session.updateSettings({ profile: { ...settings.profile, ...patch } }))
        .catch((err) => toast.error(errorMessage(err)))
    return (
        <Card className="space-y-5 p-4 md:p-6">
            <Toggle checked={dark} onChange={(v) => { setDark(v); applyTheme(v ? 'dark' : 'light'); save({ theme: v ? 'dark' : 'light' }) }}
                label={<span className="flex items-center gap-2"><Moon size={18} aria-hidden />Tungi rejim</span>} />
            <div>
                <p className="mb-2 text-sm font-semibold">Til</p>
                <Chips ariaLabel="Til" value={lang} onChange={(v) => { setLang(v); save({ language: v }) }}
                    options={[{ value: 'uz_latn', label: "O'zbek" }, { value: 'uz_cyrl', label: 'Ўзбек' }, { value: 'ru', label: 'Русский' }]} />
                {lang !== 'uz_latn' && <p className="mt-2 text-[13px] text-ink-2">Tanlov saqlandi (SMS va bot xabarlari uchun). Ilova matnlari hozircha o'zbek (lotin) tilida.</p>}
            </div>
        </Card>
    )
}

function SecuritySection({ settings, session }) {
    const profile = settings.profile || {}
    const [method, setMethod] = useState(profile.login_method || 'otp')
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [pwError, setPwError] = useState('')
    const [busy, setBusy] = useState(false)
    const devices = useResource(() => authApi.devices(), [])
    const [confirmAll, setConfirmAll] = useState(false)

    const changeMethod = async (v) => {
        if (v === 'password' && !profile.has_password) return toast.error("Avval parol o'rnating")
        try {
            await profileApi.setLoginMethod(v)
            setMethod(v)
            session.updateSettings({ profile: { ...profile, login_method: v } })
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    const savePassword = async () => {
        const problem = passwordProblem(pw.next)
        if (profile.has_password && !pw.current) return setPwError('Joriy parolni kiriting')
        if (problem) return setPwError(problem)
        if (pw.next !== pw.confirm) return setPwError('Parollar mos emas')
        setBusy(true)
        try {
            await profileApi.updatePassword({ current_password: pw.current || undefined, password: pw.next, password_confirmation: pw.confirm })
            toast.success('Parol saqlandi')
            setPw({ current: '', next: '', confirm: '' })
            session.updateSettings({ profile: { ...profile, has_password: true } })
        } catch (err) {
            setPwError(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    const list = devices.data?.data || []
    return (
        <div className="space-y-4">
            <Card className="p-4 md:p-6">
                <p className="mb-3 section-label">Kirish usuli</p>
                {[['otp', 'Kod bilan (tavsiya)', 'Parol eslab qolish shart emas'], ['password', 'Parol', 'Telefon raqam + parol']].map(([v, l, d]) => (
                    <label key={v} className="mb-2 flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-line p-3">
                        <input type="radio" name="login" checked={method === v} onChange={() => changeMethod(v)} className="mt-1 h-5 w-5 accent-[rgb(var(--brand))]" />
                        <span className="text-[15px]"><strong>{l}</strong><br /><span className="text-[13px] text-ink-2">{d}</span></span>
                    </label>
                ))}
            </Card>
            <Card className="space-y-3 p-4 md:p-6">
                <p className="section-label">{profile.has_password ? "Parolni o'zgartirish" : "Parol o'rnatish"}</p>
                {profile.has_password && <Input size="md" type="password" autoComplete="current-password" label="Joriy parol" value={pw.current} onChange={(e) => { setPw({ ...pw, current: e.target.value }); setPwError('') }} />}
                <Input size="md" type="password" autoComplete="new-password" label="Yangi parol" value={pw.next} onChange={(e) => { setPw({ ...pw, next: e.target.value }); setPwError('') }} hint="Kamida 8 belgi · harf va raqam" />
                <Input size="md" type="password" autoComplete="new-password" label="Yangi parolni takrorlang" value={pw.confirm} onChange={(e) => { setPw({ ...pw, confirm: e.target.value }); setPwError('') }} error={pwError} />
                <Button loading={busy} onClick={savePassword}>Parolni saqlash</Button>
            </Card>
            <Card className="p-4 md:p-6">
                <p className="mb-2 section-label">Faol qurilmalar</p>
                {devices.loading && !devices.data ? <Skeleton className="h-16" /> : (
                    <ul className="divide-y divide-line">
                        {list.map((d) => (
                            <li key={d.id} className="flex items-center gap-3 py-3">
                                <Smartphone size={20} className="shrink-0 text-ink-2" aria-hidden />
                                <span className="min-w-0 flex-1 text-[15px] leading-snug">
                                    <strong>{d.device || d.name}</strong>
                                    <span className="block text-[13px] text-ink-3">{d.is_current ? 'Shu qurilma' : [d.city, d.ip_address, formatDateTime(d.last_active_at)].filter(Boolean).join(' · ')}</span>
                                </span>
                                {d.is_current ? <Pill tone="success">Shu</Pill> : (
                                    <Button size="sm" variant="secondary" onClick={async () => {
                                        try { await authApi.revokeDevice(d.id); devices.reload() } catch (err) { toast.error(errorMessage(err)) }
                                    }}>Chiqarish</Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {list.length > 1 && <Button variant="danger-ghost" className="mt-2" onClick={() => setConfirmAll(true)}>Boshqa barcha qurilmalardan chiqish</Button>}
            </Card>
            <Confirm open={confirmAll} onClose={() => setConfirmAll(false)} title="Barcha qurilmalardan chiqish" text="Shu qurilmadan boshqa hamma joyda qayta kirish kerak bo'ladi." confirmText="Chiqish" danger
                onConfirm={async () => { try { await authApi.logoutAll(); devices.reload(); toast.success('Chiqarildi') } catch (err) { toast.error(errorMessage(err)) } setConfirmAll(false) }} />
        </div>
    )
}

function DocumentsSection({ settings }) {
    const support = settings.support || {}
    const legal = settings.legal || {}
    const links = [
        ['/support', Bot, 'AI yordamchi', 'Savolga darhol javob', true],
        [safeUrl(support.telegram_support_url), Send, "Telegram'dan yozish", 'Qo\'llab-quvvatlash'],
        [safeUrl(support.telegram_group_url), MessageCircle, 'Muhokama guruhi', "Do'kondorlar jamoasi"],
        [support.phone && `tel:${support.phone}`, Phone, "Qo'ng'iroq", support.phone]
    ].filter(([href]) => href)
    return (
        <div className="space-y-4">
            <List>
                {links.map(([href, Icon, title, sub, internal]) => internal
                    ? <Row key={title} to={href} left={<Icon size={20} className="text-brand-strong" aria-hidden />} title={title} subtitle={sub} chevron />
                    : (
                        <a key={title} href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer" className="flex items-center gap-3 px-3.5 py-3 hover:bg-soft/60">
                            <Icon size={20} className="text-brand-strong" aria-hidden />
                            <span className="min-w-0 flex-1 text-[15px] leading-snug"><strong>{title}</strong><span className="block text-[13px] text-ink-3">{sub}</span></span>
                            <ChevronRight size={20} className="text-ink-3" aria-hidden />
                        </a>
                    ))}
            </List>
            <List>
                <Row to="/legal/offer" left={<FileText size={20} aria-hidden />} title="Ommaviy oferta" subtitle={legal.offer?.version && `Versiya ${legal.offer.version}`} chevron />
                <Row to="/legal/privacy" left={<FileText size={20} aria-hidden />} title="Maxfiylik siyosati" subtitle={legal.privacy?.version && `Versiya ${legal.privacy.version}`} chevron />
                <Row to="/delete-account" left={<Trash2 size={20} className="text-debt" aria-hidden />} title="Akkauntni o'chirish" chevron />
            </List>
            <Card className="p-4 text-sm leading-relaxed text-ink-2">
                <p className="mb-1 font-bold text-ink">Maxfiylik — qisqacha</p>
                Mijozlaringiz ma'lumoti faqat sizga ko'rinadi. Raqamlar faqat SMS eslatma uchun ishlatiladi. Obuna tugasa ham ma'lumotlar o'chmaydi. Istalgan vaqt Excel'ga yuklab olishingiz mumkin.
            </Card>
        </div>
    )
}

