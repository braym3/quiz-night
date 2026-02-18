import React, { useState, useEffect } from 'react';
import { database, storage } from '../../index';
import { ref, get, set } from 'firebase/database';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import './PlayerView.css';
import { motion } from 'framer-motion';

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

// NYT Connections group colors
const CONNECTION_COLORS = [
  { bg: '#f9df6d', text: '#000' },  // Yellow
  { bg: '#a0c35a', text: '#000' },  // Green
  { bg: '#b0c4ef', text: '#000' },  // Blue
  { bg: '#ba81c5', text: '#000' },  // Purple
];

// Animation variants for the list
const listVariants = {
    visible: { transition: { staggerChildren: 0.3 } },
    hidden: {},
};
const itemVariants = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 20 },
};


const PlayerView = ({ playerName, gameState, onShowLeaderboard }) => {
  const [quizContent, setQuizContent] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [orderedAnswer, setOrderedAnswer] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Connections state
  const [selectedWords, setSelectedWords] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [remainingWords, setRemainingWords] = useState([]);
  const [connectionMistakes, setConnectionMistakes] = useState(0);
  // Logo wall state
  const [logoAnswers, setLogoAnswers] = useState({});
  const [logoUrls, setLogoUrls] = useState({});
  const [expandedLogo, setExpandedLogo] = useState(null); // index of expanded logo, null = closed

  useEffect(() => {
      const activeQuizRef = ref(database, 'liveGame/activeQuizId');
      get(activeQuizRef).then((activeQuizSnapshot) => {
          if (activeQuizSnapshot.exists()) {
              const quizId = activeQuizSnapshot.val();
              const quizContentRef = ref(database, `quizzes/${quizId}`);
              get(quizContentRef).then((snapshot) => {
                  if (snapshot.exists()) {
                      setQuizContent(snapshot.val());
                  }
              });
          }
      });
  }, []);

  useEffect(() => {
    if (gameState && gameState.currentQuestionId && quizContent) {
      const questionData = quizContent.rounds[gameState.currentRoundId]?.questions[gameState.currentQuestionId];
      if (questionData) {
        setCurrentQuestion(questionData);
        setIsSubmitted(false);
        setAnswer('');

        if (questionData.type === 'ordering') {
          setOrderedAnswer(shuffleArray([...questionData.options]));
        }

        // Initialize connections
        if (questionData.type === 'connections' && questionData.connections) {
          const allWords = questionData.connections.flatMap(g => g.words).filter(w => w);
          setRemainingWords(shuffleArray([...allWords]));
          setSelectedWords([]);
          setSolvedGroups([]);
          setConnectionMistakes(0);
        }

        // Initialize logo wall
        if (questionData.type === 'logo_wall' && questionData.logos) {
          setLogoAnswers({});
          setLogoUrls({});
          // Load all logo image URLs
          questionData.logos.forEach((logo, i) => {
            if (logo.imageUrl) {
              const imgRef = storageRef(storage, logo.imageUrl);
              getDownloadURL(imgRef).then(url => {
                setLogoUrls(prev => ({ ...prev, [i]: url }));
              }).catch(err => console.error('Logo load error:', err));
            }
          });
        }
      }
    } else {
        setCurrentQuestion(null);
    }
  }, [gameState, quizContent]);

  const handleTextAnswerSubmit = () => {
    if (answer.trim() !== '') {
      set(ref(database, `liveGame/players/${playerName}/answer`), answer);
      setIsSubmitted(true);
    }
  };

  const handleChoiceSubmit = (choice) => {
    set(ref(database, `liveGame/players/${playerName}/answer`), choice);
    setIsSubmitted(true);
  };

  const handleOrderingSubmit = () => {
    set(ref(database, `liveGame/players/${playerName}/answer`), orderedAnswer);
    setIsSubmitted(true);
  };

  // Connections handlers
  const toggleWordSelection = (word) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleConnectionSubmit = () => {
    if (selectedWords.length !== 4 || !currentQuestion?.connections) return;

    // Check if the selected words match any group
    const matchedGroup = currentQuestion.connections.find(group => {
      const groupWords = group.words.map(w => w.toUpperCase());
      const selected = selectedWords.map(w => w.toUpperCase());
      return groupWords.length === selected.length && groupWords.every(w => selected.includes(w));
    });

    if (matchedGroup) {
      const newSolvedGroups = [...solvedGroups, { ...matchedGroup, colorIndex: solvedGroups.length }];
      setSolvedGroups(newSolvedGroups);
      setRemainingWords(remainingWords.filter(w => !selectedWords.includes(w)));
      setSelectedWords([]);

      // If all groups solved, submit
      if (newSolvedGroups.length === currentQuestion.connections.length) {
        const groupedAnswer = newSolvedGroups.map(g => g.words);
        set(ref(database, `liveGame/players/${playerName}/answer`), groupedAnswer);
        setIsSubmitted(true);
      }
    } else {
      setConnectionMistakes(prev => prev + 1);
      setSelectedWords([]);
      // Max 4 mistakes = game over, submit what they have
      if (connectionMistakes + 1 >= 4) {
        const groupedAnswer = solvedGroups.map(g => g.words);
        set(ref(database, `liveGame/players/${playerName}/answer`), groupedAnswer);
        setIsSubmitted(true);
      }
    }
  };

  const handleConnectionGiveUp = () => {
    const groupedAnswer = solvedGroups.map(g => g.words);
    set(ref(database, `liveGame/players/${playerName}/answer`), groupedAnswer);
    setIsSubmitted(true);
  };

  // Logo wall handlers
  const handleLogoAnswerChange = (index, value) => {
    setLogoAnswers(prev => ({ ...prev, [index]: value }));
  };

  const handleLogoWallSubmit = () => {
    set(ref(database, `liveGame/players/${playerName}/answer`), logoAnswers);
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

    const round = quizContent.rounds[gameState.currentRoundId];
    if (!round) return null;

    const questionsInRound = Object.keys(round.questions);
    const totalQuestions = questionsInRound.length;
    const currentQuestionIndex = questionsInRound.indexOf(gameState.currentQuestionId);

    const progress = (currentQuestionIndex / totalQuestions) * 100;

    return (
        <div className="round-header">
            <div className="round-header-row">
                <h3 className="round-title">{round.title}</h3>
                <span className="question-counter">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
            </div>
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
    // Connections answer reveal
    if (currentQuestion?.type === 'connections' && currentQuestion.connections) {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container connections-reveal">
                    <p>The connections were:</p>
                    <motion.div className="connections-reveal-groups" initial="hidden" animate="visible" variants={listVariants}>
                        {currentQuestion.connections.map((group, i) => (
                            <motion.div
                                key={i}
                                className="connections-reveal-group"
                                style={{ backgroundColor: CONNECTION_COLORS[i % 4].bg, color: CONNECTION_COLORS[i % 4].text }}
                                variants={itemVariants}
                            >
                                <div className="connections-reveal-category">{group.category}</div>
                                <div className="connections-reveal-words">{group.words.join(', ')}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Logo wall answer reveal
    if (currentQuestion?.type === 'logo_wall' && currentQuestion.logos) {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container logo-wall-reveal">
                    <p>The answers were:</p>
                    <motion.div className="logo-reveal-grid" initial="hidden" animate="visible" variants={listVariants}>
                        {currentQuestion.logos.map((logo, i) => (
                            <motion.div key={i} className="logo-reveal-item" variants={itemVariants}>
                                {logoUrls[i] && <img src={logoUrls[i]} alt={logo.answer} className="logo-reveal-image" />}
                                <span className="logo-reveal-name">{logo.answer}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    if (currentQuestion?.type === 'ordering') {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container">
                    <p>The correct order was:</p>
                    <motion.ol className="ordering-answer-list" initial="hidden" animate="visible" variants={listVariants}>
                        {currentQuestion.answer.map((item, index) => (
                            <motion.li key={index} variants={itemVariants}>
                                {index + 1}. {item}
                            </motion.li>
                        ))}
                    </motion.ol>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Fallback for all other question types
    let correctAnswerText = '';
    if (currentQuestion) {
      if (currentQuestion.options && !Array.isArray(currentQuestion.options)) {
        correctAnswerText = currentQuestion.options[currentQuestion.answer];
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

  if (gameState.quizStatus === 'round-interstitial') {
    const round = quizContent?.rounds?.[gameState.currentRoundId];
    return (
      <div className="player-view-container centered-view">
        <motion.div
          className="player-message round-interstitial-message"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <h2>{round?.title || 'Next Round'}</h2>
          <p>Get ready!</p>
        </motion.div>
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
        return (
          <motion.div
            className="player-message submitted-message"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="submitted-checkmark">&#10003;</div>
            <h3>Answer Locked In!</h3>
            {typeof answer === 'string' && answer.trim() !== '' && (
              <p className="submitted-answer">{answer}</p>
            )}
            <p className="submitted-hint">Waiting for the reveal...</p>
          </motion.div>
        );
    }

    switch(currentQuestion.type) {
      case 'multiple_choice':
      case 'true_false':
        return (
          <div className="answer-options">
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <button key={key} className={`option-btn option-${key}`} onClick={() => handleChoiceSubmit(key)}>
                <span className="option-label">{key.toUpperCase()}</span>
                <span className="option-text">{value}</span>
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
                    <button onClick={() => moveOption(index, -1)} disabled={index === 0}>&#9650;</button>
                    <button onClick={() => moveOption(index, 1)} disabled={index === orderedAnswer.length - 1}>&#9660;</button>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={handleOrderingSubmit}>Submit Order</button>
          </div>
        );

      case 'connections':
        return (
          <div className="connections-section">
            {/* Solved groups at the top */}
            {solvedGroups.length > 0 && (
              <div className="connections-solved">
                {solvedGroups.map((group, i) => (
                  <motion.div
                    key={i}
                    className="connections-solved-group"
                    style={{ backgroundColor: CONNECTION_COLORS[group.colorIndex % 4].bg, color: CONNECTION_COLORS[group.colorIndex % 4].text }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <div className="connections-solved-category">{group.category}</div>
                    <div className="connections-solved-words">{group.words.join(', ')}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Word grid */}
            <div className="connections-grid">
              {remainingWords.map((word, i) => (
                <motion.button
                  key={word}
                  className={`connections-word ${selectedWords.includes(word) ? 'selected' : ''}`}
                  onClick={() => toggleWordSelection(word)}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  {word}
                </motion.button>
              ))}
            </div>

            {/* Mistakes indicator */}
            <div className="connections-mistakes">
              <span>Mistakes remaining: </span>
              {[...Array(4 - connectionMistakes)].map((_, i) => (
                <span key={i} className="mistake-dot active">&#9679;</span>
              ))}
              {[...Array(connectionMistakes)].map((_, i) => (
                <span key={i} className="mistake-dot used">&#9679;</span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="connections-actions">
              <button
                className="connections-submit-btn"
                disabled={selectedWords.length !== 4}
                onClick={handleConnectionSubmit}
              >
                Submit ({selectedWords.length}/4)
              </button>
              <button
                className="connections-deselect-btn"
                onClick={() => setSelectedWords([])}
                disabled={selectedWords.length === 0}
              >
                Deselect All
              </button>
              <button
                className="connections-giveup-btn"
                onClick={handleConnectionGiveUp}
              >
                Give Up
              </button>
            </div>
          </div>
        );

      case 'logo_wall':
        return (
          <div className="logo-wall-section">
            <div className="logo-wall-grid">
              {(currentQuestion.logos || []).map((logo, i) => (
                <div key={i} className="logo-wall-item">
                  <div
                    className="logo-wall-image-container"
                    onClick={() => setExpandedLogo(i)}
                  >
                    {logoUrls[i] ? (
                      <img src={logoUrls[i]} alt={`Logo ${i + 1}`} className="logo-wall-image" />
                    ) : (
                      <div className="logo-wall-placeholder">?</div>
                    )}
                    <div className="logo-wall-tap-hint">Tap to zoom</div>
                    <div className="logo-wall-badge">{i + 1}</div>
                  </div>
                  <input
                    type="text"
                    placeholder={`Name...`}
                    value={logoAnswers[i] || ''}
                    onChange={(e) => handleLogoAnswerChange(i, e.target.value)}
                    className="logo-wall-input"
                  />
                </div>
              ))}
            </div>

            {/* Expanded logo lightbox */}
            {expandedLogo !== null && logoUrls[expandedLogo] && (
              <motion.div
                className="logo-lightbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpandedLogo(null)}
              >
                <motion.div
                  className="logo-lightbox-content"
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src={logoUrls[expandedLogo]} alt={`Logo ${expandedLogo + 1}`} className="logo-lightbox-image" />
                  <div className="logo-lightbox-number">#{expandedLogo + 1}</div>
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={logoAnswers[expandedLogo] || ''}
                    onChange={(e) => handleLogoAnswerChange(expandedLogo, e.target.value)}
                    className="logo-lightbox-input"
                    autoFocus
                  />
                  <div className="logo-lightbox-nav">
                    <button
                      className="logo-lightbox-nav-btn"
                      disabled={expandedLogo === 0}
                      onClick={() => setExpandedLogo(expandedLogo - 1)}
                    >
                      &#9664; Prev
                    </button>
                    <button
                      className="logo-lightbox-close-btn"
                      onClick={() => setExpandedLogo(null)}
                    >
                      Close
                    </button>
                    <button
                      className="logo-lightbox-nav-btn"
                      disabled={expandedLogo >= (currentQuestion.logos || []).length - 1}
                      onClick={() => setExpandedLogo(expandedLogo + 1)}
                    >
                      Next &#9654;
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            <button onClick={handleLogoWallSubmit} className="logo-wall-submit-btn">
              Submit Answers
            </button>
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
