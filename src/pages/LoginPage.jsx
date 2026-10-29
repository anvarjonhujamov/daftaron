import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Lock, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth.api'
import { useSession } from '../app/session'
import { deviceName, getToken } from '../lib/session'
import { errorMessage } from '../lib/errors'
import { Button, Input, PhoneInput, cx } from '../ui/controls'
import { formatPhone, isValidPhone, toApiPhone } from '../utils/phone'
import { requestTelegramContact, telegramInitData, waitTelegram } from '../utils/telegram'

// Kod uzunligi backend sozlamasi (TZ 28.1: hozir 4, Eskiz yangi shablonni tasdiqlasa 6)
export const OTP_LENGTH = Number(import.meta.env.VITE_OTP_LENGTH) || 4
const BOT_URL = 'https://t.me/daftaron_bot'

export function Logo() {
    return (
        <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
            <span className="text-xl font-extrabold tracking-tight">DaftarOn</span>
        </div>
    )
}

export function AuthShell({ children, onBack }) {
    return (
        <div className="min-h-screen bg-card md:flex md:items-center md:justify-center md:bg-bg md:p-6">
            <div className="pb-safe mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-6 pb-7 pt-6 md:min-h-0 md:rounded-[24px] md:bg-card md:p-10 md:shadow-sm">
                {onBack && (
                    <button type="button" aria-label="Orqaga" onClick={onBack} className="-ml-2.5 mb-2 flex h-11 w-11 items-center justify-center rounded-xl hover:bg-soft">
                        <ChevronLeft size={26} aria-hidden />
                    </button>
                )}
                {children}
            </div>
        </div>
    )
}

// Kod maydoni: bitta input (SMS'dan avtomatik to'ldirish ishlaydi), ko'rinishda alohida kataklar
export function CodeInput({ value, onChange, onComplete, error, length = OTP_LENGTH }) {
    const ref = useRef(null)
    useEffect(() => { ref.current?.focus() }, [])
    return (
        <div className="relative" onClick={() => ref.current?.focus()}>
            <input
                ref={ref}
                value={value}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`${length} xonali kod`}
                aria-invalid={!!error}
                maxLength={length}
                onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, length)
                    onChange(v)
                    if (v.length === length) onComplete?.(v)
                }}
                className="absolute inset-0 h-full w-full opacity-0"
            />
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden>
                {Array.from({ length }, (_, i) => (
                    <div
                        key={i}
                        className={cx(
                            'flex h-[68px] items-center justify-center rounded-ctl border-2 text-[28px] font-bold',
                            error ? 'border-debt' : i === value.length ? 'border-brand' : value[i] ? 'border-line-2' : 'border-line'
                        )}
                    >
                        {value[i] || ''}
                    </div>
                ))}
            </div>
            {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-debt">{error}</p>}
        </div>
    )
}

