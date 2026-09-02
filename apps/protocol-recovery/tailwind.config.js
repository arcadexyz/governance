/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          blue: '#0094FF',
          purple: '#7E0CDC',
          pink: '#FF337C',
          mint: '#42EFCF',
          black: '#05080A',
        },
        elv: {
          0: '#1f2937',
          1: '#1a1f2e',
          2: '#161b26',
          3: '#13171f',
          4: '#111419',
          5: '#0f1114',
          14: '#05080A',
        },
        guide: {
          sidebar: '#1a1f2e',
          content: '#242b3d',
        },
      },
      fontFamily: {
        pixel: ['"Pixel Operator"', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
};
