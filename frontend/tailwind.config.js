/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: '#050508',
        primary: '#6366f1', // Electric Indigo
        secondary: '#06b6d4', // Cyan
        success: '#10b981',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40 L40 40 L40 0' fill='none' stroke='rgba(99,102,241,0.06)' stroke-width='1'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'indigo-glow': '0 0 15px 2px rgba(99,102,241,0.4)',
        'cyan-glow': '0 0 15px 2px rgba(6,182,212,0.4)',
      }
    },
  },
  plugins: [],
}
