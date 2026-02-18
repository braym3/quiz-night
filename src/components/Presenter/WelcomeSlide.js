import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import AnimatedIcon from './AnimatedIcon';
import styles from './WelcomeSlide.module.css';

export default function WelcomeSlide({ title, subtitle, playerCount = 0 }) {
    // Calculate font size based on title length so it never clips
    const titleFontSize = useMemo(() => {
        const len = (title || '').length;
        if (len <= 10) return 110;
        if (len <= 15) return 90;
        if (len <= 20) return 75;
        if (len <= 25) return 65;
        if (len <= 30) return 55;
        return 45;
    }, [title]);

    // Wider viewBox and gentler curve for longer titles
    const svgWidth = useMemo(() => {
        const len = (title || '').length;
        if (len <= 15) return 1000;
        if (len <= 25) return 1200;
        return 1400;
    }, [title]);

    const curvePath = `M 30 140 C ${svgWidth * 0.25} 70, ${svgWidth * 0.75} 70, ${svgWidth - 30} 140`;

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

            <svg viewBox={`0 0 ${svgWidth} 200`} className={styles.curvedTextContainer}>
                <path id="curve" d={curvePath} fill="transparent"/>
                <text className={styles.titleText} fontSize={titleFontSize}>
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