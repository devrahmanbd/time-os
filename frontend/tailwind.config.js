/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0f1117',
        surface: '#1a1b26',
        surface2: '#24253a',
        border: '#2e2f45',
        text: '#cdd6f4',
        text2: '#a6adc8',
        muted: '#6c7086',
        accent: '#89b4fa',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        red: '#f38ba8',
        teal: '#94e2d5',
        sakura: '#f5c2e7',
      },
    },
  },
  plugins: [],
};
