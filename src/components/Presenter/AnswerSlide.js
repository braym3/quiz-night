import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { storage } from '../../index';
import { ref, getDownloadURL } from 'firebase/storage';
import Avatar from '../Avatar/Avatar';
import styles from './AnswerSlide.module.css';
import { playReveal } from '../../utils/sounds';
import { scoreForQuestion, scoreNumberQuestion, hasAnswered } from '../../utils/scoring';

// NYT Connections group colors
const CONNECTION_COLORS = [
  { bg: '#f9df6d', text: '#000' },
  { bg: '#a0c35a', text: '#000' },
  { bg: '#b0c4ef', text: '#000' },
  { bg: '#ba81c5', text: '#000' },
];

// Animation variants for the list container
const listVariants = {
    visible: {
        opacity: 1,
        transition: {
            when: "beforeChildren",
            staggerChildren: 0.3,
        },
    },
    hidden: {
        opacity: 0,
    },
};

// Animation variants for each list item
const itemVariants = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 20 },
};

// Slower stagger for logo wall reveals
const logoListVariants = {
    visible: {
        opacity: 1,
        transition: {
            when: "beforeChildren",
            staggerChildren: 0.6,
        },
    },
    hidden: {
        opacity: 0,
    },
};

const logoItemVariants = {
    visible: { opacity: 1, scale: 1, y: 0 },
    hidden: { opacity: 0, scale: 0.8, y: 20 },
};


const OPT_VARS = { a: 'var(--opt-a)', b: 'var(--opt-b)', c: 'var(--opt-c)', d: 'var(--opt-d)' };

