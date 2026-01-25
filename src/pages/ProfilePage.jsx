import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi } from '../api/profile.api'
import { authApi } from '../api/auth.api'
import {
    User, Phone, Mail, Lock, LogOut, ChevronRight,
    Edit3, Loader2, Check, X, Moon, Sun, Clock
} from 'lucide-react'
import { Drawer } from 'vaul'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'

export default function ProfilePage() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showPasswordDrawer, setShowPasswordDrawer] = useState(false)
    const [showEditDrawer, setShowEditDrawer] = useState(false)
    const [darkMode, setDarkMode] = useState(false)

    const [profileForm, setProfileForm] = useState({
        name: '',
        phone: '',
        email: ''
    })

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    })

    const [message, setMessage] = useState({ type: '', text: '' })

    useEffect(() => {
        loadProfile()
        // Check for saved dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode') === 'true'
        setDarkMode(savedDarkMode)
        if (savedDarkMode) {
            document.documentElement.classList.add('dark')
        }
    }, [])

    const loadProfile = async () => {
        try {
            const data = await profileApi.getProfile()
            const userData = data.user || data
            setUser(userData)
            setProfileForm({
                name: userData.name || '',
                phone: formatPhoneNumber(userData.phone || ''),
                email: userData.email || ''
            })
        } catch (err) {
            console.error('Failed to load profile:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleDarkMode = () => {
        const newValue = !darkMode
        setDarkMode(newValue)
        localStorage.setItem('darkMode', newValue.toString())
        if (newValue) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setSaving(true)
        setMessage({ type: '', text: '' })

        try {
            const submitData = { ...profileForm, phone: getRawPhoneNumber(profileForm.phone) }
            const data = await profileApi.updateProfile(submitData)
            const updatedUser = data.user || data
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setMessage({ type: 'success', text: 'Profil yangilandi' })
            setShowEditDrawer(false)
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Xatolik yuz berdi'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        setSaving(true)
        setMessage({ type: '', text: '' })

        try {
            await profileApi.updatePassword(passwordForm)
            setMessage({ type: 'success', text: 'Parol yangilandi' })
            setPasswordForm({
                current_password: '',
                password: '',
                password_confirmation: ''
            })
            setShowPasswordDrawer(false)
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Xatolik yuz berdi'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        if (!confirm('Chiqmoqchimisiz?')) return

        try {
            await authApi.logout()
        } catch (err) {
            console.error('Logout error:', err)
        } finally {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            navigate('/login')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()
        return `${mm}/${dd}/${yyyy}`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-6">Sozlamalar</h1>

            {message.text && (
                <div className={`mb-4 p-4 rounded-2xl text-[14px] flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                    {message.type === 'success' ? <Check size={18} /> : null}
                    {message.text}
                </div>
            )}

            {/* User Card */}
            <div className="card dark:bg-gray-800 mb-4">
                <div className="flex items-center gap-4">
                    <div className="avatar avatar-md">
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">{user?.name}</h2>
                        <p className="text-gray-400 text-[14px]">{user?.phone}</p>
                    </div>
                    <button
                        onClick={() => setShowEditDrawer(true)}
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                    >
                        <Edit3 size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Trial Period Card */}
            {user?.trial_ends_at && (
                <div className="card dark:bg-gray-800 mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Clock size={18} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-medium text-gray-900 dark:text-white">Sinov rejimi</p>
                            <p className="text-[13px] text-orange-600 dark:text-orange-400">
                                {formatDate(user.trial_ends_at)} gacha bepul
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="card dark:bg-gray-800 mb-4 divide-y divide-gray-100 dark:divide-gray-700">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-yellow-100'
                            }`}>
                            {darkMode ? (
                                <Moon size={18} className="text-blue-500" />
                            ) : (
                                <Sun size={18} className="text-yellow-500" />
                            )}
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                            {darkMode ? 'Tungi rejim' : 'Kunduzgi rejim'}
                        </span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${darkMode ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                    </button>
                </div>

                {/* Change Password */}
                <button
                    onClick={() => setShowPasswordDrawer(true)}
                    className="w-full flex items-center justify-between py-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Lock size={18} className="text-orange-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">Parolni o'zgartirish</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="card dark:bg-gray-800 w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-4"
            >
                <LogOut size={18} />
                Chiqish
            </button>

            {/* Edit Profile Drawer */}
            <Drawer.Root open={showEditDrawer} onOpenChange={setShowEditDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Profilni tahrirlash
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        Profil ma'lumotlarini yangilash
                                    </Drawer.Description>
                                </div>
                                <button
                                    onClick={() => setShowEditDrawer(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="label dark:text-gray-400">Ism</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11"
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label dark:text-gray-400">Telefon</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11"
                                            placeholder="+998 XX XXX XX XX"
                                            value={profileForm.phone}
                                            onChange={(e) => {
                                                const formatted = formatPhoneNumber(e.target.value)
                                                setProfileForm({ ...profileForm, phone: formatted })
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label dark:text-gray-400">Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11"
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-orange w-full"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Saqlash'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Password Drawer */}
            <Drawer.Root open={showPasswordDrawer} onOpenChange={setShowPasswordDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Parolni o'zgartirish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        Yangi xavfsiz parolni kiriting
                                    </Drawer.Description>
                                </div>
                                <button
                                    onClick={() => setShowPasswordDrawer(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="label dark:text-gray-400">Joriy parol</label>
                                    <input
                                        type="password"
                                        className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={passwordForm.current_password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label dark:text-gray-400">Yangi parol</label>
                                    <input
                                        type="password"
                                        className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={passwordForm.password}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label dark:text-gray-400">Parolni tasdiqlang</label>
                                    <input
                                        type="password"
                                        className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={passwordForm.password_confirmation}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-orange w-full"
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'O\'zgartirish'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
