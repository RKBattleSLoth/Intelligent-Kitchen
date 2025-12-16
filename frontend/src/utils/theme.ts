// Vintage Cookbook Theme Colors
export const theme = {
  // Backgrounds
  bg: {
    primary: '#f0fdfa',      // Light teal background
    card: '#ffffff',          // White cards
    cardHover: '#fafafa',     // Slightly darker on hover
    input: '#f3f3f5',         // Input background
    overlay: 'rgba(0, 0, 0, 0.5)',  // Modal overlay
  },
  
  // Text colors
  text: {
    primary: '#1a1a1a',       // Dark text
    secondary: '#4b5563',     // Gray text
    muted: '#717182',         // Muted gray
    link: '#035b49',          // Teal links
    error: '#dc2626',         // Red for errors
    success: '#059669',       // Green for success
  },
  
  // Brand colors
  brand: {
    tealDark: '#035b49',
    tealMedium: '#2a6f6f',
    tealLight: '#0fc7b9',
    gold: '#d4af37',
    goldLight: '#e8d399',
    orange: '#EA6A47',
    blue: '#33789f',
  },
  
  // UI colors
  ui: {
    border: '#e5e7eb',
    borderDark: '#d1d5db',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Button colors
  button: {
    primary: {
      bg: '#0fc7b9',
      hover: '#0ea5a0',
      text: '#ffffff',
    },
    secondary: {
      bg: '#f3f4f6',
      hover: '#e5e7eb',
      text: '#374151',
    },
    danger: {
      bg: '#dc2626',
      hover: '#b91c1c',
      text: '#ffffff',
    },
    success: {
      bg: '#059669',
      hover: '#047857',
      text: '#ffffff',
    },
    info: {
      bg: '#3b82f6',
      hover: '#2563eb',
      text: '#ffffff',
    },
  },
  
  // Category colors (for recipes/meals)
  categories: {
    Breakfast: '#10b981',
    Lunch: '#f59e0b',
    Dinner: '#ef4444',
    Snack: '#8b5cf6',
    Dessert: '#ec4899',
    Beverage: '#06b6d4',
  },
};

// Common style objects for consistency
export const styles = {
  card: {
    background: theme.bg.card,
    border: `1px solid ${theme.ui.border}`,
    borderRadius: '0.5rem',
    boxShadow: `0 1px 3px ${theme.ui.shadow}`,
  },
  
  cardHover: {
    background: theme.bg.cardHover,
    boxShadow: `0 4px 6px ${theme.ui.shadow}`,
  },
  
  input: {
    background: theme.bg.input,
    border: `1px solid ${theme.ui.border}`,
    borderRadius: '0.375rem',
    color: theme.text.primary,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    outline: 'none',
  },
  
  inputFocus: {
    borderColor: theme.brand.tealLight,
    boxShadow: `0 0 0 2px ${theme.brand.tealLight}33`,
  },
  
  button: {
    base: {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      fontWeight: 500,
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
    },
  },
  
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    color: theme.text.primary,
  },
  
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 600,
    fontFamily: "'Playfair Display', Georgia, serif",
    color: theme.text.primary,
    marginBottom: '1.5rem',
  },
  
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    fontFamily: "'Playfair Display', Georgia, serif",
    color: theme.text.primary,
    marginBottom: '1rem',
  },
};
