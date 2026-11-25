import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth.api'
import { errorMessage } from '../lib/errors'
import { Button, Input, PhoneInput } from '../ui/controls'
import { isValidPhone, toApiPhone } from '../utils/phone'
import { AuthShell, CodeInput } from './LoginPage'
import { t } from '../i18n'
import LangSwitch from '../features/LangSwitch'

export const passwordProblem = (p) => {
    if (p.length < 8) return t('Kamida 8 belgi')
    if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return t('Harf va raqam bo\'lishi kerak')
    return null
}

// Parolni tiklash (parol bilan kiradiganlar uchun): telefon → SMS-kod → yangi parol
export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [phone, setPhone] = useState('')
    const [code, setCode] = useState('')
    const [token, setToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const run = async (fn) => {
        setBusy(true)
        setError('')
        try { await fn() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
    }

    const send = () => {
        if (!isValidPhone(phone)) return setError(t("Raqam to'liq emas"))
        run(async () => { await authApi.forgotPassword(toApiPhone(phone)); setStep(2) })
    }
    const check = (value = code) => run(async () => {
        const res = await authApi.verifyPasswordReset(toApiPhone(phone), value)
        setToken(res.reset_token)
        setStep(3)
    })
    const save = () => {
        const problem = passwordProblem(password)
        if (problem) return setError(problem)
        if (password !== confirm) return setError(t('Parollar mos emas'))
        run(async () => {
            await authApi.resetPassword(token, password, confirm)
            toast.success(t('Parol yangilandi. Endi kiring.'))
            navigate('/login', { replace: true })
        })
    }

    return (
        <AuthShell onBack={() => (step > 1 ? setStep(step - 1) : navigate('/login'))}>
            <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-2">{step}/3</p>
                <LangSwitch />
            </div>
            <h1 className="mb-8 mt-1 text-[28px] font-extrabold tracking-tight">
                {step === 1 ? t('Parolni tiklash') : step === 2 ? t('SMS-kod') : t('Yangi parol')}
            </h1>
            <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); step === 1 ? send() : step === 2 ? check() : save() }}>
                {step === 1 && <PhoneInput value={phone} onChange={setPhone} autoFocus />}
                {step === 2 && <CodeInput value={code} onChange={setCode} onComplete={check} />}
                {step === 3 && (
                    <>
                        <Input label={t('Yangi parol')} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={t('Kamida 8 belgi · harf va raqam')} autoFocus />
                        <Input label={t('Parolni takrorlang')} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    </>
                )}
                {error && <p role="alert" className="text-[15px] font-semibold text-debt">{error}</p>}
                <Button type="submit" size="lg" block loading={busy}>{step === 3 ? t('Saqlash') : t('Davom etish')}</Button>
            </form>
            <Link to="/login" className="mt-5 text-[15px] font-semibold text-brand-strong">{t('Kod bilan kirish')}</Link>
        </AuthShell>
    )
}
