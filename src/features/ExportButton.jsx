import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from '../app/session'
import { errorMessage, errorReason } from '../lib/errors'
import { Button } from '../ui/controls'

const LOCKED = "Excel'ga yuklash Oddiy ta'rifda yo'q. Ta'rifni yangilang."

// «Excel'ga yuklash» (Tarix, Hisobot). Ta'rifda eksport bo'lmasa (usage.export_allowed) — qulf va obuna sahifasi
export default function ExportButton({ onExport }) {
    const session = useSession()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const locked = !session.canExport

    const upgrade = () => {
        toast(LOCKED, { icon: '🔒' })
        navigate('/subscription')
    }

    const run = async () => {
        if (locked) return upgrade()
        setLoading(true)
        try {
            await onExport()
        } catch (err) {
            if (errorReason(err) === 'plan_feature') {
                session.refresh()
                upgrade()
            } else toast.error(errorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="secondary" icon={locked ? Lock : FileSpreadsheet} loading={loading} onClick={run} title={locked ? LOCKED : undefined}>
            <span className="hidden sm:inline">Excel'ga yuklash</span><span className="sm:hidden">Excel</span>
        </Button>
    )
}
