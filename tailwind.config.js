/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5D7A6E',
          light: '#8B9D83',
        },
        accent: '#C9B8A5',
        background: '#F5F2ED',
        surface: '#FFFFFF',
        text: {
          primary: '#3D3D3D',
          secondary: '#6B6B6B',
        },
        border: '#D4CFC7',
        success: '#7BA383',
        warning: '#D4A574',
        error: '#C47C7C',
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

