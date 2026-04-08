/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: "#6b7280",
        "primary-dark": "#4b5563",
        "primary-light": "#f3f4f6",
      },
      backgroundColor: {
        'dark-base': '#0a0a0f',
        'dark-surface': '#111118',
        'dark-card': '#1a1a24',
      }
    },
  },
  plugins: [],
}
