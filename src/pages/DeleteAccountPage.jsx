import { Mail, Database, ShieldAlert, Clock } from 'lucide-react'
import { getToken } from '../lib/session'
import { AuthShell } from './LoginPage'
import { useNavigate } from 'react-router-dom'

// Akkauntni o'chirish tartibi (Play Market talabi bo'yicha ochiq sahifa)
export default function DeleteAccountPage() {
    const navigate = useNavigate()
    const items = [
        [Database, "Ma'lumotlarni o'chirish", 'Barcha shaxsiy ma\'lumotlar va qarzdorlik yozuvlari o\'chiriladi.'],
        [ShieldAlert, 'Saqlanishi mumkin', "Qonuniy talablar asosida ba'zi loglar vaqtincha saqlanishi mumkin."],
        [Clock, "O'chirish muddati", '3–5 ish kuni ichida amalga oshiriladi.']
    ]
    return (
        <AuthShell onBack={() => (window.history.length > 1 ? navigate(-1) : navigate(getToken() ? '/settings' : '/login'))}>
            <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">Akkauntni o'chirish</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                DaftarOn akkauntingizni o'chirish uchun so'rov yuboring. Avval kerakli ma'lumotlarni Excel'ga yuklab oling (Tarix bo'limi).
            </p>
            <div className="mt-6 rounded-ctl bg-soft p-4">
                <p className="flex items-center gap-2 font-bold"><Mail size={18} aria-hidden /> So'rov yuborish</p>
                <p className="mt-2 text-sm text-ink-2">Email:</p>
                <a href="mailto:muminovxurshidbek@gmail.com?subject=Account%20deletion%20request" className="font-semibold text-brand-strong">muminovxurshidbek@gmail.com</a>
                <p className="mt-2 text-sm text-ink-2">Mavzu: <strong className="text-ink">Account deletion request</strong></p>
            </div>
            <ul className="mt-4 space-y-3">
                {items.map(([Icon, title, text]) => (
                    <li key={title} className="flex gap-3">
                        <Icon size={20} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
                        <span className="text-[15px]"><strong>{title}</strong><br /><span className="text-ink-2">{text}</span></span>
                    </li>
                ))}
            </ul>
        </AuthShell>
    )
}
