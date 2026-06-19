import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import LegalContentRenderer from '../components/LegalContentRenderer'
import { getLegalDocument } from '../api/legal.api'
import toast from 'react-hot-toast'

export default function TermsPage() {
    const navigate = useNavigate()
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchContent()
    }, [])

    const fetchContent = async () => {
        try {
            setLoading(true)
            const response = await getLegalDocument('public_offer')
            const documentContent = response.data?.content || response.content || getDefaultPublicOffer()
            setContent(documentContent)
        } catch (error) {
            console.error('Error fetching public offer:', error)
            // Show default content if API fails
            setContent(getDefaultPublicOffer())
        } finally {
            setLoading(false)
        }
    }

    const getDefaultPublicOffer = () => {
        return `<h1 style="text-align: center; margin: 20px 0;">DAFTARON PLATFORMASIDAN FOYDALANISH BO'YICHA OMMAVIY OFERTA</h1>
<p style="text-align: center; color: #6b7280; margin: 20px 0;">
    (Terms of Service / Public Offer)
</p>

<h2 style="margin-top: 30px; margin-bottom: 15px;">1. Umumiy qoidalar</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>1.1. Ushbu hujjat "Daftaron" platformasidan foydalanish bo'yicha ommaviy oferta hisoblanadi.</li>
<li>1.2. Ushbu oferta O'zbekiston Respublikasi Fuqarolik kodeksiga muvofiq xizmat ko'rsatish bo'yicha ommaviy shartnoma hisoblanadi.</li>
<li>1.3. Platformada ro'yxatdan o'tgan yoki undan foydalanishni boshlagan har qanday shaxs ushbu ofertaning barcha shartlarini qabul qilgan hisoblanadi.</li>
<li>1.4. Agar foydalanuvchi ushbu shartlarga rozi bo'lmasa, platformadan foydalanishni to'xtatishi lozim.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">2. Atamalar va ta'riflar</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li><strong>Platforma</strong> — nasiya savdolarini hisobga olish va qarzdorliklarni boshqarish uchun mo'ljallangan "Daftaron" onlayn tizimi.</li>
<li><strong>Foydalanuvchi</strong> — platformada ro'yxatdan o'tgan jismoniy yoki yuridik shaxs (do'kon egasi).</li>
<li><strong>Mijoz</strong> — foydalanuvchining savdo qilgan va qarzdorlik mavjud bo'lgan shaxsi.</li>
<li><strong>Shaxsiy kabinet</strong> — foydalanuvchining platformadagi boshqaruv paneli.</li>
<li><strong>Tarif</strong> — platformadan foydalanish uchun belgilangan xizmat paketlari.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">3. Xizmat tavsifi</h2>
<p>Platforma foydalanuvchilarga quyidagi xizmatlarni taqdim etadi:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>mijozlar bazasini yuritish</li>
<li>nasiya savdolarni ro'yxatga olish</li>
<li>qarzdorliklarni nazorat qilish</li>
<li>to'lov tarixini saqlash</li>
<li>qarzdor mijozlarga SMS eslatmalar yuborish</li>
<li>statistika va hisobotlarni shakllantirish</li>
</ul>
<p>Platforma internet orqali ishlaydigan bulutli xizmat hisoblanadi.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">4. Ro'yxatdan o'tish tartibi</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>4.1. Platformadan foydalanish uchun foydalanuvchi ro'yxatdan o'tishi kerak.</li>
<li>4.2. Ro'yxatdan o'tishda foydalanuvchi telefon raqami va boshqa zarur ma'lumotlarni kiritadi.</li>
<li>4.3. Foydalanuvchi o'z login va paroli xavfsizligi uchun mustaqil javobgar hisoblanadi.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">5. Tariflar va to'lov</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>5.1. Platforma obuna modeli asosida ishlaydi.</li>
<li>5.2. Foydalanuvchilar quyidagi tariflardan birini tanlashi mumkin:
<ul style="margin: 10px 0; padding-left: 20px;">
<li>Basic</li>
<li>Pro</li>
</ul>
</li>
<li>5.3. To'lovlar elektron to'lov tizimlari orqali amalga oshiriladi (Click, Payme va boshqa tizimlar).</li>
<li>5.4. To'lov amalga oshirilgandan so'ng xizmat darhol faollashtiriladi.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">6. To'lov va qaytarish siyosati (Refund Policy)</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>6.1. Platformadan foydalanish obuna asosida amalga oshiriladi.</li>
<li>6.2. Foydalanuvchi tomonidan amalga oshirilgan to'lovlar xizmat ko'rsatish boshlangandan so'ng qaytarilmaydi.</li>
<li>6.3. Agar xizmat texnik sabablar tufayli ishlamasa, platforma xizmat muddatini uzaytirishi mumkin.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">7. Foydalanuvchi majburiyatlari</h2>
<p>Foydalanuvchi quyidagilarga majbur:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>platformadan qonuniy foydalanish</li>
<li>noto'g'ri ma'lumot kiritmaslik</li>
<li>spam xabarlar yubormaslik</li>
<li>tizim ishlashiga xalaqit bermaslik</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">8. Platforma majburiyatlari</h2>
<p>Platforma quyidagilarni ta'minlashga harakat qiladi:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>xizmatning barqaror ishlashi</li>
<li>foydalanuvchi ma'lumotlarini saqlash</li>
<li>texnik qo'llab-quvvatlash</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">9. Javobgarlikni cheklash</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>9.1. Platforma foydalanuvchilar o'rtasidagi qarz munosabatlari uchun javobgar emas.</li>
<li>9.2. Platforma faqat qarz va to'lovlarni hisobga olish vositasi hisoblanadi.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">10. Shaxsiy ma'lumotlar</h2>
<p>Platforma foydalanuvchilarning ma'lumotlarini maxfiylik siyosatiga muvofiq qayta ishlaydi.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">11. SMS xabarlar yuborish tartibi</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>11.1. Platforma foydalanuvchilarga SMS xabarlar yuborish imkoniyatini taqdim etadi.</li>
<li>11.2. SMS xabarlar foydalanuvchilar tomonidan ularning mijozlariga qarzdorlik eslatmalari yuborish uchun ishlatiladi.</li>
<li>11.3. Foydalanuvchi SMS yuborish uchun zarur ruxsat olinganligini tasdiqlaydi.</li>
<li>11.4. Platforma SMS xabar mazmuni uchun javobgar emas.</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">12. Hisobni bloklash qoidasi</h2>
<p>Platforma quyidagi holatlarda foydalanuvchi hisobini bloklash huquqiga ega:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
<li>spam yuborish</li>
<li>noqonuniy faoliyat</li>
<li>tizimdan noto'g'ri foydalanish</li>
</ul>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">13. Shartlarni o'zgartirish</h2>
<p>Platforma ushbu ofertani istalgan vaqtda o'zgartirish huquqiga ega.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">14. Nizolarni hal qilish</h2>
<p>Nizolar avvalo muzokaralar orqali hal qilinadi. Kelishuvga erishilmasa sud tartibida ko'rib chiqiladi.</p>

<hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

<h2 style="margin-bottom: 15px;">15. Rekvizitlar</h2>
<ul style="margin: 10px 0; padding-left: 20px;">
<li><strong>Kompaniya nomi:</strong> Daftaron MCHJ</li>
<li><strong>INN:</strong> 312805920</li>
<li><strong>Manzil:</strong> Andijon viloyati, Baliqchi tumani, Eski markaz MFY, Maydon ko'chasi, 51-uy</li>
<li><strong>Telefon:</strong> +998999093331</li>
<li><strong>Email:</strong> muminovxurshidbek@gmail.com</li>
</ul>`
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
