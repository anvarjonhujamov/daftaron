import { useEffect, useRef, useState } from 'react'
import { Bot, Eraser, MessageCircle, Phone, SendHorizontal, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportApi } from '../api/settings.api'
import { useSession } from '../app/session'
import { errorMessage } from '../lib/errors'
import { safeUrl } from '../lib/sanitize'
import { Card, PageHeader } from '../ui/display'
import { Button, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'

const QUICK = ['Nasiya qanday yoziladi?', 'SMS ketmayapti', "Qaysi mijozlar eng uzoq to'lamayapti?", 'Bu oy qancha nasiya berdim?']

// AI yordamchi (backend tarixni o'zi saqlaydi) va aloqa havolalari
export default function SupportPage() {
    const session = useSession()
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [clearing, setClearing] = useState(false)
    const endRef = useRef(null)
    const support = session.settings?.support || {}

    useEffect(() => {
        supportApi.history().then((r) => setMessages(r.history || [])).catch(() => {})
    }, [])
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, sending])

    const send = async (value = text) => {
        const message = value.trim()
        if (!message || sending) return
        setText('')
        setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: message }])
        setSending(true)
        try {
            const r = await supportApi.send(message)
            setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: r.reply }])
        } catch (err) {
            toast.error(errorMessage(err))
            setMessages((m) => m.slice(0, -1))
            setText(message)
        } finally {
            setSending(false)
        }
    }

    const contacts = [
        [safeUrl(support.telegram_support_url), Send, 'Operator (Telegram)'],
        [safeUrl(support.telegram_group_url), MessageCircle, 'Muhokama guruhi'],
        [support.phone && `tel:${support.phone}`, Phone, "Qo'ng'iroq"]
    ].filter(([href]) => href)

    return (
        <div className="page md:max-w-3xl">
            <PageHeader back title="Yordam" subtitle="AI yordamchi · o'zbek tilida"
                actions={messages.length > 0 && <Button size="sm" variant="ghost" icon={Eraser} onClick={() => setClearing(true)}>Tozalash</Button>} />
            {contacts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {contacts.map(([href, Icon, label]) => (
                        <a key={label} href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-card px-3 text-sm font-semibold hover:bg-soft">
                            <Icon size={16} aria-hidden />{label}
                        </a>
                    ))}
                </div>
            )}
            <Card className="flex min-h-[50vh] flex-col p-4">
                <div className="flex-1 space-y-3" aria-live="polite">
                    {messages.length === 0 && (
                        <div className="py-6 text-center">
                            <Bot size={36} className="mx-auto text-brand-strong" aria-hidden />
                            <p className="mt-2 font-bold">Savolingizni yozing</p>
                            <p className="text-sm text-ink-2">Ilovadan foydalanish, SMS, obuna va hisobotlar haqida.</p>
                        </div>
                    )}
                    {messages.map((m) => (
                        <div key={m.id} className={cx('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed',
                            m.role === 'user' ? 'ml-auto bg-brand text-white' : 'bg-soft text-ink')}>
                            {m.content}
                        </div>
                    ))}
                    {sending && <div className="w-16 animate-pulse rounded-2xl bg-soft px-3.5 py-2.5 text-ink-2">…</div>}
                    <div ref={endRef} />
                </div>
                <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
                    {QUICK.map((qq) => <Button key={qq} size="sm" variant="soft" onClick={() => send(qq)}>{qq}</Button>)}
                </div>
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send() }}>
                    <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Savolingizni yozing" aria-label="Savol"
                        className="h-12 min-w-0 flex-1 rounded-ctl border-[1.5px] border-line-2 bg-card px-4 text-ink outline-none focus:border-brand" />
                    <Button type="submit" aria-label="Yuborish" className="h-12 w-12 px-0" disabled={!text.trim()} loading={sending}>{!sending && <SendHorizontal size={20} aria-hidden />}</Button>
                </form>
            </Card>
            <Confirm open={clearing} onClose={() => setClearing(false)} title="Chatni tozalash" text="Yordamchi bilan yozishmalar o'chiriladi." confirmText="Tozalash"
                onConfirm={async () => { try { await supportApi.clear(); setMessages([]) } catch (err) { toast.error(errorMessage(err)) } setClearing(false) }} />
        </div>
    )
}
