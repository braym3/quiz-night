import React, { useState } from 'react';
import './Avatar.css';
import { avatarUrl, isImageAvatar } from '../../utils/avatars';

const PersonFallback = () => (
  <svg className="qn-avatar__person" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="9" r="3.4" />
    <path d="M5.5 20a6.5 6.5 0 0113 0" />
  </svg>
);

// Renders a player's avatar as a circular image. Falls back to a legacy emoji
// (if the stored value is one) or a neutral person icon — never a broken image.
export default function Avatar({ value, size = 40, alt = '', className = '' }) {
  const [broken, setBroken] = useState(false);
  const dim = typeof size === 'number' ? `${size}px` : size;

  if (isImageAvatar(value) && !broken) {
    return (
      <span className={`qn-avatar ${className}`} style={{ width: dim, height: dim }}>
        <img src={avatarUrl(value)} alt={alt} loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  }

  // Legacy players may have stored an emoji string — keep showing it.
  if (value && !isImageAvatar(value)) {
    return (
      <span className={`qn-avatar qn-avatar--emoji ${className}`}
            style={{ width: dim, height: dim, fontSize: `calc(${dim} * 0.62)` }}>
        {value}
      </span>
    );
  }

  return (
    <span className={`qn-avatar qn-avatar--fallback ${className}`} style={{ width: dim, height: dim }}>
      <PersonFallback />
    </span>
  );
}
