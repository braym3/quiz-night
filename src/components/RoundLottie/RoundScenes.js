import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Hand-built SVG round intros, for rounds that want something more specific
// than the per-type Lottie. Picked via a round's `animation` field.
// Colours are fixed so they read on both the light phone background and the
// gradient presenter background.
const C = {
  purple: '#7c4dff',
  yellow: '#feca57',
  pink: '#ff6b9d',
  teal: '#1dd1a1',
  navy: '#2c2c54',
  blue: '#2e86de',
  white: '#ffffff',
};

const loop = (duration, extra = {}) => ({ duration, repeat: Infinity, ease: 'easeInOut', ...extra });

// --- Class of 2000: digits drop in, sparkles burst ---------------------------
const Sparkle = ({ x, y, delay, color }) => (
  <motion.path
    d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z"
    fill={color}
    style={{ x, y }}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], rotate: [0, 90] }}
    transition={loop(1.6, { delay, repeatDelay: 0.6 })}
  />
);

function Y2KScene() {
  const digits = ['2', '0', '0', '0'];
  const colors = [C.purple, C.pink, C.teal, C.yellow];
  return (
    <>
      {digits.map((d, i) => (
        <motion.g
          key={i}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: [-120, 0, 0, 0, -120], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 4, times: [0, 0.18, 0.5, 0.85, 1], repeat: Infinity, delay: i * 0.18, ease: 'easeOut' }}
        >
          <rect x={18 + i * 42} y={70} width={38} height={56} rx={9} fill={colors[i]} />
          <text x={37 + i * 42} y={112} textAnchor="middle" fontSize="38" fontWeight="900" fill={C.white} fontFamily="Poppins, sans-serif">{d}</text>
        </motion.g>
      ))}
      <Sparkle x={24} y={46} delay={0.9} color={C.yellow} />
      <Sparkle x={176} y={52} delay={1.2} color={C.pink} />
      <Sparkle x={40} y={152} delay={1.5} color={C.teal} />
      <Sparkle x={166} y={148} delay={1.0} color={C.purple} />
      <Sparkle x={100} y={40} delay={1.7} color={C.yellow} />
    </>
  );
}

// --- Here We Go Again: Greek island at sunset ---------------------------------
const wave = (y) => `M0 ${y} q12.5 -8 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V200 H0 Z`;

