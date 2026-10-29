import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import Layout from './app/Layout'
import { SessionProvider, useSession } from './app/session'
import { getToken, getUser } from './lib/session'
import { initTelegramWebApp } from './utils/telegram'

// Kirish va bosh sahifa asosiy bundle'da, qolganlari kerak bo'lganda yuklanadi
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

// Yangi deploydan keyin eski chunk topilmasa sahifani bir marta yangilaymiz
const lazyPage = (factory) => lazy(() => factory().catch((err) => {
    if (!sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1')
        window.location.reload()
        return new Promise(() => {})
    }
    throw err
}))

const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'))
const TelegramLoginPage = lazyPage(() => import('./pages/TelegramLoginPage'))
const OnboardingPage = lazyPage(() => import('./pages/OnboardingPage'))
const InstallPage = lazyPage(() => import('./pages/InstallPage'))
const LegalPage = lazyPage(() => import('./pages/LegalPage'))
const DeleteAccountPage = lazyPage(() => import('./pages/DeleteAccountPage'))
const CustomersPage = lazyPage(() => import('./pages/CustomersPage'))
const CustomerPage = lazyPage(() => import('./pages/CustomerPage'))
const CustomerFormPage = lazyPage(() => import('./pages/CustomerFormPage'))
const DebtPage = lazyPage(() => import('./pages/DebtPage'))
const OverduePage = lazyPage(() => import('./pages/OverduePage'))
const HistoryPage = lazyPage(() => import('./pages/HistoryPage'))
const ReportsPage = lazyPage(() => import('./pages/ReportsPage'))
const SuppliersPage = lazyPage(() => import('./pages/SuppliersPage'))
const SupplierPage = lazyPage(() => import('./pages/SupplierPage'))
const StaffPage = lazyPage(() => import('./pages/StaffPage'))
const ShopsPage = lazyPage(() => import('./pages/ShopsPage'))
const NotificationsPage = lazyPage(() => import('./pages/NotificationsPage'))
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'))
const SubscriptionPage = lazyPage(() => import('./pages/SubscriptionPage'))
const SupportPage = lazyPage(() => import('./pages/SupportPage'))
const MorePage = lazyPage(() => import('./pages/MorePage'))

const Spinner = () => (
    <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-ink-3" aria-label="Yuklanmoqda" />
    </div>
)

// Token bo'lmasa — kirish; do'kon hali yaratilmagan bo'lsa — onboarding
function Private({ children, onboarding }) {
    const location = useLocation()
    const session = useSession()
    if (!getToken()) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
    if (session.loading && !session.user) return <Spinner />
    const user = session.user || getUser()
    const hasShop = !!user?.tenant_id || (session.tenants || []).length > 0
    if (!onboarding && !hasShop) return <Navigate to="/onboarding" replace />
    return children
}

export default function App() {
    useEffect(() => {
        // SDK async yuklanadi: hali tayyor bo'lmasa, yuklangach ishga tushiramiz
        if (initTelegramWebApp()) return
        window.addEventListener('telegram-sdk-loaded', initTelegramWebApp, { once: true })
        return () => window.removeEventListener('telegram-sdk-loaded', initTelegramWebApp)
    }, [])

    return (
        <SessionProvider>
            <Toaster
                position="top-center"
                toastOptions={{ duration: 4000, style: { borderRadius: '14px', background: '#0F172A', color: '#fff', fontSize: '15px' } }}
            />
            <Suspense fallback={<Spinner />}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/telegram/web-login" element={<TelegramLoginPage />} />
                    <Route path="/install" element={<InstallPage />} />
                    <Route path="/legal/:type" element={<LegalPage />} />
                    <Route path="/delete-account" element={<DeleteAccountPage />} />
                    <Route path="/register" element={<Navigate to="/login" replace />} />
                    <Route path="/terms" element={<Navigate to="/legal/offer" replace />} />
                    <Route path="/privacy-policy" element={<Navigate to="/legal/privacy" replace />} />

                    <Route path="/onboarding" element={<Private onboarding><OnboardingPage /></Private>} />

                    <Route element={<Private><Layout /></Private>}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/customers/new" element={<CustomerFormPage />} />
                        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                        <Route path="/customers" element={<CustomersPage />}>
                            <Route path=":id" element={<CustomerPage />} />
                        </Route>
                        <Route path="/debts/:id" element={<DebtPage />} />
                        <Route path="/overdue" element={<OverduePage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/suppliers" element={<SuppliersPage />} />
                        <Route path="/suppliers/:id" element={<SupplierPage />} />
                        <Route path="/staff" element={<StaffPage />} />
                        <Route path="/shops" element={<ShopsPage />} />
                        <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/settings/:section" element={<SettingsPage />} />
                        <Route path="/subscription" element={<SubscriptionPage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/more" element={<MorePage />} />
                        {/* Eski manzillar (xatcho'plar, bildirishnomalardagi havolalar) */}
                        <Route path="/debts" element={<Navigate to="/history" replace />} />
                        <Route path="/payments" element={<Navigate to="/history" replace />} />
                        <Route path="/profile" element={<Navigate to="/settings" replace />} />
                        <Route path="/admin/legal" element={<Navigate to="/settings/documents" replace />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </SessionProvider>
    )
}