export default function AnswerSlide({ question, players = [] }) {
    const [logoUrls, setLogoUrls] = useState({});

    // Dramatic sting as the answer lands
    useEffect(() => {
        playReveal();
    }, []);

    // Who scored on this question (avatar pile under the answer)
    const numberWinners = question?.type === 'number'
        ? scoreNumberQuestion(question, players.filter(hasAnswered))
        : null;
    const scorers = players.filter(p => {
        if (!hasAnswered(p)) return false;
        if (numberWinners) return !!numberWinners[p.name];
        return scoreForQuestion(question, p.answer) > 0;
    });

    const renderScorerPile = () => {
        if (!players.length) return null;
        return (
            <motion.div
                className={styles.scorerPile}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
            >
                <span className={styles.scorerLabel}>
                    {scorers.length === 0
                        ? 'Nobody got it. Awkward.'
                        : question?.type === 'number' ? 'Closest:' : 'Got it right:'}
                </span>
                {scorers.map((p, i) => (
                    <motion.span
                        key={p.name}
                        className={styles.scorerAvatar}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1 + i * 0.08, type: 'spring', stiffness: 260, damping: 16 }}
                        title={p.name}
                    >
                        <Avatar value={p.avatar} size={'clamp(30px, 3vw, 46px)'} alt={p.name} />
                    </motion.span>
                ))}
            </motion.div>
        );
    };

    // Answer distribution bars for multiple choice / true-false
    const renderDistribution = () => {
        if (!players.length || !question) return null;
        if (question.type !== 'multiple_choice' && question.type !== 'true_false') return null;
        const keys = Object.keys(question.options || {});
        if (!keys.length) return null;
        const counts = keys.map(k => players.filter(p => p.answer === k).length);
        const max = Math.max(1, ...counts);
        return (
            <div className={styles.dist}>
                {keys.map((k, i) => {
                    const correct = k === question.answer;
                    const color = correct ? 'var(--correct)' : (OPT_VARS[k] || 'var(--primary)');
                    // True/false reads clearer with the actual words; MC keeps its A/B/C/D letters
                    const isTF = question.type === 'true_false';
                    const label = isTF ? question.options[k] : k.toUpperCase();
                    return (
                        <div key={k} className={styles.distBar}>
                            <div className={styles.distCount}>{counts[i]}</div>
                            <motion.div
                                className={styles.distCol}
                                style={{ background: color }}
                                initial={{ height: 0 }}
                                animate={{ height: 16 + (counts[i] / max) * 120 }}
                                transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 120, damping: 18 }}
                            />
                            <div className={`${styles.distKey} ${isTF ? styles.distKeyWide : ''}`} style={{ background: color }}>{label}</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Load logo URLs for logo_wall questions
    useEffect(() => {
        if (question?.type === 'logo_wall' && question.logos) {
            setLogoUrls({});
            question.logos.forEach((logo, i) => {
                if (logo.imageUrl) {
                    const imgRef = ref(storage, logo.imageUrl);
                    getDownloadURL(imgRef).then(url => {
                        setLogoUrls(prev => ({ ...prev, [i]: url }));
                    }).catch(err => console.error('Logo load error:', err));
                }
            });
        }
    }, [question]);

    // Music answer reveal - title, artist, decade staggered
    if (question && question.type === 'music' && question.answer) {
        return (
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>The Answer Is...</h2>
                <motion.div
                    className={styles.musicReveal}
                    initial="hidden"
                    animate="visible"
                    variants={listVariants}
                >
                    <motion.div className={styles.musicRevealRow} variants={itemVariants}>
                        <span className={styles.musicRevealLabel}>Song</span>
                        <span className={styles.musicRevealValue}>{question.answer.title}</span>
                    </motion.div>
                    <motion.div className={styles.musicRevealRow} variants={itemVariants}>
                        <span className={styles.musicRevealLabel}>Artist</span>
                        <span className={styles.musicRevealValue}>{question.answer.artist}</span>
                    </motion.div>
                    {question.answer.decade && (
                        <motion.div className={styles.musicRevealRow} variants={itemVariants}>
                            <span className={styles.musicRevealLabel}>Decade</span>
                            <span className={styles.musicRevealValue}>{question.answer.decade}</span>
                        </motion.div>
                    )}
                </motion.div>
                {question.answerDetails?.detail && (
                    <p className={styles.funFact}>{question.answerDetails.detail}</p>
                )}
                {renderScorerPile()}
            </motion.div>
        );
    }

    // Connections answer reveal - groups appear one at a time
    if (question && question.type === 'connections' && question.connections) {
        return (
            <motion.div
                className={`${styles.card} ${styles.connectionsCard}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>The Connections Are...</h2>
                <motion.div
                    className={styles.connectionsRevealGrid}
                    initial="hidden"
                    animate="visible"
                    variants={listVariants}
                >
                    {question.connections.map((group, i) => (
                        <motion.div
                            key={i}
                            className={styles.connectionsRevealGroup}
                            style={{ backgroundColor: CONNECTION_COLORS[i % 4].bg, color: CONNECTION_COLORS[i % 4].text }}
                            variants={itemVariants}
                        >
                            <div className={styles.connectionsCategory}>{group.category}</div>
                            <div className={styles.connectionsWords}>{group.words.join(', ')}</div>
                        </motion.div>
                    ))}
                </motion.div>
                {question.answerDetails?.detail && (
                    <p className={styles.funFact}>{question.answerDetails.detail}</p>
                )}
                {renderScorerPile()}
            </motion.div>
        );
    }

    // Logo wall answer reveal - answers pop up one at a time
    if (question && question.type === 'logo_wall' && question.logos) {
        const logos = question.logos.slice(0, 12);
        const logoGridCols = Math.max(2, Math.min(6, Math.ceil(logos.length / 2)));
        return (
            <motion.div
                className={`${styles.card} ${styles.logoWallCard}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.titleCompact}>The Answers Are...</h2>
                <motion.div
                    className={styles.logoRevealGrid}
                    style={{ gridTemplateColumns: `repeat(${logoGridCols}, 1fr)` }}
                    initial="hidden"
                    animate="visible"
                    variants={logoListVariants}
                >
                    {logos.map((logo, i) => (
                        <motion.div
                            key={i}
                            className={styles.logoRevealItem}
                            variants={logoItemVariants}
                        >
                            <div className={styles.logoRevealImageContainer}>
                                {logoUrls[i] ? (
                                    <img src={logoUrls[i]} alt={logo.answer} className={styles.logoRevealImage} />
                                ) : (
                                    <div className={styles.logoRevealPlaceholder}>?</div>
                                )}
                            </div>
                            <motion.div
                                className={styles.logoRevealName}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (i * 0.6) }}
                            >
                                {logo.answer}
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
                {question.answerDetails?.detail && (
                    <p className={styles.funFact}>{question.answerDetails.detail}</p>
                )}
                {renderScorerPile()}
            </motion.div>
        );
    }

    // If the question is an ordering question, render the animated list
    if (question && question.type === 'ordering') {
        return (
            <motion.div
                className={`${styles.card} ${styles.orderingCard}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>The Answer Is...</h2>
                <motion.ol
                    className={styles.answerList}
                    initial="hidden"
                    animate="visible"
                    variants={listVariants}
                >
                    {question.answer.map((item, index) => {
                        const detailItem = question.answerDetails?.find(d => d.option === item);
                        return (
                            <motion.li key={index} className={styles.answerListItem} variants={itemVariants}>
                                <div className={styles.itemContent}>
                                    <span className={styles.itemNumber}>{index + 1}</span>
                                    {item}
                                </div>
                                {detailItem && (
                                    <span className={styles.itemDetail}>{detailItem.detail}</span>
                                )}
                            </motion.li>
                        );
                    })}
                </motion.ol>
                {renderScorerPile()}
            </motion.div>
        );
    }

    // Guess Who reveal — dramatic culprit unveiling
    if (question && question.type === 'guess_who') {
        const culprit = players.find(p => p.name === question.answer);
        return (
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>It Was...</h2>
                {question.quote && <p className={styles.guessWhoRevealQuote}>“{question.quote}”</p>}
                <motion.div
                    className={styles.guessWhoCulprit}
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.9, type: 'spring', stiffness: 180, damping: 14 }}
                >
                    <Avatar value={culprit?.avatar} size={'clamp(70px, 9vw, 130px)'} alt={question.answer} />
                    <div className={styles.guessWhoCulpritName}>{question.answer}</div>
                </motion.div>
                {renderScorerPile()}
            </motion.div>
        );
    }

    // Nearest-number reveal — everyone's guesses on a number line
    if (question && question.type === 'number') {
        const target = parseFloat(question.answer);
        const guesses = players
            .map(p => ({ name: p.name, avatar: p.avatar, g: parseFloat(p.answer) }))
            .filter(x => !isNaN(x.g));
        const values = [...guesses.map(x => x.g), isNaN(target) ? 0 : target];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || 1;
        const pos = (v) => 4 + ((v - min) / span) * 92; // % along the line
        return (
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>The Answer Is...</h2>
                <motion.p
                    className={styles.correctAnswer}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 160 }}
                >
                    {question.answer}
                </motion.p>
                {guesses.length > 0 && (
                    <div className={styles.numberLine}>
                        <div className={styles.numberTrack} />
                        {!isNaN(target) && (
                            <motion.div
                                className={styles.numberTarget}
                                style={{ left: `${pos(target)}%` }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                <span className={styles.numberTargetFlag}>{question.answer}</span>
                            </motion.div>
                        )}
                        {guesses.map((x, i) => (
                            <motion.div
                                key={x.name}
                                className={`${styles.numberGuess} ${numberWinners?.[x.name] ? styles.numberGuessWinner : ''}`}
                                style={{ left: `${pos(x.g)}%` }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.9 + i * 0.1 }}
                            >
                                <Avatar value={x.avatar} size={'clamp(26px, 3vw, 42px)'} alt={x.name} />
                                <span className={styles.numberGuessValue}>{x.g}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
                {question.answerDetails?.detail && (
                    <p className={styles.funFact}>{question.answerDetails.detail}</p>
                )}
                {renderScorerPile()}
            </motion.div>
        );
    }

    // If it's a multiple-choice question with details for all options
    if (question && (question.type === 'multiple_choice') && question.answerDetails?.options) {
        const correctAnswerText = question.options[question.answer];
        return (
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
            >
                <h2 className={styles.title}>The Answer Is...</h2>
                <p className={styles.correctAnswer}>{correctAnswerText}</p>
                {renderDistribution()}
                <ul className={styles.mcDetailsList}>
                    {Object.entries(question.options).map(([key, value]) => (
                        <li key={key} className={key === question.answer ? styles.correctMcItem : styles.mcItem}>
                            <span>{value}</span>
                            <span>{question.answerDetails.options[key]}</span>
                        </li>
                    ))}
                </ul>
                {renderScorerPile()}
            </motion.div>
        );
    }


    // --- Fallback for all other question types (e.g., text_input with a fun fact) ---
    let correctAnswerText = '';
    let detailText = question?.answerDetails?.detail || '';

    if (question) {
        if (question.type === 'true_false') {
            correctAnswerText = question.options[question.answer];
        } else {
            correctAnswerText = question.answer;
        }
    }

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
        >
            <div className={styles.answerContent}>
                <h2 className={styles.title}>The Answer Is...</h2>
                <p className={styles.correctAnswer}>{correctAnswerText}</p>
                {renderDistribution()}
                {detailText && <p className={styles.funFact}>{detailText}</p>}
                {renderScorerPile()}
            </div>
        </motion.div>
    );
}
