import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth.api'
import { errorMessage } from '../lib/errors'
import { Button, Input, PhoneInput } from '../ui/controls'
import { isValidPhone, toApiPhone } from '../utils/phone'
import { AuthShell, CodeInput } from './LoginPage'

export const passwordProblem = (p) => {
    if (p.length < 8) return 'Kamida 8 belgi'
    if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Harf va raqam bo\'lishi kerak'
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
        if (!isValidPhone(phone)) return setError("Raqam to'liq emas")
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
        if (password !== confirm) return setError('Parollar mos emas')
        run(async () => {
            await authApi.resetPassword(token, password, confirm)
            toast.success('Parol yangilandi. Endi kiring.')
            navigate('/login', { replace: true })
        })
    }

    return (
        <AuthShell onBack={() => (step > 1 ? setStep(step - 1) : navigate('/login'))}>
            <p className="mt-6 text-sm font-semibold text-ink-2">{step}/3</p>
            <h1 className="mb-8 mt-1 text-[28px] font-extrabold tracking-tight">
                {step === 1 ? 'Parolni tiklash' : step === 2 ? 'SMS-kod' : 'Yangi parol'}
            </h1>
            <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); step === 1 ? send() : step === 2 ? check() : save() }}>
                {step === 1 && <PhoneInput value={phone} onChange={setPhone} autoFocus />}
                {step === 2 && <CodeInput value={code} onChange={setCode} onComplete={check} />}
                {step === 3 && (
                    <>
                        <Input label="Yangi parol" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Kamida 8 belgi · harf va raqam" autoFocus />
                        <Input label="Parolni takrorlang" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    </>
                )}
                {error && <p role="alert" className="text-[15px] font-semibold text-debt">{error}</p>}
                <Button type="submit" size="lg" block loading={busy}>{step === 3 ? 'Saqlash' : 'Davom etish'}</Button>
            </form>
            <Link to="/login" className="mt-5 text-[15px] font-semibold text-brand-strong">Kod bilan kirish</Link>
        </AuthShell>
    )
}
