import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { Eye, EyeOff } from 'lucide-react'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'

export default function RegisterPage() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        name: '',
        phone: PHONE_PREFIX,
        email: '',
        password: '',
        password_confirmation: '',
        shop_name: '',
        region_id: null,
        district_id: null,
        street_id: null
    })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [errors, setErrors] = useState({})

    const handleLocationChange = (location) => {
        setForm({ ...form, ...location })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setErrors({})

        try {
            const submitData = { ...form, phone: getRawPhoneNumber(form.phone) }
            const data = await authApi.register(submitData)
            // Register returns token directly
            if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/')
            } else {
                // Fallback to login page if no token returned
                navigate('/login')
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
        <div className="min-h-screen px-6 py-8 bg-gradient-to-b from-primary-50 to-white">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center mb-6">
                    <Link to="/login" className="text-primary-600 text-sm">← Kirish</Link>
                    <h1 className="text-2xl font-bold text-slate-900 mt-4">Ro'yxatdan o'tish</h1>
                    <p className="text-slate-500 text-sm mt-1">Yangi hisob yarating</p>
                </div>

                <div className="card">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">To'liq ism</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ismingiz"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                                value={form.phone}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value)
                                    setForm({ ...form, phone: formatted })
                                }}
                                required
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                        </div>

                        <div>
                            <label className="label">Email (ixtiyoriy)</label>
                            <input
                                type="email"
                                className="input"
                                placeholder="email@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Do'kon nomi</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Do'koningiz nomi"
                                value={form.shop_name}
                                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                                required
                            />
                            {errors.shop_name && <p className="text-red-500 text-xs mt-1">{errors.shop_name[0]}</p>}
                        </div>

                        <LocationSelector
                            value={{
                                region_id: form.region_id,
                                district_id: form.district_id,
                                street_id: form.street_id
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
                                    placeholder="Kamida 8 belgi"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                                    value={form.password_confirmation}
                                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
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

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? <LoadingSpinner size="sm" /> : 'Ro\'yxatdan o\'tish'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-slate-500 text-sm">Hisobingiz bormi? </span>
                        <Link to="/login" className="text-primary-600 font-medium text-sm hover:underline">
                            Kirish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
