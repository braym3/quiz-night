import React, { useState, useEffect, useRef } from 'react';
import { database, storage } from '../../index';
import { ref, set, onValue } from 'firebase/database';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import './PlayerView.css';
import { motion, Reorder } from 'framer-motion';
import Icon from '../Icon/Icon';
import Avatar from '../Avatar/Avatar';
import RoundLottie from '../RoundLottie/RoundLottie';
import { playCorrect, playWrong, playLock, playTimesUp } from '../../utils/sounds';
import {
  OBJECTIVE_TYPES, PARTIAL_TYPES, checkCorrect, scoreBreakdown,
  hasAnswered as hasAnsweredShared,
} from '../../utils/scoring';
import { orderedEntries, orderedKeys } from '../../utils/order';

// Haptic feedback helper
const vibrate = (pattern = 10) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// A helper function to shuffle an array
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};

// NYT Connections group colors
const CONNECTION_COLORS = [
  { bg: '#f9df6d', text: '#000' },  // Yellow
  { bg: '#a0c35a', text: '#000' },  // Green
  { bg: '#b0c4ef', text: '#000' },  // Blue
  { bg: '#ba81c5', text: '#000' },  // Purple
];

// Animation variants for the list
const listVariants = {
    visible: { transition: { staggerChildren: 0.3 } },
    hidden: {},
};
const itemVariants = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 20 },
};


