import React, { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../../index';
import { ref, set, get, remove, update, onValue } from 'firebase/database';
import './MasterView.css';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../Avatar/Avatar';
import Icon from '../Icon/Icon';
import RoundLottie from '../RoundLottie/RoundLottie';
import {
    scoreForQuestion, scoreNumberQuestion, matchQuality, normalize,
    hasAnswered as hasAnsweredShared,
} from '../../utils/scoring';
import { orderedKeys, orderedEntries } from '../../utils/order';

export default function MasterView({ gameState, players }) {
    const [activeTab, setActiveTab] = useState('control'); // 'control' or 'players'
    const [editingScores, setEditingScores] = useState({});
    const [quizData, setQuizData] = useState(null);
    const [activeQuizId, setActiveQuizId] = useState(null);
    const [timerSeconds, setTimerSeconds] = useState(30);
    const [moreOpen, setMoreOpen] = useState(false);
    const [autoReveal, setAutoReveal] = useState(false);
    const [acceptedClusters, setAcceptedClusters] = useState({}); // per-question accepted answer clusters
    const autoRevealedRef = useRef(null);
    const timerRunning = !!gameState?.timerDeadline;
    const timerPaused = !timerRunning && typeof gameState?.timerPausedRemaining === 'number';

    // Follow the active quiz live (one listener, not a refetch per state change)
    useEffect(() => {
        let unsubQuiz = null;
        const unsubActive = onValue(ref(database, 'liveGame/activeQuizId'), (snap) => {
            if (unsubQuiz) { unsubQuiz(); unsubQuiz = null; }
            if (snap.exists()) {
                const quizId = snap.val();
                setActiveQuizId(quizId);
                unsubQuiz = onValue(ref(database, `quizzes/${quizId}`), (qsnap) => {
                    setQuizData(qsnap.exists() ? qsnap.val() : null);
                });
            } else {
                setActiveQuizId(null);
                setQuizData(null);
            }
        });
        return () => {
            unsubActive();
            if (unsubQuiz) unsubQuiz();
        };
    }, []);

    const startQuiz = () => {
        set(ref(database, 'liveGame/gameState'), {
            quizStatus: 'waiting',
            currentRoundId: null,
            currentQuestionId: null
        });
    };

    // Starting a Guess Who round builds its questions from the lobby answers
    const startRound = async (roundId) => {
        const round = quizData?.rounds?.[roundId];
        if (round?.type === 'guess_who' && activeQuizId) {
            const hasQuestions = Object.keys(round.questions || {}).length > 0;
            if (!hasQuestions) {
                const snap = await get(ref(database, 'liveGame/lobbyAnswers'));
                const lobbyAnswers = snap.exists() ? snap.val() : {};
                const entries = Object.entries(lobbyAnswers);
                if (entries.length === 0) {
                    window.alert('No lobby answers yet — players submit them on the join screen before the quiz starts.');
                    return;
                }
                const questions = {};
                // Shuffle so reveal order isn't join order
                entries.sort(() => Math.random() - 0.5).forEach(([name, text], i) => {
                    questions[`gw${i + 1}`] = {
                        type: 'guess_who',
                        text: round.prompt || 'Who said it?',
                        quote: text,
                        answer: name,
                        points: typeof round.points === 'number' ? round.points : 10,
                        order: i + 1,
                    };
                });
                await update(ref(database), {
                    [`quizzes/${activeQuizId}/rounds/${roundId}/questions`]: questions,
                });
            }
        }
        set(ref(database, 'liveGame/gameState'), {
            quizStatus: 'round-interstitial',
            currentRoundId: roundId,
            currentQuestionId: null
        });
    };

    const showQuestion = (questionId) => {
        // One atomic write: fresh slate for every player + the new game state
        const round = quizData?.rounds?.[gameState?.currentRoundId];
        const autoTimer = typeof round?.defaultTimer === 'number' && round.defaultTimer > 0 ? round.defaultTimer : null;
        const updates = {
            'liveGame/reactions': null,
            'liveGame/gameState': {
                ...gameState,
                quizStatus: 'active',
                currentQuestionId: questionId,
                questionStartedAt: Date.now(),
                timerDeadline: autoTimer ? Date.now() + autoTimer * 1000 : null,
                timerDuration: autoTimer || null,
                timerPausedRemaining: null,
            },
        };
        players.forEach(player => {
            updates[`liveGame/players/${player.name}/answer`] = '';
            updates[`liveGame/players/${player.name}/answeredAt`] = null;
        });
        if (autoTimer) setTimerSeconds(autoTimer);
        update(ref(database), updates);
    };

    const showAnswer = () => {
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            quizStatus: 'moderating'
        });
    };

    const nextQuestion = () => {
        if (!quizData || !gameState?.currentRoundId) return;

        const currentRound = quizData.rounds[gameState.currentRoundId];
        const questionIds = orderedKeys(currentRound.questions);
        const currentIndex = questionIds.indexOf(gameState.currentQuestionId);

        if (currentIndex < questionIds.length - 1) {
            showQuestion(questionIds[currentIndex + 1]);
        } else {
            const roundIds = orderedKeys(quizData.rounds);
            const roundIndex = roundIds.indexOf(gameState.currentRoundId);
            if (roundIndex < roundIds.length - 1) {
                startRound(roundIds[roundIndex + 1]);
            } else {
                endQuiz();
            }
        }
    };

    const previousQuestion = () => {
        if (!quizData || !gameState?.currentRoundId) return;
        const currentRound = quizData.rounds[gameState.currentRoundId];
        const questionIds = orderedKeys(currentRound.questions);
        const currentIndex = questionIds.indexOf(gameState.currentQuestionId);
        if (currentIndex > 0) {
            // Re-showing a question wipes submitted answers — make that a choice
            if (!window.confirm('Going back re-opens that question and clears everyone\'s submitted answers. Continue?')) return;
            showQuestion(questionIds[currentIndex - 1]);
        }
    };

    const endQuiz = () => {
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            quizStatus: 'ended'
        });
    };

    const restartQuiz = () => {
        // Atomic reset: fresh game state + per-question data cleared
        const updates = {
            'liveGame/gameState': {
                quizStatus: 'waiting',
                currentRoundId: null,
                currentQuestionId: null,
            },
            'liveGame/reactions': null,
        };
        players.forEach(player => {
            updates[`liveGame/players/${player.name}/answer`] = '';
            updates[`liveGame/players/${player.name}/answeredAt`] = null;
            updates[`liveGame/players/${player.name}/history`] = null;
            updates[`liveGame/players/${player.name}/streak`] = null;
            updates[`liveGame/players/${player.name}/bestStreak`] = null;
        });
        setAcceptedClusters({});
        update(ref(database), updates);
    };

    const updatePlayerScore = (playerName, newScore) => {
        set(ref(database, `liveGame/players/${playerName}/score`), parseInt(newScore) || 0);
        setEditingScores({ ...editingScores, [playerName]: undefined });
    };

    const removePlayer = (playerName) => {
        if (window.confirm(`Remove ${playerName} from the quiz?`)) {
            remove(ref(database, `liveGame/players/${playerName}`));
        }
    };

    const clearAllAnswers = () => {
        const updates = {};
        players.forEach(player => {
            updates[`liveGame/players/${player.name}/answer`] = '';
        });
        update(ref(database), updates);
    };

    // Timer controls
    const startTimer = (seconds) => {
        const deadline = Date.now() + seconds * 1000;
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            timerDeadline: deadline,
            timerDuration: seconds,
            timerPausedRemaining: null,
        });
    };

    const stopTimer = () => {
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            timerDeadline: null,
            timerDuration: null,
            timerPausedRemaining: null,
        });
    };

    const pauseTimer = () => {
        if (!gameState?.timerDeadline) return;
        const remaining = Math.max(0, gameState.timerDeadline - Date.now());
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            timerDeadline: null,
            timerPausedRemaining: remaining,
        });
    };

    const resumeTimer = () => {
        if (typeof gameState?.timerPausedRemaining !== 'number') return;
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            timerDeadline: Date.now() + gameState.timerPausedRemaining,
            timerPausedRemaining: null,
        });
    };

    // Toggle the live leaderboard on the presenter/TV
    const toggleLeaderboard = () => {
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            showLeaderboard: !gameState?.showLeaderboard,
        });
    };

    const SPEED_FLOOR = 0.5;
    const SPEED_TYPES = ['multiple_choice', 'true_false', 'text_input', 'image_input', 'ordering', 'guess_who'];

    const hasAnswered = hasAnsweredShared;
    const currentQid = gameState?.currentQuestionId;
    const alreadyScored = !!currentQid && gameState?.scoredQuestionId === currentQid;

    // Auto-score the current question once. Uses the shared (fuzzy) scoring,
    // writes per-player history for the phones/awards, and guards against
    // double-tapping the button.
    const autoScoreCurrentQuestion = () => {
        const question = getCurrentQuestion();
        if (!question || !currentQid || alreadyScored) return;

        const useSpeed = quizData?.speedBonus && gameState?.questionStartedAt && SPEED_TYPES.includes(question.type);
        const windowMs = (gameState?.timerDuration || 30) * 1000;
        const updates = { 'liveGame/gameState/scoredQuestionId': currentQid };

        // Nearest-number: scored against the whole field
        const numberWinners = question.type === 'number'
            ? scoreNumberQuestion(question, players.filter(hasAnswered))
            : null;

        players.forEach(player => {
            if (!hasAnswered(player)) return;
            let gain = numberWinners
                ? (numberWinners[player.name] || 0)
                : scoreForQuestion(question, player.answer);
            if (gain > 0 && useSpeed) {
                const at = player.answeredAt || gameState.questionStartedAt;
                const frac = Math.min(1, Math.max(0, (at - gameState.questionStartedAt) / windowMs));
                gain = Math.round(gain * (1 - (1 - SPEED_FLOOR) * frac));
            }
            const ms = (player.answeredAt && gameState?.questionStartedAt)
                ? Math.max(0, player.answeredAt - gameState.questionStartedAt)
                : null;
            updates[`liveGame/players/${player.name}/history/${currentQid}`] = {
                gain,
                ok: gain > 0 ? 1 : 0,
                ...(ms !== null ? { ms } : {}),
            };
            if (gain > 0) {
                updates[`liveGame/players/${player.name}/score`] = (player.score || 0) + gain;
            }
        });
        update(ref(database), updates);
    };

    const getCurrentQuestion = useCallback(() => {
        if (!quizData || !gameState?.currentRoundId || !gameState?.currentQuestionId) return null;
        return quizData.rounds[gameState.currentRoundId]?.questions[gameState.currentQuestionId];
    }, [quizData, gameState?.currentRoundId, gameState?.currentQuestionId]);

    const resetAllScores = () => {
        if (window.confirm('Reset all scores to 0?')) {
            players.forEach(player => {
                set(ref(database, `liveGame/players/${player.name}/score`), 0);
            });
        }
    };

    // Keyboard shortcuts for quiz master
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key) {
                case 'ArrowRight':
                case 'n':
                    e.preventDefault();
                    if (gameState?.quizStatus === 'moderating') nextQuestion();
                    break;
                case 'ArrowLeft':
                case 'p':
                    e.preventDefault();
                    if (gameState?.quizStatus === 'active' || gameState?.quizStatus === 'moderating') previousQuestion();
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (gameState?.quizStatus === 'active') showAnswer();
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    // Auto-reveal once every player has answered (opt-in)
    useEffect(() => {
        if (!autoReveal || gameState?.quizStatus !== 'active' || players.length === 0) return;
        if (players.filter(hasAnswered).length < players.length) return;
        const qid = gameState.currentQuestionId;
        if (autoRevealedRef.current === qid) return;
        autoRevealedRef.current = qid;
        const t = setTimeout(() => showAnswer(), 800);
        return () => clearTimeout(t);
    }, [autoReveal, gameState?.quizStatus, gameState?.currentQuestionId, players]);

    const getPlayerAnswer = (player) => {
        if (!player.answer) return <span className="no-answer">No answer yet</span>;
        const question = getCurrentQuestion();
        if (!question) return <span className="answer-text">{JSON.stringify(player.answer)}</span>;

        if (question.type === 'number' || question.type === 'guess_who') {
            return <span className="answer-text">{typeof player.answer === 'string' ? player.answer : JSON.stringify(player.answer)}</span>;
        }
        if (question.type === 'text_input' || question.type === 'image_input') {
            return <span className="answer-text">{typeof player.answer === 'string' ? player.answer : JSON.stringify(player.answer)}</span>;
        } else if (question.type === 'multiple_choice' || question.type === 'true_false') {
            if (typeof player.answer !== 'string') return <span className="no-answer">No answer yet</span>;
            const optionText = question.options?.[player.answer];
            return <span className="answer-text">{player.answer.toUpperCase()}) {optionText}</span>;
        } else if (question.type === 'music') {
            const a = (player.answer && typeof player.answer === 'object') ? player.answer : {};
            return (
                <div className="answer-music">
                    <div><strong>Title:</strong> {a.title || '—'}</div>
                    <div><strong>Artist:</strong> {a.artist || '—'}</div>
                    <div><strong>Decade:</strong> {a.decade || '—'}</div>
                </div>
            );
        } else if (question.type === 'ordering') {
            if (!Array.isArray(player.answer)) return <span className="no-answer">No answer yet</span>;
            return (
                <div className="answer-ordering">
                    {player.answer.map((item, i) => (<div key={i}>{i + 1}. {item}</div>))}
                </div>
            );
        } else if (question.type === 'connections') {
            if (!Array.isArray(player.answer)) return <span className="no-answer">No answer yet</span>;
            return (
                <div className="answer-connections">
                    {player.answer.map((group, i) => (
                        <div key={i} className="connection-group-mini">
                            <div className="group-label">Group {i + 1}:</div>
                            <div className="group-words">{group.join(', ')}</div>
                        </div>
                    ))}
                </div>
            );
        } else if (question.type === 'logo_wall') {
            if (!player.answer || typeof player.answer !== 'object' || Array.isArray(player.answer)) {
                return <span className="no-answer">No answer yet</span>;
            }
            return (
                <div className="answer-logos">
                    {Object.entries(player.answer).map(([idx, name]) => (<div key={idx} className="logo-answer">{name}</div>))}
                </div>
            );
        }
        return <span className="answer-text">{JSON.stringify(player.answer)}</span>;
    };

    // --- derived helpers for the redesigned control panel ---
    const status = gameState?.quizStatus;

    const getPosition = () => {
        if (!gameState?.currentRoundId || !quizData) return null;
        const roundIds = orderedKeys(quizData.rounds);
        const rIdx = roundIds.indexOf(gameState.currentRoundId);
        const round = quizData.rounds[gameState.currentRoundId];
        const qIds = round ? orderedKeys(round.questions) : [];
        const qIdx = qIds.indexOf(gameState.currentQuestionId);
        return {
            roundNum: rIdx + 1, roundTotal: roundIds.length, roundTitle: round?.title,
            qNum: qIdx + 1, qTotal: qIds.length, hasQuestion: qIdx >= 0,
        };
    };

    // What's coming next — so the host can tee it up before revealing
    const getOnDeck = () => {
        if (!quizData || !gameState?.currentRoundId) return null;
        const round = quizData.rounds[gameState.currentRoundId];
        const qIds = round ? orderedKeys(round.questions) : [];
        const qIdx = qIds.indexOf(gameState.currentQuestionId);
        if (qIdx >= 0 && qIdx < qIds.length - 1) {
            const nq = round.questions[qIds[qIdx + 1]];
            return { kind: 'question', label: `Q${qIdx + 2}`, text: nq.text, type: nq.type };
        }
        const roundIds = orderedKeys(quizData.rounds);
        const rIdx = roundIds.indexOf(gameState.currentRoundId);
        if (rIdx >= 0 && rIdx < roundIds.length - 1) {
            const nr = quizData.rounds[roundIds[rIdx + 1]];
            return { kind: 'round', label: 'Next round', text: nr.title, type: nr.type };
        }
        return { kind: 'end', label: 'After this', text: 'Final scores & podium', type: null };
    };

    const statusMeta = () => {
        switch (status) {
            case 'waiting': return { label: 'Lobby', icon: 'users' };
            case 'round-interstitial': return { label: 'Round screen', icon: 'flag' };
            case 'active': return { label: 'Live', icon: 'play' };
            case 'moderating': return { label: 'Revealing', icon: 'eye' };
            case 'ended': return { label: 'Finished', icon: 'trophy' };
            default: return { label: 'No game', icon: 'dots' };
        }
    };

    const correctAnswerText = () => {
        const q = getCurrentQuestion();
        if (!q) return '';
        if (q.type === 'multiple_choice' || q.type === 'true_false') return `${String(q.answer).toUpperCase()}) ${q.options?.[q.answer] || ''}`;
        if (q.type === 'ordering' && Array.isArray(q.answer)) return q.answer.join('  →  ');
        if (q.type === 'music' && q.answer) return [q.answer.title, q.answer.artist, q.answer.decade].filter(Boolean).join(' · ');
        if (q.type === 'guess_who') return `${q.answer} said it`;
        if (typeof q.answer === 'string') return q.answer;
        return '';
    };

    const primaryAction = () => {
        if (!status) return { label: 'Start quiz', icon: 'play', onClick: startQuiz };
        if (status === 'waiting' && quizData) return { label: 'Start first round', icon: 'play', onClick: () => startRound(orderedKeys(quizData.rounds)[0]) };
        if (status === 'round-interstitial' && quizData) return { label: 'Show first question', icon: 'play', onClick: () => showQuestion(orderedKeys(quizData.rounds[gameState.currentRoundId].questions)[0]) };
        if (status === 'active') return { label: 'Reveal answer', icon: 'check', onClick: showAnswer, variant: 'success' };
        if (status === 'moderating') return { label: 'Next question', icon: 'skip-forward', onClick: nextQuestion };
        if (status === 'ended' && quizData) return { label: 'Restart quiz', icon: 'refresh', onClick: restartQuiz };
        return null;
    };

    const pos = getPosition();
    const sm = statusMeta();
    const primary = primaryAction();
    const currentQ = getCurrentQuestion();
    const onDeck = (status === 'moderating' || status === 'active') ? getOnDeck() : null;
    const isTextQ = currentQ && (currentQ.type === 'text_input' || currentQ.type === 'image_input');
    const moderatingText = status === 'moderating' && isTextQ;
    const inQuestion = status === 'active' || status === 'moderating';
    const answeredCount = players.filter(hasAnswered).length;
    const isObjective = !!currentQ; // every question type is now auto-scorable

    // Mark one player's text answer correct by hand (writes history so their
    // phone shows the real points)
    const markCorrect = (player) => {
        if (!currentQ || !currentQid) return;
        const pts = typeof currentQ.points === 'number' ? currentQ.points : 10;
        update(ref(database), {
            [`liveGame/players/${player.name}/score`]: (player.score || 0) + pts,
            [`liveGame/players/${player.name}/history/${currentQid}`]: { gain: pts, ok: 1 },
        });
    };

    // Group identical/similar text answers so the host can accept a whole
    // cluster in one tap instead of scanning the list
    const answerClusters = () => {
        if (!moderatingText) return [];
        const map = new Map();
        players.forEach(p => {
            if (typeof p.answer !== 'string' || p.answer.trim() === '') return;
            const key = normalize(p.answer);
            if (!map.has(key)) map.set(key, { key, display: p.answer.trim(), players: [] });
            map.get(key).players.push(p);
        });
        return [...map.values()]
            .map(c => ({ ...c, quality: matchQuality(c.display, currentQ.answer) }))
            .sort((a, b) => b.players.length - a.players.length);
    };

    const acceptCluster = (cluster) => {
        const pts = typeof currentQ?.points === 'number' ? currentQ.points : 10;
        const updates = {};
        cluster.players.forEach(p => {
            updates[`liveGame/players/${p.name}/score`] = (p.score || 0) + pts;
            updates[`liveGame/players/${p.name}/history/${currentQid}`] = { gain: pts, ok: 1 };
        });
        update(ref(database), updates);
        setAcceptedClusters(prev => ({ ...prev, [`${currentQid}|${cluster.key}`]: true }));
    };

    const renderControl = () => (
        <div className="control-panel">
            <div className="mc-statusbar">
                <span className={`mc-status-pill mc-status-${status || 'none'}`}>
                    <Icon name={sm.icon} size={14} /> {sm.label}
                </span>
                {pos && (
                    <span className="mc-position">
                        Round {pos.roundNum}/{pos.roundTotal}
                        {pos.hasQuestion && <> &middot; Q{pos.qNum}/{pos.qTotal}</>}
                    </span>
                )}
                {timerRunning && <span className="mc-timer-live"><Icon name="clock" size={13} /> timer</span>}
                {gameState?.showLeaderboard && <span className="mc-lb-live"><Icon name="trophy" size={13} /> on TV</span>}
            </div>

            {inQuestion && currentQ && (
                <div className="mc-now-card">
                    <div className="mc-now-tag">{status === 'moderating' ? 'Answer revealed' : 'On screen now'}</div>
                    <div className="mc-now-question">{currentQ.text}</div>
                    {currentQ.hostNotes && (
                        <div className="mc-host-notes">
                            <Icon name="bulb" size={14} /> {currentQ.hostNotes}
                        </div>
                    )}
                    {status === 'active' && (
                        <div className="mc-answered">
                            <div className="mc-answered-count">{answeredCount} / {players.length}</div>
                            <div className="mc-answered-label">answered</div>
                            <div className="mc-answered-bar">
                                <div className="mc-answered-fill" style={{ width: `${players.length > 0 ? (answeredCount / players.length) * 100 : 0}%` }} />
                            </div>
                        </div>
                    )}
                    {status === 'moderating' && correctAnswerText() && (
                        <div className="mc-now-answer">
                            <span className="mc-now-answer-label">Correct answer</span>
                            <span className="mc-now-answer-value">{correctAnswerText()}</span>
                        </div>
                    )}
                </div>
            )}

            {status === 'round-interstitial' && pos && (
                <div className="mc-round-card">
                    <RoundLottie type={quizData?.rounds?.[gameState.currentRoundId]?.type} size={88} />
                    <div className="mc-round-title">{pos.roundTitle}</div>
                    <div className="mc-round-sub">Round {pos.roundNum} of {pos.roundTotal}</div>
                </div>
            )}

            {status === 'waiting' && (
                <div className="mc-lobby-note">
                    {players.length === 0
                        ? <span className="mc-warn"><Icon name="users" size={16} /> No players have joined yet</span>
                        : <span><Icon name="users" size={16} /> {players.length} player{players.length !== 1 ? 's' : ''} ready</span>}
                </div>
            )}
            {status === 'ended' && (
                <div className="mc-ended-note"><Icon name="trophy" size={18} /> Quiz finished &mdash; check the scores</div>
            )}

            {primary && (
                <button className={`mc-primary ${primary.variant === 'success' ? 'mc-primary-success' : ''}`} onClick={primary.onClick}>
                    <Icon name={primary.icon} size={20} /> {primary.label}
                </button>
            )}

            {status === 'moderating' && isObjective && (
                <button
                    className={`mc-autoscore ${alreadyScored ? 'mc-autoscore-done' : ''}`}
                    onClick={autoScoreCurrentQuestion}
                    disabled={alreadyScored}
                >
                    <Icon name={alreadyScored ? 'check' : 'bolt'} size={17} />
                    {alreadyScored ? ' Scored — points awarded' : ' Auto-score this question'}
                </button>
            )}

            {status === 'moderating' && onDeck && (
                <div className="mc-ondeck">
                    <span className="mc-ondeck-tag">{onDeck.label} up next</span>
                    <span className="mc-ondeck-text">{onDeck.text}</span>
                    {onDeck.type && <span className="mc-ondeck-type">{String(onDeck.type).replace('_', ' ')}</span>}
                </div>
            )}

            {inQuestion && (
                <div className="mc-core">
                    <button className="mc-core-btn" onClick={previousQuestion}>
                        <Icon name="skip-back" size={16} /> Previous
                    </button>
                    <button className="mc-core-btn" onClick={() => setActiveTab('players')}>
                        <Icon name="users" size={16} /> Scores
                    </button>
                </div>
            )}

            {status === 'active' && (
                <div className="mc-timerbar">
                    <span className="mc-timer-label">Timer</span>
                    {[15, 30, 45, 60].map(s => (
                        <button
                            key={s}
                            className={`mc-tchip ${timerSeconds === s && timerRunning ? 'on' : ''}`}
                            onClick={() => { setTimerSeconds(s); startTimer(s); }}
                        >{s}s</button>
                    ))}
                    {timerRunning && <button className="mc-tchip mc-tpause" onClick={pauseTimer}>Pause</button>}
                    {timerPaused && (
                        <button className="mc-tchip mc-tresume" onClick={resumeTimer}>
                            Resume ({Math.ceil(gameState.timerPausedRemaining / 1000)}s)
                        </button>
                    )}
                    {(timerRunning || timerPaused) && <button className="mc-tchip mc-tstop" onClick={stopTimer}>Stop</button>}
                </div>
            )}

            {status && (
                <button className="mc-more" onClick={() => setMoreOpen(true)}>
                    <Icon name="dots" size={18} /> More controls
                </button>
            )}

            <div className="shortcuts-hint">
                <kbd>Space</kbd> Reveal <kbd>&rarr;</kbd> Next <kbd>&larr;</kbd> Previous
            </div>
        </div>
    );

    const renderMoreSheet = () => (
        <AnimatePresence>
            {moreOpen && (
                <>
                    <motion.div className="mc-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
                    <motion.div className="mc-sheet" initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
                        <div className="mc-sheet-grab" />
                        <h4>More controls</h4>
                        {quizData && status !== 'ended' && (
                            <div className="mc-sheet-rounds">
                                <span className="mc-sheet-sub">Jump to round</span>
                                <div className="mc-rounds-grid">
                                    {orderedEntries(quizData.rounds).map(([roundId, round]) => (
                                        <button
                                            key={roundId}
                                            className={`mc-round-btn ${gameState?.currentRoundId === roundId ? 'active' : ''}`}
                                            onClick={() => { startRound(roundId); setMoreOpen(false); }}
                                        >{round.title}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button className="mc-sheet-row" onClick={() => { clearAllAnswers(); setMoreOpen(false); }}>
                            <Icon name="refresh" size={18} /> Clear all answers
                        </button>
                        <button className="mc-sheet-row" onClick={() => { resetAllScores(); setMoreOpen(false); }}>
                            <Icon name="numbers" size={18} /> Reset all scores
                        </button>
                        <button className="mc-sheet-row" onClick={() => { toggleLeaderboard(); setMoreOpen(false); }}>
                            <Icon name="trophy" size={18} /> {gameState?.showLeaderboard ? 'Hide leaderboard from TV' : 'Show leaderboard on TV'}
                        </button>
                        <button className="mc-sheet-row" onClick={() => { setAutoReveal(v => !v); setMoreOpen(false); }}>
                            <Icon name="eye" size={18} /> Auto-reveal when all answered: {autoReveal ? 'On' : 'Off'}
                        </button>
                        {status && status !== 'ended' && (
                            <button className="mc-sheet-row mc-danger" onClick={() => { endQuiz(); setMoreOpen(false); }}>
                                <Icon name="flag" size={18} /> End quiz
                            </button>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    const renderPlayers = () => (
        <div className="players-panel">
            <div className="players-header">
                <h3>{players.length} {players.length === 1 ? 'Player' : 'Players'}</h3>
                {currentQ && (
                    <div className="question-type-badge">{currentQ.type.replace('_', ' ')}</div>
                )}
            </div>

            {moderatingText && (
                <div className="mc-answer-ref">Correct answer: <strong>{correctAnswerText()}</strong></div>
            )}

            {moderatingText && answerClusters().length > 0 && (
                <div className="mc-clusters">
                    <div className="mc-clusters-title">Answers, grouped</div>
                    {answerClusters().map(cluster => {
                        const accepted = acceptedClusters[`${currentQid}|${cluster.key}`];
                        return (
                            <div key={cluster.key} className={`mc-cluster ${cluster.quality !== 'wrong' ? 'mc-cluster-match' : ''}`}>
                                <span className="mc-cluster-text">"{cluster.display}"</span>
                                <span className="mc-cluster-count">×{cluster.players.length}</span>
                                {cluster.quality === 'exact' && <span className="mc-quality exact">match</span>}
                                {cluster.quality === 'close' && <span className="mc-quality close">close</span>}
                                {cluster.quality === 'wrong' && !accepted && !alreadyScored && (
                                    <button className="mc-cluster-accept" onClick={() => acceptCluster(cluster)}>
                                        <Icon name="check" size={13} /> Accept all
                                    </button>
                                )}
                                {accepted && <span className="mc-quality accepted">accepted</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {players.length === 0 ? (
                <div className="no-players">
                    <p>No players yet</p>
                    <p className="hint">Players will appear here when they join</p>
                </div>
            ) : (
                <div className="players-list">
                    {players.map((player, index) => {
                        const quality = (moderatingText && typeof player.answer === 'string' && player.answer !== '')
                            ? matchQuality(player.answer, currentQ.answer)
                            : null;
                        const exactMatch = quality === 'exact';
                        return (
                        <motion.div
                            key={player.name}
                            className={`player-card ${
                                (status === 'active') ? (hasAnswered(player) ? 'player-answered' : 'player-waiting') : ''
                            }`}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                        >
                            <div className="player-header">
                                <div className="player-rank">{index + 1}</div>
                                <div className="player-avatar-name">
                                    <span className="player-avatar"><Avatar value={player.avatar} size={32} alt={player.name} /></span>
                                    <span className="player-name">{player.name}</span>
                                    {status === 'active' && (
                                        <span className={`answer-dot ${hasAnswered(player) ? 'answered' : ''}`} title={hasAnswered(player) ? 'Answered' : 'Waiting'} />
                                    )}
                                </div>
                                <div className="player-score-edit">
                                    {editingScores[player.name] !== undefined ? (
                                        <>
                                            <input
                                                type="number"
                                                value={editingScores[player.name]}
                                                onChange={(e) => setEditingScores({ ...editingScores, [player.name]: e.target.value })}
                                                className="score-input"
                                                autoFocus
                                            />
                                            <button onClick={() => updatePlayerScore(player.name, editingScores[player.name])} className="score-save" aria-label="Save">
                                                <Icon name="check" size={16} />
                                            </button>
                                            <button onClick={() => setEditingScores({ ...editingScores, [player.name]: undefined })} className="score-cancel" aria-label="Cancel">
                                                <Icon name="x" size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="player-score">{player.score || 0} pts</div>
                                            {status === 'moderating' ? (
                                                <div className="quick-score-buttons">
                                                    {isTextQ && (
                                                        <button className="quick-score-btn correct" title="Mark correct" onClick={() => markCorrect(player)}>
                                                            <Icon name="check" size={14} />
                                                        </button>
                                                    )}
                                                    <button className="quick-score-btn positive" onClick={() => updatePlayerScore(player.name, (player.score || 0) + 5)}>+5</button>
                                                    <button className="quick-score-btn positive" onClick={() => updatePlayerScore(player.name, (player.score || 0) + 10)}>+10</button>
                                                    <button className="quick-score-btn negative" onClick={() => updatePlayerScore(player.name, Math.max(0, (player.score || 0) - 5))}>&minus;5</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setEditingScores({ ...editingScores, [player.name]: player.score || 0 })} className="score-edit-btn" aria-label="Edit score">
                                                    <Icon name="pencil" size={15} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {inQuestion ? (
                                <div className={`player-answer ${exactMatch ? 'answer-correct' : ''} ${quality === 'close' ? 'answer-close' : ''}`}>
                                    {getPlayerAnswer(player)}
                                    {quality === 'close' && <span className="mc-quality close">close — counts</span>}
                                </div>
                            ) : null}

                            {(status === 'waiting' || !status) && (
                                <button className="remove-player-btn" onClick={() => removePlayer(player.name)}>
                                    <Icon name="trash" size={14} /> Remove
                                </button>
                            )}
                        </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <div className="master-view">
            <div className="master-tabs">
                <button className={`master-tab ${activeTab === 'control' ? 'active' : ''}`} onClick={() => setActiveTab('control')}>
                    <Icon name="gamepad" size={18} /> Control
                </button>
                <button className={`master-tab ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>
                    <Icon name="users" size={18} /> Players ({players.length})
                </button>
            </div>

            <div className="master-content">
                {activeTab === 'control' ? renderControl() : renderPlayers()}
            </div>

            {renderMoreSheet()}
        </div>
    );
}
