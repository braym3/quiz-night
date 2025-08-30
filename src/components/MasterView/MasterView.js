import React, { useState, useEffect } from 'react';
import { database } from '../../index';
import { ref, set, get, update, onValue } from 'firebase/database';
import './MasterView.css';

const MasterView = ({ gameState, players }) => {
    const [statusMessage, setStatusMessage] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentAnswers, setCurrentAnswers] = useState([]);
    const [moderatedScores, setModeratedScores] = useState({});

    useEffect(() => {
        const questionsRef = ref(database, 'questions');
        get(questionsRef).then((snapshot) => {
            if (snapshot.exists()) {
                setQuestions(Object.entries(snapshot.val()));
            }
        });
    }, []);

    useEffect(() => {
        if (!gameState?.currentQuestionId) return;

        const playersRef = ref(database, 'players');
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
    }, [gameState?.currentQuestionId]);


    const handleScoreChange = (playerName, score) => {
        const newScore = parseInt(score, 10);
        setModeratedScores(prevScores => ({
            ...prevScores,
            [playerName]: isNaN(newScore) ? 0 : newScore,
        }));
    };

    const handleStartQuiz = () => {
        set(ref(database, 'quiz/gameState'), { quizStatus: 'waiting', currentQuestionId: '' });
        set(ref(database, 'players'), {});
        setStatusMessage('Quiz ready. Click "Next Question" to start!');
    };

    const handleRevealAnswer = () => {
        const [questionId, questionData] = questions.find(([id]) => id === gameState.currentQuestionId) || [];
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
                    score = 10;
                }
            }
            suggestedScores[player.name] = score;
        });
        setModeratedScores(suggestedScores);
        
        update(ref(database, 'quiz/gameState'), { quizStatus: 'moderating' });
        setStatusMessage('Answer revealed. Adjust scores as needed, then proceed.');
    };

    const handleApplyScoresAndNextQuestion = () => {
        const updates = {};
        players.forEach(player => {
            const roundScore = moderatedScores[player.name] || 0;
            if (roundScore > 0) {
                const newTotalScore = (player.score || 0) + roundScore;
                updates[`/players/${player.name}/score`] = newTotalScore;
            }
        });
        update(ref(database), updates);

        setModeratedScores({}); 
        let nextIndex;
        if (gameState?.quizStatus === 'waiting' || !gameState?.currentQuestionId) {
            nextIndex = 0;
        } else {
            const currentQuestionIndex = questions.findIndex(([id]) => id === gameState?.currentQuestionId);
            nextIndex = currentQuestionIndex + 1;
        }

        if (nextIndex < questions.length) {
            const [nextQuestionId] = questions[nextIndex];
            update(ref(database, 'quiz/gameState'), { quizStatus: 'active', currentQuestionId: nextQuestionId });
            const answerUpdates = {};
            players.forEach(player => {
                answerUpdates[`/players/${player.name}/answer`] = '';
            });
            update(ref(database), answerUpdates);
            setStatusMessage(`Question ${nextIndex + 1} is live!`);
        } else {
            update(ref(database, 'quiz/gameState'), { quizStatus: 'ended' });
            setStatusMessage('Quiz has ended. Final scores are on the leaderboard.');
        }
    };

    const handleEndQuiz = () => {
        update(ref(database, 'quiz/gameState'), { quizStatus: 'ended' });
        setStatusMessage('Quiz has ended. Final scores are on the leaderboard.');
    };
    
    const nextButtonText = gameState?.quizStatus === 'moderating' ? 'Apply Scores & Next Question' : 'Next Question';
    
    const currentQuestion = questions.find(([id]) => id === gameState?.currentQuestionId)?.[1];
    
    let correctAnswerDisplay = '';
    if (currentQuestion) {
        if (currentQuestion.options && !Array.isArray(currentQuestion.options)) {
            correctAnswerDisplay = currentQuestion.options[currentQuestion.answer];
        } else if (Array.isArray(currentQuestion.answer)) {
            correctAnswerDisplay = currentQuestion.answer.join(' → ');
        } else {
            correctAnswerDisplay = currentQuestion.answer;
        }
    }

    return (
        <div className="master-view-container">
            <h1>Quiz Master Controls</h1>
            
            <div className="master-card controls-card">
                <h2>Game Flow</h2>
                <div className="controls-group">
                    <button onClick={handleStartQuiz} disabled={gameState?.quizStatus !== 'waiting' && gameState?.quizStatus !== null && gameState?.quizStatus !== 'ended'}>
                      Start Quiz
                    </button>
                    <button onClick={handleApplyScoresAndNextQuestion} disabled={!questions.length || gameState?.quizStatus === 'active' || gameState?.quizStatus === 'ended'}>
                      {nextButtonText}
                    </button>
                    <button onClick={handleRevealAnswer} disabled={gameState?.quizStatus !== 'active'}>
                      Reveal Answer
                    </button>
                    <button onClick={handleEndQuiz} disabled={gameState?.quizStatus === 'ended' || gameState?.quizStatus === 'moderating'}>
                      End Quiz
                    </button>
                </div>
            </div>

            <div className="master-card status-card">
                <h2>Status</h2>
                <p className="master-status">{statusMessage}</p>
            </div>

            <div className="master-card answers-card">
                <h2>Answers & Scoring</h2>
                {(gameState?.quizStatus === 'moderating') && correctAnswerDisplay && (
                    <div className="correct-answer-display">
                        <strong>Correct Answer: </strong>{correctAnswerDisplay}
                    </div>
                )}
                <ul className="answers-list">
                    {currentAnswers.length > 0 ? currentAnswers.map((player) => {
                        // **NEW LOGIC: Determine the display text for the player's answer**
                        let playerAnswerDisplay = 'No answer';
                        if (player.answer) {
                            if (currentQuestion?.options && !Array.isArray(currentQuestion.options) && currentQuestion.options[player.answer]) {
                                playerAnswerDisplay = currentQuestion.options[player.answer];
                            } else if (Array.isArray(player.answer)) {
                                playerAnswerDisplay = player.answer.join(', ');
                            } else {
                                playerAnswerDisplay = player.answer.toString();
                            }
                        }

                        return (
                            <li key={player.name} className="answer-item">
                                <span className="player-name">{player.name}</span>
                                <span className="player-answer">"{playerAnswerDisplay}"</span>
                                <div className="score-moderation">
                                    <input
                                        type="number"
                                        className="score-input"
                                        value={moderatedScores[player.name] !== undefined ? moderatedScores[player.name] : ''}
                                        onChange={(e) => handleScoreChange(player.name, e.target.value)}
                                        disabled={gameState?.quizStatus !== 'active' && gameState?.quizStatus !== 'moderating'}
                                        placeholder="0"
                                    />
                                    <span>pts</span>
                                </div>
                            </li>
                        );
                    }) : <p className="waiting-for-answers">Waiting for players to join and answer...</p>}
                </ul>
            </div>
        </div>
    );
};

export default MasterView;