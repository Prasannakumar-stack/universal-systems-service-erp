export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 18px 55px rgba(15, 42, 82, 0.12)',
        glow: '0 0 35px rgba(45, 127, 249, 0.22)'
      },
      borderRadius: {
        card: '8px'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
