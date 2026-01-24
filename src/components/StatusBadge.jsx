import { CheckCircle, Clock } from 'lucide-react'

export default function StatusBadge({ status }) {
    const statusConfig = {
        open: {
            label: 'Faol',
            icon: Clock,
            className: 'badge-success'
        },
        closed: {
            label: 'Yopilgan',
            icon: CheckCircle,
            className: 'badge-neutral'
        }
    }

    const config = statusConfig[status] || statusConfig.open
    const Icon = config.icon

    return (
        <span className={`badge ${config.className}`}>
            <Icon size={12} className="mr-1.5" />
            {config.label}
        </span>
    )
}
