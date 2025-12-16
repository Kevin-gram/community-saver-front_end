/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#F9F6EF',
          100: '#F0E8D8',
          200: '#E8D59F',
          300: '#E0C266',
          400: '#D8AF2D',
          500: '#D4AF37',
          600: '#C4A02E',
          700: '#B8941F',
          800: '#A0801A',
          900: '#8B6F1F',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Cormorant Garamond', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
      textShadow: {
        sm: '1px 1px 2px rgba(0, 0, 0, 0.1)',
        DEFAULT: '2px 2px 4px rgba(0, 0, 0, 0.15)',
        lg: '3px 3px 6px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
