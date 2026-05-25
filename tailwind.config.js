/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6fcff',
          100: '#b3f5ff',
          200: '#80eeff',
          300: '#4de7ff',
          400: '#35e0ff',
          500: '#00d1ff',
          600: '#00b5e0',
          700: '#0088aa',
          800: '#005c73',
          900: '#003040',
        },
        surface: {
          950: '#0b0f19',
          900: '#111827',
          800: '#161f2e',
          700: '#1e2d40',
        },
        indigo: {
          500: '#0066ff',
          600: '#0080ff',
          700: '#0060cc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
