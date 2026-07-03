import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import AnimatedIcon from './AnimatedIcon';
import Avatar from '../Avatar/Avatar';
import { QRCodeSVG } from 'qrcode.react';
import styles from './WelcomeSlide.module.css';

export default function WelcomeSlide({ title, subtitle, playerCount = 0, players = [], poll = {} }) {
    // Tally the "who's winning tonight?" lobby poll
    const pollTally = useMemo(() => {
        const counts = {};
        Object.values(poll || {}).forEach((votedFor) => {
            counts[votedFor] = (counts[votedFor] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, votes]) => ({ name, votes, avatar: players.find(p => p.name === name)?.avatar }))
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 5);
    }, [poll, players]);

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
    const joinHost = typeof window !== 'undefined' ? window.location.host : '';
    const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

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

            {joinHost && (
                <motion.div
                    className={styles.joinPrompt}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }}
                >
                    <div className={styles.qrBox}>
                        <QRCodeSVG value={joinUrl} size={120} bgColor="#ffffff" fgColor="#16151c" level="M" />
                    </div>
                    <div className={styles.joinTextCol}>
                        <span className={styles.joinLabel}>Scan to join</span>
                        <span className={styles.joinUrl}>{joinHost}</span>
                    </div>
                </motion.div>
            )}

            {players.length > 0 && (
                <motion.div
                    className={styles.playerLobby}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.9 } }}
                >
                    <div className={styles.playerCount}>
                        {playerCount} player{playerCount !== 1 ? 's' : ''} joined
                    </div>
                    <div className={styles.playerAvatarRow}>
                        {players.map((player, i) => (
                            <motion.div
                                key={player.name}
                                className={styles.playerChip}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1 + i * 0.1, type: 'spring', stiffness: 200 }}
                            >
                                <span className={styles.chipAvatar}><Avatar value={player.avatar} size={30} alt={player.name} /></span>
                                <span className={styles.chipName}>{player.name}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
            {playerCount === 0 && (
                <motion.div
                    className={styles.playerCount}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.9 } }}
                >
                    Waiting for players...
                </motion.div>
            )}

            {pollTally.length > 0 && (
                <motion.div
                    className={styles.pollPanel}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 1.2 } }}
                >
                    <div className={styles.pollTitle}>The room predicts tonight's winner...</div>
                    <div className={styles.pollRows}>
                        {pollTally.map((entry, i) => (
                            <motion.div
                                key={entry.name}
                                className={styles.pollRow}
                                initial={{ opacity: 0, x: -18 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.3 + i * 0.12 }}
                            >
                                <Avatar value={entry.avatar} size={26} alt={entry.name} />
                                <span className={styles.pollName}>{entry.name}</span>
                                <span className={styles.pollVotes}>
                                    {'●'.repeat(Math.min(entry.votes, 10))} {entry.votes}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}