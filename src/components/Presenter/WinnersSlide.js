import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../Avatar/Avatar';
import Confetti from '../Confetti/Confetti';
import styles from './WinnersSlide.module.css';
import { playFanfare, playPop } from '../../utils/sounds';

const AWARD_SECONDS = 4.5;

// Compute the night's superlatives from per-question history
const computeAwards = (players) => {
    const stats = players.map(p => {
        const entries = Object.values(p.history || {});
        const timed = entries.filter(e => typeof e.ms === 'number');
        const timedWrong = timed.filter(e => !e.ok);
        const avg = (arr) => arr.length ? arr.reduce((s, e) => s + e.ms, 0) / arr.length : null;
        return {
            name: p.name,
            avatar: p.avatar,
            score: p.score || 0,
            answered: entries.length,
            correct: entries.filter(e => e.ok).length,
            avgMs: avg(timed),
            timedCount: timed.length,
            avgWrongMs: avg(timedWrong),
            wrongTimedCount: timedWrong.length,
            bestStreak: p.bestStreak || 0,
        };
    });

    const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
    const awards = [];

    const fastest = stats.filter(s => s.timedCount >= 2 && s.avgMs !== null)
        .sort((a, b) => a.avgMs - b.avgMs)[0];
    if (fastest) awards.push({
        emoji: '⚡', title: 'Fastest Finger', player: fastest,
        stat: `${secs(fastest.avgMs)} average answer time`,
    });

    const hot = stats.filter(s => s.bestStreak >= 2)
        .sort((a, b) => b.bestStreak - a.bestStreak)[0];
    if (hot) awards.push({
        emoji: '🔥', title: 'Hot Streak', player: hot,
        stat: `${hot.bestStreak} correct in a row`,
    });

    const confident = stats.filter(s => s.wrongTimedCount >= 2 && s.avgWrongMs !== null)
        .sort((a, b) => a.avgWrongMs - b.avgWrongMs)[0];
    if (confident) awards.push({
        emoji: '🤡', title: 'Confidently Wrong', player: confident,
        stat: `wrong in a blistering ${secs(confident.avgWrongMs)}`,
    });

    const overthinker = stats.filter(s => s.timedCount >= 2 && s.avgMs !== null && (!fastest || s.name !== fastest.name))
        .sort((a, b) => b.avgMs - a.avgMs)[0];
    if (overthinker) awards.push({
        emoji: '🐢', title: 'The Overthinker', player: overthinker,
        stat: `${secs(overthinker.avgMs)} of deep thought per question`,
    });

    if (players.length >= 3) {
        const last = [...stats].sort((a, b) => a.score - b.score)[0];
        if (last) awards.push({
            emoji: '🥄', title: 'The Wooden Spoon', player: last,
            stat: `${last.score} points. Somebody had to.`,
        });
    }

    return awards;
};

export default function WinnersSlide({ players }) {
    // Sort players by score one last time to be safe
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

    const awards = useMemo(() => computeAwards(players), [players]);
    // phase: 0..awards.length-1 = award slides, awards.length = podium
    const [phase, setPhase] = useState(awards.length ? 0 : awards.length);
    const onPodium = phase >= awards.length;

    useEffect(() => {
        if (onPodium) {
            playFanfare();
            return;
        }
        playPop();
        const t = setTimeout(() => setPhase(p => p + 1), AWARD_SECONDS * 1000);
        return () => clearTimeout(t);
    }, [phase, onPodium]);

    const topThree = sortedPlayers.slice(0, 3);
    const otherPlayers = sortedPlayers.slice(3);

    // Reorder top three for podium display (2nd, 1st, 3rd)
    const podiumOrder = [
        topThree.find((p, i) => i === 1), // 2nd place
        topThree.find((p, i) => i === 0), // 1st place
        topThree.find((p, i) => i === 2)  // 3rd place
    ].filter(p => p); // Filter out undefined if less than 3 players

    if (!onPodium) {
        const award = awards[phase];
        return (
            <motion.div
                className={styles.container}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <h1 className={styles.awardsHeading}>Tonight's Awards</h1>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={award.title}
                        className={styles.awardCard}
                        initial={{ opacity: 0, y: 60, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -40, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                    >
                        <motion.div
                            className={styles.awardEmoji}
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 12 }}
                        >
                            {award.emoji}
                        </motion.div>
                        <h2 className={styles.awardTitle}>{award.title}</h2>
                        <motion.div
                            className={styles.awardWinner}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.1, type: 'spring', stiffness: 180 }}
                        >
                            <Avatar value={award.player.avatar} size={'clamp(60px, 8vw, 110px)'} alt={award.player.name} />
                            <div className={styles.awardName}>{award.player.name}</div>
                            <div className={styles.awardStat}>{award.stat}</div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
                <div className={styles.awardProgress}>
                    {awards.map((a, i) => (
                        <span key={a.title} className={`${styles.awardDot} ${i <= phase ? styles.awardDotOn : ''}`} />
                    ))}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
        >
            <Confetti />
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
                            <div className={styles.playerAvatar}><Avatar value={player.avatar} size={'clamp(2.5rem, 5vw, 4.5rem)'} alt={player.name} /></div>
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
