import { tk } from '../../i18n'

// Joriy sahifa: backend'ga context.screen (o'zbekcha lotin, til almashsa ham bir xil) va bo'sh chatdagi tezkor savollar.
// Savollar ko'rsatishda t() bilan tarjima qilinadi va shu tilda yuboriladi.

const HOME = [tk('Bugun kimlar qarzini qaytarishi kerak?'), tk('Jami qarz qancha?')]
const CUSTOMERS = [tk("Muddati o'tganlar kimlar?"), tk("Mijozni qanday qo'shaman?")]
// Nasiya oynasi ochiq bo'lganda tugma yashirin — shu savollar nasiya sahifasida (/debts/:id) chiqadi
const DEBT = [tk('Qaytarish sanasini qanday tanlayman?'), tk('SMS eslatma qachon ketadi?')]
const SUBSCRIPTION = [tk("Pro ta'rif nima beradi?"), tk("Balansni qanday to'ldiraman?")]
const GENERAL = [tk('Nasiya qanday yoziladi?'), tk("To'lovni qanday qabul qilaman?"), tk('SMS eslatma qachon ketadi?')]

const SCREENS = [
    [/^\/$/, 'Bosh sahifa', HOME],
    [/^\/customers\/new$/, 'Yangi mijoz', CUSTOMERS],
    [/^\/customers\/[^/]+\/edit$/, 'Mijozni tahrirlash', CUSTOMERS],
    [/^\/customers\/[^/]+$/, 'Mijoz kartasi', CUSTOMERS],
    [/^\/customers$/, 'Mijozlar', CUSTOMERS],
    [/^\/overdue$/, "Muddati o'tganlar", CUSTOMERS],
    [/^\/debts\/[^/]+$/, 'Nasiya', DEBT],
    [/^\/subscription$/, "Ta'rif va balans", SUBSCRIPTION],
    [/^\/history$/, 'Tarix', GENERAL],
    [/^\/reports$/, 'Hisobot', GENERAL],
    [/^\/suppliers\/[^/]+$/, "Ta'minotchi kartasi", GENERAL],
    [/^\/suppliers$/, "Ta'minotchilar", GENERAL],
    [/^\/staff$/, 'Xodimlar', GENERAL],
    [/^\/shops$/, "Do'konlar", GENERAL],
    [/^\/notifications$/, 'Bildirishnomalar', GENERAL],
    [/^\/settings(\/.*)?$/, 'Sozlamalar', GENERAL],
    [/^\/support$/, 'Yordam', GENERAL],
    [/^\/guides$/, "Foydalanish qo'llanmasi", GENERAL],
    [/^\/more$/, 'Yana', GENERAL]
]

export function screenFor(pathname) {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    const found = SCREENS.find(([re]) => re.test(path))
    return { route: path.slice(0, 200), screen: found ? found[1] : 'Boshqa', quick: found ? found[2] : GENERAL }
}
