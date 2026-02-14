import React from 'react';
import { motion } from 'framer-motion';
import './Leaderboard.css';

const Leaderboard = ({ players, currentPlayer }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const getMedalEmoji = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}.`;
    }
  };

  return (
    <div className="leaderboard-container">
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        🏆 Leaderboard
      </motion.h1>
      <motion.ul
        className="leaderboard-list"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {players.map((player, index) => {
          const rank = index + 1;
          const isCurrentPlayer = player.name === currentPlayer;
          const isTopThree = rank <= 3;

          return (
            <motion.li
              key={player.name}
              className={`leaderboard-item ${isTopThree ? `top-${rank}` : ''} ${isCurrentPlayer ? 'current-player' : ''}`}
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="player-rank">{getMedalEmoji(rank)}</span>
              <span className="player-name">
                {player.name}
                {isCurrentPlayer && <span className="you-badge">YOU</span>}
              </span>
              <motion.span
                className="player-score"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: index * 0.1 + 0.2 }}
              >
                {player.score || 0}
              </motion.span>
            </motion.li>
          );
        })}
      </motion.ul>
      {players.length === 0 && (
        <motion.p
          className="no-players"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          No players yet. Be the first to join!
        </motion.p>
      )}
    </div>
  );
};

export default Leaderboard;
