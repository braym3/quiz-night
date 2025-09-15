import React from 'react';
import { motion } from 'framer-motion';
import styles from './WinnersSlide.module.css';

export default function WinnersSlide({ players }) {
    // Sort players by score one last time to be safe
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

    const topThree = sortedPlayers.slice(0, 3);
    const otherPlayers = sortedPlayers.slice(3);

    // Reorder top three for podium display (2nd, 1st, 3rd)
    const podiumOrder = [
        topThree.find((p, i) => i === 1), // 2nd place
        topThree.find((p, i) => i === 0), // 1st place
        topThree.find((p, i) => i === 2)  // 3rd place
    ].filter(p => p); // Filter out undefined if less than 3 players

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
        >
            <h1 className={styles.title}>Winners!</h1>

            <div className={styles.podiumContainer}>
                {podiumOrder.map((player, index) => (
                    player && (
                        <motion.div
                            key={player.name}
                            className={`${styles.podiumStep} ${styles[`place${index + 1}`]}`}
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 50, delay: 0.5 + index * 0.2 }}
                        >
                            <div className={styles.playerName}>{player.name}</div>
                            <div className={styles.playerScore}>{player.score} pts</div>
                        </motion.div>
                    )
                ))}
            </div>

            {otherPlayers.length > 0 && (
                <div className={styles.otherPlayersContainer}>
                    <ul className={styles.playerList}>
                        {otherPlayers.map((player, index) => (
                            <li key={player.name}>
                                <span>{index + 4}. {player.name}</span>
                                <span>{player.score} pts</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    );
}