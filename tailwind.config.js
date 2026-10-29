/** @type {import('tailwindcss').Config} */

// Ranglar CSS o'zgaruvchilaridan (src/index.css: yorug' va tungi rejim tokenlari).
// Komponentlarda hex yozilmaydi: bg-card, text-ink-2, border-line, text-debt ...
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                bg: token('bg'),
                card: token('card'),
                soft: token('soft'),
                ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
                line: { DEFAULT: token('line'), 2: token('line-2') },
                brand: { DEFAULT: token('brand'), strong: token('brand-strong'), soft: token('brand-soft') },
                debt: { DEFAULT: token('debt'), soft: token('debt-soft') },
                pay: { DEFAULT: token('pay'), strong: token('pay-strong'), soft: token('pay-soft') },
                supp: { DEFAULT: token('supp'), strong: token('supp-strong'), soft: token('supp-soft') },
                warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
                danger: token('danger'),
                night: token('night')
            },
            fontFamily: {
                sans: ['Inter Variable', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif']
            },
            borderRadius: {
                card: '18px',
                ctl: '14px'
            },
            height: { ctl: '56px', 'ctl-sm': '46px' },
            screens: { xs: '360px' }
        }
    },
    plugins: []
}
