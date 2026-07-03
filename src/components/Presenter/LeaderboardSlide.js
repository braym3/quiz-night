import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar/Avatar';
import Icon from '../Icon/Icon';
import styles from './LeaderboardSlide.module.css';
import { playRiser } from '../../utils/sounds';

// Big-screen leaderboard with race-style bars. Shown when the master
// toggles gameState.showLeaderboard. Reveals bottom-up for drama and
// shows rank movement since the last time it was on screen.
export default function LeaderboardSlide({ players = [], prevRanks = null }) {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8);
    const top = Math.max(1, sorted[0]?.score || 0);
    const count = sorted.length;

    useEffect(() => {
        playRiser();
    }, []);

    const delta = (name, rank) => {
        if (!prevRanks || typeof prevRanks[name] !== 'number') return null;
        return prevRanks[name] - rank; // positive = climbed
    };

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
                {sorted.map((player, i) => {
                    const rank = i + 1;
                    const d = delta(player.name, rank);
                    // Bottom-up: last place appears first, leader lands last
                    const revealDelay = 0.15 + (count - 1 - i) * 0.35;
                    return (
                        <motion.div
                            key={player.name}
                            className={styles.row}
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: revealDelay, type: 'spring', stiffness: 90, damping: 18 }}
                            layout
                        >
                            <span className={styles.rank}>{rank}</span>
                            <span className={styles.deltaSlot}>
                                {d !== null && d > 0 && <span className={`${styles.delta} ${styles.deltaUp}`}><Icon name="arrow-right" size={14} style={{ transform: 'rotate(-90deg)' }} />{d}</span>}
                                {d !== null && d < 0 && <span className={`${styles.delta} ${styles.deltaDown}`}><Icon name="arrow-right" size={14} style={{ transform: 'rotate(90deg)' }} />{-d}</span>}
                                {d !== null && d === 0 && <span className={`${styles.delta} ${styles.deltaSame}`}>—</span>}
                            </span>
                            <div className={styles.track}>
                                <motion.div
                                    className={styles.fill}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(18, ((player.score || 0) / top) * 100)}%` }}
                                    transition={{ delay: revealDelay + 0.1, type: 'spring', stiffness: 80, damping: 18 }}
                                >
                                    <span className={styles.avatar}><Avatar value={player.avatar} size={'clamp(28px, 3vw, 44px)'} alt={player.name} /></span>
                                    <span className={styles.name}>{player.name}</span>
                                    <span className={styles.score}>{player.score || 0}</span>
                                </motion.div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            {sorted.length === 0 && <p className={styles.empty}>No scores yet</p>}
        </motion.div>
    );
}
