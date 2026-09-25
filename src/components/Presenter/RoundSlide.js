import React from 'react';
import { motion } from 'framer-motion';
import RoundLottie from '../RoundLottie/RoundLottie';
import Avatar from '../Avatar/Avatar';
import styles from './RoundSlide.module.css';

export default function RoundSlide({ round, roundId, players = [] }) {
    if (!round) return null;

    const roundNumber = roundId ? String(roundId).replace(/\D/g, '') : '';

    // Between-rounds standings (hidden until someone has scored)
    const standings = [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
    const showStandings = standings.some(p => (p.score || 0) > 0);

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

            <motion.div
                className={styles.lottieContainer}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { delay: 0.6 } }}
            >
                <RoundLottie type={round.type} animation={round.animation} size="100%" />
            </motion.div>

            {showStandings && (
                <motion.div
                    className={styles.standings}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1, transition: { delay: 0.8 } }}
                >
                    <div className={styles.standingsTitle}>Standings</div>
                    {standings.map((p, i) => (
                        <div key={p.name} className={styles.standingRow}>
                            <span className={styles.standingRank}>{i + 1}</span>
                            <span className={styles.standingAvatar}><Avatar value={p.avatar} size={'clamp(24px, 2.4vw, 38px)'} alt={p.name} /></span>
                            <span className={styles.standingName}>{p.name}</span>
                            <span className={styles.standingScore}>{p.score || 0}</span>
                        </div>
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
}