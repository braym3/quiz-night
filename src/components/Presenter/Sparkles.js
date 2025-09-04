import React from 'react';
import { motion } from 'framer-motion';
import styles from './Sparkles.module.css';

// Utility to generate a random number in a range
const random = (min, max) => Math.random() * (max - min) + min;

const Sparkle = ({ top, left }) => {
  // Randomize animation properties for each sparkle
  const duration = random(1.5, 3);
  const delay = random(0, 2);
  const scale = random(0.7, 2.0);

  return (
    <motion.div
      className={styles.sparkle}
      style={{ top: `${top}%`, left: `${left}%`, transform: `scale(${scale})` }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{
        duration: duration,
        repeat: Infinity,
        delay: delay,
        ease: "easeInOut"
      }}
    />
  );
};

const Sparkles = ({ count = 30 }) => {
  // Create an array of sparkle data
  const sparkles = Array.from({ length: count }).map((_, i) => ({
    id: i,
    top: random(5, 95),
    left: random(5, 95),
  }));

  return (
    <div className={styles.sparkleWrapper}>
      {sparkles.map(sparkle => (
        <Sparkle key={sparkle.id} top={sparkle.top} left={sparkle.left} />
      ))}
    </div>
  );
};

export default Sparkles;