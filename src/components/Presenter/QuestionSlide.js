import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { storage } from '../../index';
import { ref, getDownloadURL } from 'firebase/storage';
import styles from './QuestionSlide.module.css';

// NYT Connections colors for the presenter grid
const CONNECTION_COLORS = [
  { bg: '#f9df6d', text: '#000' },
  { bg: '#a0c35a', text: '#000' },
  { bg: '#b0c4ef', text: '#000' },
  { bg: '#ba81c5', text: '#000' },
];

export default function QuestionSlide({ question, round, players = [] }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [logoUrls, setLogoUrls] = useState({});

    useEffect(() => {
        setImageUrl(null);
        if (question.imageUrl) {
            const imageRef = ref(storage, question.imageUrl);
            getDownloadURL(imageRef)
                .then((url) => {
                    setImageUrl(url);
                })
                .catch((error) => {
                    console.error("Error getting image URL:", error);
                });
        }
    }, [question.imageUrl]);

    // Load logo URLs for logo_wall questions
    useEffect(() => {
        if (question.type === 'logo_wall' && question.logos) {
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

    // Shuffle words for connections display (stable per question)
    const shuffledWords = useMemo(() => {
        if (question.type === 'connections' && question.connections) {
            const allWords = question.connections.flatMap(g => g.words).filter(w => w);
            // Seeded shuffle based on question text for consistency
            const arr = [...allWords];
            let seed = 0;
            for (let i = 0; i < (question.text || '').length; i++) {
                seed = ((seed << 5) - seed) + question.text.charCodeAt(i);
                seed |= 0;
            }
            for (let i = arr.length - 1; i > 0; i--) {
                seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                const j = seed % (i + 1);
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }
        return [];
    }, [question]);

    const questionIdsInRound = Object.keys(round.questions);
    const questionId = questionIdsInRound.find(id => round.questions[id].text === question.text);
    const questionNumber = questionIdsInRound.indexOf(questionId) + 1;
    const answeredCount = players.filter(p => p.answer && p.answer !== '').length;

    // Determine if this is a logo wall question for special card styling
    const isLogoWall = question.type === 'logo_wall';
    const logoCount = Math.min(question.logos?.length || 0, 12);
    // Always aim for 2 rows: cols = ceil(count / 2), min 2, max 6
    const logoGridCols = Math.max(2, Math.min(6, Math.ceil(logoCount / 2)));

    return (
        <motion.div
            className={`${styles.card} ${isLogoWall ? styles.logoWallCardLayout : ''}`}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
        >
            <div className={styles.questionNumberBanner}>
                Question {questionNumber}
                {players.length > 0 && (
                    <span className={styles.answerCount}>{answeredCount}/{players.length} answered</span>
                )}
            </div>
            <div className={styles.questionContent}>

                {imageUrl && <img src={imageUrl} alt={question.text} className={styles.questionImage} />}

                <p className={`${styles.questionText} ${isLogoWall ? styles.questionTextCompact : ''}`}>{question.text}</p>

                {/* Connections: show shuffled word grid */}
                {question.type === 'connections' && shuffledWords.length > 0 && (
                    <div className={styles.connectionsGrid}>
                        {shuffledWords.map((word, i) => (
                            <motion.div
                                key={word}
                                className={styles.connectionsWord}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                {word}
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Logo Wall: show image grid - capped at 12, always 2 rows */}
                {isLogoWall && question.logos && (
                    <div
                        className={styles.logoWallGrid}
                        style={{ gridTemplateColumns: `repeat(${logoGridCols}, 1fr)` }}
                    >
                        {question.logos.slice(0, 12).map((logo, i) => (
                            <motion.div
                                key={i}
                                className={styles.logoWallItem}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.08 }}
                            >
                                <div className={styles.logoWallImageWrap}>
                                    {logoUrls[i] ? (
                                        <img src={logoUrls[i]} alt={`Logo ${i + 1}`} className={styles.logoWallImage} />
                                    ) : (
                                        <div className={styles.logoWallPlaceholder}>?</div>
                                    )}
                                </div>
                                <div className={styles.logoWallNumber}>{i + 1}</div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {question.type === 'ordering' && (
                    <ul className={styles.orderingList}>
                        {question.options.map((option, index) => (
                            <li key={index} className={styles.orderingItem}>
                                {option}
                            </li>
                        ))}
                    </ul>
                )}

                {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                    <div className={styles.options}>
                        {Object.values(question.options).map((option, index) => (
                           <React.Fragment key={index}>
                             <span className={styles.option}>{option}</span>
                             {index < Object.values(question.options).length - 1 && <span className={styles.or}>OR</span>}
                           </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
