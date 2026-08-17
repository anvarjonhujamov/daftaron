import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { categoriesApi } from '../api/categories.api'
import { Eye, EyeOff } from 'lucide-react'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import toast from 'react-hot-toast'

const STEP_NAMES = { namePhone: 1, verify: 2, password: 3, complete: 4 }

export default function RegisterPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(STEP_NAMES.namePhone)
    const [phoneCache, setPhoneCache] = useState('')

    const [formStep1, setFormStep1] = useState({ name: '', phone: PHONE_PREFIX })
    const [code, setCode] = useState('')
    const [acceptedTerms, setAcceptedTerms] = useState(false)

    const [formPassword, setFormPassword] = useState({
        password: '',
        password_confirmation: ''
    })

    const [formComplete, setFormComplete] = useState({
        shop_name: '',
        category_id: null,
        region_id: null,
        district_id: null,
        street_id: null
    })
    const [categories, setCategories] = useState([])

    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [errors, setErrors] = useState({})

    const handleLocationChange = (location) => {
        setFormComplete(prev => ({ ...prev, ...location }))
    }

    useEffect(() => {
        if (step !== STEP_NAMES.complete) return
        let mounted = true
        categoriesApi.getCategories().then((list) => {
            if (mounted) {
                setCategories(list)
                setFormComplete(prev => ({
                    ...prev,
                    category_id: prev.category_id ?? list[0]?.id ?? null
                }))
            }
        })
        return () => { mounted = false }
    }, [step])

    const handleStep1Submit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrors({})
        try {
            const rawPhone = getRawPhoneNumber(formStep1.phone)
            await authApi.registerStep1(formStep1.name.trim(), rawPhone)
            setPhoneCache(rawPhone)
            setCode('')
            setStep(STEP_NAMES.verify)
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                toast.error(err.response.data.message || 'Ma\'lumotlarni tekshiring')
            } else {
                toast.error(err.response?.data?.message || 'Ro\'yxatdan o\'tish amalga oshmadi')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleVerifySubmit = async (e) => {
        e.preventDefault()
        if (!code || code.length !== 4) {
            toast.error('4 xonali kodni kiriting')
            return
        }
        setLoading(true)
        try {
            const data = await authApi.verify(phoneCache, code, 'register')
            if (data.requires_password_setup) {
                setFormPassword({ password: '', password_confirmation: '' })
                setStep(STEP_NAMES.password)
            } else if (data.requires_completion) {
                setStep(STEP_NAMES.complete)
            } else if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/')
            } else {
                toast.error('Kutilmagan javob')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Kod noto\'g\'ri yoki muddati tugagan')
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        setErrors({})

        if (formPassword.password.length < 8) {
            toast.error('Parol kamida 8 ta belgi bo\'lishi kerak')
            return
        }
        if (formPassword.password !== formPassword.password_confirmation) {
            toast.error('Parollar bir xil emas')
            return
        }

        setLoading(true)
        try {
            const data = await authApi.registerPassword(
                phoneCache,
                formPassword.password,
                formPassword.password_confirmation
            )
            if (data.requires_completion) {
                setStep(STEP_NAMES.complete)
            } else {
                toast.error('Kutilmagan javob')
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                toast.error(err.response.data.message || 'Parolni tekshiring')
            } else {
                toast.error(err.response?.data?.message || 'Parol saqlashda xatolik')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrors({})
        try {
            const data = await authApi.registerComplete({
                phone: phoneCache,
                shop_name: formComplete.shop_name.trim(),
                category_id: formComplete.category_id,
                region_id: formComplete.region_id,
                district_id: formComplete.district_id,
                street_id: formComplete.street_id
            })
            if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/')
            } else {
                toast.error('Hisob yaratildi, lekin kirish amalga oshmadi. Login sahifasiga o\'ting.')
                setTimeout(() => navigate('/login'), 2000)
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                toast.error(err.response.data.message || 'Ma\'lumotlarni tekshiring')
            } else {
                toast.error(err.response?.data?.message || 'Ro\'yxatdan o\'tish amalga oshmadi')
            }
        } finally {
            setLoading(false)
        }
    }

    const goBack = () => {
        if (step === STEP_NAMES.verify) setStep(STEP_NAMES.namePhone)
        else if (step === STEP_NAMES.password) setStep(STEP_NAMES.verify)
        else if (step === STEP_NAMES.complete) setStep(STEP_NAMES.password)
    }

    return (
        <div className="min-h-screen px-6 py-8 bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center mb-6">
                    {step === STEP_NAMES.namePhone && (
                        <Link to="/login" className="text-primary-600 text-sm">← Kirish</Link>
                    )}
                    {step > STEP_NAMES.namePhone && (
                        <button
                            type="button"
                            onClick={goBack}
                            className="text-primary-600 text-sm"
                        >
                            ← Orqaga
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-4">Ro'yxatdan o'tish</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                        {step === STEP_NAMES.namePhone && "1/4 — Ism va telefon"}
                        {step === STEP_NAMES.verify && "2/4 — SMS kodni tasdiqlang"}
                        {step === STEP_NAMES.password && "3/4 — Parol yarating"}
                        {step === STEP_NAMES.complete && "4/4 — Do'kon ma'lumotlari"}
                    </p>
                </div>

                <div className="card">
                    {/* Step 1: Name + Phone */}
                    {step === STEP_NAMES.namePhone && (
                        <form onSubmit={handleStep1Submit} className="space-y-4">
                            <div>
                                <label className="label">To'liq ism</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ismingiz"
                                    value={formStep1.name}
                                    onChange={(e) => setFormStep1({ ...formStep1, name: e.target.value })}
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                            </div>
                            <div>
                                <label className="label">Telefon raqam</label>
                                <input
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    className="input"
                                    placeholder="+998 XX XXX XX XX"
                                    value={formStep1.phone}
                                    onChange={(e) => setFormStep1({ ...formStep1, phone: formatPhoneNumber(e.target.value) })}
                                    required
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                            </div>

                            <div className="flex items-start mb-4">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        required
                                    />
                                </div>
                                <label htmlFor="terms" className="ml-2 text-[13px] font-medium text-gray-900 dark:text-gray-300">
                                    Men <Link to="/terms" className="text-blue-600 hover:underline dark:text-blue-500">Ommaviy oferta foydalanish shartlariga</Link> roziman
                                </label>
                            </div>

                            <button type="submit" className="btn btn-primary w-full" disabled={loading || !acceptedTerms}>
                                {loading ? <LoadingSpinner size="sm" /> : 'Davom etish'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Verify code */}
                    {step === STEP_NAMES.verify && (
                        <form onSubmit={handleVerifySubmit} className="space-y-4">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                <strong>{phoneCache}</strong> raqamiga yuborilgan 4 xonali kodni kiriting.
                            </p>
                            <div>
                                <label className="label">SMS kodi</label>
                                <input
                                    type="text"
                                    className="input text-center text-[20px] tracking-[0.5em]"
                                    placeholder="1234"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={loading || code.length !== 4}
                            >
                                {loading ? <LoadingSpinner size="sm" /> : 'Tasdiqlash'}
                            </button>
                        </form>
                    )}

                    {/* Step 3: Password setup */}
                    {step === STEP_NAMES.password && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Hisobingiz uchun parol yarating (kamida 8 ta belgi).
                            </p>
                            <div>
                                <label className="label">Parol</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="input pr-12"
                                        placeholder="Kamida 8 belgi"
                                        value={formPassword.password}
                                        onChange={(e) => setFormPassword({ ...formPassword, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
                            </div>
                            <div>
                                <label className="label">Parolni tasdiqlang</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className="input pr-12"
                                        placeholder="Parolni qaytaring"
                                        value={formPassword.password_confirmation}
                                        onChange={(e) => setFormPassword({ ...formPassword, password_confirmation: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <p className="text-red-500 text-xs mt-1">{errors.password_confirmation[0]}</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={loading}
                            >
                                {loading ? <LoadingSpinner size="sm" /> : 'Davom etish'}
                            </button>
                        </form>
                    )}

                    {/* Step 4: Shop + location */}
                    {step === STEP_NAMES.complete && (
                        <form onSubmit={handleCompleteSubmit} className="space-y-4">
                            <div>
                                <label className="label">Do'kon nomi</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Do'koningiz nomi"
                                    value={formComplete.shop_name}
                                    onChange={(e) => setFormComplete({ ...formComplete, shop_name: e.target.value })}
                                    required
                                />
                                {errors.shop_name && <p className="text-red-500 text-xs mt-1">{errors.shop_name[0]}</p>}
                            </div>
                            <div>
                                <label className="label">Faoliyat turi (kategoriya)</label>
                                <select
                                    className="input"
                                    value={formComplete.category_id ?? ''}
                                    onChange={(e) => setFormComplete({ ...formComplete, category_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                                    required
                                >
                                    <option value="">Tanlang...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id[0]}</p>}
                            </div>
                            <LocationSelector
                                value={{
                                    region_id: formComplete.region_id,
                                    district_id: formComplete.district_id,
                                    street_id: formComplete.street_id
                                }}
                                onChange={handleLocationChange}
                            />
                            <button type="submit" className="btn btn-primary w-full" disabled={loading || !formComplete.category_id}>
                                {loading ? <LoadingSpinner size="sm" /> : 'Ro\'yxatdan o\'tish'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <span className="text-slate-500 dark:text-gray-400 text-sm">Hisobingiz bormi? </span>
                        <Link to="/login" className="text-primary-600 font-medium text-sm hover:underline">
                            Kirish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
