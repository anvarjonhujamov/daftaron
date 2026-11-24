import { ChevronRight, MessageCircle, Phone, Send, Sparkles } from 'lucide-react'
import { useSession } from '../app/session'
import { safeUrl } from '../lib/sanitize'
import { openAiAssistant } from '../features/ai/events'
import { Card, List, PageHeader, SectionTitle } from '../ui/display'
import { Button } from '../ui/controls'
import { t } from '../i18n'

// Yordam: AI yordamchi (o'ng pastdagi tugma bilan bir xil oyna) va aloqa havolalari
export default function SupportPage() {
    const session = useSession()
    const support = session.settings?.support || {}

    const contacts = [
        [safeUrl(support.telegram_support_url), Send, t('Operator (Telegram)')],
        [safeUrl(support.telegram_group_url), MessageCircle, t('Muhokama guruhi')],
        [support.phone && `tel:${support.phone}`, Phone, t("Qo'ng'iroq")]
    ].filter(([href]) => href)

    return (
        <div className="page md:max-w-3xl">
            <PageHeader back title={t('Yordam')} subtitle={t('AI yordamchi va aloqa')} />
            <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                    <Sparkles size={24} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold">{t('AI yordamchi')}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-ink-2">
                        {t("Ilovadan foydalanish, SMS, obuna va do'koningiz raqamlari bo'yicha savolga darhol javob.")}
                    </p>
                </div>
                <Button icon={Sparkles} onClick={openAiAssistant}>{t('Yordamchini ochish')}</Button>
            </Card>
            {contacts.length > 0 && (
                <>
                    <SectionTitle>{t('Aloqa')}</SectionTitle>
                    <List>
                        {contacts.map(([href, Icon, label]) => (
                            <a key={label} href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer"
                                className="flex items-center gap-3 px-3.5 py-3.5 transition-colors hover:bg-soft/60">
                                <Icon size={20} className="text-brand-strong" aria-hidden />
                                <span className="min-w-0 flex-1 text-[15px] font-bold">{label}</span>
                                <ChevronRight size={20} className="text-ink-3" aria-hidden />
                            </a>
                        ))}
                    </List>
                </>
            )}
        </div>
    )
}
