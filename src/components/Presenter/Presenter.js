import React, { useState, useEffect, useRef } from 'react';
import { database } from '../../index';
import { ref, onValue, get } from 'firebase/database';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeSlide from './WelcomeSlide';
import RoundSlide from './RoundSlide';
import QuestionSlide from './QuestionSlide';
import AnswerSlide from './AnswerSlide';
import WinnersSlide from './WinnersSlide';
import LeaderboardSlide from './LeaderboardSlide';
import Sparkles from './Sparkles';
import Icon from '../Icon/Icon';
import Avatar from '../Avatar/Avatar';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import styles from './Presenter.module.css';
import { applyTheme, getTheme } from '../../utils/themes';
import { orderedKeys } from '../../utils/order';
import useWakeLock from '../../utils/useWakeLock';
import { isSoundOn, setSoundOn as persistSound, playPop } from '../../utils/sounds';

// Taglines for the little title-card moment when someone joins the lobby
const INTRO_TAGLINES = [
    'has entered the arena',
    'is here to win it all',
    'claims to have revised',
    'peaked at school quizzes',
    'is tonight\'s dark horse',
    'brings the vibes, not the answers',
    'has been waiting all week for this',
    'says trust nobody',
    'is dangerously confident',
    'knows things. Allegedly.',
];

