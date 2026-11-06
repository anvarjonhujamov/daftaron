import { BookOpen, ExternalLink, FileText, Link2, PlayCircle } from 'lucide-react'
import { settingsApi } from '../api/settings.api'
import { useResource } from '../lib/hooks'
import { safeUrl } from '../lib/sanitize'
import { EmptyState, ErrorState, List, ListSkeleton, PageHeader, SectionTitle } from '../ui/display'

const GROUPS = {
    mobile: 'Telefon uchun',
    desktop: 'Kompyuter uchun',
    all: 'Barcha qurilmalar uchun'
}
const TYPES = {
    file: [FileText, 'Fayl'],
    video: [PlayCircle, 'Video'],
    link: [Link2, 'Havola']
}

const fileSize = (bytes) => {
    if (!bytes) return null
    return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Hozirgi qurilmaga mos qo'llanmalar birinchi
const groupOrder = () => (window.matchMedia('(min-width: 768px)').matches ? ['desktop', 'mobile', 'all'] : ['mobile', 'desktop', 'all'])

// Foydalanish qo'llanmalari: admin panel Sozlamalaridan qo'shiladi
export default function GuidesPage() {
    const { data, error, loading, reload } = useResource(() => settingsApi.guides(), [], { cacheKey: 'guides' })
    const guides = (data?.data || []).map((g) => ({ ...g, href: safeUrl(g.url) })).filter((g) => g.href)

    return (
        <div className="page md:max-w-2xl">
            <PageHeader back title="Foydalanish qo'llanmasi" />
            {!data && loading && <ListSkeleton rows={4} />}
            {!data && error && <ErrorState onRetry={reload} />}
            {data && guides.length === 0 && (
                <EmptyState icon={BookOpen} title="Hozircha qo'llanma yo'q" text="Savolingiz bo'lsa, «Yordam» bo'limiga yozing." />
            )}
            {groupOrder().map((platform) => {
                const items = guides.filter((g) => g.platform === platform)
                if (items.length === 0) return null
                return (
                    <section key={platform}>
                        <SectionTitle>{GROUPS[platform]}</SectionTitle>
                        <List>
                            {items.map((g) => <GuideRow key={g.id} guide={g} />)}
                        </List>
                    </section>
                )
            })}
        </div>
    )
}

function GuideRow({ guide }) {
    const [Icon, label] = TYPES[guide.type] || TYPES.link
    const meta = [label, fileSize(guide.file?.size)].filter(Boolean).join(' · ')
    return (
        <a href={guide.href} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-soft/60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                <Icon size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-[15px] leading-snug">
                <span className="block font-bold text-ink">{guide.title}</span>
                {guide.description && <span className="block text-[13px] text-ink-2">{guide.description}</span>}
                <span className="block text-[13px] text-ink-3">{meta}</span>
            </span>
            <ExternalLink size={18} className="shrink-0 text-ink-3" aria-hidden />
        </a>
    )
}