function GreekScene() {
  return (
    <>
      <defs>
        <clipPath id="greek-clip"><circle cx="100" cy="100" r="92" /></clipPath>
      </defs>
      <g clipPath="url(#greek-clip)">
        <rect width="200" height="200" fill="#ffe3b3" />
        {/* sun rays + sun */}
        <motion.g style={{ x: 100, y: 88 }} animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}>
          {[...Array(12)].map((_, i) => (
            <rect key={i} x={-2.5} y={-62} width={5} height={16} rx={2.5} fill={C.yellow} transform={`rotate(${i * 30})`} />
          ))}
        </motion.g>
        <motion.circle cx="100" cy="88" r="34" fill={C.yellow} animate={{ y: [8, -4, 8] }} transition={loop(4)} />
        {/* island + chapel */}
        <path d="M30 150 Q70 104 118 118 Q150 126 176 150 Z" fill="#e8c28e" />
        <rect x="76" y="104" width="30" height="24" fill={C.white} stroke={C.navy} strokeWidth="1.5" />
        <path d="M76 104 A15 15 0 0 1 106 104 Z" fill={C.blue} stroke={C.navy} strokeWidth="1.5" />
        <rect x="88" y="114" width="7" height="14" rx="3.5" fill={C.blue} />
        <line x1="91" y1="89" x2="91" y2="82" stroke={C.navy} strokeWidth="1.5" />
        <line x1="88" y1="85" x2="94" y2="85" stroke={C.navy} strokeWidth="1.5" />
        {/* boat */}
        <motion.g animate={{ y: [0, -4, 0], rotate: [-4, 4, -4] }} transition={loop(2.4)} style={{ originX: '50%', originY: '100%' }}>
          <path d="M126 150 L162 150 L156 160 L132 160 Z" fill={C.pink} />
          <line x1="144" y1="150" x2="144" y2="124" stroke={C.navy} strokeWidth="1.5" />
          <path d="M145 126 L145 148 L160 148 Z" fill={C.white} stroke={C.navy} strokeWidth="1" />
        </motion.g>
        {/* waves */}
        <motion.path d={wave(154)} fill={C.blue} opacity="0.75" animate={{ x: [0, -50] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
        <motion.path d={wave(166)} fill="#54a0ff" animate={{ x: [-50, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'linear' }} />
      </g>
      <circle cx="100" cy="100" r="92" fill="none" stroke={C.white} strokeWidth="5" />
    </>
  );
}

// --- Emoji Cinema: snapping clapperboard, popcorn floating up ----------------
function CinemaScene() {
  const floaters = [
    { e: '🍿', x: 30, delay: 0 },
    { e: '⭐', x: 168, delay: 0.8 },
    { e: '🎬', x: 150, delay: 1.7 },
    { e: '🍿', x: 52, delay: 2.4 },
  ];
  return (
    <>
      {floaters.map((f, i) => (
        <motion.text
          key={i}
          x={f.x}
          y={0}
          fontSize="22"
          textAnchor="middle"
          initial={{ y: 190, opacity: 0 }}
          animate={{ y: [190, 30], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: f.delay, ease: 'easeOut' }}
        >
          {f.e}
        </motion.text>
      ))}
      <motion.g animate={{ rotate: [0, -2, 0] }} transition={loop(1.2)} style={{ originX: '50%', originY: '50%' }}>
        {/* board */}
        <rect x="46" y="84" width="108" height="76" rx="6" fill={C.navy} />
        <line x1="58" y1="112" x2="142" y2="112" stroke={C.white} strokeWidth="2" opacity="0.5" />
        <line x1="58" y1="128" x2="142" y2="128" stroke={C.white} strokeWidth="2" opacity="0.5" />
        <line x1="58" y1="144" x2="120" y2="144" stroke={C.white} strokeWidth="2" opacity="0.5" />
        <rect x="46" y="70" width="108" height="16" fill={C.white} stroke={C.navy} strokeWidth="2" />
        {[0, 1, 2, 3].map(i => (
          <path key={i} d={`M${54 + i * 26} 70 l12 0 l-8 16 l-12 0 Z`} fill={C.navy} />
        ))}
        {/* clapper arm, hinged at its left end */}
        <motion.g
          style={{ originX: '0%', originY: '100%' }}
          animate={{ rotate: [-28, -28, 0, 0, -28] }}
          transition={{ duration: 1.8, times: [0, 0.45, 0.55, 0.8, 1], repeat: Infinity, ease: 'easeIn' }}
        >
          <rect x="46" y="52" width="108" height="16" fill={C.white} stroke={C.navy} strokeWidth="2" />
          {[0, 1, 2, 3].map(i => (
            <path key={i} d={`M${54 + i * 26} 52 l12 0 l-8 16 l-12 0 Z`} fill={C.pink} />
          ))}
        </motion.g>
      </motion.g>
    </>
  );
}

// --- Connections: tiles shuffle, then snap into coloured groups --------------
const GROUP_COLORS = ['#f9df6d', '#a0c35a', '#b0c4ef', '#ba81c5'];
const SHUFFLED = [5, 12, 0, 9, 14, 3, 7, 10, 1, 15, 6, 11, 4, 8, 13, 2];

function ConnectionsScene() {
  const [solved, setSolved] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSolved(s => !s), 2200);
    return () => clearInterval(t);
  }, []);
  const cell = 40;
  const origin = 22;
  return (
    <>
      {[...Array(16)].map((_, tile) => {
        const group = Math.floor(tile / 4);
        const slot = solved ? tile : SHUFFLED.indexOf(tile);
        return (
          <motion.rect
            key={tile}
            width={cell - 6}
            height={cell - 6}
            rx={6}
            initial={false}
            animate={{
              x: origin + (slot % 4) * cell,
              y: origin + Math.floor(slot / 4) * cell,
            }}
            transition={{ type: 'spring', stiffness: 170, damping: 18, delay: solved ? group * 0.12 : (tile % 5) * 0.03 }}
            fill={solved ? GROUP_COLORS[group] : '#efefe6'}
            style={{ transition: `fill 0.35s ease ${solved ? group * 0.12 + 0.25 : 0}s` }}
            stroke={C.navy}
            strokeOpacity={0.15}
          />
        );
      })}
    </>
  );
}

export const roundScenes = {
  y2k: Y2KScene,
  greek: GreekScene,
  cinema: CinemaScene,
  connections: ConnectionsScene,
};

export default function RoundScene({ name, size, style, className }) {
  const Scene = roundScenes[name];
  if (!Scene) return null;
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ width: size, height: size, margin: '0 auto', display: 'block', overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      <Scene />
    </svg>
  );
}
