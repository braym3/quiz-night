import React from 'react';
import { motion } from 'framer-motion';
import styles from './AnimatedIcon.module.css';

export default function AnimatedIcon() {
    return (
        <div className={styles.iconContainer}>
            <motion.svg
                viewBox="0 0 100 100"
                className={styles.iconSvg}
                // Animate the background seal to spin continuously
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            >
                {/* Jagged "seal" background shape */}
                <path 
                    d="M50 0 L61.8 11.4 L78.5 6.9 L83 23.5 L97.6 27.6 L92.1 44.2 L100 50 L92.1 55.8 L97.6 72.4 L83 76.5 L78.5 93.1 L61.8 88.6 L50 100 L38.2 88.6 L21.5 93.1 L17 76.5 L2.4 72.4 L7.9 55.8 L0 50 L7.9 44.2 L2.4 27.6 L17 23.5 L21.5 6.9 L38.2 11.4 Z"
                    fill="#ff8484" 
                />
            </motion.svg>
            <motion.div
                className={styles.questionMark}
                // Animate the question mark to sway side-to-side
                animate={{ rotate: [0, -15, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            >
                ?
            </motion.div>
        </div>
    );
}