import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
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
                        DAFTARON PLATFORMASIDAN FOYDALANISH BO‘YICHA OMMAVIY OFERTA
                    </h1>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-8 font-medium">
                        (Terms of Service / Public Offer)
                    </p>

                    <h2 className="text-[18px] font-bold mt-8 mb-3">1. Umumiy qoidalar</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li>1.1. Ushbu hujjat "Daftaron" platformasidan foydalanish bo'yicha ommaviy oferta hisoblanadi.</li>
                        <li>1.2. Ushbu oferta O'zbekiston Respublikasi Fuqarolik kodeksiga muvofiq xizmat ko'rsatish bo'yicha ommaviy shartnoma hisoblanadi.</li>
                        <li>1.3. Platformada ro'yxatdan o'tgan yoki undan foydalanishni boshlagan har qanday shaxs ushbu ofertaning barcha shartlarini qabul qilgan hisoblanadi.</li>
                        <li>1.4. Agar foydalanuvchi ushbu shartlarga rozi bo'lmasa, platformadan foydalanishni to'xtatishi lozim.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">2. Atamalar va ta'riflar</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li><strong>Platforma</strong> — nasiya savdolarini hisobga olish va qarzdorliklarni boshqarish uchun mo'ljallangan "Daftaron" onlayn tizimi.</li>
                        <li><strong>Foydalanuvchi</strong> — platformada ro'yxatdan o'tgan jismoniy yoki yuridik shaxs (do'kon egasi).</li>
                        <li><strong>Mijoz</strong> — foydalanuvchining savdo qilgan va qarzdorlik mavjud bo'lgan shaxsi.</li>
                        <li><strong>Shaxsiy kabinet</strong> — foydalanuvchining platformadagi boshqaruv paneli.</li>
                        <li><strong>Tarif</strong> — platformadan foydalanish uchun belgilangan xizmat paketlari.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">3. Xizmat tavsifi</h2>
                    <p className="mb-2">Platforma foydalanuvchilarga quyidagi xizmatlarni taqdim etadi:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2 mb-4">
                        <li>mijozlar bazasini yuritish</li>
                        <li>nasiya savdolarni ro'yxatga olish</li>
                        <li>qarzdorliklarni nazorat qilish</li>
                        <li>to'lov tarixini saqlash</li>
                        <li>qarzdor mijozlarga SMS eslatmalar yuborish</li>
                        <li>statistika va hisobotlarni shakllantirish</li>
                    </ul>
                    <p>Platforma internet orqali ishlaydigan bulutli xizmat hisoblanadi.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">4. Ro'yxatdan o'tish tartibi</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li>4.1. Platformadan foydalanish uchun foydalanuvchi ro'yxatdan o'tishi kerak.</li>
                        <li>4.2. Ro'yxatdan o'tishda foydalanuvchi telefon raqami va boshqa zarur ma'lumotlarni kiritadi.</li>
                        <li>4.3. Foydalanuvchi o'z login va paroli xavfsizligi uchun mustaqil javobgar hisoblanadi.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">5. Tariflar va to'lov</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li>5.1. Platforma obuna modeli asosida ishlaydi.</li>
                        <li>
                            5.2. Foydalanuvchilar quyidagi tariflardan birini tanlashi mumkin:
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Basic</li>
                                <li>Pro</li>
                            </ul>
                        </li>
                        <li>5.3. To'lovlar elektron to'lov tizimlari orqali amalga oshiriladi (Click, Payme va boshqa tizimlar).</li>
                        <li>5.4. To'lov amalga oshirilgandan so'ng xizmat darhol faollashtiriladi.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">6. To'lov va qaytarish siyosati (Refund Policy)</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li>6.1. Platformadan foydalanish obuna asosida amalga oshiriladi.</li>
                        <li>6.2. Foydalanuvchi tomonidan amalga oshirilgan to'lovlar xizmat ko'rsatish boshlangandan so'ng qaytarilmaydi.</li>
                        <li>6.3. Agar xizmat texnik sabablar tufayli ishlamasa, platforma xizmat muddatini uzaytirishi mumkin.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">7. Foydalanuvchi majburiyatlari</h2>
                    <p className="mb-2">Foydalanuvchi quyidagilarga majbur:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>platformadan qonuniy foydalanish</li>
                        <li>noto'g'ri ma'lumot kiritmaslik</li>
                        <li>spam xabarlar yubormaslik</li>
                        <li>tizim ishlashiga xalaqit bermaslik</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">8. Platforma majburiyatlari</h2>
                    <p className="mb-2">Platforma quyidagilarni ta'minlashga harakat qiladi:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>xizmatning barqaror ishlashi</li>
                        <li>foydalanuvchi ma'lumotlarini saqlash</li>
                        <li>texnik qo'llab-quvvatlash</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">9. Javobgarlikni cheklash</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li>9.1. Platforma foydalanuvchilar o'rtasidagi qarz munosabatlari uchun javobgar emas.</li>
                        <li>9.2. Platforma faqat qarz va to'lovlarni hisobga olish vositasi hisoblanadi.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">10. Shaxsiy ma'lumotlar</h2>
                    <p>Platforma foydalanuvchilarning ma'lumotlarini maxfiylik siyosatiga muvofiq qayta ishlaydi.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">11. SMS xabarlar yuborish tartibi</h2>
                    <ul className="space-y-2 list-none pl-0">
                        <li>11.1. Platforma foydalanuvchilarga SMS xabarlar yuborish imkoniyatini taqdim etadi.</li>
                        <li>11.2. SMS xabarlar foydalanuvchilar tomonidan ularning mijozlariga qarzdorlik eslatmalari yuborish uchun ishlatiladi.</li>
                        <li>11.3. Foydalanuvchi SMS yuborish uchun zarur ruxsat olinganligini tasdiqlaydi.</li>
                        <li>11.4. Platforma SMS xabar mazmuni uchun javobgar emas.</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">12. Hisobni bloklash qoidasi</h2>
                    <p className="mb-2">Platforma quyidagi holatlarda foydalanuvchi hisobini bloklash huquqiga ega:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>spam yuborish</li>
                        <li>noqonuniy faoliyat</li>
                        <li>tizimdan noto'g'ri foydalanish</li>
                    </ul>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">13. Shartlarni o'zgartirish</h2>
                    <p>Platforma ushbu ofertani istalgan vaqtda o'zgartirish huquqiga ega.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">14. Nizolarni hal qilish</h2>
                    <p>Nizolar avvalo muzokaralar orqali hal qilinadi. Kelishuvga erishilmasa sud tartibida ko'rib chiqiladi.</p>

                    <hr className="my-6 border-gray-100 dark:border-gray-700" />

                    <h2 className="text-[18px] font-bold mb-3">15. Rekvizitlar</h2>
                    <ul className="space-y-1 list-none pl-0">
                        <li><strong>Kompaniya nomi:</strong> Daftaron MCHJ</li>
                        <li><strong>INN:</strong> 312805920</li>
                        <li><strong>Manzil:</strong> Andijon viloyati, Baliqchi tumani, Eski markaz MFY, Maydon ko'chasi, 51-uy</li>
                        <li><strong>Telefon:</strong> +998999093331</li>
                        <li><strong>Email:</strong> muminovxurshidbek@gmail.com</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
