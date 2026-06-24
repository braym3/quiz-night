import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar/Avatar';
import Icon from '../Icon/Icon';
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

  const MEDAL_COLORS = { 1: '#f6c945', 2: '#c4ccd6', 3: '#cd8c52' };
  const renderRank = (rank) => {
    if (rank === 1) return <Icon name="crown" size={26} style={{ color: MEDAL_COLORS[1] }} title="1st" />;
    if (rank === 2 || rank === 3) return <Icon name="medal" size={24} style={{ color: MEDAL_COLORS[rank] }} title={`${rank}${rank === 2 ? 'nd' : 'rd'}`} />;
    return `${rank}`;
  };

  return (
    <div className="leaderboard-container">
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <Icon name="trophy" size={26} /> Leaderboard
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
              layout
              className={`leaderboard-item ${isTopThree ? `top-${rank}` : ''} ${isCurrentPlayer ? 'current-player' : ''}`}
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="player-rank">{renderRank(rank)}</span>
              <span className="player-name">
                <span className="leaderboard-avatar"><Avatar value={player.avatar} size={36} alt={player.name} /></span>
                {player.name}
                {isCurrentPlayer && <span className="you-badge">YOU</span>}
              </span>
              <motion.span
                className="player-score"
                key={player.score}
                initial={{ scale: 1.3, color: '#28a745' }}
                animate={{ scale: 1, color: 'var(--primary, #9669ff)' }}
                transition={{ type: 'spring', stiffness: 200 }}
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
