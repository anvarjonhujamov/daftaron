import { cx } from '../ui/controls'

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=co.median.android.abeaayb'

// Android ilova (Median WebView) ichida ochilgan bo'lsa — Play tugmasi kerak emas
export const inAndroidApp = () => /median|gonative/i.test(navigator.userAgent || '')

function AppleLogo() {
    return (
        <svg viewBox="0 0 384 512" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
    )
}

// Standart do'kon belgilari: Google Play (havola) va App Store (tez orada)
export default function AppBadges({ className }) {
    if (inAndroidApp()) return null
    const badge = 'flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line-2 bg-black px-3 text-white'
    return (
        <div className={cx('flex gap-2.5', className)}>
            <a href={PLAY_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Play'dan yuklab olish" className={cx(badge, 'transition-opacity hover:opacity-85')}>
                <img src="/icons/google-play.svg" alt="" className="h-6 w-6 shrink-0" />
                <span className="min-w-0 leading-tight">
                    <span className="block text-[10px] uppercase tracking-wide opacity-80">Yuklab oling</span>
                    <span className="block truncate text-[16px] font-semibold">Google Play</span>
                </span>
            </a>
            <div aria-label="App Store — tez orada" className={cx(badge, 'cursor-default opacity-50')}>
                <span className="shrink-0"><AppleLogo /></span>
                <span className="min-w-0 leading-tight">
                    <span className="block text-[10px] uppercase tracking-wide opacity-80">Tez orada</span>
                    <span className="block truncate text-[16px] font-semibold">App Store</span>
                </span>
            </div>
        </div>
    )
}
