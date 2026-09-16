/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Primary indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        slate: {
          850: '#151f33',
          900: '#0f172a',
          950: '#090d16',
        },
        ops: {
          500: '#06b6d4', // Operational cyan
          600: '#0891b2',
        },
        status: {
          green: {
            bg: '#ecfdf5',
            text: '#065f46',
            border: '#a7f3d0',
          },
          amber: {
            bg: '#fffbeb',
            text: '#92400e',
            border: '#fde68a',
          },
          red: {
            bg: '#fef2f2',
            text: '#991b1b',
            border: '#fecaca',
          },
          blue: {
            bg: '#eff6ff',
            text: '#1e40af',
            border: '#bfdbfe',
          },
          gray: {
            bg: '#f3f4f6',
            text: '#374151',
            border: '#e5e7eb',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
