import React, { useState, useEffect, useMemo } from 'react';
import { database } from '../../index';
import { ref, set, get, update, onValue } from 'firebase/database';
import './MasterView.css';

const MasterView = ({ gameState, players }) => {
    const [quizContent, setQuizContent] = useState(null);
    const [currentAnswers, setCurrentAnswers] = useState([]);
    const [moderatedScores, setModeratedScores] = useState({});

    useEffect(() => {
        const activeQuizRef = ref(database, 'liveGame/activeQuizId');
        get(activeQuizRef).then((snapshot) => {
            const quizId = snapshot.val();
            if (quizId) {
                const quizContentRef = ref(database, `quizzes/${quizId}`);
                get(quizContentRef).then((quizSnapshot) => {
                    if (quizSnapshot.exists()) {
                        setQuizContent(quizSnapshot.val());
                    }
                });
            }
        });
    }, []);

    useEffect(() => {
        if (!gameState?.currentQuestionId && !gameState?.currentRoundId) return;

        const playersRef = ref(database, 'liveGame/players');
        const onPlayersChange = onValue(playersRef, (snapshot) => {
            if (snapshot.exists()) {
                const playersData = snapshot.val();
                const submittedAnswers = Object.entries(playersData)
                    .map(([name, data]) => ({ name, ...data }));
                setCurrentAnswers(submittedAnswers);
            } else {
                setCurrentAnswers([]);
            }
        });
        return () => onPlayersChange();
    }, [gameState]);

    const getCurrentQuestion = () => {
        if (!quizContent || !gameState?.currentRoundId || !gameState?.currentQuestionId) return null;
        return quizContent.rounds[gameState.currentRoundId]?.questions[gameState.currentQuestionId];
    };

    const handleScoreChange = (playerName, score) => {
        const newScore = parseFloat(score);
        setModeratedScores(prevScores => ({
            ...prevScores,
            [playerName]: isNaN(newScore) ? 0 : newScore,
        }));
    };

    const handleScoreAdjust = (playerName, amount) => {
        const currentScore = moderatedScores[playerName] || 0;
        const newScore = Math.max(0, currentScore + amount);
        setModeratedScores(prevScores => ({
            ...prevScores,
            [playerName]: newScore,
        }));
    };

    const handleNextQuestion = () => {
        if (!quizContent) return;
        setModeratedScores({});
        const roundIds = Object.keys(quizContent.rounds);
        let currentRoundId = gameState?.currentRoundId;
        let currentQuestionId = gameState?.currentQuestionId;

        if (gameState?.quizStatus === 'ended' || gameState?.quizStatus === 'waiting') {
            currentRoundId = '';
            currentQuestionId = '';
            set(ref(database, 'liveGame/players'), {});
        }
        
        if (gameState?.quizStatus === 'round-interstitial') {
            const firstQuestionId = Object.keys(quizContent.rounds[currentRoundId].questions)[0];
            update(ref(database, 'liveGame/gameState'), {
                quizStatus: 'active',
                currentQuestionId: firstQuestionId,
            });
            return;
        }

        if (!currentRoundId) {
            const firstRoundId = roundIds[0];
            update(ref(database, 'liveGame/gameState'), {
                quizStatus: 'round-interstitial',
                currentRoundId: firstRoundId,
                currentQuestionId: '',
            });
            return;
        }
        
        const currentRoundQuestions = Object.keys(quizContent.rounds[currentRoundId].questions);
        const currentQuestionIndex = currentRoundQuestions.indexOf(currentQuestionId);

        if (currentQuestionIndex < currentRoundQuestions.length - 1) {
            currentQuestionId = currentRoundQuestions[currentQuestionIndex + 1];
        } else {
            const currentRoundIndex = roundIds.indexOf(currentRoundId);
            if (currentRoundIndex < roundIds.length - 1) {
                const nextRoundId = roundIds[currentRoundIndex + 1];
                update(ref(database, 'liveGame/gameState'), {
                    quizStatus: 'round-interstitial',
                    currentRoundId: nextRoundId,
                    currentQuestionId: '',
                });
                return;
            } else {
                update(ref(database, 'liveGame/gameState'), { quizStatus: 'ended' });
                return;
            }
        }
        
        update(ref(database, 'liveGame/gameState'), {
            quizStatus: 'active',
            currentRoundId: currentRoundId,
            currentQuestionId: currentQuestionId,
        });

        const answerUpdates = {};
        players.forEach(player => {
            answerUpdates[`liveGame/players/${player.name}/answer`] = '';
        });
        update(ref(database), answerUpdates);
    };

    const handleRevealAnswer = () => {
        const questionData = getCurrentQuestion();
        if (!questionData) return;
        const suggestedScores = {};
        currentAnswers.forEach(player => {
            let score = 0;
            const correctAnswer = questionData.answer;
            if (player.answer) {
                let isCorrect = false;
                if (questionData.type === 'ordering') {
                    if (Array.isArray(player.answer) && player.answer.length === correctAnswer.length) {
                        isCorrect = player.answer.every((val, index) => val === correctAnswer[index]);
                    }
                } else {
                    isCorrect = player.answer.toString().toLowerCase().trim() === correctAnswer.toString().toLowerCase().trim();
                }
                if (isCorrect) {
                    score = questionData.points || 10;
                }
            }
            suggestedScores[player.name] = score;
        });
        setModeratedScores(suggestedScores);
        update(ref(database, 'liveGame/gameState'), { quizStatus: 'moderating' });
    };

    const handleEndQuiz = () => {
        update(ref(database, 'liveGame/gameState'), { quizStatus: 'ended' });
    };

    const currentQuestionData = getCurrentQuestion();

    const totalQuestions = useMemo(() => {
        if (!quizContent) return 0;
        return Object.values(quizContent.rounds).reduce((total, round) => total + Object.keys(round.questions).length, 0);
    }, [quizContent]);

    let currentQuestionNumber = 0;
    if (quizContent && gameState?.currentRoundId && gameState?.currentQuestionId) {
        const roundIds = Object.keys(quizContent.rounds);
        const currentRoundIndex = roundIds.indexOf(gameState.currentRoundId);
        
        for (let i = 0; i < currentRoundIndex; i++) {
            currentQuestionNumber += Object.keys(quizContent.rounds[roundIds[i]].questions).length;
        }
        
        const questionsInCurrentRound = Object.keys(quizContent.rounds[gameState.currentRoundId].questions);
        currentQuestionNumber += questionsInCurrentRound.indexOf(gameState.currentQuestionId) + 1;
    }
    
    let correctAnswerDisplay = '';
    if (currentQuestionData) {
        if (currentQuestionData.options && !Array.isArray(currentQuestionData.options)) {
            correctAnswerDisplay = currentQuestionData.options[currentQuestionData.answer];
        } else if (Array.isArray(currentQuestionData.answer)) {
            correctAnswerDisplay = currentQuestionData.answer.join(' → ');
        } else {
            correctAnswerDisplay = currentQuestionData.answer;
        }
    }

    const renderPrimaryButton = () => {
        const status = gameState?.quizStatus;

        if (!status || status === 'waiting' || status === 'ended') {
            return <button className="button-primary" onClick={handleNextQuestion}>Start Quiz</button>
        }
        if (status === 'active') {
            return <button className="button-primary" onClick={handleRevealAnswer}>Reveal Answer</button>
        }
        if (status === 'moderating') {
            const applyAndGoNext = () => {
                const updates = {};
                players.forEach(player => {
                    const roundScore = moderatedScores[player.name] || 0;
                    if (roundScore >= 0) {
                        const newTotalScore = (player.score || 0) + roundScore;
                        updates[`liveGame/players/${player.name}/score`] = newTotalScore;
                    }
                });
                update(ref(database), updates).then(() => {
                    handleNextQuestion();
                });
            }
            return <button className="button-primary" onClick={applyAndGoNext}>Next</button>
        }
        if (status === 'round-interstitial') {
            return <button className="button-primary" onClick={handleNextQuestion}>Start Round</button>
        }
        return null;
    };

    return (
        <div className="master-view-container">
            <h1 className="master-title">Quiz Master</h1>
            
            <div className="master-card controls-card">
                <h2>Game Controls</h2>
                <div className="controls-group">
                    {renderPrimaryButton()}
                    {(gameState?.quizStatus === 'active' || gameState?.quizStatus === 'moderating') && 
                        <button onClick={handleEndQuiz} className="button-secondary">End Quiz</button>
                    }
                </div>
            </div>

            {(gameState?.quizStatus === 'active' || gameState?.quizStatus === 'moderating') && currentQuestionData && (
                 <div className="master-card question-info-card">
                    <h2>Question ({currentQuestionNumber} of {totalQuestions})</h2>
                    <div className="question-info-details">
                        <p><strong>Round:</strong> {quizContent.rounds[gameState.currentRoundId].title}</p>
                        <p><strong>Answer:</strong> {correctAnswerDisplay}</p>
                        <p><strong>Points:</strong> {currentQuestionData.points || 10}</p>
                    </div>
                 </div>
            )}

            <div className="master-card answers-card">
                <h2>Answers & Scoring</h2>
                <ul className="answers-list">
                    {currentAnswers.length > 0 ? currentAnswers.map((player) => {
                        let playerAnswerDisplay = 'No answer submitted';
                        if (player.answer) {
                            if (currentQuestionData?.options && !Array.isArray(currentQuestionData.options) && currentQuestionData.options[player.answer]) {
                                playerAnswerDisplay = currentQuestionData.options[player.answer];
                            } else if (Array.isArray(player.answer)) {
                                playerAnswerDisplay = player.answer.join(', ');
                            } else {
                                playerAnswerDisplay = player.answer.toString();
                            }
                        }

                        return (
                            <li key={player.name} className="answer-item">
                                <div className="answer-details">
                                    <span className="player-name">{player.name}</span>
                                    <span className="player-answer">{playerAnswerDisplay}</span>
                                </div>
                                <div className="score-moderation">
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="score-input"
                                        value={moderatedScores[player.name] !== undefined ? moderatedScores[player.name] : ''}
                                        onChange={(e) => handleScoreChange(player.name, e.target.value)}
                                        disabled={gameState?.quizStatus !== 'active' && gameState?.quizStatus !== 'moderating'}
                                        placeholder="0"
                                    />
                                    <div className="score-button-stack">
                                        <button className="score-adjust-button" onClick={() => handleScoreAdjust(player.name, 0.5)} disabled={gameState?.quizStatus !== 'active' && gameState?.quizStatus !== 'moderating'}>▲</button>
                                        <button className="score-adjust-button" onClick={() => handleScoreAdjust(player.name, -0.5)} disabled={gameState?.quizStatus !== 'active' && gameState?.quizStatus !== 'moderating'}>▼</button>
                                    </div>
                                </div>
                            </li>
                        );
                    }) : <p className="waiting-for-answers">Waiting for players to answer...</p>}
                </ul>
            </div>
        </div>
    );
};

export default MasterView;