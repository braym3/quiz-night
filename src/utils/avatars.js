// Avatar manifest loading + URL helpers.
// Images live in public/avatars/ and are listed in public/avatars/manifest.json.

const BASE = `${process.env.PUBLIC_URL || ''}/avatars`;
const IMG_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

export const avatarUrl = (file) => `${BASE}/${file}`;

// A stored avatar value is an image if it looks like a filename; otherwise
// it's treated as an emoji (legacy players) or falls back to a default.
export const isImageAvatar = (value) => typeof value === 'string' && IMG_RE.test(value);

export async function loadAvatarManifest() {
  try {
    const res = await fetch(`${BASE}/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.avatars) ? data.avatars : [];
  } catch {
    return [];
  }
}
