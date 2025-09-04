import React from 'react';
import { motion } from 'framer-motion';
import styles from './RoundSlide.module.css';

export default function RoundSlide({ round }) {
    if (!round) return null;

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
                Round #X
            </motion.h2>
            <motion.h1
                className={styles.roundTitle}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { delay: 0.4 } }}
            >
                {round.title}
            </motion.h1>
        </motion.div>
    );
}