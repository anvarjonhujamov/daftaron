/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Vibrant Blue Primary
                primary: {
                    50: '#eef4ff',
                    100: '#e0ebff',
                    200: '#c7d9fe',
                    300: '#a5c0fc',
                    400: '#819cf8',
                    500: '#6478f1',
                    600: '#4855e5',
                    700: '#3a43ca',
                    800: '#3139a3',
                    900: '#2e3581',
                    950: '#1c1f4b',
                },
                // Emerald Success
                success: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
                // Rose Danger
                danger: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    200: '#fecdd3',
                    300: '#fda4af',
                    400: '#fb7185',
                    500: '#f43f5e',
                    600: '#e11d48',
                    700: '#be123c',
                    800: '#9f1239',
                    900: '#881337',
                },
                // iOS-style neutral grays
                surface: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                    950: '#0a0a0a',
                }
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                'ios': '16px',
                'ios-lg': '20px',
                'ios-xl': '24px',
            },
            boxShadow: {
                'ios': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'ios-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
                'ios-up': '0 -4px 20px -5px rgba(0, 0, 0, 0.1)',
            },
            backdropBlur: {
                'ios': '20px',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'press': 'press 0.1s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                press: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(0.97)' },
                }
            }
        },
    },
    plugins: [],
}
