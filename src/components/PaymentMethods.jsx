export default function PaymentMethods({ onSelect }) {
    const methods = [
        { id: 'click', name: 'Click', icon: '/icons/click.png', disabled: false },
        { id: 'payme', name: 'Payme', icon: '/icons/payme.png', disabled: false },
        { id: 'xazna', name: 'Xazna', icon: '/icons/xazna.png', disabled: true },
        { id: 'uzumbank', name: 'Uzum', icon: '/icons/uzumbank.png', disabled: true },
    ]

    return (
        <div className="grid grid-cols-2 gap-3">
            {methods.map(m => (
                <button
                    key={m.id}
                    disabled={m.disabled}
                    onClick={() => onSelect(m.id)}
                    className={`h-[72px] flex items-center justify-center px-4 rounded-xl bg-white border border-gray-200 transition-all ${m.disabled
                        ? 'opacity-40 grayscale cursor-not-allowed border-gray-100'
                        : 'border-gray-200 shadow-sm active:scale-95 hover:border-blue-300'
                        }`}
                >
                    {m.icon ? (
                        <img
                            src={m.icon}
                            alt={m.name}
                            className="max-h-[30px] max-w-[70%] object-contain block mx-auto"
                        />
                    ) : (
                        <span className={`font-semibold text-[15px] ${m.id === 'click' ? 'text-[#00a1fb]' : 'text-gray-500'}`}>
                            {m.name}
                        </span>
                    )}
                </button>
            ))}
        </div>
    )
}