const PlayerView = ({ playerName, gameState, onShowLeaderboard, players = [] }) => {
  const [quizContent, setQuizContent] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [orderedAnswer, setOrderedAnswer] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Connections state
  const [selectedWords, setSelectedWords] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [remainingWords, setRemainingWords] = useState([]);
  const [connectionMistakes, setConnectionMistakes] = useState(0);
  // Logo wall state
  const [logoAnswers, setLogoAnswers] = useState({});
  const [logoUrls, setLogoUrls] = useState({});
  const [expandedLogo, setExpandedLogo] = useState(null);
  // Music state
  const [musicAnswer, setMusicAnswer] = useState({ title: '', artist: '', decade: '' });
  // Nearest-number state
  const [numberAnswer, setNumberAnswer] = useState('');
  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);
  // Per-player result feedback
  const [myAnswer, setMyAnswer] = useState(null);
  const [verdict, setVerdict] = useState(null); // 'correct' | 'wrong' | 'partial' | 'number' | 'none'
  const [myBreakdown, setMyBreakdown] = useState(null); // partial-credit detail
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null); // MC/TF/guess-who live selection
  // Lobby extras
  const [pollVote, setPollVote] = useState(null);
  const [lobbyAnswer, setLobbyAnswer] = useState('');
  const [lobbyAnswerSent, setLobbyAnswerSent] = useState(false);
  const [roast, setRoast] = useState(null);
  const scoredRef = useRef(null);

  const isAnswered = (a) => a != null && (Array.isArray(a) ? a.length > 0 : (typeof a === 'string' ? a.trim() !== '' : true));

  // My live record (score/history) as the master updates it
  const me = players.find(p => p.name === playerName);
  const currentQid = gameState?.currentQuestionId;
  const myHistory = me?.history?.[currentQid];

  // Timer countdown + auto-submit when time expires
  useEffect(() => {
    if (!gameState?.timerDeadline) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((gameState.timerDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [gameState?.timerDeadline]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft !== 0 || isSubmitted || !currentQuestion) return;

    // Auto-submit whatever they have
    vibrate([30, 50, 30]);
    playTimesUp();
    const playerAnswerRef = ref(database, `liveGame/players/${playerName}/answer`);

    if (currentQuestion.type === 'logo_wall') {
      // Submit partial logo answers
      const hasAny = Object.values(logoAnswers).some(v => v && v.trim() !== '');
      if (hasAny) set(playerAnswerRef, logoAnswers);
    } else if (currentQuestion.type === 'music') {
      const hasAny = musicAnswer.title || musicAnswer.artist || musicAnswer.decade;
      if (hasAny) set(playerAnswerRef, musicAnswer);
    } else if (currentQuestion.type === 'connections') {
      if (solvedGroups.length > 0) {
        set(playerAnswerRef, solvedGroups.map(g => g.words));
      }
    } else if (currentQuestion.type === 'ordering') {
      set(playerAnswerRef, orderedAnswer);
      set(ref(database, `liveGame/players/${playerName}/answeredAt`), Date.now());
      setMyAnswer(orderedAnswer);
    } else if (currentQuestion.type === 'number') {
      if (numberAnswer.trim() !== '' && !isNaN(parseFloat(numberAnswer))) {
        set(playerAnswerRef, numberAnswer.trim());
        set(ref(database, `liveGame/players/${playerName}/answeredAt`), Date.now());
        setMyAnswer(numberAnswer.trim());
      }
    } else if (currentQuestion.type === 'text_input' || currentQuestion.type === 'image_input') {
      if (answer.trim()) {
        set(playerAnswerRef, answer);
        set(ref(database, `liveGame/players/${playerName}/answeredAt`), Date.now());
        setMyAnswer(answer);
      }
    }
    // MC / true_false / guess_who: if they haven't tapped, nothing to submit

    setIsSubmitted(true);
  }, [timeLeft, isSubmitted, gameState?.currentQuestionId]);

  // Persist streaks so the presenter can celebrate hot runs
  const persistStreak = (nextStreak) => {
    set(ref(database, `liveGame/players/${playerName}/streak`), nextStreak);
    setBestStreak((b) => {
      const nb = Math.max(b, nextStreak);
      if (nb !== b) set(ref(database, `liveGame/players/${playerName}/bestStreak`), nb);
      return nb;
    });
  };

  // Work out this player's result once per question when the answer is revealed
  useEffect(() => {
    const revealing = gameState?.quizStatus === 'reveal' || gameState?.quizStatus === 'moderating';
    if (!revealing || !currentQuestion) return;
    const qid = gameState?.currentQuestionId;
    if (scoredRef.current === qid) return;
    scoredRef.current = qid;

    // Pick a roast for this reveal (used if the answer was wrong)
    const roasts = Array.isArray(quizContent?.roasts) ? quizContent.roasts.filter(Boolean) : [];
    setRoast(roasts.length ? roasts[Math.floor(Math.random() * roasts.length)] : null);

    // Partial-credit types get a per-part breakdown instead of a binary verdict
    if (PARTIAL_TYPES.includes(currentQuestion.type)) {
      if (!isAnswered(myAnswer)) { setVerdict('none'); setStreak(0); persistStreak(0); return; }
      const bd = scoreBreakdown(currentQuestion, myAnswer);
      setMyBreakdown(bd);
      if (bd && bd.gain > 0) {
        setVerdict('partial');
        setCorrectCount((c) => c + 1);
        playCorrect();
      } else {
        setVerdict('wrong'); setStreak(0); persistStreak(0); playWrong();
      }
      return;
    }

    // Nearest-number is scored against the whole field by the master
    if (currentQuestion.type === 'number') {
      setVerdict(isAnswered(myAnswer) ? 'number' : 'none');
      return;
    }

    if (!OBJECTIVE_TYPES.includes(currentQuestion.type)) { setVerdict(null); return; }
    if (!isAnswered(myAnswer)) { setVerdict('none'); setStreak(0); persistStreak(0); return; }
    if (checkCorrect(currentQuestion, myAnswer)) {
      setVerdict('correct');
      setStreak((prev) => { const ns = prev + 1; persistStreak(ns); return ns; });
      setCorrectCount((c) => c + 1);
      playCorrect();
    } else {
      setVerdict('wrong'); setStreak(0); persistStreak(0); playWrong();
    }
  }, [gameState?.quizStatus, gameState?.currentQuestionId, currentQuestion, myAnswer]);

  // Live-follow the active quiz so switching quizzes (or generated rounds,
  // like Guess Who) reaches players immediately
  useEffect(() => {
      let unsubQuiz = null;
      const unsubActive = onValue(ref(database, 'liveGame/activeQuizId'), (activeQuizSnapshot) => {
          if (unsubQuiz) { unsubQuiz(); unsubQuiz = null; }
          if (activeQuizSnapshot.exists()) {
              const quizId = activeQuizSnapshot.val();
              unsubQuiz = onValue(ref(database, `quizzes/${quizId}`), (snapshot) => {
                  setQuizContent(snapshot.exists() ? snapshot.val() : null);
              });
          } else {
              setQuizContent(null);
          }
      });
      return () => {
          unsubActive();
          if (unsubQuiz) unsubQuiz();
      };
  }, []);

  useEffect(() => {
    if (gameState && gameState.currentQuestionId && quizContent) {
      const questionData = quizContent.rounds[gameState.currentRoundId]?.questions[gameState.currentQuestionId];
      if (questionData) {
        setCurrentQuestion(questionData);
        setIsSubmitted(false);
        setAnswer('');
        setMyAnswer(null);
        setVerdict(null);
        setMyBreakdown(null);
        setRoast(null);
        setSelectedChoice(null);

        // Always reset all question-type state to prevent bleed-through
        setOrderedAnswer([]);
        setMusicAnswer({ title: '', artist: '', decade: '' });
        setNumberAnswer('');
        setSelectedWords([]);
        setSolvedGroups([]);
        setRemainingWords([]);
        setConnectionMistakes(0);
        setLogoAnswers({});
        setExpandedLogo(null);

        // Then initialize for the current question type
        if (questionData.type === 'ordering') {
          setOrderedAnswer(shuffleArray([...questionData.options]));
        }

        if (questionData.type === 'connections' && questionData.connections) {
          const allWords = questionData.connections.flatMap(g => g.words).filter(w => w);
          setRemainingWords(shuffleArray([...allWords]));
        }

        if (questionData.type === 'logo_wall' && questionData.logos) {
          setLogoUrls({});
          questionData.logos.forEach((logo, i) => {
            if (logo.imageUrl) {
              const imgRef = storageRef(storage, logo.imageUrl);
              getDownloadURL(imgRef).then(url => {
                setLogoUrls(prev => ({ ...prev, [i]: url }));
              }).catch(err => console.error('Logo load error:', err));
            }
          });
        }
      }
    } else {
        setCurrentQuestion(null);
    }
  }, [gameState, quizContent]);

  // Record when the player locked their answer in (for speed-based scoring)
  const markAnswered = () => set(ref(database, `liveGame/players/${playerName}/answeredAt`), Date.now());

  const handleTextAnswerSubmit = () => {
    if (answer.trim() !== '') {
      vibrate(15); playLock();
      set(ref(database, `liveGame/players/${playerName}/answer`), answer);
      markAnswered();
      setMyAnswer(answer);
      setIsSubmitted(true);
    }
  };

  // Multiple choice / true-false: tap to select, tap again to change until reveal/timeout
  const handleChoiceSubmit = (choice) => {
    if (isSubmitted) return;
    vibrate(15); playLock();
    set(ref(database, `liveGame/players/${playerName}/answer`), choice);
    markAnswered();
    setSelectedChoice(choice);
    setMyAnswer(choice);
    // note: not locked — players can change their pick until the host reveals
  };

  const handleOrderingSubmit = () => {
    vibrate(15); playLock();
    set(ref(database, `liveGame/players/${playerName}/answer`), orderedAnswer);
    markAnswered();
    setMyAnswer(orderedAnswer);
    setIsSubmitted(true);
  };

  // Connections handlers
  const toggleWordSelection = (word) => {
    vibrate(5);
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleConnectionSubmit = () => {
    if (selectedWords.length !== 4 || !currentQuestion?.connections) return;

    // Check if the selected words match any group
    const matchedGroup = currentQuestion.connections.find(group => {
      const groupWords = group.words.map(w => w.toUpperCase());
      const selected = selectedWords.map(w => w.toUpperCase());
      return groupWords.length === selected.length && groupWords.every(w => selected.includes(w));
    });

    if (matchedGroup) {
      vibrate([15, 50, 15]);
      const newSolvedGroups = [...solvedGroups, { ...matchedGroup, colorIndex: solvedGroups.length }];
      setSolvedGroups(newSolvedGroups);
      setRemainingWords(remainingWords.filter(w => !selectedWords.includes(w)));
      setSelectedWords([]);

      // If all groups solved, submit
      if (newSolvedGroups.length === currentQuestion.connections.length) {
        const groupedAnswer = newSolvedGroups.map(g => g.words);
        set(ref(database, `liveGame/players/${playerName}/answer`), groupedAnswer);
        setIsSubmitted(true);
      }
    } else {
      vibrate([30, 30, 30]);
      setConnectionMistakes(prev => prev + 1);
      setSelectedWords([]);
      // Max 4 mistakes = game over, submit what they have
      if (connectionMistakes + 1 >= 4) {
        const groupedAnswer = solvedGroups.map(g => g.words);
        set(ref(database, `liveGame/players/${playerName}/answer`), groupedAnswer);
        setIsSubmitted(true);
      }
    }
  };

  const handleConnectionGiveUp = () => {
    const groupedAnswer = solvedGroups.map(g => g.words);
    set(ref(database, `liveGame/players/${playerName}/answer`), groupedAnswer);
    setIsSubmitted(true);
  };

  // Logo wall handlers
  const handleLogoAnswerChange = (index, value) => {
    setLogoAnswers(prev => ({ ...prev, [index]: value }));
  };

  const handleLogoWallSubmit = () => {
    vibrate(15); playLock();
    set(ref(database, `liveGame/players/${playerName}/answer`), logoAnswers);
    setIsSubmitted(true);
  };

  // Music handlers
  const handleMusicSubmit = () => {
    vibrate(15); playLock();
    set(ref(database, `liveGame/players/${playerName}/answer`), musicAnswer);
    setIsSubmitted(true);
  };

  // Nearest-number handler
  const handleNumberSubmit = () => {
    const v = numberAnswer.trim();
    if (v === '' || isNaN(parseFloat(v))) return;
    vibrate(15); playLock();
    set(ref(database, `liveGame/players/${playerName}/answer`), v);
    markAnswered();
    setMyAnswer(v);
    setIsSubmitted(true);
  };

  // Lobby: vote for tonight's winner
  const handlePollVote = (name) => {
    vibrate(10);
    setPollVote(name);
    set(ref(database, `liveGame/poll/${playerName}`), name);
  };

  // Lobby: secret answer that becomes the Guess Who round
  const handleLobbyAnswerSubmit = () => {
    if (!lobbyAnswer.trim()) return;
    vibrate(15); playLock();
    set(ref(database, `liveGame/lobbyAnswers/${playerName}`), lobbyAnswer.trim());
    setLobbyAnswerSent(true);
  };

  const moveOption = (index, direction) => {
    const newOrder = [...orderedAnswer];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      setOrderedAnswer(newOrder);
    }
  };

  const formatMyAnswer = () => {
    const q = currentQuestion;
    if (!q) return '';
    if (q.type === 'multiple_choice' || q.type === 'true_false') return `${String(myAnswer).toUpperCase()}) ${q.options?.[myAnswer] || ''}`;
    if (q.type === 'text_input' || q.type === 'image_input' || q.type === 'guess_who' || q.type === 'number') return myAnswer;
    return '';
  };

  const renderVerdict = () => {
    if (!verdict) return null;
    const flatPts = typeof currentQuestion?.points === 'number' ? currentQuestion.points : 10;
    // Once the master has scored, show the points actually awarded
    // (speed bonus means the real gain can differ from the flat value)
    const awarded = typeof myHistory?.gain === 'number' ? myHistory.gain : null;

    if (verdict === 'correct') {
      return (
        <motion.div className="pv-verdict" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="pv-result-icon ok"><Icon name="check" size={42} strokeWidth={2.6} /></div>
          <h2 className="pv-result-title pv-ok">Correct!</h2>
          <div className="pv-points">{awarded !== null ? `+${awarded}` : `+${flatPts}`}</div>
          {awarded !== null && awarded < flatPts && awarded > 0 && (
            <div className="pv-points-note">speed bonus applied</div>
          )}
          {streak >= 2 && <div className="pv-streak"><Icon name="flame" size={15} /> {streak} in a row!</div>}
        </motion.div>
      );
    }
    if (verdict === 'partial' && myBreakdown) {
      return (
        <motion.div className="pv-verdict" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className={`pv-result-icon ${myBreakdown.gain === myBreakdown.max ? 'ok' : 'part'}`}>
            <Icon name={myBreakdown.gain === myBreakdown.max ? 'check' : 'star'} size={40} strokeWidth={2.6} />
          </div>
          <h2 className="pv-result-title pv-ok">
            {myBreakdown.gain === myBreakdown.max ? 'Full marks!' : 'Nice — partial credit!'}
          </h2>
          <div className="pv-points">+{awarded !== null ? awarded : myBreakdown.gain}</div>
          <div className="pv-breakdown">
            {myBreakdown.parts?.map((p, i) => (
              <div key={i} className={`pv-breakdown-row ${p.ok ? 'ok' : 'no'}`}>
                <Icon name={p.ok ? 'check' : 'x'} size={14} strokeWidth={2.6} />
                <span className="pv-breakdown-label">{p.label}</span>
                <span className="pv-breakdown-pts">{p.ok ? `+${p.pts}` : '0'}</span>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }
    if (verdict === 'number') {
      const target = parseFloat(currentQuestion?.answer);
      const mine = parseFloat(myAnswer);
      const off = (!isNaN(target) && !isNaN(mine)) ? Math.abs(target - mine) : null;
      const won = awarded !== null && awarded > 0;
      return (
        <motion.div className="pv-verdict" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className={`pv-result-icon ${won ? 'ok' : 'part'}`}>
            <Icon name={won ? 'trophy' : 'numbers'} size={40} strokeWidth={2.4} />
          </div>
          <h2 className={`pv-result-title ${won ? 'pv-ok' : ''}`}>
            {won ? 'Closest guess!' : 'Guess locked'}
          </h2>
          {off !== null && <div className="pv-your-wrong">You guessed {mine} — off by {off % 1 === 0 ? off : off.toFixed(2)}</div>}
          {won && <div className="pv-points">+{awarded}</div>}
          {awarded === null && <div className="pv-points-note">waiting for scores...</div>}
        </motion.div>
      );
    }
    if (verdict === 'wrong') {
      return (
        <motion.div className="pv-verdict" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="pv-result-icon no"><Icon name="x" size={40} strokeWidth={2.6} /></div>
          <h2 className="pv-result-title pv-no">{roast || 'Not this time'}</h2>
          {formatMyAnswer() && <div className="pv-your-wrong">You said: {formatMyAnswer()}</div>}
          {myBreakdown?.parts && (
            <div className="pv-breakdown">
              {myBreakdown.parts.map((p, i) => (
                <div key={i} className={`pv-breakdown-row ${p.ok ? 'ok' : 'no'}`}>
                  <Icon name={p.ok ? 'check' : 'x'} size={14} strokeWidth={2.6} />
                  <span className="pv-breakdown-label">{p.label}</span>
                  <span className="pv-breakdown-pts">{p.ok ? `+${p.pts}` : '0'}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      );
    }
    return (
      <motion.div className="pv-verdict" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="pv-result-icon none"><Icon name="clock" size={38} /></div>
        <h2 className="pv-result-title">No answer this time</h2>
      </motion.div>
    );
  };

  const renderRoundInfo = () => {
    if (!quizContent || !gameState?.currentRoundId || !gameState.currentQuestionId) {
        return null;
    }

    const round = quizContent.rounds[gameState.currentRoundId];
    if (!round) return null;

    const questionsInRound = orderedKeys(round.questions);
    const totalQuestions = questionsInRound.length;
    const currentQuestionIndex = questionsInRound.indexOf(gameState.currentQuestionId);

    const progress = (currentQuestionIndex / totalQuestions) * 100;

    return (
        <div className="round-header">
            <div className="round-header-row">
                <h3 className="round-title">{round.title}</h3>
                <span className="question-counter">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
            </div>
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
  };

  if (!gameState || gameState.quizStatus === 'waiting') {
    // Does this quiz have a Guess Who round that needs a secret answer?
    const guessWhoRound = quizContent
      ? orderedEntries(quizContent.rounds).map(([, r]) => r).find(r => r.type === 'guess_who' && r.prompt)
      : null;
    const others = players.filter(p => p.name !== playerName);

    return <div className="player-view-container centered-view">
        <div className="player-message pv-lobby">
            <h2>Get Ready!</h2>
            <p>The quiz is about to start...</p>

            {guessWhoRound && !lobbyAnswerSent && (
              <motion.div className="pv-lobby-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="pv-lobby-card-title"><Icon name="eye" size={16} /> Psst — secret question</div>
                <p className="pv-lobby-prompt">{guessWhoRound.prompt}</p>
                <input
                  type="text"
                  value={lobbyAnswer}
                  maxLength={120}
                  placeholder="Answer honestly..."
                  onChange={(e) => setLobbyAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLobbyAnswerSubmit()}
                />
                <button className="pv-lobby-submit" onClick={handleLobbyAnswerSubmit} disabled={!lobbyAnswer.trim()}>
                  Lock it in
                </button>
                <p className="pv-lobby-hint">Your answer becomes a round — everyone guesses who said what!</p>
              </motion.div>
            )}
            {guessWhoRound && lobbyAnswerSent && (
              <motion.div className="pv-lobby-card pv-lobby-done" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                <Icon name="check" size={18} /> Secret answer locked in
              </motion.div>
            )}

            {others.length > 0 && (
              <motion.div className="pv-lobby-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="pv-lobby-card-title"><Icon name="trophy" size={16} /> Who's winning tonight?</div>
                <div className="pv-poll-grid">
                  {players.map((p) => (
                    <button
                      key={p.name}
                      className={`pv-poll-option ${pollVote === p.name ? 'selected' : ''}`}
                      onClick={() => handlePollVote(p.name)}
                    >
                      <Avatar value={p.avatar} size={34} alt={p.name} />
                      <span>{p.name === playerName ? 'Me, obviously' : p.name}</span>
                    </button>
                  ))}
                </div>
                {pollVote && <p className="pv-lobby-hint">Vote cast — results on the big screen!</p>}
              </motion.div>
            )}
        </div>
    </div>;
  }

  if (gameState.quizStatus === 'ended') {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const rank = sorted.findIndex(p => p.name === playerName) + 1;
    const me = sorted.find(p => p.name === playerName);
    const total = sorted.length;
    const medalColor = { 1: '#f6c945', 2: '#c4ccd6', 3: '#cd8c52' };
    const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
    return (
      <div className="player-view-container centered-view">
        <motion.div
          className="player-message pv-summary"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="pv-summary-avatar"><Avatar value={me?.avatar} size={84} alt={playerName} /></div>
          <h2>Quiz over!</h2>
          {rank > 0 && (
            <div className="pv-summary-rank">
              {rank <= 3 && <Icon name={rank === 1 ? 'crown' : 'medal'} size={22} style={{ color: medalColor[rank] }} />}
              <span>{rankLabel}{total ? ` of ${total}` : ''}</span>
            </div>
          )}
          <div className="pv-summary-score">{me?.score || 0} pts</div>
          <div className="pv-summary-stats">
            <span><strong>{correctCount}</strong> correct</span>
            <span><strong>{bestStreak}</strong> best streak</span>
          </div>
          <button className="leaderboard-button" onClick={onShowLeaderboard}>Full leaderboard</button>
        </motion.div>
      </div>
    );
  }

  if (gameState.quizStatus === 'reveal' || gameState.quizStatus === 'moderating') {
    // Connections answer reveal
    if (currentQuestion?.type === 'connections' && currentQuestion.connections) {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container connections-reveal">
                    <p>The connections were:</p>
                    <motion.div className="connections-reveal-groups" initial="hidden" animate="visible" variants={listVariants}>
                        {currentQuestion.connections.map((group, i) => (
                            <motion.div
                                key={i}
                                className="connections-reveal-group"
                                style={{ backgroundColor: CONNECTION_COLORS[i % 4].bg, color: CONNECTION_COLORS[i % 4].text }}
                                variants={itemVariants}
                            >
                                <div className="connections-reveal-category">{group.category}</div>
                                <div className="connections-reveal-words">{group.words.join(', ')}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Logo wall answer reveal
    if (currentQuestion?.type === 'logo_wall' && currentQuestion.logos) {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container logo-wall-reveal">
                    <p>The answers were:</p>
                    <motion.div className="logo-reveal-grid" initial="hidden" animate="visible" variants={listVariants}>
                        {currentQuestion.logos.map((logo, i) => (
                            <motion.div key={i} className="logo-reveal-item" variants={itemVariants}>
                                {logoUrls[i] && <img src={logoUrls[i]} alt={logo.answer} className="logo-reveal-image" />}
                                <span className="logo-reveal-name">{logo.answer}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Music answer reveal
    if (currentQuestion?.type === 'music' && currentQuestion.answer) {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container music-reveal">
                    <p>The answer was:</p>
                    <motion.div className="music-reveal-items" initial="hidden" animate="visible" variants={listVariants}>
                        <motion.div className="music-reveal-row" variants={itemVariants}>
                            <span className="music-reveal-label">Song</span>
                            <span className="music-reveal-value">{currentQuestion.answer.title}</span>
                        </motion.div>
                        {currentQuestion.answer.artist && (
                            <motion.div className="music-reveal-row" variants={itemVariants}>
                                <span className="music-reveal-label">Artist</span>
                                <span className="music-reveal-value">{currentQuestion.answer.artist}</span>
                            </motion.div>
                        )}
                        {currentQuestion.answer.decade && (
                            <motion.div className="music-reveal-row" variants={itemVariants}>
                                <span className="music-reveal-label">Decade</span>
                                <span className="music-reveal-value">{currentQuestion.answer.decade}</span>
                            </motion.div>
                        )}
                    </motion.div>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    if (currentQuestion?.type === 'ordering') {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container">
                    {renderVerdict()}
                    <p>The correct order was:</p>
                    <motion.ol className="ordering-answer-list" initial="hidden" animate="visible" variants={listVariants}>
                        {currentQuestion.answer.map((item, index) => (
                            <motion.li key={index} variants={itemVariants}>
                                {index + 1}. {item}
                            </motion.li>
                        ))}
                    </motion.ol>
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Guess Who reveal — show whose secret it was
    if (currentQuestion?.type === 'guess_who') {
        const culprit = players.find(p => p.name === currentQuestion.answer);
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container">
                    {renderVerdict()}
                    <p>It was...</p>
                    <motion.div className="pv-guesswho-reveal" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}>
                        <Avatar value={culprit?.avatar} size={72} alt={currentQuestion.answer} />
                        <h2 className="correct-answer-text">{currentQuestion.answer}</h2>
                    </motion.div>
                    {currentQuestion.quote && <p className="pv-guesswho-quote">"{currentQuestion.quote}"</p>}
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Nearest-number reveal
    if (currentQuestion?.type === 'number') {
        return (
            <div className="player-view-container centered-view">
                <div className="answer-reveal-container">
                    {renderVerdict()}
                    <p>The answer was:</p>
                    <h2 className="correct-answer-text">{currentQuestion.answer}</h2>
                    {currentQuestion?.answerDetails?.detail && (
                        <motion.p className="fun-fact-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                            {currentQuestion.answerDetails.detail}
                        </motion.p>
                    )}
                    <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
                </div>
            </div>
        );
    }

    // Fallback for all other question types
    let correctAnswerText = '';
    if (currentQuestion) {
      if (currentQuestion.options && !Array.isArray(currentQuestion.options)) {
        correctAnswerText = currentQuestion.options[currentQuestion.answer];
      } else {
        correctAnswerText = currentQuestion.answer;
      }
    }

    return (
        <div className="player-view-container centered-view">
            <div className="answer-reveal-container">
                {renderVerdict()}
                <p>The correct answer was:</p>
                <h2 className="correct-answer-text">{correctAnswerText}</h2>
                {currentQuestion?.answerDetails?.detail && (
                    <motion.p
                        className="fun-fact-text"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        {currentQuestion.answerDetails.detail}
                    </motion.p>
                )}
                <button className="leaderboard-button" onClick={onShowLeaderboard}>Show Leaderboard</button>
            </div>
        </div>
    );
  }

  if (gameState.quizStatus === 'round-interstitial') {
    const round = quizContent?.rounds?.[gameState.currentRoundId];
    return (
      <div className="player-view-container centered-view">
        <motion.div
          className="player-message round-interstitial-message"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <RoundLottie type={round?.type} size={130} />
          <h2>{round?.title || 'Next Round'}</h2>
          <p>Get ready!</p>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="player-view-container centered-view">
        <div className="player-message">Loading question...</div>
    </div>;
  }

  const defaultWaitingMessages = [
    "Fingers crossed...",
    "Waiting for the reveal...",
    "Did you nail it?",
    "Confidence level: high",
    "The suspense...",
    "Let's see how you did!",
    "No going back now!",
    "Good luck!",
  ];
  const waitingMessages = (Array.isArray(quizContent?.waitingMessages) && quizContent.waitingMessages.filter(Boolean).length > 0)
    ? quizContent.waitingMessages.filter(Boolean)
    : defaultWaitingMessages;

  const renderInteraction = () => {
    if (isSubmitted) {
        // Stable message per question (not re-rolled every render)
        const seed = (currentQid || '').split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
        const waitMsg = waitingMessages[seed % waitingMessages.length];
        return (
          <motion.div
            className="player-message submitted-message"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <motion.div
              className="submitted-checkmark"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            >
              <Icon name="check" size={30} strokeWidth={2.6} />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Answer Locked In!
            </motion.h3>
            {typeof answer === 'string' && answer.trim() !== '' && (
              <motion.p
                className="submitted-answer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {answer}
              </motion.p>
            )}
            <motion.p
              className="submitted-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {waitMsg}
            </motion.p>
            {players.length > 1 && (
              <motion.div
                className="pv-answer-pile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                <p className="pv-pile-label">Waiting for...</p>
                <div className="pv-pile-row">
                  {players.map((p) => {
                    const done = p.name === playerName || hasAnsweredShared(p);
                    return (
                      <motion.div
                        key={p.name}
                        className={`pv-pile-avatar ${done ? 'done' : 'pending'}`}
                        animate={done ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0.45 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        title={p.name}
                      >
                        <Avatar value={p.avatar} size={38} alt={p.name} />
                        {done && <span className="pv-pile-tick"><Icon name="check" size={11} strokeWidth={3} /></span>}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
    }

    switch(currentQuestion.type) {
      case 'multiple_choice':
      case 'true_false':
        return (
          <div className="answer-options">
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <button
                key={key}
                className={`option-btn option-${key} ${selectedChoice === key ? 'selected' : ''}`}
                onClick={() => handleChoiceSubmit(key)}
              >
                <span className="option-label">{key.toUpperCase()}</span>
                <span className="option-text">{value}</span>
                {selectedChoice === key && <span className="option-check"><Icon name="check" size={18} /></span>}
              </button>
            ))}
            <p className="answer-hint">
              {selectedChoice ? 'Locked in — tap another to change' : 'Tap your answer'}
            </p>
          </div>
        );

      case 'ordering':
        return (
          <div className="ordering-section">
            <p className="answer-hint ordering-hint">Drag to reorder (or use the arrows)</p>
            <Reorder.Group axis="y" values={orderedAnswer} onReorder={setOrderedAnswer} className="ordering-list" as="ul">
              {orderedAnswer.map((item, index) => (
                <Reorder.Item key={item} value={item} className="ordering-item" as="li" whileDrag={{ scale: 1.03, boxShadow: '0 8px 22px rgba(0,0,0,0.25)' }}>
                  <span className="ordering-grip">⠿</span>
                  <span className="ordering-text">{item}</span>
                  <div className="ordering-controls">
                    <button onClick={() => moveOption(index, -1)} disabled={index === 0} aria-label="Move up">&#9650;</button>
                    <button onClick={() => moveOption(index, 1)} disabled={index === orderedAnswer.length - 1} aria-label="Move down">&#9660;</button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <button onClick={handleOrderingSubmit}>Submit Order</button>
          </div>
        );

      case 'number':
        return (
          <div className="number-section">
            <p className="answer-hint">Closest guess wins the points!</p>
            <input
              type="number"
              inputMode="decimal"
              className="number-input"
              placeholder="Your best guess..."
              value={numberAnswer}
              onChange={(e) => setNumberAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNumberSubmit()}
            />
            <button onClick={handleNumberSubmit} disabled={numberAnswer.trim() === '' || isNaN(parseFloat(numberAnswer))}>
              Lock In Guess
            </button>
          </div>
        );

      case 'guess_who':
        return (
          <div className="guesswho-section">
            {currentQuestion.quote && <div className="guesswho-quote">"{currentQuestion.quote}"</div>}
            <div className="guesswho-grid">
              {players.map((p) => (
                <button
                  key={p.name}
                  className={`guesswho-option ${selectedChoice === p.name ? 'selected' : ''}`}
                  onClick={() => handleChoiceSubmit(p.name)}
                >
                  <Avatar value={p.avatar} size={40} alt={p.name} />
                  <span className="guesswho-name">{p.name}</span>
                  {selectedChoice === p.name && <span className="option-check"><Icon name="check" size={16} /></span>}
                </button>
              ))}
            </div>
            <p className="answer-hint">
              {selectedChoice ? 'Locked in — tap another to change' : 'Who said it?'}
            </p>
          </div>
        );

      case 'connections':
        return (
          <div className="connections-section">
            {/* Solved groups at the top */}
            {solvedGroups.length > 0 && (
              <div className="connections-solved">
                {solvedGroups.map((group, i) => (
                  <motion.div
                    key={i}
                    className="connections-solved-group"
                    style={{ backgroundColor: CONNECTION_COLORS[group.colorIndex % 4].bg, color: CONNECTION_COLORS[group.colorIndex % 4].text }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <div className="connections-solved-category">{group.category}</div>
                    <div className="connections-solved-words">{group.words.join(', ')}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Word grid */}
            <div className="connections-grid">
              {remainingWords.map((word, i) => (
                <motion.button
                  key={word}
                  className={`connections-word ${selectedWords.includes(word) ? 'selected' : ''}`}
                  onClick={() => toggleWordSelection(word)}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  {word}
                </motion.button>
              ))}
            </div>

            {/* Mistakes indicator */}
            <div className="connections-mistakes">
              <span>Mistakes remaining: </span>
              {[...Array(4 - connectionMistakes)].map((_, i) => (
                <span key={i} className="mistake-dot active">&#9679;</span>
              ))}
              {[...Array(connectionMistakes)].map((_, i) => (
                <span key={i} className="mistake-dot used">&#9679;</span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="connections-actions">
              <button
                className="connections-submit-btn"
                disabled={selectedWords.length !== 4}
                onClick={handleConnectionSubmit}
              >
                Submit ({selectedWords.length}/4)
              </button>
              <button
                className="connections-deselect-btn"
                onClick={() => setSelectedWords([])}
                disabled={selectedWords.length === 0}
              >
                Deselect All
              </button>
              <button
                className="connections-giveup-btn"
                onClick={handleConnectionGiveUp}
              >
                Give Up
              </button>
            </div>
          </div>
        );

      case 'music':
        return (
          <div className="music-section">
            <div className="music-field">
              <label className="music-field-label">Song Title</label>
              <input
                type="text"
                placeholder="What's the song called?"
                value={musicAnswer.title}
                onChange={(e) => setMusicAnswer(prev => ({ ...prev, title: e.target.value }))}
                className="music-input"
              />
            </div>
            {currentQuestion.answer?.artist && (
            <div className="music-field">
              <label className="music-field-label">Artist</label>
              <input
                type="text"
                placeholder="Who sings it?"
                value={musicAnswer.artist}
                onChange={(e) => setMusicAnswer(prev => ({ ...prev, artist: e.target.value }))}
                className="music-input"
              />
            </div>
            )}
            {currentQuestion.answer?.decade && (
            <div className="music-field">
              <label className="music-field-label">Decade</label>
              <div className="music-decades">
                {['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map(d => (
                  <button
                    key={d}
                    className={`music-decade-btn ${musicAnswer.decade === d ? 'active' : ''}`}
                    onClick={() => setMusicAnswer(prev => ({ ...prev, decade: prev.decade === d ? '' : d }))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            )}
            <button onClick={handleMusicSubmit} className="music-submit-btn">
              Submit Answer
            </button>
          </div>
        );

      case 'logo_wall':
        return (
          <div className="logo-wall-section">
            <div className="logo-wall-grid">
              {(currentQuestion.logos || []).map((logo, i) => (
                <div key={i} className="logo-wall-item">
                  <div
                    className="logo-wall-image-container"
                    onClick={() => setExpandedLogo(i)}
                  >
                    {logoUrls[i] ? (
                      <img src={logoUrls[i]} alt={`Logo ${i + 1}`} className="logo-wall-image" />
                    ) : (
                      <div className="logo-wall-placeholder">?</div>
                    )}
                    <div className="logo-wall-tap-hint">Tap to zoom</div>
                    <div className="logo-wall-badge">{i + 1}</div>
                  </div>
                  <input
                    type="text"
                    placeholder={`Name...`}
                    value={logoAnswers[i] || ''}
                    onChange={(e) => handleLogoAnswerChange(i, e.target.value)}
                    className="logo-wall-input"
                  />
                </div>
              ))}
            </div>

            {/* Expanded logo lightbox */}
            {expandedLogo !== null && logoUrls[expandedLogo] && (
              <motion.div
                className="logo-lightbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpandedLogo(null)}
              >
                <motion.div
                  className="logo-lightbox-content"
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src={logoUrls[expandedLogo]} alt={`Logo ${expandedLogo + 1}`} className="logo-lightbox-image" />
                  <div className="logo-lightbox-number">#{expandedLogo + 1}</div>
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={logoAnswers[expandedLogo] || ''}
                    onChange={(e) => handleLogoAnswerChange(expandedLogo, e.target.value)}
                    className="logo-lightbox-input"
                    autoFocus
                  />
                  <div className="logo-lightbox-nav">
                    <button
                      className="logo-lightbox-nav-btn"
                      disabled={expandedLogo === 0}
                      onClick={() => setExpandedLogo(expandedLogo - 1)}
                    >
                      &#9664; Prev
                    </button>
                    <button
                      className="logo-lightbox-close-btn"
                      onClick={() => setExpandedLogo(null)}
                    >
                      Close
                    </button>
                    <button
                      className="logo-lightbox-nav-btn"
                      disabled={expandedLogo >= (currentQuestion.logos || []).length - 1}
                      onClick={() => setExpandedLogo(expandedLogo + 1)}
                    >
                      Next &#9654;
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            <button onClick={handleLogoWallSubmit} className="logo-wall-submit-btn">
              Submit Answers
              <span className="logo-wall-progress">
                ({Object.values(logoAnswers).filter(v => v && v.trim() !== '').length}/{(currentQuestion.logos || []).length})
              </span>
            </button>
          </div>
        );

      default:
        return (
          <div className="text-input-section">
            {currentQuestion.imageUrl && <img src={currentQuestion.imageUrl} alt="Quiz question" className="question-image"/>}
            <input
              type="text"
              placeholder="Your answer..."
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextAnswerSubmit()}
            />
            <button onClick={handleTextAnswerSubmit}>
              Submit Answer
            </button>
          </div>
        );
    }
  };

  return (
    <div className="player-view-container">
        {renderRoundInfo()}
        {timeLeft !== null && timeLeft > 0 && !isSubmitted && (
            <div className={`player-timer ${timeLeft <= 5 ? 'player-timer-urgent' : ''}`}>
                <span className="player-timer-number">{timeLeft}</span>
                <div className="player-timer-bar">
                    <div className="player-timer-fill" style={{ width: `${(timeLeft / (gameState?.timerDuration || 30)) * 100}%` }} />
                </div>
            </div>
        )}
        {timeLeft === 0 && (
            <motion.div
                className="player-times-up"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
            >
                <Icon name="clock" size={20} /> Time's Up!
            </motion.div>
        )}
        <div className="question-section">
            <p className="question-text">{currentQuestion.text}</p>
        </div>
        <div className="interaction-section">
            {renderInteraction()}
        </div>
    </div>
  );
};

export default PlayerView;
