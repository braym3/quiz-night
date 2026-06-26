import React from 'react';
import Lottie from 'lottie-react';
import musicAnimation from '../../assets/lottie/music-animation.json';
import knowledgeAnimation from '../../assets/lottie/knowledge-animation.json';
import photoAnimation from '../../assets/lottie/photo-animation.json';
import geographyAnimation from '../../assets/lottie/geography-animation.json';

// Maps a round's `type` to its Lottie animation. Shared by the player,
// master and presenter round intros so there's a single source of truth.
const lottieMap = {
  music: musicAnimation,
  knowledge: knowledgeAnimation,
  picture: photoAnimation,
  geography: geographyAnimation,
};

export default function RoundLottie({ type, size = 140, style, className }) {
  const animationData = lottieMap[type];
  if (!animationData) return null;
  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <Lottie
      animationData={animationData}
      loop
      className={className}
      style={{ width: dim, height: dim, margin: '0 auto', ...style }}
    />
  );
}
