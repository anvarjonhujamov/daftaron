import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ size = 'md', className = '' }) {
    const sizeMap = {
        sm: 16,
        md: 24,
        lg: 32
    }

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Loader2
                size={sizeMap[size]}
                className="animate-spin text-primary-500"
            />
        </div>
    )
}
