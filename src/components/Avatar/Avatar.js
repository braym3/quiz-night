import React from 'react';
import './Avatar.css';
import { avatarUrl, isImageAvatar } from '../../utils/avatars';

// Renders a player's avatar as a circular image, falling back to an emoji
// (legacy players) or a neutral default. `size` can be a number (px) or any
// CSS length string (e.g. a clamp() for the TV presenter view).
export default function Avatar({ value, size = 40, alt = '', className = '' }) {
  const dim = typeof size === 'number' ? `${size}px` : size;

  if (isImageAvatar(value)) {
    return (
      <span className={`qn-avatar ${className}`} style={{ width: dim, height: dim }}>
        <img
          src={avatarUrl(value)}
          alt={alt}
          loading="lazy"
          onError={(e) => { e.currentTarget.parentElement.classList.add('qn-avatar--broken'); }}
        />
      </span>
    );
  }

  return (
    <span
      className={`qn-avatar qn-avatar--emoji ${className}`}
      style={{ width: dim, height: dim, fontSize: `calc(${dim} * 0.62)` }}
    >
      {value || '🙂'}
    </span>
  );
}
