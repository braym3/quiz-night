import React, { useState, useEffect } from 'react';
import './App.css';
import { database } from './index';
import { ref, onValue, set } from 'firebase/database';
import Leaderboard from './components/Leaderboard/Leaderboard';
import PlayerView from './components/PlayerView/PlayerView';
import MasterView from './components/MasterView/MasterView';

export default function MainQuizApp() {
  const [isMaster, setIsMaster] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [playerTab, setPlayerTab] = useState('quiz');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('role') === 'master') {
      setIsMaster(true);
    }
  }, []);

  useEffect(() => {
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

  const renderView = () => {
    if (isMaster) {
      return <MasterView gameState={gameState} players={players} />;
    }

    if (!hasJoined) {
      return (
        <div className="player-input-section">
          <h2>Join the Quiz!</h2>
          <input
            type="text"
            placeholder="Enter your name"
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinQuiz(playerName)}
          />
          <button onClick={() => handleJoinQuiz(playerName)}>Join Quiz</button>
        </div>
      );
    }

    return (
      <div className="player-dashboard">
        <div className="tabs">
          <button 
            className={`tab-button ${playerTab === 'quiz' ? 'active' : ''}`} 
            onClick={() => setPlayerTab('quiz')}
          >
            Quiz
          </button>
          <button 
            className={`tab-button ${playerTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setPlayerTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>
        <div className="tab-content">
          {playerTab === 'quiz' ? (
            <PlayerView playerName={playerName} gameState={gameState} onShowLeaderboard={() => setPlayerTab('leaderboard')} />
          ) : (
            <Leaderboard players={players} />
          )}
        </div>
      </div>
    );
  };

  return <div className={isMaster ? 'App master-mode' : 'App'}>{renderView()}</div>;
}