import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import { QRCodeSVG } from 'qrcode.react';
import { storage } from '../../index';
import { ref, getDownloadURL } from 'firebase/storage';
import musicAnimation from '../../assets/lottie/music-animation.json';
import Icon from '../Icon/Icon';
import Avatar from '../Avatar/Avatar';
import styles from './QuestionSlide.module.css';
import { orderedKeys } from '../../utils/order';
import { playTick } from '../../utils/sounds';

const OPT_VARS = { a: 'var(--opt-a)', b: 'var(--opt-b)', c: 'var(--opt-c)', d: 'var(--opt-d)' };

// NYT Connections colors for the presenter grid
const CONNECTION_COLORS = [
  { bg: '#f9df6d', text: '#000' },
  { bg: '#a0c35a', text: '#000' },
  { bg: '#b0c4ef', text: '#000' },
  { bg: '#ba81c5', text: '#000' },
];

export default function QuestionSlide({ question, round, players = [], timerDeadline, timerDuration, timerPaused = null, showJoinQr = false }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [logoUrls, setLogoUrls] = useState({});
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const audioRef = useRef(null);
    const lottieRef = useRef(null);

    // Timer countdown
    useEffect(() => {
        if (!timerDeadline) {
            setTimeLeft(null);
            return;
        }
        const tick = () => {
            const remaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
            setTimeLeft(remaining);
        };
        tick();
        const interval = setInterval(tick, 200);
        return () => clearInterval(interval);
    }, [timerDeadline]);

    // Tension tick from the TV speakers in the final five seconds
    const lastTickRef = useRef(null);
    useEffect(() => {
        if (timeLeft === null || timeLeft > 5 || timeLeft <= 0) return;
        if (lastTickRef.current === timeLeft) return;
        lastTickRef.current = timeLeft;
        playTick();
    }, [timeLeft]);

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

    // Load audio URL for music questions
    useEffect(() => {
        setAudioUrl(null);
        setIsPlaying(false);
        if (question.type === 'music' && question.audioUrl) {
            const audioStorageRef = ref(storage, question.audioUrl);
            getDownloadURL(audioStorageRef)
                .then(url => setAudioUrl(url))
                .catch(err => console.error('Audio load error:', err));
        }
        return () => {
            // Stop audio on unmount / question change
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, [question]);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (lottieRef.current) lottieRef.current.pause();
        } else {
            audioRef.current.play();
            setIsPlaying(true);
            if (lottieRef.current) lottieRef.current.play();
        }
    };

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

    const questionIdsInRound = orderedKeys(round.questions);
    const questionId = question.id || questionIdsInRound.find(id => round.questions[id].text === question.text);
    const questionNumber = questionIdsInRound.indexOf(questionId) + 1;
    const answeredCount = players.filter(p => p.answer && p.answer !== '').length;
    const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

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

            {/* Timer display */}
            {timeLeft !== null && timeLeft > 0 && (
                <div className={`${styles.timerDisplay} ${timeLeft <= 5 ? styles.timerUrgent : ''}`}>
                    <div className={styles.timerNumber}>{timeLeft}</div>
                    <div className={styles.timerBar}>
                        <motion.div
                            className={styles.timerBarFill}
                            initial={{ width: '100%' }}
                            animate={{ width: `${(timeLeft / (timerDuration || 30)) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            )}
            {timeLeft === 0 && (
                <motion.div
                    className={styles.timesUp}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                >
                    Time's Up!
                </motion.div>
            )}
            {timerPaused !== null && (
                <div className={styles.timerPausedBadge}>
                    <Icon name="pause" size={16} /> Paused — {Math.ceil(timerPaused / 1000)}s left
                </div>
            )}
            {showJoinQr && (
                <div className={styles.joinQrCorner}>
                    <QRCodeSVG value={joinUrl} size={74} bgColor="#ffffff" fgColor="#16151c" level="M" />
                    <span>Scan to join</span>
                </div>
            )}
            <div className={styles.questionContent}>

                {imageUrl && <img src={imageUrl} alt={question.text} className={styles.questionImage} />}

                <p className={`${styles.questionText} ${isLogoWall ? styles.questionTextCompact : ''}`}>{question.text}</p>

                {/* Music: spinning vinyl with play/pause */}
                {question.type === 'music' && (
                    <div className={styles.musicPlayer}>
                        <div className={styles.vinylContainer} onClick={toggleAudio}>
                            <div className={`${styles.vinylWrapper} ${isPlaying ? styles.vinylSpinning : ''}`}>
                                <Lottie
                                    lottieRef={lottieRef}
                                    animationData={musicAnimation}
                                    loop={true}
                                    autoplay={false}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                            <button className={styles.playPauseBtn} onClick={(e) => { e.stopPropagation(); toggleAudio(); }} aria-label={isPlaying ? 'Pause' : 'Play'}>
                                <Icon name={isPlaying ? 'pause' : 'play'} size={30} style={{ color: '#fff' }} />
                            </button>
                        </div>
                        {audioUrl && (
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={() => { setIsPlaying(false); if (lottieRef.current) lottieRef.current.pause(); }}
                            />
                        )}
                        <p className={styles.musicHint}>
                            {isPlaying ? 'Now Playing...' : 'Press play to listen'}
                        </p>
                    </div>
                )}

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

                {/* Guess Who: big quote + the suspect gallery */}
                {question.type === 'guess_who' && (
                    <>
                        {question.quote && (
                            <motion.div
                                className={styles.guessWhoQuote}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
                            >
                                “{question.quote}”
                            </motion.div>
                        )}
                        <div className={styles.guessWhoGallery}>
                            {players.map((p, i) => (
                                <motion.div
                                    key={p.name}
                                    className={styles.guessWhoSuspect}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 + i * 0.06 }}
                                >
                                    <Avatar value={p.avatar} size={'clamp(34px, 4vw, 58px)'} alt={p.name} />
                                    <span>{p.name}</span>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}

                {/* Nearest number: closest-wins banner */}
                {question.type === 'number' && (
                    <motion.div
                        className={styles.numberBanner}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <Icon name="numbers" size={26} /> Closest guess wins the points!
                    </motion.div>
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
                    <div className={styles.optionCards}>
                        {Object.entries(question.options).map(([key, value], index) => (
                            <motion.div
                                key={key}
                                className={styles.optionCard}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 }}
                            >
                                <span className={styles.optionLetter} style={{ background: OPT_VARS[key] || 'var(--primary)' }}>{key.toUpperCase()}</span>
                                <span className={styles.optionValue}>{value}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
