import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { database } from './index';
import { ref, onValue, set, get } from 'firebase/database';
import Leaderboard from './components/Leaderboard/Leaderboard';
import PlayerView from './components/PlayerView/PlayerView';
import MasterView from './components/MasterView/MasterView';
import QuizBuilder from './components/QuizBuilder/QuizBuilder';
import { applyTheme, getTheme } from './utils/themes';
import { loadAvatarManifest } from './utils/avatars';
import Avatar from './components/Avatar/Avatar';
import Icon from './components/Icon/Icon';
import { isSoundOn, setSoundOn as persistSound } from './utils/sounds';
import { motion, AnimatePresence } from 'framer-motion';

const AVATAR_EMOJIS = ['😎', '🤓', '🦊', '🐱', '🦄', '🐸', '🦋', '🎸', '🌟', '🍕', '🎯', '🚀', '🌈', '🎨', '🎵', '🏆'];

export default function MainQuizApp() {
  const [isMaster, setIsMaster] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [playerTab, setPlayerTab] = useState('quiz');
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('fun-and-sparkly');
  const [activeQuizInfo, setActiveQuizInfo] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [soundOn, setSoundOn] = useState(isSoundOn());

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('role') === 'master') {
      setIsMaster(true);
    }
  }, []);

  // Load avatar set and default to the first one
  useEffect(() => {
    loadAvatarManifest().then((list) => {
      setAvatars(list);
      if (list.length > 0) setPlayerAvatar(list[0].file);
    });
  }, []);

  // Pre-fill the name field from a previous session
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('qn_player') || 'null');
      if (saved?.name) setPlayerName(saved.name);
    } catch { /* ignore */ }
  }, []);

  // Auto-rejoin: if a saved player is still in the live game, restore their session
  const rejoinedRef = useRef(false);
  useEffect(() => {
    if (isMaster || hasJoined || rejoinedRef.current) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('qn_player') || 'null'); } catch { /* ignore */ }
    if (!saved?.name) return;
    if (players.some(p => p.name === saved.name)) {
      rejoinedRef.current = true;
      setPlayerName(saved.name);
      if (saved.avatar) setPlayerAvatar(saved.avatar);
      setHasJoined(true);
    }
  }, [players, isMaster, hasJoined]);

  // Firebase connection status
  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    const unsubConn = onValue(connectedRef, (snap) => {
      setIsOnline(snap.val() === true);
    });
    return unsubConn;
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
          const theme = quiz.theme || 'fun-and-sparkly';

          setCurrentTheme(theme);
          setActiveQuizInfo({
            id: quizId,
            title: quiz.title,
            theme: theme,
            themeName: getTheme(theme).name
          });

          // Apply theme immediately without reload
          applyTheme(theme, isMaster ? 'master' : 'player');
        }
      } else {
        setActiveQuizInfo(null);
        applyTheme('fun-and-sparkly', isMaster ? 'master' : 'player');
      }
    });

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

    return unsubscribe;
  }, [isMaster]);

  const handleJoinQuiz = (name) => {
    if (name.trim() === '') {
      setJoinError('Please enter your name');
      return;
    }
    const sanitizedName = name.trim();
    if (sanitizedName.length > 20) {
      setJoinError('Name must be 20 characters or less');
      return;
    }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('qn_player') || 'null'); } catch { /* ignore */ }
    const isOwnName = saved?.name && saved.name.toLowerCase() === sanitizedName.toLowerCase();
    const existingPlayer = players.find(p => p.name.toLowerCase() === sanitizedName.toLowerCase());
    // Block taken names — unless it's the player's own previous session (rejoin)
    if (existingPlayer && !isOwnName) {
      setJoinError('That name is already taken!');
      return;
    }
    setJoinError('');
    setPlayerName(sanitizedName);
    if (existingPlayer && isOwnName) {
      // Rejoin: keep their score/answer, just refresh the avatar
      set(ref(database, `liveGame/players/${sanitizedName}/avatar`), playerAvatar);
    } else {
      set(ref(database, `liveGame/players/${sanitizedName}`), { score: 0, answer: '', avatar: playerAvatar });
    }
    try { localStorage.setItem('qn_player', JSON.stringify({ name: sanitizedName, avatar: playerAvatar })); } catch { /* ignore */ }
    setHasJoined(true);
  };

  const renderMasterView = () => (
      <>
        <div className="master-header">
          <div className="master-title-section">
            <h1 className="master-title">Quiz Master</h1>
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
            <Icon name="book" size={18} /> Manage Quizzes
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
        <motion.div
            className="join-icon"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        >
          <span className="join-icon-badge"><Icon name="sparkles" size={40} /></span>
        </motion.div>
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
            <motion.div
                className="join-quiz-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
              <span className="join-quiz-title">{activeQuizInfo.title}</span>
            </motion.div>
        )}
        {players.length > 0 && (
            <motion.div
                className="join-player-count"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
            >
              {players.length} player{players.length !== 1 ? 's' : ''} already in
            </motion.div>
        )}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
          <div className="avatar-picker">
            <span className="avatar-label">Pick your avatar</span>
            <div className="avatar-grid">
              {(avatars.length > 0 ? avatars : AVATAR_EMOJIS.map(e => ({ file: e, label: e }))).map(({ file, label }) => (
                <motion.button
                    key={file}
                    className={`avatar-option ${playerAvatar === file ? 'selected' : ''}`}
                    onClick={() => setPlayerAvatar(file)}
                    whileTap={{ scale: 0.85 }}
                    title={label}
                    type="button"
                >
                  <Avatar value={file} size={44} alt={label} />
                </motion.button>
              ))}
            </div>
          </div>
          <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setJoinError(''); }}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinQuiz(playerName)}
              maxLength={20}
              autoFocus
          />
          {joinError && (
              <motion.div
                  className="join-error"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
              >
                {joinError}
              </motion.div>
          )}
          <motion.button
              onClick={() => handleJoinQuiz(playerName)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="join-button"
          >
            <Avatar value={playerAvatar} size={26} alt="" /> Let's Go!
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
          <button
              className="sound-toggle"
              onClick={() => { const next = !soundOn; setSoundOn(next); persistSound(next); }}
              aria-label={soundOn ? 'Mute sounds' : 'Unmute sounds'}
              title={soundOn ? 'Mute sounds' : 'Unmute sounds'}
          >
            <Icon name={soundOn ? 'volume' : 'volume-off'} size={20} />
          </button>
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
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                className="offline-banner"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="offline-icon"><Icon name="bolt" size={16} /></span>
                <span>Connection lost — reconnecting...</span>
              </motion.div>
            )}
          </AnimatePresence>
          {renderView()}
        </div>
        <AnimatePresence>
          {showQuizBuilder && (
              <QuizBuilder
                  onClose={() => setShowQuizBuilder(false)}
                  activeTheme={currentTheme}
              />
          )}
        </AnimatePresence>
      </>
  );
}