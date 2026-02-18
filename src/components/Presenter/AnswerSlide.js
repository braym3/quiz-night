import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { storage } from '../../index';
import { ref, getDownloadURL } from 'firebase/storage';
import styles from './AnswerSlide.module.css';

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


export default function AnswerSlide({ question }) {
    const [logoUrls, setLogoUrls] = useState({});

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
                <ul className={styles.mcDetailsList}>
                    {Object.entries(question.options).map(([key, value]) => (
                        <li key={key} className={key === question.answer ? styles.correctMcItem : styles.mcItem}>
                            <span>{value}</span>
                            <span>{question.answerDetails.options[key]}</span>
                        </li>
                    ))}
                </ul>
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
                {detailText && <p className={styles.funFact}>{detailText}</p>}
            </div>
        </motion.div>
    );
}
