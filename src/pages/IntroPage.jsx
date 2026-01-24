import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react'

const slides = [
    {
        title: "Daftaronga Xush Kelibsiz",
        description: "Barcha qarzlaringizni bir joyda, xavfsiz va oson boshqaring.",
        color: "bg-teal-600",
        icon: "📱"
    },
    {
        title: "Ajoyib Imkoniyatlar",
        description: "Mijozlar ro'yxati, nasiya tarixi va to'lovlarni istalgan vaqtda kuzatib boring.",
        color: "bg-emerald-600",
        icon: "✨"
    },
    {
        title: "Hammasi bir ilovada",
        description: "Qog'oz daftarlardan voz keching va biznesingizni raqamlashtiring.",
        color: "bg-purple-600",
        icon: "🚀"
    }
]

export default function IntroPage() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const navigate = useNavigate()

    useState(() => {
        // One-time check on mount (using useState initializer for early run, 
        // or useEffect if you prefer, but this is even faster)
        const hasSeen = localStorage.getItem('hasSeenIntro') === 'true'
        if (hasSeen) {
            navigate('/login', { replace: true })
        }
    })

    const handleFinish = () => {
        localStorage.setItem('hasSeenIntro', 'true')
        navigate('/login')
    }

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1)
        } else {
            handleFinish()
        }
    }

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1)
        }
    }

    const skipIntro = () => {
        handleFinish()
    }

    return (
        <div className={`fixed inset-0 flex flex-col transition-colors duration-500 ${slides[currentSlide].color}`}>
            {/* Skip Button */}
            <div className="absolute top-12 right-6">
                <button
                    onClick={skipIntro}
                    className="text-white/80 font-medium text-[15px] px-4 py-2"
                >
                    O'tkazib yuborish
                </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-10 text-center text-white">
                <div className="w-40 h-40 bg-white rounded-[40px] flex items-center justify-center mb-12 animate-bounce shadow-xl">
                    <img src="/logo.png" alt="Daftaron Logo" className="w-24 h-24 object-contain" />
                </div>
                <h1 className="text-3xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {slides[currentSlide].title}
                </h1>
                <p className="text-lg text-white/80 leading-relaxed max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                    {slides[currentSlide].description}
                </p>
            </div>

            {/* Footer Navigation */}
            <div className="p-8 pb-12 flex items-center justify-between">
                {/* Dots */}
                <div className="flex gap-2">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 transition-all duration-300 rounded-full ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                        />
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                    {currentSlide > 0 && (
                        <button
                            onClick={prevSlide}
                            className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center text-white active:scale-90 transition-transform"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    <button
                        onClick={nextSlide}
                        className="bg-white text-gray-900 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-lg"
                    >
                        {currentSlide === slides.length - 1 ? (
                            <>
                                Boshlash
                                <ArrowRight size={20} />
                            </>
                        ) : (
                            <>
                                Keyingi
                                <ChevronRight size={20} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
