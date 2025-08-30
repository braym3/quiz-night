import React from 'react';
import './Leaderboard.css';

const Leaderboard = ({ players }) => {
  // A message to show when no players have joined
  if (!players || players.length === 0) {
    return (
      <div className="leaderboard-container">
        <h1>Leaderboard</h1>
        <p className="no-players-message">No players have joined yet. Be the first!</p>
      </div>
    );
  }
  
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="leaderboard-container">
      <h1>Leaderboard</h1>
      <ul className="leaderboard-list">
        {players.map((player, index) => (
          <li 
            key={index} 
            className={`leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}`}
          >
            <div className="player-rank">
              <span className="rank-number">{index + 1}.</span>
              {medals[index] && <span className="medal">{medals[index]}</span>}
            </div>
            <span className="player-name">{player.name}</span>
            <span className="player-score">{player.score} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;