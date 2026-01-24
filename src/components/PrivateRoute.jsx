import { Navigate, useLocation } from 'react-router-dom'

export default function PrivateRoute({ children }) {
    const token = localStorage.getItem('token')
    const hasSeenIntro = localStorage.getItem('hasSeenIntro') === 'true'
    const location = useLocation()

    if (!hasSeenIntro) {
        return <Navigate to="/intro" replace />
    }

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}
