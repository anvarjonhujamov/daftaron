import { LANGS, setLang, useLang } from '../i18n'
import { getToken } from '../lib/session'
import { cx } from '../ui/controls'

const SHORT = { uz_latn: "O'z", uz_cyrl: 'Ўз', ru: 'Ру' }

// Kirish sahifasida til tanlash. Kirmagan foydalanuvchi tanlovi kirgandan keyin serverga yoziladi (session.jsx)
export default function LangSwitch({ className }) {
    const lang = useLang()
    return (
        <div role="radiogroup" aria-label="Til · Тил · Язык" className={cx('flex rounded-xl bg-soft p-0.5', className)}>
            {LANGS.map((l) => (
                <button key={l.value} type="button" role="radio" aria-checked={lang === l.value} aria-label={l.label} lang={l.html}
                    onClick={() => setLang(l.value, { pending: !getToken() })}
                    className={cx('h-9 min-w-[44px] rounded-[10px] px-2 text-sm font-semibold transition-colors', lang === l.value ? 'bg-card text-ink shadow-sm' : 'text-ink-2 hover:text-ink')}>
                    {SHORT[l.value]}
                </button>
            ))}
        </div>
    )
}
