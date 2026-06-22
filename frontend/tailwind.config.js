/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          dark: '#0F172A',
          glass: 'rgba(15, 23, 42, 0.75)',
          slate: '#F8FAFC',
          border: '#E2E8F0',
        }
      },
    },
  },
  plugins: [],
};
