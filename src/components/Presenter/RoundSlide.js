import React from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react'; // Import the Lottie component
import styles from './RoundSlide.module.css';

// Import your downloaded animation files
import musicAnimation from '../../assets/lottie/music-animation.json';
import knowledgeAnimation from '../../assets/lottie/knowledge-animation.json';

// Create a map to link a round title to its animation
const lottieMap = {
  "Music Round": musicAnimation,
  "General Knowledge": knowledgeAnimation,
};

export default function RoundSlide({ round, roundId }) {
    if (!round) return null;

    const roundNumber = roundId ? String(roundId).replace(/\D/g, '') : '';
    // Look up the correct animation from our map
    const animationData = lottieMap[round.title];

    return (
        <motion.div
            className={styles.roundContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.h2
                className={styles.roundNumber}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
            >
                Round #{roundNumber}
            </motion.h2>

            <motion.h1
                className={styles.roundTitle}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}
            >
                {round.title}
            </motion.h1>

            {/* If an animation exists for this round, display it */}
            {animationData && (
                <motion.div
                    className={styles.lottieContainer}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, transition: { delay: 0.6 } }}
                >
                    <Lottie animationData={animationData} loop={true} />
                </motion.div>
            )}
        </motion.div>
    );
}