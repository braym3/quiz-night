// Theme configuration for different quiz visual styles
export const themes = {
  'fun-and-sparkly': {
    name: 'Fun & Sparkly',
    colors: {
      primary: '#9669ff',
      accent: '#feca57',
      text: '#2c2c54',
      background: '#f1f2f6',
      surface: '#ffffff',
      lightGray: '#dcdde1',
      shadow: '#AAE7FF',
      correct: '#28a745',
      incorrect: '#dc3545',
    },
    fonts: {
      heading: "'Teachers', sans-serif",
      body: "'Poppins', sans-serif",
    },
    backgrounds: {
      player: 'linear-gradient(135deg, #f1f2f6 0%, #e8deff 100%)',
      presenter: 'linear-gradient(135deg, #9669ff 0%, #feca57 100%)',
      master: 'linear-gradient(135deg, #f1f2f6 0%, #ffffff 100%)',
    },
    effects: {
      sparkles: true,
      confetti: true,
      animations: 'playful',
    }
  },
  'neon-nights': {
    name: 'Neon Nights',
    colors: {
      primary: '#ff006e',
      accent: '#00f5ff',
      text: '#ffffff',
      background: '#0a0a0a',
      surface: '#1a1a2e',
      lightGray: '#2d2d44',
      shadow: '#ff006e',
      correct: '#00ff41',
      incorrect: '#ff006e',
    },
    fonts: {
      heading: "'Audiowide', cursive",
      body: "'Rajdhani', sans-serif",
    },
    backgrounds: {
      player: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      presenter: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0a 100%)',
      master: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
    },
    effects: {
      sparkles: false,
      confetti: true,
      animations: 'neon',
      glow: true,
    }
  },
  'minimalist': {
    name: 'Minimalist',
    colors: {
      primary: '#000000',
      accent: '#666666',
      text: '#000000',
      background: '#f5f5f5',
      surface: '#ffffff',
      lightGray: '#e0e0e0',
      shadow: '#cccccc',
      correct: '#2d7f3e',
      incorrect: '#c9302c',
    },
    fonts: {
      heading: "'Inter', sans-serif",
      body: "'Inter', sans-serif",
    },
    backgrounds: {
      player: '#f5f5f5',
      presenter: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
      master: '#ffffff',
    },
    effects: {
      sparkles: false,
      confetti: false,
      animations: 'subtle',
    }
  },
  'retro-arcade': {
    name: 'Retro Arcade',
    colors: {
      primary: '#ff3864',
      accent: '#ffed4e',
      text: '#ffffff',
      background: '#2d1b69',
      surface: '#3d2c8d',
      lightGray: '#5c4ab8',
      shadow: '#0e153a',
      correct: '#00e676',
      incorrect: '#ff1744',
    },
    fonts: {
      heading: "'Press Start 2P', cursive",
      body: "'Courier New', monospace",
    },
    backgrounds: {
      player: 'repeating-linear-gradient(0deg, #2d1b69 0px, #2d1b69 2px, #1a0f3d 2px, #1a0f3d 4px)',
      presenter: 'repeating-linear-gradient(0deg, #2d1b69 0px, #2d1b69 2px, #1a0f3d 2px, #1a0f3d 4px)',
      master: 'repeating-linear-gradient(0deg, #2d1b69 0px, #2d1b69 2px, #1a0f3d 2px, #1a0f3d 4px)',
    },
    effects: {
      sparkles: false,
      confetti: true,
      animations: 'pixelated',
      scanlines: true,
    }
  },
  'pub-quiz-classic': {
    name: 'Pub Quiz Classic',
    colors: {
      primary: '#8B4513',
      accent: '#DAA520',
      text: '#2C1810',
      background: '#F5E6D3',
      surface: '#FFF8F0',
      lightGray: '#D4C4B0',
      shadow: '#A0522D',
      correct: '#228B22',
      incorrect: '#B22222',
    },
    fonts: {
      heading: "'Playfair Display', serif",
      body: "'Source Serif 4', serif",
    },
    backgrounds: {
      player: 'linear-gradient(135deg, #F5E6D3 0%, #E8D5C0 100%)',
      presenter: 'linear-gradient(180deg, #3E2723 0%, #5D4037 50%, #4E342E 100%)',
      master: 'linear-gradient(135deg, #F5E6D3 0%, #FFF8F0 100%)',
    },
    effects: {
      sparkles: false,
      confetti: false,
      animations: 'subtle',
    }
  },
  'game-show': {
    name: 'Game Show',
    colors: {
      primary: '#1A237E',
      accent: '#FFD700',
      text: '#FFFFFF',
      background: '#0D1B2A',
      surface: '#1B2838',
      lightGray: '#2C3E50',
      shadow: '#FFD700',
      correct: '#00E676',
      incorrect: '#FF1744',
    },
    fonts: {
      heading: "'Oswald', sans-serif",
      body: "'Roboto', sans-serif",
    },
    backgrounds: {
      player: 'linear-gradient(135deg, #0D1B2A 0%, #1B2838 100%)',
      presenter: 'radial-gradient(ellipse at center, #1A237E 0%, #0D1B2A 70%)',
      master: 'linear-gradient(135deg, #0D1B2A 0%, #1B2838 100%)',
    },
    effects: {
      sparkles: false,
      confetti: true,
      animations: 'dramatic',
      spotlight: true,
    }
  },
  'tropical-party': {
    name: 'Tropical Party',
    colors: {
      primary: '#E91E63',
      accent: '#00BFA5',
      text: '#1B5E20',
      background: '#E8F5E9',
      surface: '#FFFFFF',
      lightGray: '#C8E6C9',
      shadow: '#FF6F00',
      correct: '#00C853',
      incorrect: '#FF1744',
    },
    fonts: {
      heading: "'Lobster', cursive",
      body: "'Nunito', sans-serif",
    },
    backgrounds: {
      player: 'linear-gradient(135deg, #E8F5E9 0%, #FFF3E0 100%)',
      presenter: 'linear-gradient(135deg, #00BFA5 0%, #E91E63 50%, #FF6F00 100%)',
      master: 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 100%)',
    },
    effects: {
      sparkles: true,
      confetti: true,
      animations: 'playful',
    }
  },
  'midnight-galaxy': {
    name: 'Midnight Galaxy',
    colors: {
      primary: '#7C4DFF',
      accent: '#E040FB',
      text: '#E8EAF6',
      background: '#0A0E27',
      surface: '#151A3A',
      lightGray: '#283593',
      shadow: '#7C4DFF',
      correct: '#69F0AE',
      incorrect: '#FF5252',
    },
    fonts: {
      heading: "'Orbitron', sans-serif",
      body: "'Exo 2', sans-serif",
    },
    backgrounds: {
      player: 'linear-gradient(135deg, #0A0E27 0%, #151A3A 100%)',
      presenter: 'radial-gradient(ellipse at 30% 40%, #1A237E 0%, #0A0E27 60%, #000000 100%)',
      master: 'linear-gradient(135deg, #0A0E27 0%, #151A3A 100%)',
    },
    effects: {
      sparkles: true,
      confetti: true,
      animations: 'cosmic',
      glow: true,
    }
  }
};

export const defaultTheme = 'fun-and-sparkly';

export const getTheme = (themeId) => {
  return themes[themeId] || themes[defaultTheme];
};

export const applyTheme = (themeId, viewType = 'player') => {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  const body = document.body;

  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Apply font variables
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);

  // Apply background based on view type
  const backgroundKey = viewType === 'presenter' ? 'presenter' :
      viewType === 'master' ? 'master' : 'player';
  const background = theme.backgrounds[backgroundKey];

  if (background) {
    body.style.background = background;
    body.style.backgroundAttachment = 'fixed';

    // For presenter view, ensure full coverage
    if (viewType === 'presenter') {
      body.style.minHeight = '100vh';
    }
  }

  // Apply theme-specific effects
  body.className = body.className.replace(/theme-\S+/g, '');
  body.classList.add(`theme-${themeId}`);

  return theme;
};

// Helper to get current active theme
export const getCurrentTheme = () => {
  const classes = document.body.className.split(' ');
  const themeClass = classes.find(c => c.startsWith('theme-'));
  if (themeClass) {
    const themeId = themeClass.replace('theme-', '');
    return themes[themeId] || themes[defaultTheme];
  }
  return themes[defaultTheme];
};