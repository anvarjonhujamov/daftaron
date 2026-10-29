import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSession } from './session'
import { settingsApi } from '../api/settings.api'
import { errorMessage } from '../lib/errors'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/controls'

// Admin oferta yoki maxfiylik siyosatini yangilasa — foydalanuvchi qayta qabul qiladi (TZ 28.16)
export default function LegalAcceptSheet() {
    const session = useSession()
    const legal = session.settings?.legal
    const [busy, setBusy] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    if (!legal?.needs_acceptance || dismissed) return null

    const accept = async () => {
        setBusy(true)
        try {
            await settingsApi.acceptLegal(legal.offer?.version, legal.privacy?.version)
            session.updateSettings({ legal: { ...legal, needs_acceptance: false } })
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open onClose={() => setDismissed(true)} title="Hujjatlar yangilandi" width={480}
            footer={<Button size="lg" block loading={busy} onClick={accept}>Roziman</Button>}>
            <p className="text-[15px] leading-relaxed text-ink-2">
                <Link to="/legal/offer" className="font-semibold text-brand-strong" onClick={() => setDismissed(true)}>Ommaviy oferta</Link> va{' '}
                <Link to="/legal/privacy" className="font-semibold text-brand-strong" onClick={() => setDismissed(true)}>maxfiylik siyosati</Link> yangilandi.
                Ilovadan foydalanishni davom ettirish uchun ular bilan tanishib, rozilik bildiring.
            </p>
        </Sheet>
    )
}
