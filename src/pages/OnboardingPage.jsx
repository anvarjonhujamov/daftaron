import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Send, Smartphone, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingApi } from '../api/auth.api'
import { locationsApi } from '../api/settings.api'
import { debtsApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { errorMessage } from '../lib/errors'
import { QuickCustomerForm } from '../features/CustomerPicker'
import { AmountPad } from '../ui/Sheet'
import { Button, Chips, Input, Toggle } from '../ui/controls'
import { addDaysYmd, addMonthsYmd, formatDate, todayYmd } from '../utils/date'
import { formatMoney } from '../utils/format'
import { formatPhone } from '../utils/phone'
import { AuthShell } from './LoginPage'

const STEPS = ['shop', 'customer', 'debt']

// Birinchi 3 daqiqa: do'kon nomi → birinchi mijoz → birinchi nasiya (backend holatni ma'lumotdan hisoblaydi)
export default function OnboardingPage() {
    const navigate = useNavigate()
    const session = useSession()
    const [step, setStep] = useState(null)
    const [customer, setCustomer] = useState(null)
    const [done, setDone] = useState(null)

    useEffect(() => {
        onboardingApi.state()
            .then((s) => setStep(s.step === 'done' ? 'finished' : s.step))
            .catch(() => setStep('shop'))
    }, [])

    const skip = async () => {
        try { await onboardingApi.complete() } catch { /* baribir bosh sahifaga */ }
        navigate('/', { replace: true })
    }

    if (!step) return <AuthShell><div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-ink-3" aria-label="Yuklanmoqda" /></div></AuthShell>
    if (step === 'finished' && !done) return <Finish onGo={() => navigate('/', { replace: true })} session={session} />
    if (done) return <Finish done={done} onGo={() => navigate('/', { replace: true })} session={session} />

    const index = STEPS.indexOf(step)
    return (
        <AuthShell>
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-2">{index + 1}-qadam / 3</span>
                {step !== 'shop' && <button type="button" onClick={skip} className="text-sm font-semibold text-ink-2">Keyinroq</button>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden>
                {STEPS.map((s, i) => <div key={s} className={`h-1.5 rounded-full ${i <= index ? 'bg-brand' : 'bg-line'}`} />)}
            </div>
            {step === 'shop' && <ShopStep onDone={async () => { await session.refresh(); setStep('customer') }} />}
            {step === 'customer' && (
                <>
                    <h1 className="mb-2 mt-9 text-[28px] font-extrabold leading-tight tracking-tight">Birinchi mijozni qo'shing</h1>
                    <p className="mb-7 text-base text-ink-2">Faqat ism va telefon. Qolganini keyin to'ldirsangiz bo'ladi.</p>
                    <QuickCustomerForm onCreated={(c) => { setCustomer(c); setStep('debt') }} />
                </>
            )}
            {step === 'debt' && <DebtStep customer={customer} session={session} onDone={setDone} onNoCustomer={() => setStep('customer')} />}
        </AuthShell>
    )
}

function ShopStep({ onDone }) {
    const [name, setName] = useState('')
    const [categoryId, setCategoryId] = useState(null)
    const [categories, setCategories] = useState([])
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        locationsApi.categories().then((r) => setCategories(Array.isArray(r) ? r : r?.data || [])).catch(() => {})
    }, [])

    const submit = async () => {
        if (!name.trim()) return setError("Do'kon nomini kiriting")
        setBusy(true)
        try {
            await onboardingApi.shop({ name: name.trim(), category_id: categoryId })
            await onDone()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="flex flex-1 flex-col" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
            <h1 className="mb-2 mt-9 text-[28px] font-extrabold leading-tight tracking-tight">Do'koningiz nomi nima?</h1>
            <p className="mb-7 text-base text-ink-2">Bu nom qarzdorga boradigan SMS'da ko'rinadi.</p>
            <Input label="Do'kon nomi" value={name} onChange={(e) => { setName(e.target.value); setError('') }} error={error} autoFocus maxLength={255} />
            {categories.length > 0 && (
                <>
                    <p className="mb-2.5 mt-7 text-sm font-semibold">Nima sotasiz? <span className="font-normal text-ink-3">(ixtiyoriy)</span></p>
                    <Chips wrap ariaLabel="Faoliyat turi" value={categoryId} onChange={(v) => setCategoryId(v === categoryId ? null : v)}
                        options={categories.map((c) => ({ value: c.id, label: c.name }))} />
                </>
            )}
            <div className="flex-1" />
            <Button type="submit" size="lg" block loading={busy} className="mt-8">Keyingisi</Button>
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
        if (!(amount > 0)) return toast.error('Summani kiriting')
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
            <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Birinchi nasiyani yozing</h1>
            <p className="mb-4 text-[15px] text-ink-2">{customer.name} · {formatPhone(customer.phone)}</p>
            <AmountPad value={amount} onChange={setAmount} autoFocus />
            <p className="mb-2 mt-3.5 text-sm font-semibold">Qachon berildi?</p>
            <Chips ariaLabel="Berilgan sana" value={given} onChange={setGiven} options={[{ value: 'today', label: 'Bugun' }, { value: 'yesterday', label: 'Kecha' }]} />
            <p className="mb-2 mt-3 text-sm font-semibold">Qachon qaytaradi?</p>
            <Chips ariaLabel="Qaytarish muddati" value={due} onChange={(v) => setDue(v === due ? null : v)}
                options={[{ value: '1w', label: '1 hafta' }, { value: '2w', label: '2 hafta' }, { value: '1m', label: '1 oy' }]} />
            <div className="mt-3 rounded-ctl bg-pay-soft px-3.5 py-3">
                <Toggle checked={sms} onChange={setSms} label={dueDate ? `${formatDate(dueDate)}, ${session.notifications.reminder_time || '09:00'} da SMS eslatma` : 'Mijozga SMS'}
                    description={`${customer.name}ga o'zi boradi`} />
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Izoh (ixtiyoriy): nima oldi?" aria-label="Izoh"
                className="mt-2.5 h-12 rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-[15px] text-ink outline-none focus:border-brand" />
            <div className="flex-1" />
            <Button type="submit" size="lg" block loading={busy} className="mt-6">Nasiyani yozish</Button>
        </form>
    )
}

function Finish({ done, onGo, session }) {
    const days = session.subscription?.trial_info?.days_remaining
    return (
        <AuthShell>
            <span className="mt-8 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-pay-soft text-pay"><Check size={36} strokeWidth={2.5} aria-hidden /></span>
            <h1 className="mb-2 mt-6 text-[28px] font-extrabold leading-tight tracking-tight">{done ? 'Birinchi nasiya yozildi' : 'Hammasi tayyor'}</h1>
            {done && (
                <p className="text-base leading-relaxed text-ink-2">
                    {done.customer.name} · {formatMoney(done.amount)}{done.dueDate && ` · ${formatDate(done.dueDate)} gacha`}. Eslatma SMS'i o'z vaqtida boradi.
                </p>
            )}
            <p className="mb-3 mt-8 section-label">Yana 2 ta qadam — unutmaslik uchun</p>
            <div className="space-y-2.5">
                {[
                    ['/settings/reminders', Send, 'Kechki xulosani ulash', "Har kuni Telegram'ga: bugun kim oldi, kim to'ladi"],
                    ['/install', Smartphone, "Telefonga o'rnatish", "Bosh ekranga qo'shish — ilovadek ochiladi"]
                ].map(([to, Icon, title, text]) => (
                    <Link key={to} to={to} className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-line p-4 hover:bg-soft/60">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Icon size={22} aria-hidden /></span>
                        <span className="min-w-0 flex-1 text-[15px] leading-snug"><strong>{title}</strong><br /><span className="text-ink-2">{text}</span></span>
                        <ChevronRight size={20} className="text-ink-3" aria-hidden />
                    </Link>
                ))}
            </div>
            {days > 0 && (
                <p className="mt-4 rounded-ctl bg-soft p-4 text-sm text-ink-2"><strong className="text-ink">Bepul sinov muddati: {days} kun qoldi.</strong> Karta kerak emas.</p>
            )}
            <div className="flex-1" />
            <Button size="lg" block className="mt-8" onClick={onGo}>Bosh sahifaga o'tish</Button>
        </AuthShell>
    )
}
