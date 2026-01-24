import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import IntroPage from './pages/IntroPage'

// App pages
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import DebtsPage from './pages/DebtsPage'
import DebtDetailPage from './pages/DebtDetailPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro') === 'true'
    const token = localStorage.getItem('token')

    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/login"
                element={
                    !hasSeenIntro ? <Navigate to="/intro" replace /> : <LoginPage />
                }
            />
            <Route
                path="/register"
                element={
                    !hasSeenIntro ? <Navigate to="/intro" replace /> : <RegisterPage />
                }
            />
            <Route path="/intro" element={<IntroPage />} />

            {/* Protected routes */}
            <Route
                element={
                    <PrivateRoute>
                        <Layout />
                    </PrivateRoute>
                }
            >
                <Route
                    path="/"
                    element={
                        !hasSeenIntro && !token ? <Navigate to="/intro" replace /> : <DashboardPage />
                    }
                />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/new" element={<Navigate to="/customers" replace />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/debts" element={<DebtsPage />} />
                <Route path="/debts/:id" element={<DebtDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
            </Route>
        </Routes>
    )
}
