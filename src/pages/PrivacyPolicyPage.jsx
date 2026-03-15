import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicyPage() {
    const navigate = useNavigate()

    const handleBack = () => {
        const hasToken = localStorage.getItem('token')
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
        } else {
            navigate(hasToken ? '/profile' : '/register')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 mb-6 text-blue-500 font-medium active:opacity-60 transition-opacity"
                >
                    <ArrowLeft size={18} />
                    <span className="text-[16px] font-semibold">Orqaga</span>
                </button>

                <div className="card dark:bg-gray-800 p-6 sm:p-8 prose dark:prose-invert max-w-none shadow-sm selection:bg-blue-100 dark:selection:bg-blue-900/40">
                    <h1 className="text-[20px] sm:text-[24px] font-bold text-center mb-2">
                        MAXFIYLIK SIYOSATI (PRIVACY POLICY)
                    </h1>
                    
                    <h2 className="text-[18px] font-bold mt-8 mb-3">1. Umumiy qoidalar</h2>
                    <p>Ushbu Maxfiylik siyosati “Daftaron” platformasida foydalanuvchilarning shaxsiy ma’lumotlarini yig‘ish va qayta ishlash tartibini belgilaydi.</p>
                    <p>Platformadan foydalanish orqali foydalanuvchi ushbu siyosatga rozilik bildiradi.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">2. Yig‘iladigan ma’lumotlar</h2>
                    <p>Platforma quyidagi ma’lumotlarni yig‘ishi mumkin:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>telefon raqami</li>
                        <li>foydalanuvchi ismi yoki biznes nomi</li>
                        <li>do‘kon nomi</li>
                        <li>mijozlar telefon raqamlari</li>
                        <li>qarzdorlik yozuvlari</li>
                        <li>to‘lov ma’lumotlari</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">3. Ma’lumotlardan foydalanish</h2>
                    <p>Ma’lumotlar quyidagi maqsadlarda ishlatiladi:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>xizmat ko‘rsatish</li>
                        <li>tizim funksiyalarini ta’minlash</li>
                        <li>SMS bildirishnomalar yuborish</li>
                        <li>xizmat sifatini yaxshilash</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">4. Ma’lumotlarni himoya qilish</h2>
                    <p>Platforma ma’lumotlarning xavfsizligini ta’minlash uchun texnik va tashkiliy choralar ko‘radi.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">5. Ma’lumotlarni uchinchi shaxslarga berish</h2>
                    <p>Ma’lumotlar quyidagi holatlardan tashqari uchinchi shaxslarga berilmaydi:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>qonun talab qilganda</li>
                        <li>SMS xizmatlari orqali xabar yuborilganda</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">6. Data Retention Policy</h2>
                    <p>Foydalanuvchi ma’lumotlari platformada xizmat ko‘rsatish davomida saqlanadi.</p>
                    <p>Foydalanuvchi hisobini o‘chirgan taqdirda ma’lumotlar o‘chirilishi yoki anonimlashtirilishi mumkin.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">7. Foydalanuvchi huquqlari</h2>
                    <p>Foydalanuvchi quyidagi huquqlarga ega:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>o‘z ma’lumotlarini ko‘rish</li>
                        <li>ma’lumotlarni o‘zgartirish</li>
                        <li>hisobini o‘chirishni so‘rash</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">8. Force Majeure</h2>
                    <p>Platforma quyidagi holatlar tufayli yuzaga kelgan zarar uchun javobgar emas:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>internet uzilishi</li>
                        <li>texnik nosozliklar</li>
                        <li>tabiiy ofatlar</li>
                        <li>davlat organlari qarorlari</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">9. Siyosatni o‘zgartirish</h2>
                    <p>Platforma ushbu maxfiylik siyosatini istalgan vaqtda yangilash huquqiga ega.</p>
                </div>
            </div>
        </div>
    )
}
