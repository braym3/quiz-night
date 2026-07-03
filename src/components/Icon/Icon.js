import React from 'react';

// Friendly rounded line-icon set. Colour comes from `currentColor`, so icons
// inherit the surrounding text colour and theme automatically.
// Usage: <Icon name="check" size={20} />   (add `filled` glyphs use fill)

const STROKE = {
  check: <path d="M5 13l4 4L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  pause: <><rect x="7" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="13" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'skip-back': <><path d="M18 6v12L9 12z" fill="currentColor" stroke="none" /><path d="M7 5v14" /></>,
  'skip-forward': <><path d="M6 6v12l9-6z" fill="currentColor" stroke="none" /><path d="M17 5v14" /></>,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: <path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7" /><path d="M8 20v-6h8v6" /></>,
  book: <path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 00-2 2V4z" />,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-4 10c.8.7 1 1.3 1 2h6c0-.7.2-1.3 1-2a6 6 0 00-4-10z" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  flag: <path d="M5 3v18M5 4h12l-2.5 4L17 12H5" />,
  refresh: <path d="M20 11a8 8 0 10-1.5 5M20 5v6h-6" />,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0111 0" /><path d="M16 5.2a3.2 3.2 0 010 5.6M17 20a5.5 5.5 0 00-3-4.9" /></>,
  gamepad: <><rect x="3" y="8" width="18" height="9" rx="4.5" /><path d="M8 11v3M6.5 12.5h3" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="14" r="1" fill="currentColor" stroke="none" /></>,
  trophy: <><path d="M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" /><path d="M10 13.5V17M14 13.5V17M8 20h8M9 20a3 3 0 016 0" /></>,
  crown: <path d="M4 8l4 4 4-7 4 7 4-4-1.5 11h-13z" fill="currentColor" stroke="none" />,
  medal: <><path d="M9 3l3 5 3-5" /><circle cx="12" cy="15" r="5" /><path d="M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 14.6l2-.3z" fill="currentColor" stroke="none" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor" stroke="none" />,
  flame: <path d="M12 3c2.5 2.5 3.5 5 3.5 7.5a3.5 3.5 0 01-7 0c0-.8.3-1.6.8-2.2C9 10 10 11 11 11c0-2.5-1-4.5 1-8z" fill="currentColor" stroke="none" />,
  bolt: <path d="M13 2L5 13h5l-1 9 8-12h-5l1-8z" fill="currentColor" stroke="none" />,
  sparkles: <><path d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4z" fill="currentColor" stroke="none" /><path d="M18 14l.7 1.8L20.5 16.5l-1.8.7L18 19l-.7-1.8L15.5 16.5l1.8-.7z" fill="currentColor" stroke="none" /></>,
  dots: <><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
  link: <path d="M9 15l6-6M10 7l1-1a4 4 0 015.6 5.6l-1 1M14 17l-1 1A4 4 0 017.4 12.4l1-1" />,
  image: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-4-7 6" /></>,
  text: <path d="M5 6h14M5 6v-.5M9 6v13M15 6v13M9 19h6" />,
  'true-false': <><path d="M5 9l2 2 3-4" /><circle cx="17" cy="14" r="4" /></>,
  numbers: <path d="M8 6l-2 1M8 6v6M14 7a2 2 0 113 1.7L14 12h5" />,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  volume: <><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a4 4 0 010 7M18 6a8 8 0 010 12" /></>,
  'volume-off': <><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M16 9l5 6M21 9l-5 6" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>,
  download: <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />,
  warn: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
};

export default function Icon({ name, size = 24, strokeWidth = 2, className = '', style, title }) {
  const glyph = STROKE[name];
  if (!glyph) return null;
  return (
    <svg
      className={`qn-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ flexShrink: 0, verticalAlign: 'middle', ...style }}
    >
      {title ? <title>{title}</title> : null}
      {glyph}
    </svg>
  );
}
