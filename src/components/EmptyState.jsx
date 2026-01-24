import { Inbox } from 'lucide-react'

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'Ma\'lumot topilmadi',
    description = '',
    action = null
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
                <Icon size={28} className="text-surface-400" />
            </div>
            <h3 className="text-title mb-2">{title}</h3>
            {description && (
                <p className="text-caption max-w-xs mb-6">{description}</p>
            )}
            {action}
        </div>
    )
}
