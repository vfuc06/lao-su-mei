/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        chinese: {
          red: '#c93b2b',
          'red-dark': '#a1281c',
          'red-light': '#fdf2f0',
          gold: '#e09f3e',
          'gold-light': '#fdf8ee',
        }
      }
    },
  },
  plugins: [],
}

