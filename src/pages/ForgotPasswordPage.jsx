import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { Loader2, Phone, Lock, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1) // 1=phone, 2=code, 3=new password
    const [phone, setPhone] = useState(PHONE_PREFIX)
    const [rawPhone, setRawPhone] = useState('')
    const [code, setCode] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode') === 'true'
        if (savedDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    const handleStep1 = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const raw = getRawPhoneNumber(phone)
            setRawPhone(raw)
            await authApi.forgotPassword(raw)
            toast.success('SMS kod yuborildi')
            setStep(2)
        } catch (err) {
            if (err.response?.status === 404) {
                toast.error('Bu raqam ro\'yxatda yo\'q')
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleStep2 = async (e) => {
        e.preventDefault()
        if (code.length !== 4) {
            toast.error('4 xonali kodni kiriting')
            return
        }
        setLoading(true)
        try {
            const data = await authApi.verifyPasswordReset(rawPhone, code)
            setResetToken(data.reset_token)
            setStep(3)
        } catch (err) {
            if (err.response?.status === 404) {
                toast.error('Kod muddati tugagan. Qaytadan urinib ko\'ring')
            } else {
                toast.error(err.response?.data?.message || 'Kod noto\'g\'ri')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleStep3 = async (e) => {
        e.preventDefault()
        if (password.length < 6) {
            toast.error('Parol kamida 6 belgidan iborat bo\'lishi kerak')
            return
        }
        if (password !== passwordConfirmation) {
            toast.error('Parollar mos kelmaydi')
            return
        }
        setLoading(true)
        try {
            await authApi.resetPassword(resetToken, password, passwordConfirmation)
            toast.success('Parol muvaffaqiyatli yangilandi!')
            setTimeout(() => navigate('/login'), 2000)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Parolni yangilashda xatolik')
        } finally {
            setLoading(false)
        }
    }

    const stepTitle = step === 1 ? 'Telefon raqam' : step === 2 ? 'SMS tasdiq' : 'Yangi parol'

    return (
        <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-[24px] shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                        <KeyRound size={32} className="text-blue-500" />
                    </div>
                    <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Parolni tiklash</h1>
                    <p className="text-gray-400 mt-2 text-[14px]">{step}/3 — {stepTitle}</p>
                </div>

                <div className="card dark:bg-gray-800">
                    {/* Step 1: Phone */}
                    {step === 1 && (
                        <form onSubmit={handleStep1} className="space-y-5">
                            <div>
                                <label className="label dark:text-gray-400">Telefon raqam</label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11"
                                        placeholder="+998 XX XXX XX XX"
                                        value={phone}
                                        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'SMS yuborish'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Code */}
                    {step === 2 && (
                        <form onSubmit={handleStep2} className="space-y-5">
                            <p className="text-[14px] text-gray-500 dark:text-gray-400">
                                <strong>{rawPhone}</strong> raqamiga yuborilgan 4 xonali kodni kiriting.
                            </p>
                            <div>
                                <label className="label dark:text-gray-400">SMS kodi</label>
                                <input
                                    type="text"
                                    className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-[20px] tracking-[0.5em]"
                                    placeholder="1234"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-full" disabled={loading || code.length !== 4}>
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Tasdiqlash'}
                            </button>
                        </form>
                    )}

                    {/* Step 3: New Password */}
                    {step === 3 && (
                        <form onSubmit={handleStep3} className="space-y-5">
                            <div>
                                <label className="label dark:text-gray-400">Yangi parol</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11"
                                        placeholder="Kamida 6 belgi"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label dark:text-gray-400">Parolni tasdiqlang</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11"
                                        placeholder="Parolni qaytaring"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Parolni yangilash'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-blue-500 font-semibold text-[14px] flex items-center justify-center gap-1">
                            <ArrowLeft size={16} />
                            Kirish sahifasiga qaytish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
