import { Drawer } from 'vaul'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, FileText, ChevronRight, X } from 'lucide-react'

export default function LegalDrawer({ isOpen, onClose }) {
    const navigate = useNavigate()

    const menuItems = [
        {
            title: 'Maxfiylik siyosati',
            icon: ShieldCheck,
            path: '/privacy-policy',
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            title: 'Ommaviy oferta',
            icon: FileText,
            path: '/terms',
            color: 'text-orange-500',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20'
        }
    ]

    return (
        <Drawer.Root open={isOpen} onOpenChange={onClose} shouldScaleBackground={false}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-[32px] z-[70] outline-none">
                    <div className="p-4 pt-2">
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />
                        
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div>
                                <h2 className="text-[20px] font-bold text-gray-900 dark:text-white">
                                    Hujjatlar
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-[14px]">
                                    Platforma qoidalari va siyosati
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-90 transition-transform"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {menuItems.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        navigate(item.path)
                                        onClose()
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-[20px] border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-[14px] ${item.bgColor} flex items-center justify-center`}>
                                            <item.icon size={22} className={item.color} />
                                        </div>
                                        <span className="text-[16px] font-semibold text-gray-900 dark:text-white">
                                            {item.title}
                                        </span>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
