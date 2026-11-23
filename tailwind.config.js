/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
          100: '#F3F4F6',
          50: '#F9FAFB',
        },
        gold: {
          DEFAULT: '#D4A017',
          light: '#E5B83A',
          dark: '#B0830E',
          50: '#FDF9E7',
          100: '#FAF1C6',
        },
      },
    },
  },
  plugins: [],
}
