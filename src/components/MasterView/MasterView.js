import React, { useState } from 'react';
import { database } from '../../index';
import { ref, set, get } from 'firebase/database';
import './MasterView.css';
import { motion } from 'framer-motion';

export default function MasterView({ gameState, players }) {
    const [activeTab, setActiveTab] = useState('control'); // 'control' or 'players'
    const [editingScores, setEditingScores] = useState({});
    const [quizData, setQuizData] = useState(null);

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
            // Next question in round
            showQuestion(questionIds[currentIndex + 1]);
        } else {
            // End of round
            const roundIds = Object.keys(quizData.rounds);
            const roundIndex = roundIds.indexOf(gameState.currentRoundId);

            if (roundIndex < roundIds.length - 1) {
                // Next round exists
                startRound(roundIds[roundIndex + 1]);
            } else {
                // End of quiz
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

    const updatePlayerScore = (playerName, newScore) => {
        set(ref(database, `liveGame/players/${playerName}/score`), parseInt(newScore) || 0);
        setEditingScores({ ...editingScores, [playerName]: undefined });
    };

    const getCurrentQuestion = () => {
        if (!quizData || !gameState?.currentRoundId || !gameState?.currentQuestionId) return null;
        return quizData.rounds[gameState.currentRoundId]?.questions[gameState.currentQuestionId];
    };

    const getPlayerAnswer = (player) => {
        if (!player.answer) return <span className="no-answer">No answer yet</span>;

        const question = getCurrentQuestion();
        if (!question) return <span className="answer-text">{JSON.stringify(player.answer)}</span>;

        // Format based on question type
        if (question.type === 'text_input' || question.type === 'image_input') {
            return <span className="answer-text">{player.answer}</span>;
        } else if (question.type === 'multiple_choice' || question.type === 'true_false') {
            const optionText = question.options?.[player.answer];
            return <span className="answer-text">{player.answer.toUpperCase()}) {optionText}</span>;
        } else if (question.type === 'music') {
            return (
                <div className="answer-music">
                    <div><strong>Title:</strong> {player.answer.title || '—'}</div>
                    <div><strong>Artist:</strong> {player.answer.artist || '—'}</div>
                    <div><strong>Decade:</strong> {player.answer.decade || '—'}</div>
                </div>
            );
        } else if (question.type === 'ordering') {
            return (
                <div className="answer-ordering">
                    {(player.answer || []).map((item, i) => (
                        <div key={i}>{i + 1}. {item}</div>
                    ))}
                </div>
            );
        } else if (question.type === 'connections') {
            return (
                <div className="answer-connections">
                    {(player.answer || []).map((group, i) => (
                        <div key={i} className="connection-group-mini">
                            <div className="group-label">Group {i + 1}:</div>
                            <div className="group-words">{group.join(', ')}</div>
                        </div>
                    ))}
                </div>
            );
        } else if (question.type === 'logo_wall') {
            return (
                <div className="answer-logos">
                    {Object.entries(player.answer || {}).map(([idx, name]) => (
                        <div key={idx} className="logo-answer">{name}</div>
                    ))}
                </div>
            );
        }

        return <span className="answer-text">{JSON.stringify(player.answer)}</span>;
    };

    const renderControl = () => (
        <div className="control-panel">
            {/* Quiz Status */}
            <div className="status-card">
                <div className="status-label">Status</div>
                <div className="status-value">
                    {!gameState && 'No Game Active'}
                    {gameState?.quizStatus === 'waiting' && '⏸️ Waiting to Start'}
                    {gameState?.quizStatus === 'round-interstitial' && '📺 Round Screen'}
                    {gameState?.quizStatus === 'active' && '▶️ Question Active'}
                    {gameState?.quizStatus === 'moderating' && '✅ Showing Answer'}
                    {gameState?.quizStatus === 'ended' && '🏆 Quiz Ended'}
                </div>
            </div>

            {/* Current Position */}
            {gameState?.currentRoundId && (
                <div className="position-card">
                    <div className="position-label">Current Position</div>
                    <div className="position-value">
                        Round: {gameState.currentRoundId}
                        {gameState.currentQuestionId && ` • Q: ${gameState.currentQuestionId}`}
                    </div>
                </div>
            )}

            {/* Control Buttons */}
            <div className="controls-grid">
                {!gameState?.quizStatus && (
                    <button onClick={startQuiz} className="control-btn primary">
                        ▶️ Start Quiz
                    </button>
                )}

                {gameState?.quizStatus === 'waiting' && quizData && (
                    <button
                        onClick={() => startRound(Object.keys(quizData.rounds)[0])}
                        className="control-btn primary"
                    >
                        ▶️ Start First Round
                    </button>
                )}

                {gameState?.quizStatus === 'round-interstitial' && quizData && (
                    <button
                        onClick={() => showQuestion(Object.keys(quizData.rounds[gameState.currentRoundId].questions)[0])}
                        className="control-btn primary"
                    >
                        ▶️ Show First Question
                    </button>
                )}

                {gameState?.quizStatus === 'active' && (
                    <>
                        <button onClick={showAnswer} className="control-btn success">
                            ✅ Show Answer
                        </button>
                        <button onClick={previousQuestion} className="control-btn secondary">
                            ⏮️ Previous
                        </button>
                    </>
                )}

                {gameState?.quizStatus === 'moderating' && (
                    <>
                        <button onClick={nextQuestion} className="control-btn primary">
                            ⏭️ Next Question
                        </button>
                        <button onClick={previousQuestion} className="control-btn secondary">
                            ⏮️ Previous
                        </button>
                    </>
                )}

                {gameState?.quizStatus !== 'ended' && gameState?.quizStatus && (
                    <button onClick={endQuiz} className="control-btn danger">
                        🏁 End Quiz
                    </button>
                )}
            </div>

            {/* Quick Rounds Access */}
            {quizData && gameState?.quizStatus && gameState.quizStatus !== 'ended' && (
                <div className="rounds-quick-access">
                    <div className="rounds-label">Jump to Round:</div>
                    <div className="rounds-grid">
                        {Object.entries(quizData.rounds).map(([roundId, round]) => (
                            <button
                                key={roundId}
                                onClick={() => startRound(roundId)}
                                className={`round-btn ${gameState.currentRoundId === roundId ? 'active' : ''}`}
                            >
                                {round.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPlayers = () => (
        <div className="players-panel">
            <div className="players-header">
                <h3>{players.length} Players</h3>
                {getCurrentQuestion() && (
                    <div className="question-type-badge">
                        {getCurrentQuestion().type.replace('_', ' ')}
                    </div>
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
                            className="player-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="player-header">
                                <div className="player-rank">#{index + 1}</div>
                                <div className="player-name">{player.name}</div>
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
                                            <button
                                                onClick={() => updatePlayerScore(player.name, editingScores[player.name])}
                                                className="score-save"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => setEditingScores({ ...editingScores, [player.name]: undefined })}
                                                className="score-cancel"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="player-score">{player.score || 0} pts</div>
                                            <button
                                                onClick={() => setEditingScores({ ...editingScores, [player.name]: player.score || 0 })}
                                                className="score-edit-btn"
                                            >
                                                ✏️
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {gameState?.quizStatus === 'active' || gameState?.quizStatus === 'moderating' ? (
                                <div className="player-answer">
                                    {getPlayerAnswer(player)}
                                </div>
                            ) : null}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="master-view">
            {/* Tab Navigation */}
            <div className="master-tabs">
                <button
                    className={`master-tab ${activeTab === 'control' ? 'active' : ''}`}
                    onClick={() => setActiveTab('control')}
                >
                    🎮 Control
                </button>
                <button
                    className={`master-tab ${activeTab === 'players' ? 'active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    👥 Players ({players.length})
                </button>
            </div>

            {/* Tab Content */}
            <div className="master-content">
                {activeTab === 'control' ? renderControl() : renderPlayers()}
            </div>
        </div>
    );
}