import React, { useMemo } from 'react';
import styles from './Confetti.module.css';

const COLORS = [
  'var(--color-primary)', 'var(--color-accent)',
  'var(--opt-a)', 'var(--opt-b)', 'var(--opt-c)', 'var(--opt-d)',
];

// Lightweight CSS confetti. Decorative only; respects reduced-motion globally.
export default function Confetti({ count = 70 }) {
  const pieces = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    dur: 2.6 + Math.random() * 2.2,
    color: COLORS[i % COLORS.length],
    size: 7 + Math.random() * 9,
    round: Math.random() > 0.5,
  })), [count]);

  return (
    <div className={styles.wrap} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={styles.piece}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
