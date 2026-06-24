import React, { useState, useEffect, useCallback } from 'react';
import { database } from '../../index';
import { ref, set, get, remove } from 'firebase/database';
import './MasterView.css';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../Avatar/Avatar';
import Icon from '../Icon/Icon';

export default function MasterView({ gameState, players }) {
    const [activeTab, setActiveTab] = useState('control'); // 'control' or 'players'
    const [editingScores, setEditingScores] = useState({});
    const [quizData, setQuizData] = useState(null);
    const [timerSeconds, setTimerSeconds] = useState(30);
    const [moreOpen, setMoreOpen] = useState(false);
    const timerRunning = !!gameState?.timerDeadline;

    // Load quiz data when component mounts or activeQuizId changes
    React.useEffect(() => {
        const loadQuizData = async () => {
            const activeQuizIdSnapshot = await get(ref(database, 'liveGame/activeQuizId'));
            if (activeQuizIdSnapshot.exists()) {
                const quizId = activeQuizIdSnapshot.val();
                const quizSnapshot = await get(ref(database, `quizzes/${quizId}`));
                if (quizSnapshot.exists()) {
                    setQuizData(quizSnapshot.val());
                }
            }
        };
        loadQuizData();
    }, [gameState]);

    const startQuiz = () => {
        set(ref(database, 'liveGame/gameState'), {
            quizStatus: 'waiting',
            currentRoundId: null,
            currentQuestionId: null
        });
    };

    const startRound = (roundId) => {
        set(ref(database, 'liveGame/gameState'), {
            quizStatus: 'round-interstitial',
            currentRoundId: roundId,
            currentQuestionId: null
        });
    };

    const showQuestion = (questionId) => {
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            quizStatus: 'active',
            currentQuestionId: questionId
        });
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
        const questionIds = Object.keys(currentRound.questions);
        const currentIndex = questionIds.indexOf(gameState.currentQuestionId);

        if (currentIndex < questionIds.length - 1) {
            showQuestion(questionIds[currentIndex + 1]);
        } else {
            const roundIds = Object.keys(quizData.rounds);
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
        const questionIds = Object.keys(currentRound.questions);
        const currentIndex = questionIds.indexOf(gameState.currentQuestionId);
        if (currentIndex > 0) {
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
        set(ref(database, 'liveGame/gameState'), {
            quizStatus: 'waiting',
            currentRoundId: null,
            currentQuestionId: null
        });
        players.forEach(player => {
            set(ref(database, `liveGame/players/${player.name}/answer`), '');
        });
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
        players.forEach(player => {
            set(ref(database, `liveGame/players/${player.name}/answer`), '');
        });
    };

    // Timer controls
    const startTimer = (seconds) => {
        const deadline = Date.now() + seconds * 1000;
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            timerDeadline: deadline,
            timerDuration: seconds,
        });
    };

    const stopTimer = () => {
        set(ref(database, 'liveGame/gameState'), {
            ...gameState,
            timerDeadline: null,
            timerDuration: null,
        });
    };

    // Auto-score objective questions
    const autoScoreCurrentQuestion = () => {
        const question = getCurrentQuestion();
        if (!question) return;
        const pointsPerCorrect = typeof question.points === 'number' ? question.points : 10;

        players.forEach(player => {
            if (!player.answer || player.answer === '') return;
            let correct = false;
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
                correct = player.answer === question.answer;
            } else if (question.type === 'text_input' || question.type === 'image_input') {
                const playerAns = (typeof player.answer === 'string' ? player.answer : '').trim().toLowerCase();
                const correctAns = (typeof question.answer === 'string' ? question.answer : '').trim().toLowerCase();
                correct = playerAns === correctAns;
            } else if (question.type === 'ordering' && Array.isArray(player.answer) && Array.isArray(question.answer)) {
                correct = JSON.stringify(player.answer) === JSON.stringify(question.answer);
            }
            if (correct) {
                updatePlayerScore(player.name, (player.score || 0) + pointsPerCorrect);
            }
        });
    };

    // Check if player has submitted an actual answer (handles strings, arrays, objects)
    const hasAnswered = (player) => {
        const a = player.answer;
        if (a == null) return false;
        if (typeof a === 'string') return a !== '';
        if (Array.isArray(a)) return a.length > 0;
        if (typeof a === 'object') return Object.keys(a).length > 0;
        return !!a;
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

    const getPlayerAnswer = (player) => {
        if (!player.answer) return <span className="no-answer">No answer yet</span>;
        const question = getCurrentQuestion();
        if (!question) return <span className="answer-text">{JSON.stringify(player.answer)}</span>;

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
        const roundIds = Object.keys(quizData.rounds);
        const rIdx = roundIds.indexOf(gameState.currentRoundId);
        const round = quizData.rounds[gameState.currentRoundId];
        const qIds = round ? Object.keys(round.questions) : [];
        const qIdx = qIds.indexOf(gameState.currentQuestionId);
        return {
            roundNum: rIdx + 1, roundTotal: roundIds.length, roundTitle: round?.title,
            qNum: qIdx + 1, qTotal: qIds.length, hasQuestion: qIdx >= 0,
        };
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
        if (typeof q.answer === 'string') return q.answer;
        return '';
    };

    const primaryAction = () => {
        if (!status) return { label: 'Start quiz', icon: 'play', onClick: startQuiz };
        if (status === 'waiting' && quizData) return { label: 'Start first round', icon: 'play', onClick: () => startRound(Object.keys(quizData.rounds)[0]) };
        if (status === 'round-interstitial' && quizData) return { label: 'Show first question', icon: 'play', onClick: () => showQuestion(Object.keys(quizData.rounds[gameState.currentRoundId].questions)[0]) };
        if (status === 'active') return { label: 'Reveal answer', icon: 'check', onClick: showAnswer, variant: 'success' };
        if (status === 'moderating') return { label: 'Next question', icon: 'skip-forward', onClick: nextQuestion };
        if (status === 'ended' && quizData) return { label: 'Restart quiz', icon: 'refresh', onClick: restartQuiz };
        return null;
    };

    const pos = getPosition();
    const sm = statusMeta();
    const primary = primaryAction();
    const currentQ = getCurrentQuestion();
    const inQuestion = status === 'active' || status === 'moderating';
    const answeredCount = players.filter(hasAnswered).length;
    const isObjective = currentQ && ['multiple_choice', 'true_false', 'ordering', 'text_input', 'image_input'].includes(currentQ.type);

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
            </div>

            {inQuestion && currentQ && (
                <div className="mc-now-card">
                    <div className="mc-now-tag">{status === 'moderating' ? 'Answer revealed' : 'On screen now'}</div>
                    <div className="mc-now-question">{currentQ.text}</div>
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
                <button className="mc-autoscore" onClick={autoScoreCurrentQuestion}>
                    <Icon name="bolt" size={17} /> Auto-score this question
                </button>
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
                    {timerRunning && <button className="mc-tchip mc-tstop" onClick={stopTimer}>Stop</button>}
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
                                    {Object.entries(quizData.rounds).map(([roundId, round]) => (
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

            {players.length === 0 ? (
                <div className="no-players">
                    <p>No players yet</p>
                    <p className="hint">Players will appear here when they join</p>
                </div>
            ) : (
                <div className="players-list">
                    {players.map((player, index) => (
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
                                <div className="player-answer">{getPlayerAnswer(player)}</div>
                            ) : null}

                            {(status === 'waiting' || !status) && (
                                <button className="remove-player-btn" onClick={() => removePlayer(player.name)}>
                                    <Icon name="trash" size={14} /> Remove
                                </button>
                            )}
                        </motion.div>
                    ))}
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
