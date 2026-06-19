import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import LegalContentRenderer from '../components/LegalContentRenderer'
import { getLegalDocument } from '../api/legal.api'
import toast from 'react-hot-toast'

export default function PrivacyPolicyPage() {
    const navigate = useNavigate()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchContent()
    }, [])

    const fetchContent = async () => {
        try {
            setLoading(true)
            const response = await getLegalDocument('privacy_policy')
            const documentContent = response.data?.content || response.content || getDefaultPrivacyPolicy()
            setContent(documentContent)
        } catch (error) {
            console.error('Error fetching privacy policy:', error)
            // Show default content if API fails
            setContent(getDefaultPrivacyPolicy())
        } finally {
            setLoading(false)
        }
    }

    const getDefaultPrivacyPolicy = () => {
        return `<h1 style="text-align: center; margin: 20px 0;">MAXFIYLIK SIYOSATI (PRIVACY POLICY)</h1>

<h2 style="margin-top: 30px; margin-bottom: 15px;">1. Umumiy qoidalar</h2>
<p>Ushbu Maxfiylik siyosati "Daftaron" platformasida foydalanuvchilarning shaxsiy ma'lumotlarini yig'ish va qayta ishlash tartibini belgilaydi.</p>
<p>Platformadan foydalanish orqali foydalanuvchi ushbu siyosatga rozilik bildiradi.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">2. Yig'iladigan ma'lumotlar</h2>
<p>Platforma quyidagi ma'lumotlarni yig'ishi mumkin:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>telefon raqami</li>
<li>foydalanuvchi ismi yoki biznes nomi</li>
<li>do'kon nomi</li>
<li>mijozlar telefon raqamlari</li>
<li>qarzdorlik yozuvlari</li>
<li>to'lov ma'lumotlari</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">3. Ma'lumotlardan foydalanish</h2>
<p>Ma'lumotlar quyidagi maqsadlarda ishlatiladi:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>xizmat ko'rsatish</li>
<li>tizim funksiyalarini ta'minlash</li>
<li>SMS bildirishnomalar yuborish</li>
<li>xizmat sifatini yaxshilash</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">4. Ma'lumotlarni himoya qilish</h2>
<p>Platforma ma'lumotlarning xavfsizligini ta'minlash uchun texnik va tashkiliy choralar ko'radi.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">5. Ma'lumotlarni uchinchi shaxslarga berish</h2>
<p>Ma'lumotlar quyidagi holatlardan tashqari uchinchi shaxslarga berilmaydi:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>qonun talab qilganda</li>
<li>SMS xizmatlari orqali xabar yuborilganda</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">6. Data Retention Policy</h2>
<p>Foydalanuvchi ma'lumotlari platformada xizmat ko'rsatish davomida saqlanadi.</p>
<p>Foydalanuvchi hisobini o'chirgan taqdirda ma'lumotlar o'chirilishi yoki anonimlashtirilishi mumkin.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">7. Foydalanuvchi huquqlari</h2>
<p>Foydalanuvchi quyidagi huquqlarga ega:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>o'z ma'lumotlarini ko'rish</li>
<li>ma'lumotlarni o'zgartirish</li>
<li>hisobini o'chirishni so'rash</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">8. Force Majeure</h2>
<p>Platforma quyidagi holatlar tufayli yuzaga kelgan zarar uchun javobgar emas:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>internet uzilishi</li>
<li>texnik nosozliklar</li>
<li>tabiiy ofatlar</li>
<li>davlat organlari qarorlari</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">9. Siyosatni o'zgartirish</h2>
<p>Platforma ushbu maxfiylik siyosatini istalgan vaqtda yangilash huquqiga ega.</p>`
    }

    const handleBack = () => {
        const hasToken = localStorage.getItem('token')
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1)
        } else {
            navigate(hasToken ? '/profile' : '/register')
        }
    }

    if (loading) {
        return <LoadingSpinner />
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
                    <LegalContentRenderer content={content} />
                </div>
            </div>
        </div>
    )
}
