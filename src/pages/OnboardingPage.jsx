import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ChevronRight, Send, Smartphone, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingApi } from '../api/auth.api'
import { locationsApi } from '../api/settings.api'
import { debtsApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { emitChange } from '../lib/hooks'
import { errorMessage, fieldErrors } from '../lib/errors'
import { QuickCustomerForm } from '../features/CustomerPicker'
import LocationFields from '../features/LocationFields'
import { AmountPad } from '../ui/Sheet'
import { Button, Chips, Input, Toggle } from '../ui/controls'
import { addDaysYmd, addMonthsYmd, formatDate, todayYmd } from '../utils/date'
import { formatMoney } from '../utils/format'
import { formatPhone } from '../utils/phone'
import { AuthShell } from './LoginPage'
import TrialFeatures from '../features/TrialFeatures'
import { t } from '../i18n'

const STEPS = ['shop', 'customer', 'debt']

// Birinchi 3 daqiqa: do'kon nomi → birinchi mijoz → birinchi nasiya (backend holatni ma'lumotdan hisoblaydi)
export default function OnboardingPage() {
    const navigate = useNavigate()
    const session = useSession()
    // ?new=1 — xodim o'z do'konini ochadi (TZ 28.21): backend holati 'done' (ish beruvchi do'koni bor), shuning uchun 1-qadamdan.
    // O'z do'koni bor bo'lsa ochilmaydi — POST /onboarding/shop mavjud do'kon nomini yangilab yuborardi
    const [params] = useSearchParams()
    const [openOwn] = useState(() => params.get('new') === '1' && session.ownsShop !== true)
    const [step, setStep] = useState(null)
    const [profile, setProfile] = useState(null)
    const [customer, setCustomer] = useState(null)
    const [done, setDone] = useState(null)

    useEffect(() => {
        onboardingApi.state()
            .then((s) => { setProfile(s.profile || null); setStep(openOwn ? 'shop' : s.step === 'done' ? 'finished' : s.step) })
            .catch(() => setStep('shop'))
    }, [])

    const skip = async () => {
        try { await onboardingApi.complete() } catch { /* baribir bosh sahifaga */ }
        navigate('/', { replace: true })
    }

    if (!step) return <AuthShell><div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-ink-3" aria-label={t('Yuklanmoqda')} /></div></AuthShell>
    if (step === 'finished' && !done) return <Finish onGo={() => navigate('/', { replace: true })} session={session} />
    if (done) return <Finish done={done} onGo={() => navigate('/', { replace: true })} session={session} />

    const index = STEPS.indexOf(step)
    return (
        <AuthShell>
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-2">{t('{n}-qadam / 3', { n: index + 1 })}</span>
                {step !== 'shop' && <button type="button" onClick={skip} className="text-sm font-semibold text-ink-2">{t('Keyinroq')}</button>}
                {step === 'shop' && openOwn && <button type="button" onClick={() => navigate('/shops', { replace: true })} className="text-sm font-semibold text-ink-2">{t('Bekor qilish')}</button>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
                {STEPS.map((s, i) => <div key={s} className={`h-1.5 rounded-full ${i <= index ? 'bg-brand' : 'bg-line'}`} />)}
            </div>
            {step === 'shop' && <ShopStep profile={profile} onDone={async () => { await session.refresh(); emitChange('shop'); setStep('customer') }} />}
            {step === 'customer' && (
                <>
                    <h1 className="mb-2 mt-9 text-[28px] font-extrabold leading-tight tracking-tight">{t("Birinchi mijozni qo'shing")}</h1>
                    <p className="mb-7 text-base text-ink-2">{t("Faqat ism va telefon. Qolganini keyin to'ldirsangiz bo'ladi.")}</p>
                    <QuickCustomerForm onCreated={(c) => { setCustomer(c); setStep('debt') }} />
                </>
            )}
            {step === 'debt' && <DebtStep customer={customer} session={session} onDone={setDone} onNoCustomer={() => setStep('customer')} />}
        </AuthShell>
    )
}

// Ism Telegram profilidan kelishi mumkin (bo'sh bo'lsa — so'raladi), manzil ixtiyoriy
function ShopStep({ profile, onDone }) {
    const [ownerName, setOwnerName] = useState(profile?.name || '')
    const [name, setName] = useState('')
    const [categoryId, setCategoryId] = useState(null)
    const [categories, setCategories] = useState([])
    const [location, setLocation] = useState({ region_id: profile?.region_id || null, district_id: profile?.district_id || null })
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        locationsApi.categories().then((r) => setCategories(Array.isArray(r) ? r : r?.data || [])).catch(() => {})
    }, [])

    const clear = (key) => setErrors((e) => ({ ...e, [key]: '' }))

    const submit = async () => {
        const missing = {}
        if (!ownerName.trim()) missing.owner_name = t('Ismingizni kiriting')
        if (!name.trim()) missing.name = t("Do'kon nomini kiriting")
        if (Object.keys(missing).length) return setErrors(missing)
        const payload = { name: name.trim(), owner_name: ownerName.trim(), category_id: categoryId }
        if (location.region_id) payload.region_id = location.region_id
        if (location.district_id) payload.district_id = location.district_id
        setBusy(true)
        try {
            await onboardingApi.shop(payload)
            await onDone()
        } catch (err) {
            const fields = err?.response?.status === 422 ? fieldErrors(err) : {}
            const shown = ['owner_name', 'name', 'region_id', 'district_id'].some((k) => fields[k])
            setErrors(fields)
            if (!shown) toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="flex flex-1 flex-col" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
            <h1 className="mb-2 mt-9 text-[28px] font-extrabold leading-tight tracking-tight">{t("Siz va do'koningiz")}</h1>
            <p className="mb-7 text-base text-ink-2">{t("Do'kon nomi qarzdorga boradigan SMS'da ko'rinadi.")}</p>
            <div className="space-y-4">
                <Input label={t('Ismingiz')} value={ownerName} onChange={(e) => { setOwnerName(e.target.value); clear('owner_name') }}
                    error={errors.owner_name} autoFocus={!profile?.name} maxLength={255} autoComplete="name" />
                <Input label={t("Do'kon nomi")} value={name} onChange={(e) => { setName(e.target.value); clear('name') }}
                    error={errors.name} autoFocus={!!profile?.name} maxLength={255} />
            </div>
            {categories.length > 0 && (
                <>
                    <p className="mb-2.5 mt-7 text-sm font-semibold">{t('Nima sotasiz?')} <span className="font-normal text-ink-3">{t('(ixtiyoriy)')}</span></p>
                    <Chips wrap ariaLabel={t('Faoliyat turi')} value={categoryId} onChange={(v) => setCategoryId(v === categoryId ? null : v)}
                        options={categories.map((c) => ({ value: c.id, label: c.name }))} />
                </>
            )}
            <p className="mb-2.5 mt-7 text-sm font-semibold">{t("Do'kon manzili")} <span className="font-normal text-ink-3">{t('(ixtiyoriy)')}</span></p>
            <LocationFields withStreet={false} value={location} errors={errors}
                onChange={(v) => { setLocation({ region_id: v.region_id, district_id: v.district_id }); setErrors((e) => ({ ...e, region_id: '', district_id: '' })) }} />
            <div className="flex-1" />
            <Button type="submit" size="lg" block loading={busy} className="mt-8">{t('Keyingisi')}</Button>
        </form>
    )
}

function DebtStep({ customer, session, onDone, onNoCustomer }) {
    const today = todayYmd()
    const [amount, setAmount] = useState(0)
    const [given, setGiven] = useState('today')
    const [due, setDue] = useState('2w')
    const [note, setNote] = useState('')
    const [sms, setSms] = useState(session.notifications.sms_on_debt ?? true)
    const [busy, setBusy] = useState(false)

    useEffect(() => { if (!customer) onNoCustomer() }, [customer, onNoCustomer])
    if (!customer) return null

    const givenAt = given === 'today' ? today : addDaysYmd(today, -1)
    const dueDate = due === '1w' ? addDaysYmd(givenAt, 7) : due === '2w' ? addDaysYmd(givenAt, 14) : due === '1m' ? addMonthsYmd(givenAt, 1) : null

    const submit = async () => {
        if (!(amount > 0)) return toast.error(t('Summani kiriting'))
        setBusy(true)
        try {
            await debtsApi.create({ customer_id: customer.id, amount, given_at: givenAt, due_date: dueDate, note: note.trim() || null, send_sms: sms })
            onDone({ customer, amount, dueDate })
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="flex flex-1 flex-col" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight">{t('Birinchi nasiyani yozing')}</h1>
            <p className="mb-4 text-[15px] text-ink-2">{customer.name} · {formatPhone(customer.phone)}</p>
            <AmountPad value={amount} onChange={setAmount} autoFocus />
            <p className="mb-2 mt-3.5 text-sm font-semibold">{t('Qachon berildi?')}</p>
            <Chips ariaLabel={t('Berilgan sana')} value={given} onChange={setGiven} options={[{ value: 'today', label: t('Bugun') }, { value: 'yesterday', label: t('Kecha') }]} />
            <p className="mb-2 mt-3 text-sm font-semibold">{t('Qachon qaytaradi?')}</p>
            <Chips ariaLabel={t('Qaytarish muddati')} value={due} onChange={(v) => setDue(v === due ? null : v)}
                options={[{ value: '1w', label: t('1 hafta') }, { value: '2w', label: t('2 hafta') }, { value: '1m', label: t('1 oy') }]} />
            <div className="mt-3 rounded-ctl bg-pay-soft px-3.5 py-3">
                <Toggle checked={sms} onChange={setSms} label={dueDate ? t('{date}, {time} da SMS eslatma', { date: formatDate(dueDate), time: session.notifications.reminder_time || '09:00' }) : t('Mijozga SMS')}
                    description={t("{name}ga o'zi boradi", { name: customer.name })} />
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t('Izoh (ixtiyoriy): nima oldi?')} aria-label={t('Izoh')}
                className="mt-2.5 h-12 rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-[15px] text-ink outline-none focus:border-brand" />
            <div className="flex-1" />
            <Button type="submit" size="lg" block loading={busy} className="mt-6">{t('Nasiyani yozish')}</Button>
        </form>
    )
}

function Finish({ done, onGo, session }) {
    const days = session.subscription?.trial_info?.days_remaining
    return (
        <AuthShell>
            <span className="mt-8 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-pay-soft text-pay"><Check size={36} strokeWidth={2.5} aria-hidden /></span>
            <h1 className="mb-2 mt-6 text-[28px] font-extrabold leading-tight tracking-tight">{done ? t('Birinchi nasiya yozildi') : t('Hammasi tayyor')}</h1>
            {done && (
                <p className="text-base leading-relaxed text-ink-2">
                    {done.customer.name} · {formatMoney(done.amount)}{done.dueDate && ` · ${t('{date} gacha', { date: formatDate(done.dueDate) })}`}. {t("Eslatma SMS'i o'z vaqtida boradi.")}
                </p>
            )}
            <p className="mb-3 mt-8 section-label">{t('Yana 2 ta qadam — unutmaslik uchun')}</p>
            <div className="space-y-2.5">
                {[
                    ['/settings/reminders', Send, t('Kechki xulosani ulash'), t("Har kuni Telegram'ga: bugun kim oldi, kim to'ladi")],
                    ['/install', Smartphone, t("Telefonga o'rnatish"), t("Bosh ekranga qo'shish — ilovadek ochiladi")]
                ].map(([to, Icon, title, text]) => (
                    <Link key={to} to={to} className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-line p-4 hover:bg-soft/60">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon size={22} aria-hidden /></span>
                        <span className="min-w-0 flex-1 text-[15px] leading-snug"><strong>{title}</strong><br /><span className="text-ink-2">{text}</span></span>
                        <ChevronRight size={20} className="text-ink-3" aria-hidden />
                    </Link>
                ))}
            </div>
            {days > 0 && (
                <div className="mt-4 rounded-ctl bg-soft p-4 text-sm text-ink-2">
                    <p><strong className="text-ink">{t('Bepul sinov muddati: {n} kun qoldi.', { n: days })}</strong> {t('Karta kerak emas.')}</p>
                    <TrialFeatures trial={session.subscription?.trial_policy} className="mt-2 text-sm" />
                </div>
            )}
            <div className="flex-1" />
            <Button size="lg" block className="mt-8" onClick={onGo}>{t("Bosh sahifaga o'tish")}</Button>
        </AuthShell>
    )
}
