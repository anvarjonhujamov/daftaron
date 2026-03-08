import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { categoriesApi } from '../api/categories.api'
import { Eye, EyeOff } from 'lucide-react'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'

const STEP_NAMES = { namePhone: 1, verify: 2, complete: 3 }

export default function RegisterPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(STEP_NAMES.namePhone)
    const [phoneCache, setPhoneCache] = useState('') // raw phone after step1, used in complete

    const [formStep1, setFormStep1] = useState({ name: '', phone: PHONE_PREFIX })
    const [code, setCode] = useState('')

    const [formComplete, setFormComplete] = useState({
        shop_name: '',
        category_id: null,
        region_id: null,
        district_id: null,
        street_id: null,
        password: '',
        password_confirmation: ''
    })
    const [categories, setCategories] = useState([])

    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
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
        setError('')
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
                setError(err.response.data.message || 'Ma\'lumotlarni tekshiring')
            } else {
                setError(err.response?.data?.message || 'Ro\'yxatdan o\'tish amalga oshmadi')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleVerifySubmit = async (e) => {
        e.preventDefault()
        if (!code || code.length !== 4) {
            setError('4 xonali kodni kiriting')
            return
        }
        setLoading(true)
        setError('')
        try {
            const data = await authApi.verify(phoneCache, code, 'register')
            if (data.requires_completion) {
                setStep(STEP_NAMES.complete)
            } else if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/')
            } else {
                setError('Kutilmagan javob')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Kod noto\'g\'ri yoki muddati tugagan')
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setErrors({})
        try {
            const data = await authApi.registerComplete({
                phone: phoneCache,
                shop_name: formComplete.shop_name.trim(),
                category_id: formComplete.category_id,
                region_id: formComplete.region_id,
                district_id: formComplete.district_id,
                street_id: formComplete.street_id,
                password: formComplete.password,
                password_confirmation: formComplete.password_confirmation
            })
            if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/')
            } else {
                setError('Hisob yaratildi, lekin kirish amalga oshmadi. Login sahifasiga o\'ting.')
                setTimeout(() => navigate('/login'), 2000)
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                setError(err.response.data.message || 'Ma\'lumotlarni tekshiring')
            } else {
                setError(err.response?.data?.message || 'Ro\'yxatdan o\'tish amalga oshmadi')
            }
        } finally {
            setLoading(false)
        }
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
                            onClick={() => setStep(step === STEP_NAMES.verify ? STEP_NAMES.namePhone : STEP_NAMES.verify)}
                            className="text-primary-600 text-sm"
                        >
                            ← Orqaga
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-4">Ro'yxatdan o'tish</h1>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                        {step === STEP_NAMES.namePhone && "1/3 — Ism va telefon"}
                        {step === STEP_NAMES.verify && "2/3 — SMS kodni tasdiqlang"}
                        {step === STEP_NAMES.complete && "3/3 — Do'kon va parol"}
                    </p>
                </div>

                <div className="card">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

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
                                    type="text"
                                    className="input"
                                    placeholder="+998 XX XXX XX XX"
                                    value={formStep1.phone}
                                    onChange={(e) => setFormStep1({ ...formStep1, phone: formatPhoneNumber(e.target.value) })}
                                    required
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                            </div>
                            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
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

                    {/* Step 3: Shop + location + password */}
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
                                required
                            />
                            <div>
                                <label className="label">Parol</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="input pr-12"
                                        placeholder="Kamida 6 belgi"
                                        value={formComplete.password}
                                        onChange={(e) => setFormComplete({ ...formComplete, password: e.target.value })}
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
                                        value={formComplete.password_confirmation}
                                        onChange={(e) => setFormComplete({ ...formComplete, password_confirmation: e.target.value })}
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
                            </div>
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
