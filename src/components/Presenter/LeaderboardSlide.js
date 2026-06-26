import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar/Avatar';
import styles from './LeaderboardSlide.module.css';

// Big-screen leaderboard with race-style bars. Shown when the master
// toggles gameState.showLeaderboard.
export default function LeaderboardSlide({ players = [] }) {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
    const top = Math.max(1, sorted[0]?.score || 0);

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h1 className={styles.title}>Leaderboard</h1>
            <div className={styles.rows}>
                {sorted.map((player, i) => (
                    <motion.div
                        key={player.name}
                        className={styles.row}
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 90, damping: 18 }}
                        layout
                    >
                        <span className={styles.rank}>{i + 1}</span>
                        <div className={styles.track}>
                            <motion.div
                                className={styles.fill}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(18, ((player.score || 0) / top) * 100)}%` }}
                                transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 80, damping: 18 }}
                            >
                                <span className={styles.avatar}><Avatar value={player.avatar} size={'clamp(28px, 3vw, 44px)'} alt={player.name} /></span>
                                <span className={styles.name}>{player.name}</span>
                                <span className={styles.score}>{player.score || 0}</span>
                            </motion.div>
                        </div>
                    </motion.div>
                ))}
            </div>
            {sorted.length === 0 && <p className={styles.empty}>No scores yet</p>}
        </motion.div>
    );
}
