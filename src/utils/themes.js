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
      primary: '#1a1a1a',
      accent: '#444444',
      text: '#1a1a1a',
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
      presenterText: '#FFF8F0',
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
      primary: '#3949AB',
      accent: '#FFD700',
      text: '#FFFFFF',
      background: '#0D1B2A',
      surface: '#1B2838',
      lightGray: '#34495E',
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
      presenter: 'radial-gradient(ellipse at center, #283593 0%, #0D1B2A 70%)',
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
      presenterText: '#FFFFFF',
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

/* ---------- colour maths (so themes stay concise) ---------- */
const hexToRgb = (hex) => {
  if (typeof hex !== 'string' || hex[0] !== '#') return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};

const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// relative luminance, 0 (black) .. 1 (white)
const luminance = (hex) => {
  const c = hexToRgb(hex);
  if (!c) return 0.5;
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};

// readable text colour on a given background
const onColor = (hex) => (luminance(hex) > 0.5 ? '#1a1a1a' : '#ffffff');

// blend a -> b by t (0..1)
const mix = (a, b, t) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  if (!x || !y) return a;
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
};

/* ---------- per-theme personality ---------- */
const RADIUS_SCALE = {
  'retro-arcade': 0,
  minimalist: 0.55,
  'pub-quiz-classic': 0.55,
  'game-show': 0.7,
  'tropical-party': 1.5,
};
const BORDER_WIDTH = { 'retro-arcade': '4px', minimalist: '2px' };
const GLOW_THEMES = new Set(['neon-nights', 'midnight-galaxy', 'game-show', 'retro-arcade']);
// Brighter option palettes that pop on dark surfaces
const OPTION_PALETTES = {
  'neon-nights': ['#00f5ff', '#ff2e88', '#00ff9d', '#ffe14d'],
  'midnight-galaxy': ['#7c9bff', '#e040fb', '#69f0ae', '#ffd54f'],
  'retro-arcade': ['#00e5ff', '#ff3864', '#00e676', '#ffed4e'],
  'game-show': ['#42a5f5', '#ef5350', '#66bb6a', '#ffd700'],
};
const DEFAULT_OPTIONS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

const setVars = (root, vars) => {
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
};

export const applyTheme = (themeId, viewType = 'player') => {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  const body = document.body;
  const c = theme.colors;

  const isDark = luminance(c.background) < 0.4;
  const surface = c.surface || (isDark ? '#1a1a2e' : '#ffffff');
  const border = c.lightGray || mix(surface, isDark ? '#ffffff' : '#000000', 0.18);
  const surface2 = isDark ? mix(surface, '#ffffff', 0.07) : mix(surface, '#000000', 0.04);
  const textMuted = mix(c.text, c.background, 0.42);
  const options = OPTION_PALETTES[themeId] || DEFAULT_OPTIONS;
  const radiusScale = RADIUS_SCALE[themeId] ?? 1;
  const r = (px) => Math.round(px * radiusScale) + 'px';

  // ---- semantic tokens ----
  setVars(root, {
    '--font-heading': theme.fonts.heading,
    '--font-body': theme.fonts.body,

    '--color-primary': c.primary,
    '--color-on-primary': onColor(c.primary),
    '--color-accent': c.accent,
    '--color-on-accent': onColor(c.accent),
    '--color-text': c.text,
    '--color-text-muted': textMuted,
    '--color-bg': c.background,
    '--color-surface': surface,
    '--color-surface-2': surface2,
    '--color-border': border,
    '--color-focus': c.primary,

    '--color-success': c.correct,
    '--color-danger': c.incorrect,
    '--color-warning': c.accent,
    '--color-on-reveal': isDark ? mix(c.correct, '#ffffff', 0.25) : c.correct,

    '--opt-a': options[0],
    '--opt-b': options[1],
    '--opt-c': options[2],
    '--opt-d': options[3],
    '--opt-on': '#ffffff',

    '--radius-sm': r(8),
    '--radius-md': r(12),
    '--radius-lg': r(16),
    '--radius-xl': r(24),
    '--border-width': BORDER_WIDTH[themeId] || '3px',

    '--shadow-sm': isDark ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)',
    '--shadow-md': isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
    '--shadow-lg': isDark ? '0 18px 50px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.18)',
    '--shadow-press': `0 4px 0 0 ${mix(c.primary, '#000000', 0.45)}`,
    '--glow': GLOW_THEMES.has(themeId) ? `0 0 22px ${c.primary}66` : '0 0 0 0 transparent',

    // ---- legacy aliases (concrete values for untouched components) ----
    '--primary': c.primary,
    '--accent': c.accent,
    '--text': c.text,
    '--background': c.background,
    '--surface': surface,
    '--lightGray': border,
    '--shadow': c.shadow || '#AAE7FF',
    '--correct': c.correct,
    '--incorrect': c.incorrect,
    '--presenterText': c.presenterText || c.text,
  });

  // ---- view background ----
  const backgroundKey = viewType === 'presenter' ? 'presenter' : viewType === 'master' ? 'master' : 'player';
  const background = theme.backgrounds[backgroundKey];
  if (background) {
    body.style.background = background;
    body.style.backgroundAttachment = 'fixed';
    if (viewType === 'presenter') body.style.minHeight = '100vh';
  }

  // ---- theme + mode classes ----
  body.className = body.className.replace(/theme-\S+/g, '').replace(/\bmode-(light|dark)\b/g, '').trim();
  body.classList.add(`theme-${themeId}`);
  body.classList.add(isDark ? 'mode-dark' : 'mode-light');

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