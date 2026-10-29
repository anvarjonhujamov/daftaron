import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share, Download } from 'lucide-react'
import { Button, Chips } from '../ui/controls'
import { AuthShell } from './LoginPage'
import { getToken } from '../lib/session'

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

// PWA o'rnatish: iPhone (Safari → Ulashish → Bosh ekranga), Android/kompyuter (brauzer taklifi)
export default function InstallPage() {
    const navigate = useNavigate()
    const [tab, setTab] = useState(isIos() ? 'ios' : 'android')
    const [prompt, setPrompt] = useState(null)
    const standalone = window.matchMedia('(display-mode: standalone)').matches

    useEffect(() => {
        const handler = (e) => { e.preventDefault(); setPrompt(e) }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const steps = tab === 'ios'
        ? [
            ['Safari\'da web.daftaron.uz ni oching', 'Raqamingiz bilan kiring'],
            ['Pastdagi «Ulashish» belgisini bosing', <span key="s" className="inline-flex items-center gap-1.5">kvadrat ichida yuqoriga strelka <Share size={18} className="text-brand-strong" aria-hidden /></span>],
            ['«Bosh ekranga qo\'shish» ni tanlang', 'DaftarOn belgisi ilovalar orasida paydo bo\'ladi']
        ]
        : [
            ['Chrome\'da web.daftaron.uz ni oching', 'Telefon, planshet yoki kompyuterda'],
            ['Menyu (⋮) → «Ilovani o\'rnatish»', 'yoki pastdagi tugmani bosing'],
            ['DaftarOn ilovalar orasida paydo bo\'ladi', 'Internet sekin bo\'lsa ham tez ochiladi']
        ]

    return (
        <AuthShell onBack={() => (window.history.length > 1 ? navigate(-1) : navigate(getToken() ? '/' : '/login'))}>
            <h1 className="mt-2 text-xl font-extrabold">Telefonga o'rnatish</h1>
            <Chips className="mt-3" ariaLabel="Qurilma" value={tab} onChange={setTab}
                options={[{ value: 'ios', label: 'iPhone' }, { value: 'android', label: 'Android / kompyuter' }]} />
            {standalone && <p className="mt-4 rounded-ctl bg-pay-soft p-3 text-sm font-semibold text-pay">DaftarOn allaqachon o'rnatilgan.</p>}
            <ol className="mt-4 space-y-3">
                {steps.map(([title, text], i) => (
                    <li key={i} className="flex gap-3.5 rounded-2xl bg-soft/70 p-3.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-extrabold text-white">{i + 1}</span>
                        <span className="text-[15px] leading-snug"><strong>{title}</strong><br /><span className="text-ink-2">{text}</span></span>
                    </li>
                ))}
            </ol>
            <p className="mt-4 rounded-ctl bg-brand-soft p-4 text-sm leading-relaxed text-brand-strong">
                Telegram'dan ham ishlatish mumkin: @daftaron_bot ni oching va «DaftarOn ilovasi» tugmasini bosing.
            </p>
            <div className="flex-1" />
            {prompt && (
                <Button size="lg" block icon={Download} className="mt-6" onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null) }}>
                    O'rnatish
                </Button>
            )}
        </AuthShell>
    )
}
