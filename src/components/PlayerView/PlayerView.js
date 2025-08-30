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
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [orderedAnswer, setOrderedAnswer] = useState([]); // For ordering questions
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (gameState && gameState.currentQuestionId) {
      const questionRef = ref(database, `questions/${gameState.currentQuestionId}`);
      
      get(questionRef).then((snapshot) => {
        if (snapshot.exists()) {
          const questionData = snapshot.val();
          setQuestion(questionData);
          setIsSubmitted(false); // reset submission status for new question
          setAnswer(''); // Clear old text answers

          if (questionData.type === 'ordering') {
            setOrderedAnswer(shuffleArray([...questionData.options]));
          }
        } else {
          setQuestion(null);
        }
      });
    } else {
        setQuestion(null);
    }
  }, [gameState]);

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

  if (!gameState || gameState.quizStatus === 'waiting') {
    return <div className="player-message">The quiz is about to start... Check the leaderboard tab to see who is here!</div>;
  }

  if (gameState.quizStatus === 'ended') {
    return <div className="player-message">The quiz has ended! Check the leaderboard for final results.</div>;
  }

  // **UPDATED CONDITION: Show answer during 'reveal' AND 'moderating'**
  if (gameState.quizStatus === 'reveal' || gameState.quizStatus === 'moderating') {
    let correctAnswerText = '';
    if (question) {
      if (question.options && !Array.isArray(question.options)) {
        correctAnswerText = question.options[question.answer];
      } else if (Array.isArray(question.answer)) {
        correctAnswerText = question.answer.join(' → ');
      } else {
        correctAnswerText = question.answer;
      }
    }

    return (
        <div className="answer-reveal-container">
            <h2>The correct answer was:</h2>
            <p className="correct-answer-text">{correctAnswerText}</p>
            <p className="player-message">Waiting for the Quiz Master to proceed...</p>
            <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
        </div>
    );
  }

  if (!question) {
    return <div className="player-message">Loading question...</div>;
  }
  
  const renderQuestion = () => {
    switch(question.type) {
      case 'multiple_choice':
      case 'true_false':
        return (
          <div className="answer-options">
            {Object.entries(question.options).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleChoiceSubmit(key)}
                disabled={isSubmitted}
              >
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
                    <button onClick={() => moveOption(index, -1)} disabled={index === 0 || isSubmitted}>▲</button>
                    <button onClick={() => moveOption(index, 1)} disabled={index === orderedAnswer.length - 1 || isSubmitted}>▼</button>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={handleOrderingSubmit} disabled={isSubmitted}>Submit Order</button>
          </div>
        );
      
      case 'image_input':
      case 'text_input':
      default:
        return (
          <div className="text-input-section">
            {question.imageUrl && <img src={question.imageUrl} alt="Quiz question" className="question-image"/>}
            <input
              type="text"
              placeholder="Your answer..."
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isSubmitted}
              onKeyPress={(e) => e.key === 'Enter' && handleTextAnswerSubmit()}
            />
            <button onClick={handleTextAnswerSubmit} disabled={isSubmitted}>
              Submit Answer
            </button>
          </div>
        );
    }
  };

  return (
    <div className="player-view-container">
      <h2>Question {gameState.currentQuestionId.replace('q', '')}:</h2>
      <p className="question-text">{question.text}</p>
      {isSubmitted ? <p className="player-message">Your answer is submitted! Waiting for the reveal...</p> : renderQuestion()}
    </div>
  );
};

export default PlayerView;