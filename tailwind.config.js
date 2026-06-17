/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'g1': '#38D030',
        'g2': '#108707',
        'g3': '#064F00',
        'g4': '#063800',
        'ch0': '#161616',
        'ch1': '#1B1B1B',
        'ch2': '#141414',
        'chb': '#2B2B2B',
        'chb2': '#262626',
        'chin': '#242424',
        'chib': '#343434',
        't0': '#ECEEEF',
        't1': '#C9CED0',
        't2': '#AEB4B8',
        't3': '#9AA0A6',
        't4': '#7C8388',
        't5': '#6B7176',
        't6': '#4F5458',
      },
      fontFamily: {
        sans: ['Mulish', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
