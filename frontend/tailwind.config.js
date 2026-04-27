/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#FFFBF0',       // Crema muy suave para el fondo
        'brand-primary': '#8B5CF6',  // Violeta vibrante
        'brand-secondary': '#EC4899',// Rosa intenso
        'brand-accent': '#FBBF24',   // Amarillo cálido
        'brand-dark': '#0F172A',     // Casi negro para bordes y texto principal
        'brand-success': '#10B981',  // Verde para victoria/check
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '6px 6px 0px 0px rgba(15, 23, 42, 1)', // Sombra sólida tipo cómic
        'brutal-sm': '4px 4px 0px 0px rgba(15, 23, 42, 1)',
        'brutal-hover': '2px 2px 0px 0px rgba(15, 23, 42, 1)',
      }
    },
  },
  plugins: [],
}
