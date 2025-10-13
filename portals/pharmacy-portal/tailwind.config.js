/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ff',
          100: '#bae7ff',
          200: '#91d5ff',
          300: '#69c0ff',
          400: '#40a9ff',
          500: '#1890ff',
          600: '#096dd9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766',
        },
        success: {
          DEFAULT: '#52c41a',
          light: '#95de64',
          dark: '#389e0d',
        },
        warning: {
          DEFAULT: '#faad14',
          light: '#ffd666',
          dark: '#d48806',
        },
        error: {
          DEFAULT: '#ff4d4f',
          light: '#ff7875',
          dark: '#cf1322',
        },
      },
    },
  },
  plugins: [],
}

