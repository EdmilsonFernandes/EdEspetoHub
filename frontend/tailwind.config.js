/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#0D6EFD', // Um azul mais vibrante e confiável
        'brand-secondary': '#6C757D', // Um cinza chumbo elegante
        'brand-accent': '#28A745', // Um verde de sucesso para contrastes
        'brand-light': '#F8F9FA', // Um off-white para fundos suaves
        'brand-dark': '#343A40', // Um cinza escuro para textos e elementos fortes
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'float-sm': '0 2px 8px rgba(0,0,0,0.08)',
        'float-md': '0 6px 20px rgba(0,0,0,0.12)',
        'float-lg': '0 16px 40px rgba(0,0,0,0.18)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
