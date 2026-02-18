import React from 'react';
import { motion } from 'framer-motion';
import AnimatedIcon from './AnimatedIcon';
import styles from './WelcomeSlide.module.css';

export default function WelcomeSlide({ title, subtitle, playerCount = 0 }) {
    return (
        <motion.div
            className={styles.welcomeContainer}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
        >
            <motion.h2
                className={styles.subtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
            >
                {subtitle}
            </motion.h2>

            <svg viewBox="0 0 1000 200" className={styles.curvedTextContainer}>
                <path id="curve" d="M 50 130 C 250 80, 750 80, 950 130" fill="transparent"/>
                <text className={styles.titleText} fontSize="110">
                    <textPath href="#curve" startOffset="50%" textAnchor="middle">
                        {title}
                    </textPath>
                </text>
            </svg>

            <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1, transition: { delay: 0.7, type: 'spring' } }}
            >
                <AnimatedIcon />
            </motion.div>

            {playerCount > 0 && (
                <motion.div
                    className={styles.playerCount}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.9 } }}
                >
                    {playerCount} player{playerCount !== 1 ? 's' : ''} joined
                </motion.div>
            )}
        </motion.div>
    );
}