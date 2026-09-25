import React from 'react';
import Lottie from 'lottie-react';
import musicAnimation from '../../assets/lottie/music-animation.json';
import knowledgeAnimation from '../../assets/lottie/knowledge-animation.json';
import photoAnimation from '../../assets/lottie/photo-animation.json';
import geographyAnimation from '../../assets/lottie/geography-animation.json';
import RoundScene, { roundScenes } from './RoundScenes';

// Maps a round's `type` to its Lottie animation. Shared by the player,
// master and presenter round intros so there's a single source of truth.
const lottieMap = {
  music: musicAnimation,
  knowledge: knowledgeAnimation,
  picture: photoAnimation,
  geography: geographyAnimation,
};

// Rounds with no explicit `animation` still get a scene for these types
const defaultSceneForType = {
  connections: 'connections',
};

// `animation` (optional, set per round) picks a specific Lottie or scene;
// otherwise it falls back to the round type.
export default function RoundLottie({ type, animation, size = 140, style, className }) {
  const dim = typeof size === 'number' ? `${size}px` : size;
  const sceneName = roundScenes[animation] ? animation : (!lottieMap[animation] && defaultSceneForType[type]);
  if (sceneName) return <RoundScene name={sceneName} size={dim} style={style} className={className} />;
  const animationData = lottieMap[animation] || lottieMap[type];
  if (!animationData) return null;
  return (
    <Lottie
      animationData={animationData}
      loop
      className={className}
      style={{ width: dim, height: dim, margin: '0 auto', ...style }}
    />
  );
}
