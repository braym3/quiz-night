import React, { useState, useEffect } from 'react';
import './App.css';
import { database } from './index';
import { ref, onValue, set, get } from 'firebase/database';
import Leaderboard from './components/Leaderboard/Leaderboard';
import PlayerView from './components/PlayerView/PlayerView';
import MasterView from './components/MasterView/MasterView';
import QuizBuilder from './components/QuizBuilder/QuizBuilder';
import { applyTheme, getTheme } from './utils/themes';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainQuizApp() {
  const [isMaster, setIsMaster] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [playerTab, setPlayerTab] = useState('quiz');
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('fun-and-sparkly');
  const [activeQuizInfo, setActiveQuizInfo] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('role') === 'master') {
      setIsMaster(true);
    }
  }, []);

  useEffect(() => {
    // Load active quiz and apply its theme
    const loadActiveQuiz = async () => {
      const activeQuizIdRef = ref(database, 'liveGame/activeQuizId');

      // Listen for changes to active quiz
      const unsubscribe = onValue(activeQuizIdRef, async (snapshot) => {
        if (snapshot.exists()) {
          const quizId = snapshot.val();
          const quizRef = ref(database, `quizzes/${quizId}`);
          const quizSnapshot = await get(quizRef);

          if (quizSnapshot.exists()) {
            const quiz = quizSnapshot.val();
            const theme = quiz.theme || 'fun-and-sparkly';

            setCurrentTheme(theme);
            setActiveQuizInfo({
              id: quizId,
              title: quiz.title,
              theme: theme,
              themeName: getTheme(theme).name
            });

            // Apply theme immediately
            applyTheme(theme, 'player');
          }
        } else {
          // No active quiz, use default theme
          setActiveQuizInfo(null);
          applyTheme('fun-and-sparkly', 'player');
        }
      });

      return unsubscribe;
    };

    loadActiveQuiz();

    const gameStateRef = ref(database, 'liveGame/gameState');
    onValue(gameStateRef, (snapshot) => {
      const state = snapshot.val();
      if (state) {
        setGameState(state);
      }
    });

    const playersRef = ref(database, 'liveGame/players');
    onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const playersData = snapshot.val();
        const playersArray = Object.entries(playersData).map(([name, data]) => ({
          name,
          ...data,
        }));
        playersArray.sort((a, b) => (b.score || 0) - (a.score || 0));
        setPlayers(playersArray);
      } else {
        setPlayers([]);
      }
    });
  }, [isMaster]);

  const handleJoinQuiz = (name) => {
    if (name.trim() === '') return;
    const sanitizedName = name.trim();
    setPlayerName(sanitizedName);
    set(ref(database, `liveGame/players/${sanitizedName}`), { score: 0, answer: '' });
    setHasJoined(true);
  };

  const renderMasterView = () => (
      <>
        <div className="master-header">
          <div className="master-title-section">
            <h1 className="master-title">Quiz Master Dashboard</h1>
            {activeQuizInfo && (
                <div className="active-quiz-indicator">
                  <span className="active-quiz-title">{activeQuizInfo.title}</span>
                  <span className="active-quiz-theme">{activeQuizInfo.themeName}</span>
                </div>
            )}
          </div>
          <button
              onClick={() => setShowQuizBuilder(true)}
              className="quiz-builder-toggle"
          >
            📚 Manage Quizzes
          </button>
        </div>
        <MasterView gameState={gameState} players={players} />
      </>
  );

  const renderPlayerJoin = () => (
      <motion.div
          className="player-input-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
      >
        <motion.h2
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200
            }}
        >
          Join the Quiz!
        </motion.h2>
        {activeQuizInfo && (
            <motion.p
                className="quiz-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
              Playing: <strong>{activeQuizInfo.title}</strong>
            </motion.p>
        )}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
          <input
              type="text"
              placeholder="Enter your name"
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinQuiz(playerName)}
              autoFocus
          />
          <motion.button
              onClick={() => handleJoinQuiz(playerName)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
          >
            Join Quiz
          </motion.button>
        </motion.div>
      </motion.div>
  );

  const renderPlayerDashboard = () => (
      <div className="player-dashboard">
        <div className="tabs">
          <motion.button
              className={`tab-button ${playerTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setPlayerTab('quiz')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
          >
            Quiz
          </motion.button>
          <motion.button
              className={`tab-button ${playerTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setPlayerTab('leaderboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
          >
            Leaderboard
          </motion.button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
              key={playerTab}
              className="tab-content"
              initial={{ opacity: 0, x: playerTab === 'quiz' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: playerTab === 'quiz' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
          >
            {playerTab === 'quiz' ? (
                <PlayerView playerName={playerName} gameState={gameState} onShowLeaderboard={() => setPlayerTab('leaderboard')} />
            ) : (
                <Leaderboard players={players} currentPlayer={playerName} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
  );

  const renderView = () => {
    if (isMaster) {
      return renderMasterView();
    }

    if (!hasJoined) {
      return renderPlayerJoin();
    }

    return renderPlayerDashboard();
  };

  return (
      <>
        <div className={isMaster ? 'App master-mode' : 'App'}>
          {renderView()}
        </div>
        <AnimatePresence>
          {showQuizBuilder && (
              <QuizBuilder
                  onClose={() => setShowQuizBuilder(false)}
                  onQuizActivated={(quizId, theme) => {
                    // Theme will be auto-applied by the listener above
                    setShowQuizBuilder(false);
                  }}
              />
          )}
        </AnimatePresence>
      </>
  );
}