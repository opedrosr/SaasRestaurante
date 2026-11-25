export default { content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { coal: '#141312', bone: '#F2EDE4', ember: '#B3361F', gold: '#C9A24B', ash: '#2A2826',
      cobalt: '#0B35D6', navy: '#07185F', paper: '#F4F6FB',
      brand: { light: 'rgb(var(--brand-light) / <alpha-value>)', DEFAULT: 'rgb(var(--brand) / <alpha-value>)', dark: 'rgb(var(--brand-dark) / <alpha-value>)' } },
    fontFamily: { display: ['"Barlow Condensed"', 'Impact', 'sans-serif'], body: ['Barlow', 'system-ui', 'sans-serif'], script: ['"Kaushan Script"', 'cursive'] } } } };
