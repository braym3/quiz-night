// Shared answer checking + scoring, used by PlayerView, MasterView and the
// presenter slides so everyone agrees on what counts as correct.

export const OBJECTIVE_TYPES = ['multiple_choice', 'true_false', 'text_input', 'image_input', 'ordering', 'guess_who'];
export const PARTIAL_TYPES = ['music', 'connections', 'logo_wall'];

// Lowercase, strip accents/punctuation, collapse spaces, drop leading article
export const normalize = (s) => (typeof s === 'string' ? s : '')
  .trim()
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\w\s]/g, '')
  .replace(/\s+/g, ' ')
  .replace(/^(the|a|an) /, '');

export const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
};

// 'exact' | 'close' (typo-distance) | 'wrong'
export const matchQuality = (guess, answer) => {
  const g = normalize(guess);
  const c = normalize(answer);
  if (!g || !c) return 'wrong';
  if (g === c) return 'exact';
  const tolerance = c.length <= 4 ? 1 : c.length <= 9 ? 2 : 3;
  return levenshtein(g, c) <= tolerance ? 'close' : 'wrong';
};

// Fuzzy matches count as correct; the master sees a "close" badge to overrule
export const isTextMatch = (guess, answer) => matchQuality(guess, answer) !== 'wrong';

export const checkCorrect = (q, a) => {
  if (!q) return false;
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
    case 'guess_who':
      return a === q.answer;
    case 'text_input':
    case 'image_input':
      return isTextMatch(a, q.answer);
    case 'ordering':
      return Array.isArray(a) && Array.isArray(q.answer) && JSON.stringify(a) === JSON.stringify(q.answer);
    default:
      return false;
  }
};

// Detailed result for one player's answer.
// => { gain, max, parts: [{ label, ok, pts }] | null }
// 'number' questions return null: they're scored against the whole field.
export const scoreBreakdown = (question, answer) => {
  if (!question) return null;
  const flat = typeof question.points === 'number' ? question.points : 10;

  switch (question.type) {
    case 'multiple_choice':
    case 'true_false':
    case 'text_input':
    case 'image_input':
    case 'ordering':
    case 'guess_who': {
      const ok = checkCorrect(question, answer);
      return { gain: ok ? flat : 0, max: flat, parts: null };
    }
    case 'music': {
      const pa = (answer && typeof answer === 'object') ? answer : {};
      const ca = question.answer || {};
      const pts = (question.points && typeof question.points === 'object')
        ? question.points : { title: 5, artist: 5, decade: 5 };
      const parts = [];
      if (ca.title) parts.push({ label: 'Song', ok: isTextMatch(pa.title, ca.title), pts: pts.title || 5 });
      if (ca.artist) parts.push({ label: 'Artist', ok: isTextMatch(pa.artist, ca.artist), pts: pts.artist || 5 });
      if (ca.decade) parts.push({ label: 'Decade', ok: pa.decade === ca.decade, pts: pts.decade || 5 });
      return {
        gain: parts.reduce((s, p) => s + (p.ok ? p.pts : 0), 0),
        max: parts.reduce((s, p) => s + p.pts, 0),
        parts,
      };
    }
    case 'connections': {
      const groups = Array.isArray(question.connections) ? question.connections : [];
      const perGroup = Math.round(flat / (groups.length || 4));
      const solved = Array.isArray(answer)
        ? answer.filter(g => Array.isArray(g)).map(g => g.map(normalize).sort().join('|'))
        : [];
      const parts = groups.map(g => ({
        label: g.category || 'Group',
        ok: solved.includes((g.words || []).map(normalize).sort().join('|')),
        pts: perGroup,
      }));
      return {
        gain: parts.reduce((s, p) => s + (p.ok ? p.pts : 0), 0),
        max: perGroup * groups.length,
        parts,
      };
    }
    case 'logo_wall': {
      const logos = Array.isArray(question.logos) ? question.logos : [];
      const perLogo = typeof question.points === 'number' ? question.points : 5;
      const a = (answer && typeof answer === 'object') ? answer : {};
      const parts = logos.map((logo, i) => ({
        label: logo.answer || `#${i + 1}`,
        ok: !!(logo.answer && a[i] && isTextMatch(a[i], logo.answer)),
        pts: perLogo,
      }));
      return {
        gain: parts.reduce((s, p) => s + (p.ok ? p.pts : 0), 0),
        max: perLogo * logos.length,
        parts,
      };
    }
    default:
      return null;
  }
};

export const scoreForQuestion = (question, answer) => scoreBreakdown(question, answer)?.gain || 0;

// Nearest-number ("Closest Wins"): closest guess(es) take the points.
// => { [playerName]: points }
export const scoreNumberQuestion = (question, players) => {
  const target = parseFloat(question?.answer);
  if (isNaN(target)) return {};
  const flat = typeof question.points === 'number' ? question.points : 10;
  const guesses = players
    .map(p => ({ name: p.name, g: parseFloat(p.answer) }))
    .filter(x => !isNaN(x.g));
  if (!guesses.length) return {};
  const best = Math.min(...guesses.map(x => Math.abs(x.g - target)));
  const winners = {};
  guesses.forEach(x => {
    if (Math.abs(x.g - target) === best) winners[x.name] = flat;
  });
  return winners;
};

// Has this player submitted anything meaningful?
export const hasAnswered = (player) => {
  const a = player?.answer;
  if (a == null) return false;
  if (typeof a === 'string') return a !== '';
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === 'object') return Object.keys(a).length > 0;
  return !!a;
};