export default function Presenter() {
    const [gameState, setGameState] = useState(null);
    const [quizContent, setQuizContent] = useState(null);
    const [players, setPlayers] = useState([]);
    const [currentTheme, setCurrentTheme] = useState('fun-and-sparkly');
    const [reactions, setReactions] = useState([]); // floaters currently on screen
    const [introCard, setIntroCard] = useState(null); // { name, avatar, tagline }
    const [streakToast, setStreakToast] = useState(null); // { name, streak }
    const [poll, setPoll] = useState({});
    const [soundOn, setSoundState] = useState(isSoundOn());
    const prevRanksRef = useRef(null);       // ranks last time the leaderboard was shown
    const knownPlayersRef = useRef(null);    // for join detection
    const introQueueRef = useRef([]);
    const introBusyRef = useRef(false);
    const streakShownRef = useRef(null);
    const reactionsStartRef = useRef(Date.now());

    // Keep the TV awake
    useWakeLock(true);

    useEffect(() => {
        // Remove default background for presenter view
        const rootElement = document.getElementById('root');
        document.body.style.backgroundImage = 'none';

        if (rootElement) {
            rootElement.style.padding = '0';
        }

        return () => {
            if (rootElement) {
                rootElement.style.padding = '20px';
            }
        };
    }, []);

    useEffect(() => {
        // Listen for active quiz changes and apply theme immediately
        const activeQuizIdRef = ref(database, 'liveGame/activeQuizId');

        const unsubscribe = onValue(activeQuizIdRef, async (snapshot) => {
            if (snapshot.exists()) {
                const quizId = snapshot.val();
                const quizRef = ref(database, `quizzes/${quizId}`);
                const quizSnapshot = await get(quizRef);

                if (quizSnapshot.exists()) {
                    const quiz = quizSnapshot.val();
                    setQuizContent(quiz);

                    // Apply theme for presenter view
                    const theme = quiz.theme || 'fun-and-sparkly';
                    setCurrentTheme(theme);

                    // Apply theme immediately without reload
                    applyTheme(theme, 'presenter');
                }
            } else {
                setCurrentTheme('fun-and-sparkly');
                applyTheme('fun-and-sparkly', 'presenter');
            }
        });

        const unsubGameState = onValue(ref(database, 'liveGame/gameState'), (snapshot) => setGameState(snapshot.val()));
        const unsubPlayers = onValue(ref(database, 'liveGame/players'), (snapshot) => {
            if(snapshot.exists()) {
                const playersData = snapshot.val();
                const playersArray = Object.entries(playersData).map(([name, data]) => ({ name, ...data }));
                setPlayers(playersArray);
            } else {
                setPlayers([]);
            }
        });
        const unsubPoll = onValue(ref(database, 'liveGame/poll'), (snapshot) => {
            setPoll(snapshot.exists() ? snapshot.val() : {});
        });

        return () => {
            unsubscribe();
            unsubGameState();
            unsubPlayers();
            unsubPoll();
        };
    }, []);

    // The generated Guess Who round also lives in the quiz — refresh content
    // whenever the round changes so the TV has those questions
    useEffect(() => {
        if (!gameState?.currentRoundId) return;
        get(ref(database, 'liveGame/activeQuizId')).then((snap) => {
            if (!snap.exists()) return;
            get(ref(database, `quizzes/${snap.val()}`)).then((qsnap) => {
                if (qsnap.exists()) setQuizContent(qsnap.val());
            });
        });
    }, [gameState?.currentRoundId, gameState?.quizStatus]);

    // Emoji reactions: float anything newer than mount across the screen
    useEffect(() => {
        const unsub = onValue(ref(database, 'liveGame/reactions'), (snapshot) => {
            if (!snapshot.exists()) return;
            const now = Date.now();
            const fresh = Object.entries(snapshot.val())
                .filter(([, r]) => r.t > reactionsStartRef.current && r.t > now - 8000);
            if (!fresh.length) return;
            reactionsStartRef.current = Math.max(...fresh.map(([, r]) => r.t));
            setReactions((prev) => [
                ...prev,
                ...fresh.map(([id, r]) => ({
                    id,
                    emoji: r.emoji,
                    name: r.name,
                    x: 8 + Math.random() * 84, // % across the screen
                    drift: (Math.random() - 0.5) * 120,
                })),
            ].slice(-30));
        });
        return unsub;
    }, []);

    const removeReaction = (id) => setReactions((prev) => prev.filter(r => r.id !== id));

    // Intro title-cards when someone joins during the lobby
    useEffect(() => {
        const names = players.map(p => p.name);
        if (knownPlayersRef.current === null) {
            knownPlayersRef.current = new Set(names); // don't replay history on load
            return;
        }
        if (gameState?.quizStatus && gameState.quizStatus !== 'waiting') {
            names.forEach(n => knownPlayersRef.current.add(n));
            return;
        }
        const newcomers = players.filter(p => !knownPlayersRef.current.has(p.name));
        newcomers.forEach(p => {
            knownPlayersRef.current.add(p.name);
            introQueueRef.current.push({
                name: p.name,
                avatar: p.avatar,
                tagline: INTRO_TAGLINES[Math.floor(Math.random() * INTRO_TAGLINES.length)],
            });
        });
        const pump = () => {
            if (introBusyRef.current || introQueueRef.current.length === 0) return;
            introBusyRef.current = true;
            const card = introQueueRef.current.shift();
            setIntroCard(card);
            playPop();
            setTimeout(() => {
                setIntroCard(null);
                introBusyRef.current = false;
                setTimeout(pump, 250);
            }, 3200);
        };
        pump();
    }, [players, gameState?.quizStatus]);

    // Celebrate hot streaks on the reveal
    useEffect(() => {
        if (gameState?.quizStatus !== 'moderating') return;
        const qid = gameState.currentQuestionId;
        if (!qid || streakShownRef.current === qid) return;
        const hot = [...players]
            .filter(p => (p.streak || 0) >= 3)
            .sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
        if (hot) {
            streakShownRef.current = qid;
            setStreakToast({ name: hot.name, avatar: hot.avatar, streak: hot.streak });
            playPop();
            const t = setTimeout(() => setStreakToast(null), 4200);
            return () => clearTimeout(t);
        }
    }, [gameState?.quizStatus, gameState?.currentQuestionId, players]);

    // Remember ranks each time the leaderboard is shown, for ▲▼ deltas
    const leaderboardVisible = !!gameState?.showLeaderboard;
    const currentRanks = () => {
        const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
        const map = {};
        sorted.forEach((p, i) => { map[p.name] = i + 1; });
        return map;
    };
    const shownRanksRef = useRef(null);
    useEffect(() => {
        if (leaderboardVisible) {
            // capture deltas against the previous showing, then snapshot
            shownRanksRef.current = prevRanksRef.current;
            prevRanksRef.current = currentRanks();
        }
    }, [leaderboardVisible]);

    const toggleSound = () => {
        const next = !soundOn;
        setSoundState(next);
        persistSound(next);
    };

    const renderSlide = () => {
        if (!gameState || !quizContent) {
            return <WelcomeSlide key="loading" title="Trivia Night!" subtitle="Getting ready..." />;
        }

        const { quizStatus, currentRoundId, currentQuestionId } = gameState;

        // Master can throw the live leaderboard onto the TV at any point
        if (gameState.showLeaderboard) {
            return <LeaderboardSlide key="leaderboard" players={players} prevRanks={shownRanksRef.current} />;
        }

        if (quizStatus === 'ended') {
            return <WinnersSlide key="winners" players={players} />;
        }

        if (quizStatus === 'waiting') {
            return <WelcomeSlide key="welcome" title={quizContent.title || "Trivia Night!"} subtitle="Get Ready!" playerCount={players.length} players={players} poll={poll} />;
        }

        const round = quizContent.rounds[currentRoundId];
        const question = round?.questions[currentQuestionId];

        if (quizStatus === 'round-interstitial') {
            return <RoundSlide key={currentRoundId} round={round} roundId={currentRoundId} players={players} />;
        }

        // Show the join QR in the corner throughout round 1 for late arrivals
        const isFirstRound = orderedKeys(quizContent.rounds)[0] === currentRoundId;

        if (quizStatus === 'active' && question) {
            const questionWithId = { ...question, id: currentQuestionId };
            return <QuestionSlide key={currentQuestionId} question={questionWithId} round={round} players={players} timerDeadline={gameState.timerDeadline} timerDuration={gameState.timerDuration} timerPaused={typeof gameState.timerPausedRemaining === 'number' ? gameState.timerPausedRemaining : null} showJoinQr={isFirstRound} soundOn={soundOn} />;
        }

        if (quizStatus === 'moderating' && question) {
            return <AnswerSlide key={`${currentQuestionId}-answer`} question={question} players={players} soundOn={soundOn} />;
        }

        return <WelcomeSlide key="fallback" title="Trivia Night!" subtitle="Please wait..." />;
    };

    // Use theme config to determine sparkles instead of hardcoded IDs
    const theme = getTheme(currentTheme);
    const showSparkles = theme.effects?.sparkles === true;

    return (
        <div className={`${styles.presenterContainer} presenterContainer`}>
            {showSparkles && <Sparkles />}
            <ErrorBoundary>
                <AnimatePresence mode="wait">
                    {renderSlide()}
                </AnimatePresence>
            </ErrorBoundary>

            {/* Emoji reactions floating up */}
            <div className={styles.reactionLayer} aria-hidden="true">
                <AnimatePresence>
                    {reactions.map((r) => (
                        <motion.div
                            key={r.id}
                            className={styles.reactionFloat}
                            style={{ left: `${r.x}%` }}
                            initial={{ y: '105vh', opacity: 0, scale: 0.7, rotate: -10 }}
                            animate={{ y: '-12vh', x: r.drift, opacity: [0, 1, 1, 0.9, 0], scale: [0.7, 1.25, 1.1, 1.15, 0.9], rotate: 8 }}
                            transition={{ duration: 4.2, ease: 'easeOut' }}
                            onAnimationComplete={() => removeReaction(r.id)}
                        >
                            <span className={styles.reactionEmoji}>{r.emoji}</span>
                            <span className={styles.reactionName}>{r.name}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Player intro title-card */}
            <AnimatePresence>
                {introCard && (
                    <motion.div
                        className={styles.introCard}
                        initial={{ y: 80, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                    >
                        <Avatar value={introCard.avatar} size={54} alt={introCard.name} />
                        <div className={styles.introText}>
                            <span className={styles.introName}>{introCard.name}</span>
                            <span className={styles.introTagline}>{introCard.tagline}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hot streak toast */}
            <AnimatePresence>
                {streakToast && (
                    <motion.div
                        className={styles.streakToast}
                        initial={{ y: -70, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -70, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                    >
                        <Icon name="flame" size={26} style={{ color: '#ff7a45' }} />
                        <Avatar value={streakToast.avatar} size={34} alt={streakToast.name} />
                        <span><strong>{streakToast.name}</strong> is on fire — {streakToast.streak} in a row!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sound toggle for the big screen */}
            <button className={styles.soundToggle} onClick={toggleSound} aria-label={soundOn ? 'Mute TV sound' : 'Unmute TV sound'}>
                <Icon name={soundOn ? 'volume' : 'volume-off'} size={20} />
            </button>
        </div>
    );
}
