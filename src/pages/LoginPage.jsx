import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { Loader2, Phone, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'

export default function LoginPage() {
    const navigate = useNavigate()
    const [form, setForm] = useState({ phone: PHONE_PREFIX, password: '' })
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode') === 'true'
        if (savedDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const rawPhone = getRawPhoneNumber(form.phone)
            const data = await authApi.login(rawPhone, form.password)

            // Login uchun SMS tasdiqlash o'chirilgan: backend darhol token + user qaytaradi
            if (data.token) {
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify(data.user))
                navigate('/')
            } else {
                setError('Kutilmagan javob. Qaytadan urinib ko\'ring.')
            }
        } catch (err) {
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors
                const messages = Object.values(errors).flat().join(', ')
                setError(messages)
            } else {
                setError(err.response?.data?.message || 'Kirish amalga oshmadi')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-white rounded-[32px] shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                        <img src="/logo.png" alt="Daftaron Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Daftaron</h1>
                    <p className="text-gray-400 mt-2 text-[15px]">Nasiya boshqaruvi tizimi</p>
                </div>

                <div className="card">
                    <h2 className="text-[20px] font-semibold text-center text-gray-900 dark:text-white mb-6">Kirish</h2>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-500 rounded-2xl text-[14px]">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="label">Telefon raqam</label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    className="input pl-11"
                                    placeholder="+998 XX XXX XX XX"
                                    value={form.phone}
                                    onChange={(e) => {
                                        const formatted = formatPhoneNumber(e.target.value)
                                        setForm({ ...form, phone: formatted })
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Parol</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input pl-11 pr-12"
                                    placeholder="••••••••"
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
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    Kirish
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <Link to="/forgot-password" className="text-gray-400 hover:text-blue-500 text-[14px]">
                            Parolni unutdingizmi?
                        </Link>
                    </div>

                    <div className="mt-3 text-center">
                        <span className="text-gray-400 text-[14px]">Hisobingiz yo'qmi? </span>
                        <Link to="/register" className="text-blue-500 font-semibold text-[14px]">
                            Ro'yxatdan o'tish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
