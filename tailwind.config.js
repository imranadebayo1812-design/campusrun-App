/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f9f9f9',
          100: '#f0f0f0',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#e5e5e5',
          500: '#ffffff',
          600: '#e5e5e5',
          700: '#d4d4d4',
          800: '#a3a3a3',
          900: '#737373',
        },
        surface: {
          950: '#000000',
          900: '#0a0a0a',
          800: '#141414',
          700: '#1c1c1c',
        },
        indigo: {
          400: '#d4d4d4',
          500: '#e5e5e5',
          600: '#e5e5e5',
          700: '#d4d4d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
