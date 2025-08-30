import React, { useState, useEffect } from 'react';
import { database } from '../../index';
import { ref, get, set } from 'firebase/database';
import './PlayerView.css';

// A helper function to shuffle an array
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};

const PlayerView = ({ playerName, gameState, onShowLeaderboard }) => {
  const [quizContent, setQuizContent] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [orderedAnswer, setOrderedAnswer] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
      const quizContentRef = ref(database, 'quizContent');
      get(quizContentRef).then((snapshot) => {
          if (snapshot.exists()) {
              setQuizContent(snapshot.val());
          }
      });
  }, []);

  useEffect(() => {
    if (gameState && gameState.currentQuestionId && quizContent) {
      const questionData = quizContent[gameState.currentRoundId]?.questions[gameState.currentQuestionId];
      if (questionData) {
        setCurrentQuestion(questionData);
        setIsSubmitted(false);
        setAnswer('');

        if (questionData.type === 'ordering') {
          setOrderedAnswer(shuffleArray([...questionData.options]));
        }
      }
    } else {
        setCurrentQuestion(null);
    }
  }, [gameState, quizContent]);

  const handleTextAnswerSubmit = () => {
    if (answer.trim() !== '') {
      set(ref(database, `players/${playerName}/answer`), answer);
      setIsSubmitted(true);
    }
  };

  const handleChoiceSubmit = (choice) => {
    set(ref(database, `players/${playerName}/answer`), choice);
    setIsSubmitted(true);
  };
  
  const handleOrderingSubmit = () => {
    set(ref(database, `players/${playerName}/answer`), orderedAnswer);
    setIsSubmitted(true);
  };

  const moveOption = (index, direction) => {
    const newOrder = [...orderedAnswer];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      setOrderedAnswer(newOrder);
    }
  };

  const renderRoundInfo = () => {
    if (!quizContent || !gameState?.currentRoundId || !gameState.currentQuestionId) {
        return null;
    }

    const round = quizContent[gameState.currentRoundId];
    if (!round) return null;
    
    const questionsInRound = Object.keys(round.questions);
    const totalQuestions = questionsInRound.length;
    const currentQuestionIndex = questionsInRound.indexOf(gameState.currentQuestionId);
    
    const progress = (currentQuestionIndex / totalQuestions) * 100;

    return (
        <div className="round-header">
            <h3 className="round-title">{round.title}</h3>
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
  };

  if (!gameState || gameState.quizStatus === 'waiting') {
    return <div className="player-view-container centered-view">
        <div className="player-message">
            <h2>Get Ready!</h2>
            <p>The quiz is about to start...</p>
        </div>
    </div>;
  }

  if (gameState.quizStatus === 'ended') {
    return <div className="player-view-container centered-view">
        <div className="player-message">
            <h2>Quiz Over!</h2>
            <p>Check the leaderboard for the final results.</p>
        </div>
    </div>;
  }

  if (gameState.quizStatus === 'reveal' || gameState.quizStatus === 'moderating') {
    let correctAnswerText = '';
    if (currentQuestion) {
      if (currentQuestion.options && !Array.isArray(currentQuestion.options)) {
        correctAnswerText = currentQuestion.options[currentQuestion.answer];
      } else if (Array.isArray(currentQuestion.answer)) {
        correctAnswerText = currentQuestion.answer.join(' → ');
      } else {
        correctAnswerText = currentQuestion.answer;
      }
    }

    return (
        <div className="player-view-container centered-view">
            <div className="answer-reveal-container">
                <p>The correct answer was:</p>
                <h2 className="correct-answer-text">{correctAnswerText}</h2>
                <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
            </div>
        </div>
    );
  }

  if (!currentQuestion) {
    return <div className="player-view-container centered-view">
        <div className="player-message">Loading question...</div>
    </div>;
  }
  
  const renderInteraction = () => {
    if (isSubmitted) {
        return <div className="player-message submitted-message">
            <h3>Answer Locked In!</h3>
            <p>Waiting for the reveal...</p>
        </div>
    }

    switch(currentQuestion.type) {
      case 'multiple_choice':
      case 'true_false':
        return (
          <div className="answer-options">
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <button key={key} onClick={() => handleChoiceSubmit(key)}>
                {value}
              </button>
            ))}
          </div>
        );
      
      case 'ordering':
        return (
          <div className="ordering-section">
            <ul className="ordering-list">
              {orderedAnswer.map((item, index) => (
                <li key={index} className="ordering-item">
                  <span>{item}</span>
                  <div className="ordering-controls">
                    <button onClick={() => moveOption(index, -1)} disabled={index === 0}>▲</button>
                    <button onClick={() => moveOption(index, 1)} disabled={index === orderedAnswer.length - 1}>▼</button>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={handleOrderingSubmit}>Submit Order</button>
          </div>
        );
      
      default:
        return (
          <div className="text-input-section">
            {currentQuestion.imageUrl && <img src={currentQuestion.imageUrl} alt="Quiz question" className="question-image"/>}
            <input
              type="text"
              placeholder="Your answer..."
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextAnswerSubmit()}
            />
            <button onClick={handleTextAnswerSubmit}>
              Submit Answer
            </button>
          </div>
        );
    }
  };

  return (
    <div className="player-view-container">
        {renderRoundInfo()}
        <div className="question-section">
            <p className="question-text">{currentQuestion.text}</p>
        </div>
        <div className="interaction-section">
            {renderInteraction()}
        </div>
    </div>
  );
};

export default PlayerView;