export function useCountdown(initial = 0) {
    const [left, setLeft] = useState(initial)
    useEffect(() => {
        if (left <= 0) return
        const t = setTimeout(() => setLeft((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [left])
    return [left, setLeft]
}

const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const session = useSession()
    const [step, setStep] = useState('phone') // phone | code | password
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [sent, setSent] = useState(null) // otpRequest javobi
    const [codeType, setCodeType] = useState('otp') // otp | login (parol + SMS tasdiq)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [telegramBusy, setTelegramBusy] = useState(false)
    const [resendIn, setResendIn] = useCountdown(0)

    const finish = async (res) => {
        await session.signIn(res.token, res.user)
        const onboarding = res.onboarding
        if (onboarding && !onboarding.completed && onboarding.step !== 'done') navigate('/onboarding', { replace: true })
        else navigate(location.state?.from || '/', { replace: true })
    }

    // Telegram Mini App: imzolangan init_data bilan avtomatik kirish (CLAUDE.md, 1-vazifa)
    useEffect(() => {
        if (getToken()) return
        let alive = true
        waitTelegram().then(async (app) => {
            const initData = app && telegramInitData()
            if (!alive || !initData) return
            setTelegramBusy(true)
            const login = (init_data) => authApi.telegramLogin({ init_data, device_name: deviceName(), create_if_missing: true })
            try {
                await finish(await login(initData))
            } catch (err) {
                // Telegram akkauntga bog'lanmagan: kontaktni so'raymiz (imzolangan javob)
                if ([401, 404].includes(err?.response?.status)) {
                    const contact = await requestTelegramContact()
                    if (contact) {
                        try {
                            await finish(await login(contact))
                            return
                        } catch (e) {
                            toast.error(errorMessage(e))
                        }
                    }
                } else {
                    toast.error(errorMessage(err))
                }
            } finally {
                if (alive) setTelegramBusy(false)
            }
        })
        return () => { alive = false }
    }, [])

    if (getToken() && !busy) return <Navigate to="/" replace />

    const requestCode = async () => {
        if (!isValidPhone(phone)) return setError("Raqam to'liq emas: 9 ta raqam kiriting")
        setBusy(true)
        setError('')
        try {
            const res = await authApi.otpRequest(toApiPhone(phone))
            setSent(res)
            setCodeType('otp')
            setCode('')
            setResendIn(res.resend_in || 60)
            setStep('code')
        } catch (err) {
            const d = err?.response?.data
            if (d?.reason === 'otp_cooldown' && d?.retry_after) {
                setResendIn(d.retry_after)
                setStep('code')
            } else {
                setError(errorMessage(err))
            }
        } finally {
            setBusy(false)
        }
    }

    const verify = async (value = code) => {
        if (value.length < OTP_LENGTH || busy) return
        setBusy(true)
        setError('')
        try {
            const res = codeType === 'otp'
                ? await authApi.otpVerify({ phone: toApiPhone(phone), code: value, device_name: deviceName() })
                : await authApi.verify(toApiPhone(phone), value, 'login')
            if (!res?.token) throw new Error('no token')
            await finish(res)
        } catch (err) {
            const status = err?.response?.status
            setCode('')
            setError(status === 410 ? "Kod muddati o'tdi. Yangi kod oling."
                : status === 429 ? "Ko'p marta xato kiritildi. Yangi kod oling."
                : errorMessage(err, "Kod noto'g'ri"))
        } finally {
            setBusy(false)
        }
    }

    const loginWithPassword = async () => {
        if (!isValidPhone(phone)) return setError("Raqam to'liq emas: 9 ta raqam kiriting")
        if (!password) return setError('Parolni kiriting')
        setBusy(true)
        setError('')
        try {
            const res = await authApi.login(toApiPhone(phone), password, deviceName())
            await finish(res)
        } catch (err) {
            if (err?.response?.data?.requires_verification) {
                setCodeType('login')
                setSent({ message: err.response.data.message })
                setCode('')
                setResendIn(60)
                setStep('code')
            } else {
                setError(errorMessage(err, "Telefon yoki parol noto'g'ri"))
            }
        } finally {
            setBusy(false)
        }
    }

    if (telegramBusy) {
        return (
            <AuthShell>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ink-2">
                    <Loader2 className="animate-spin" aria-hidden /> Telegram orqali kirilmoqda…
                </div>
            </AuthShell>
        )
    }

    if (step === 'code') {
        return (
            <AuthShell onBack={() => { setStep(codeType === 'login' ? 'password' : 'phone'); setError('') }}>
                <h1 className="mt-6 text-[28px] font-extrabold tracking-tight">Kodni kiriting</h1>
                <p className="mb-8 mt-2 text-base leading-relaxed text-ink-2">
                    {sent?.channel === 'telegram'
                        ? <>Kod Telegram'dagi <strong className="text-ink">@daftaron_bot</strong> ga yuborildi.</>
                        : <>{formatPhone(toApiPhone(phone))} raqamiga {OTP_LENGTH} xonali kod yubordik.</>}
                </p>
                <CodeInput value={code} onChange={(v) => { setCode(v); setError('') }} onComplete={verify} error={error} />
                {sent?.channel === 'telegram' && (
                    <a href={sent.bot_url || BOT_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-brand-strong">
                        <Send size={18} aria-hidden /> Botni ochish
                    </a>
                )}
                <p className="mt-5 text-[15px] text-ink-2">
                    {resendIn > 0
                        ? <>Kodni qayta yuborish: <strong className="text-ink">{fmtTimer(resendIn)}</strong></>
                        : codeType === 'otp' && <button type="button" onClick={requestCode} className="font-semibold text-brand-strong">Kodni qayta yuborish</button>}
                </p>
                {sent?.channel === 'telegram' && resendIn <= 0 && (
                    <button type="button" className="mt-2 text-left text-[15px] font-semibold text-brand-strong"
                        onClick={async () => {
                            try { setSent(await authApi.otpRequest(toApiPhone(phone), 'sms')); setResendIn(60) } catch (err) { setError(errorMessage(err)) }
                        }}>
                        SMS orqali olish
                    </button>
                )}
                <button type="button" onClick={() => { setStep('phone'); setError('') }} className="mt-2 text-left text-[15px] font-semibold text-brand-strong">
                    Raqamni o'zgartirish
                </button>
                <div className="flex-1" />
                <div className="mb-4 mt-8 flex items-start gap-3 rounded-ctl bg-soft p-4 text-sm leading-relaxed text-ink-2">
                    <Lock size={20} className="mt-0.5 shrink-0 text-brand-strong" aria-hidden />
                    Telefon almashsa ham ma'lumotlaringiz saqlanadi — shu raqam bilan kirsangiz bas.
                </div>
                <Button size="lg" block loading={busy} disabled={code.length < OTP_LENGTH} onClick={() => verify()}>Davom etish</Button>
            </AuthShell>
        )
    }

    if (step === 'password') {
        return (
            <AuthShell onBack={() => { setStep('phone'); setError('') }}>
                <h1 className="mt-6 text-[28px] font-extrabold tracking-tight">Parol bilan kirish</h1>
                <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); loginWithPassword() }} noValidate>
                    <PhoneInput value={phone} onChange={(v) => { setPhone(v); setError('') }} autoFocus={!phone} />
                    <Input label="Parol" type="password" autoComplete="current-password" value={password} autoFocus={!!phone}
                        onChange={(e) => { setPassword(e.target.value); setError('') }} />
                    {error && <p role="alert" className="text-[15px] font-semibold text-debt">{error}</p>}
                    <Button type="submit" size="lg" block loading={busy}>Kirish</Button>
                </form>
                <Link to="/forgot-password" className="mt-5 text-[15px] font-semibold text-brand-strong">Parolni unutdingizmi?</Link>
            </AuthShell>
        )
    }

    return (
        <AuthShell>
            <div className="mt-6"><Logo /></div>
            <h1 className="mb-2 mt-12 text-[30px] font-extrabold leading-tight tracking-tight">Nasiya daftaringiz —<br />telefoningizda</h1>
            <p className="mb-8 text-base leading-relaxed text-ink-2">Telefon raqamingizni kiriting. Parol shart emas — kod yuboramiz.</p>
            <form onSubmit={(e) => { e.preventDefault(); requestCode() }} noValidate>
                <PhoneInput value={phone} onChange={(v) => { setPhone(v); setError('') }} error={error} autoFocus />
                <Button type="submit" size="lg" block loading={busy} className="mt-4">Kod olish</Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-sm text-ink-3">
                <div className="h-px flex-1 bg-line" />yoki<div className="h-px flex-1 bg-line" />
            </div>
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
                className="flex h-14 items-center justify-center gap-2.5 rounded-ctl border-[1.5px] border-line-2 text-base font-semibold hover:bg-soft md:h-12">
                <Send size={20} aria-hidden /> Telegram bot orqali kirish
            </a>
            <button type="button" onClick={() => { setStep('password'); setError('') }} className="mt-4 text-[15px] font-semibold text-brand-strong">
                Parol bilan kirish
            </button>
            <div className="flex-1" />
            <div className="mt-8 rounded-ctl bg-soft p-4 text-[13px] leading-relaxed text-ink-2">
                <strong className="text-ink">Bitta hisob — hamma qurilmada:</strong> telefon, planshet, kompyuter va Telegram bot.
                iPhone'da brauzer orqali ishlaydi — <Link to="/install" className="font-semibold text-brand-strong">o'rnatish</Link>.
            </div>
            <p className="mt-3.5 text-center text-[13px] text-ink-3">
                Yangi foydalanuvchimisiz? Shu raqam bilan kiring — hisob o'zi ochiladi.{' '}
                <Link to="/legal/offer" className="underline">Oferta</Link> · <Link to="/legal/privacy" className="underline">Maxfiylik</Link>
            </p>
        </AuthShell>
    )
}
