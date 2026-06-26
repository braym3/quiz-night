import React, { useState, useEffect } from 'react';
import { database, storage } from '../../index';
import { ref as dbRef, set, get, push, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import './QuizBuilder.css';
import { themes, applyTheme } from '../../utils/themes';
import Icon from '../Icon/Icon';

const uid = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const QuizBuilder = ({ onClose, activeTheme }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [currentView, setCurrentView] = useState('list');
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [media, setMedia] = useState({ audio: [], logos: [], celebs: [], flags: [], memes: [] });
  const [questionBank, setQuestionBank] = useState({});
  const [roundBank, setRoundBank] = useState({});
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankFilter, setBankFilter] = useState('all');
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState([]); // array of question ids
  const [addToBank, setAddToBank] = useState(true);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [mediaPicker, setMediaPicker] = useState(null); // { title, groups, onPick }
  const [mpTab, setMpTab] = useState(0);
  const [showRoundBank, setShowRoundBank] = useState(false);
  const [generator, setGenerator] = useState(null); // { category, count }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Live preview: apply theme whenever currentQuiz.theme changes in edit view
  useEffect(() => {
    if (currentView === 'edit' && currentQuiz?.theme) {
      applyTheme(currentQuiz.theme, 'master');
    }
  }, [currentQuiz?.theme, currentView]);

  const questionTypes = [
    { id: 'text_input', name: 'Text Input', icon: 'text' },
    { id: 'multiple_choice', name: 'Multiple Choice', icon: 'list' },
    { id: 'true_false', name: 'True/False', icon: 'true-false' },
    { id: 'image_input', name: 'Image Question', icon: 'image' },
    { id: 'ordering', name: 'Order Items', icon: 'numbers' },
    { id: 'music', name: 'Music Round', icon: 'music' },
    { id: 'connections', name: 'Connections', icon: 'link' },
    { id: 'logo_wall', name: 'Logo Wall', icon: 'grid' },
  ];
  const typeIcon = (id) => questionTypes.find(t => t.id === id)?.icon || 'text';
  const prettyCategory = (c) => (c || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  useEffect(() => {
    loadQuizzes();
    loadMediaLibrary();
    loadQuestionBank();
    loadRoundBank();
  }, []);

  const loadQuestionBank = async () => {
    const snapshot = await get(dbRef(database, 'questionBank'));
    if (snapshot.exists()) setQuestionBank(snapshot.val());
  };

  const loadRoundBank = async () => {
    const snapshot = await get(dbRef(database, 'roundBank'));
    if (snapshot.exists()) setRoundBank(snapshot.val());
  };

  // Backfill the question bank from every question already in your quizzes,
  // grouped by round type, skipping duplicates.
  const importBankFromQuizzes = async () => {
    const snap = await get(dbRef(database, 'quizzes'));
    if (!snap.exists()) { showToast('No quizzes to import from'); return; }
    const bank = JSON.parse(JSON.stringify(questionBank || {}));
    const seen = new Set();
    Object.values(bank).flat().forEach(q => seen.add(`${q.type || ''}|${(q.text || '').trim().toLowerCase()}`));
    let added = 0;
    Object.values(snap.val()).forEach(quiz => {
      Object.values(quiz.rounds || {}).forEach(round => {
        const cat = round.type || 'general';
        Object.values(round.questions || {}).forEach(q => {
          if (!q.text) return;
          const key = `${q.type || ''}|${q.text.trim().toLowerCase()}`;
          if (seen.has(key)) return;
          seen.add(key);
          if (!bank[cat]) bank[cat] = [];
          bank[cat].push({ ...q, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString() });
          added += 1;
        });
      });
    });
    await set(dbRef(database, 'questionBank'), bank);
    await loadQuestionBank();
    showToast(added ? `Imported ${added} questions` : 'Bank already up to date');
  };

  const saveToQuestionBank = async (question, category = 'general') => {
    const bankRef = dbRef(database, `questionBank/${category}`);
    const snapshot = await get(bankRef);
    const questions = snapshot.exists() ? snapshot.val() : [];
    questions.push({ ...question, id: Date.now().toString(), createdAt: new Date().toISOString() });
    await set(bankRef, questions);
    await loadQuestionBank();
  };

  // --- Round bank ---
  const saveRoundToBank = async (roundId) => {
    const round = currentQuiz.rounds[roundId];
    if (!round) return;
    const key = push(dbRef(database, 'roundBank')).key;
    await set(dbRef(database, `roundBank/${key}`), {
      title: round.title || 'Untitled round',
      type: round.type || 'knowledge',
      questions: round.questions || {},
      questionCount: Object.keys(round.questions || {}).length,
      savedAt: new Date().toISOString(),
    });
    await loadRoundBank();
    showToast('Round saved to library');
  };

  const addRoundFromBank = (bankRound) => {
    const roundId = uid();
    setCurrentQuiz({
      ...currentQuiz,
      rounds: {
        ...currentQuiz.rounds,
        [roundId]: { title: bankRound.title, type: bankRound.type, questions: bankRound.questions || {} },
      },
    });
    setShowRoundBank(false);
    showToast(`Added "${bankRound.title}"`);
  };

  const deleteRoundFromBank = async (key) => {
    await remove(dbRef(database, `roundBank/${key}`));
    loadRoundBank();
  };

  // --- Random round generator ---
  const generateRandomRound = () => {
    const { category, count } = generator;
    const pool = category === 'all'
      ? Object.values(questionBank).flat()
      : (questionBank[category] || []);
    if (pool.length === 0) { showToast('No questions in that category'); return; }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
    const questions = {};
    shuffled.forEach((q, i) => {
      const data = { ...q };
      delete data.id;
      delete data.createdAt;
      questions[`q${i + 1}`] = data;
    });
    const roundId = uid();
    const title = category === 'all' ? 'Random Round' : `${category[0].toUpperCase()}${category.slice(1)} Round`;
    setCurrentQuiz({
      ...currentQuiz,
      rounds: { ...currentQuiz.rounds, [roundId]: { title, type: category === 'all' ? 'knowledge' : category, questions } },
    });
    setGenerator(null);
    showToast(`Generated ${Object.keys(questions).length}-question round`);
  };

  // --- Media ---
  const loadMediaLibrary = async () => {
    try {
      const folders = {
        audio: 'assets/audio', logos: 'assets/logos',
        celebs: 'assets/celebs-age-25', flags: 'assets/flags', memes: 'assets/memes',
      };
      const entries = await Promise.all(Object.entries(folders).map(async ([key, path]) => {
        const list = await listAll(storageRef(storage, path)).catch(() => ({ items: [] }));
        const items = await Promise.all(list.items.map(async (item) => ({
          name: item.name, path: item.fullPath, url: await getDownloadURL(item),
        })));
        return [key, items];
      }));
      setMedia(Object.fromEntries(entries));
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  const urlForPath = (path) => {
    if (!path) return null;
    for (const arr of Object.values(media)) {
      const hit = arr.find(m => m.path === path);
      if (hit) return hit.url;
    }
    return null;
  };

  const uploadFile = async (file, category) => {
    if (!file) return null;
    setUploadingFile(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const fileRef = storageRef(storage, `assets/${category}/${fileName}`);
      await uploadBytes(fileRef, file);
      await loadMediaLibrary();
      setUploadingFile(false);
      return `assets/${category}/${fileName}`;
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadingFile(false);
      showToast('Upload failed');
      return null;
    }
  };

  const openMediaPicker = (title, groups, onPick) => {
    setMpTab(0);
    setMediaPicker({ title, groups, onPick });
  };

  const imageGroups = () => [
    { key: 'celebs', label: 'Celebs', items: media.celebs },
    { key: 'flags', label: 'Flags', items: media.flags },
    { key: 'memes', label: 'Memes', items: media.memes },
  ];

  const loadQuizzes = async () => {
    const snapshot = await get(dbRef(database, 'quizzes'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      setQuizzes(Object.entries(data).map(([id, quiz]) => ({ id, ...quiz })));
    }
  };

  const createNewQuiz = () => {
    setCurrentQuiz({ title: 'New Quiz', theme: 'fun-and-sparkly', rounds: {} });
    setCurrentView('edit');
  };

  const saveQuiz = async () => {
    try {
      const quizId = currentQuiz.id || push(dbRef(database, 'quizzes')).key;
      const quizData = { ...currentQuiz };
      delete quizData.id;
      await set(dbRef(database, `quizzes/${quizId}`), quizData);
      showToast('Quiz saved');
      loadQuizzes();
      if (activeTheme) applyTheme(activeTheme, 'master');
      setCurrentView('list');
      setCurrentQuiz(null);
    } catch (error) {
      showToast('Save failed');
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Delete quiz?')) return;
    await remove(dbRef(database, `quizzes/${quizId}`));
    loadQuizzes();
  };

  const addRound = () => {
    const roundId = uid();
    setCurrentQuiz({
      ...currentQuiz,
      rounds: { ...currentQuiz.rounds, [roundId]: { title: 'New Round', type: 'knowledge', questions: {} } },
    });
  };

  const deleteRound = (roundId) => {
    if (!window.confirm('Delete this round?')) return;
    const rounds = { ...currentQuiz.rounds };
    delete rounds[roundId];
    setCurrentQuiz({ ...currentQuiz, rounds });
  };

  const addQuestion = (roundId) => {
    const round = currentQuiz.rounds[roundId];
    const questionId = `q${Object.keys(round.questions || {}).length + 1}`;
    setCurrentRound({ id: roundId, ...round });
    setCurrentQuestion({ id: questionId, type: 'text_input', text: '', answer: '', points: 10 });
    setShowQuestionBank(false);
    setSelectedBank([]);
    setCurrentView('question');
  };

  const editQuestion = (roundId, questionId) => {
    const round = currentQuiz.rounds[roundId];
    setCurrentRound({ id: roundId, ...round });
    setCurrentQuestion({ id: questionId, ...round.questions[questionId] });
    setShowQuestionBank(false);
    setCurrentView('question');
  };

  // Add one or more bank questions straight into the current round
  const addBankQuestionsToRound = (bankQuestions) => {
    const round = currentRound;
    const existing = { ...(round.questions || {}) };
    let n = Object.keys(existing).length;
    bankQuestions.forEach((bq) => {
      const data = { ...bq };
      delete data.id;
      delete data.createdAt;
      n += 1;
      existing[`q${n}`] = data;
    });
    const updatedRound = { ...round, questions: existing };
    delete updatedRound.id;
    setCurrentQuiz({ ...currentQuiz, rounds: { ...currentQuiz.rounds, [round.id]: updatedRound } });
    setSelectedBank([]);
    setShowQuestionBank(false);
    setCurrentView('edit');
    showToast(`Added ${bankQuestions.length} question${bankQuestions.length !== 1 ? 's' : ''}`);
  };

  const saveQuestion = async () => {
    const questionData = { ...currentQuestion };
    delete questionData.id;
    if (questionData.type === 'connections' && questionData.connections) {
      questionData.words = questionData.connections.flatMap(g => g.words).filter(w => w);
    }
    if (addToBank && questionData.text && questionData.answer) {
      await saveToQuestionBank(questionData, currentRound?.type || 'general');
    }
    const updatedRound = {
      ...currentRound,
      questions: { ...currentRound.questions, [currentQuestion.id]: questionData },
    };
    delete updatedRound.id;
    setCurrentQuiz({ ...currentQuiz, rounds: { ...currentQuiz.rounds, [currentRound.id]: updatedRound } });
    setCurrentView('edit');
  };

  const deleteQuestion = (roundId, qId) => {
    if (!window.confirm('Delete this question?')) return;
    const questions = { ...currentQuiz.rounds[roundId].questions };
    delete questions[qId];
    setCurrentQuiz({
      ...currentQuiz,
      rounds: { ...currentQuiz.rounds, [roundId]: { ...currentQuiz.rounds[roundId], questions } },
    });
  };

  const getQuestionPreview = (q) => {
    const preview = q.text?.substring(0, 40) || 'Untitled';
    return preview.length < q.text?.length ? preview + '...' : preview;
  };

  const toggleBankSelect = (id) => {
    setSelectedBank((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderQuestionBank = () => {
    const categories = Object.keys(questionBank);
    const base = bankFilter === 'all' ? Object.values(questionBank).flat() : (questionBank[bankFilter] || []);
    const term = bankSearch.trim().toLowerCase();
    const filtered = term ? base.filter(q => (q.text || '').toLowerCase().includes(term)) : base;
    const selectedQs = Object.values(questionBank).flat().filter(q => selectedBank.includes(q.id));

    return (
      <div className="question-bank-panel">
        <div className="bank-header">
          <h3>Question Bank ({filtered.length})</h3>
          <button onClick={() => { setShowQuestionBank(false); setSelectedBank([]); }} className="btn-sm"><Icon name="x" size={15} /> Close</button>
        </div>

        <input
          className="bank-search"
          placeholder="Search questions..."
          value={bankSearch}
          onChange={(e) => setBankSearch(e.target.value)}
        />

        <div className="bank-filters">
          <button className={`filter-btn ${bankFilter === 'all' ? 'active' : ''}`} onClick={() => setBankFilter('all')}>All</button>
          {categories.map(cat => (
            <button key={cat} className={`filter-btn ${bankFilter === cat ? 'active' : ''}`} onClick={() => setBankFilter(cat)}>{prettyCategory(cat)}</button>
          ))}
        </div>

        <div className="bank-questions">
          {filtered.length === 0 ? (
            <div className="bank-empty">
              <p>No questions found</p>
              <p className="hint">Save questions with "Add to Bank" checked, or import your existing ones:</p>
              <button className="btn-secondary" onClick={importBankFromQuizzes}><Icon name="refresh" size={14} /> Import from my quizzes</button>
            </div>
          ) : (
            filtered.map((q) => {
              const sel = selectedBank.includes(q.id);
              return (
                <div key={q.id} className={`bank-question-card ${sel ? 'sel' : ''}`} onClick={() => toggleBankSelect(q.id)}>
                  <div className={`bank-check ${sel ? 'on' : ''}`}>{sel && <Icon name="check" size={14} />}</div>
                  <div className="bank-q-icon"><Icon name={typeIcon(q.type)} size={20} /></div>
                  <div className="bank-q-content">
                    <div className="bank-q-text">{getQuestionPreview(q)}</div>
                    <div className="bank-q-meta">{q.type.replace('_', ' ')} • {typeof q.points === 'number' ? q.points : 10} pts</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedBank.length > 0 && (
          <button className="btn-primary bank-add-selected" onClick={() => addBankQuestionsToRound(selectedQs)}>
            <Icon name="plus" size={16} /> Add {selectedBank.length} to round
          </button>
        )}
      </div>
    );
  };

  const renderImageField = (label, value, onPick, uploadCategory, groups) => (
    <div className="input-group">
      <label>{label}</label>
      <div className="qb-media-field">
        {value
          ? <img className="qb-media-thumb" src={urlForPath(value)} alt="" />
          : <div className="qb-media-thumb empty"><Icon name="image" size={22} /></div>}
        <div className="qb-media-actions">
          <button type="button" className="btn-secondary" onClick={() => openMediaPicker(`Choose ${label.toLowerCase()}`, groups, onPick)}>
            Browse library
          </button>
          <label className="btn-secondary qb-upload">
            Upload
            <input type="file" accept="image/*" hidden onChange={async (e) => {
              const path = await uploadFile(e.target.files[0], uploadCategory);
              if (path) onPick(path);
            }} />
          </label>
        </div>
      </div>
      {uploadingFile && <span className="uploading">Uploading...</span>}
    </div>
  );

  const renderQuestionEditor = () => {
    const q = currentQuestion;
    return (
      <div className="question-editor">
        <div className="input-group">
          <label>Question type</label>
          <div className="qb-type-grid">
            {questionTypes.map(t => (
              <button key={t.id} type="button" className={`qb-type ${q.type === t.id ? 'sel' : ''}`} onClick={() => setCurrentQuestion({ ...q, type: t.id })}>
                <Icon name={t.icon} size={22} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Question Text</label>
          <textarea value={q.text} onChange={(e) => setCurrentQuestion({ ...q, text: e.target.value })} rows={2} />
        </div>

        {q.type !== 'music' && q.type !== 'logo_wall' && (
          <div className="input-group">
            <label>Points</label>
            <input type="number" value={q.points} onChange={(e) => setCurrentQuestion({ ...q, points: parseInt(e.target.value) })} />
          </div>
        )}

        {q.type === 'text_input' && (
          <div className="input-group">
            <label>Answer</label>
            <input type="text" value={q.answer || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: e.target.value })} />
          </div>
        )}

        {q.type === 'multiple_choice' && (
          <>
            <div className="input-group">
              <label>Options</label>
              {['a', 'b', 'c', 'd'].map(key => (
                <input key={key} type="text" placeholder={`Option ${key.toUpperCase()}`} value={q.options?.[key] || ''}
                  onChange={(e) => setCurrentQuestion({ ...q, options: { ...q.options, [key]: e.target.value } })} />
              ))}
            </div>
            <div className="input-group">
              <label>Correct Answer</label>
              <select value={q.answer || 'a'} onChange={(e) => setCurrentQuestion({ ...q, answer: e.target.value })}>
                {['a', 'b', 'c', 'd'].map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
              </select>
            </div>
          </>
        )}

        {q.type === 'true_false' && (
          <>
            <div className="input-group">
              <label>Options</label>
              <input value={q.options?.a || 'True'} onChange={(e) => setCurrentQuestion({ ...q, options: { ...q.options, a: e.target.value } })} />
              <input value={q.options?.b || 'False'} onChange={(e) => setCurrentQuestion({ ...q, options: { ...q.options, b: e.target.value } })} />
            </div>
            <div className="input-group">
              <label>Correct</label>
              <select value={q.answer || 'a'} onChange={(e) => setCurrentQuestion({ ...q, answer: e.target.value })}>
                <option value="a">True</option>
                <option value="b">False</option>
              </select>
            </div>
          </>
        )}

        {q.type === 'image_input' && (
          <>
            {renderImageField('Image', q.imageUrl, (path) => setCurrentQuestion({ ...q, imageUrl: path }), 'memes', imageGroups())}
            <div className="input-group">
              <label>Answer</label>
              <input type="text" value={q.answer || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: e.target.value })} />
            </div>
          </>
        )}

        {q.type === 'ordering' && (
          <>
            <div className="input-group">
              <label>Items ({(q.options || []).length})</label>
              {(q.options || []).map((opt, i) => (
                <div key={i} className="flex-row">
                  <input value={opt} onChange={(e) => {
                    const opts = [...(q.options || [])]; opts[i] = e.target.value;
                    setCurrentQuestion({ ...q, options: opts });
                  }} placeholder="Item" />
                  <button className="btn-icon" aria-label="Remove item" onClick={() => {
                    const opts = q.options.filter((_, idx) => idx !== i);
                    setCurrentQuestion({ ...q, options: opts });
                  }}><Icon name="trash" size={16} /></button>
                </div>
              ))}
              <button className="btn-secondary" onClick={() => setCurrentQuestion({ ...q, options: [...(q.options || []), ''] })}>+ Add Item</button>
            </div>
            <div className="input-group">
              <label>Correct Order</label>
              {(q.answer || []).map((item, i) => (
                <select key={i} value={item} onChange={(e) => {
                  const ans = [...(q.answer || [])]; ans[i] = e.target.value;
                  setCurrentQuestion({ ...q, answer: ans });
                }}>
                  <option value="">Select...</option>
                  {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ))}
              {(q.answer?.length || 0) < (q.options?.length || 0) && (
                <button className="btn-secondary" onClick={() => setCurrentQuestion({ ...q, answer: [...(q.answer || []), ''] })}>+ Add to Order</button>
              )}
            </div>
          </>
        )}

        {q.type === 'music' && (
          <>
            <div className="input-group">
              <label>Audio File</label>
              <select value={q.audioUrl || ''} onChange={(e) => setCurrentQuestion({ ...q, audioUrl: e.target.value })}>
                <option value="">Select...</option>
                {media.audio.map(a => <option key={a.path} value={a.path}>{a.name}</option>)}
              </select>
              <input type="file" accept="audio/*" onChange={async (e) => {
                const path = await uploadFile(e.target.files[0], 'audio');
                if (path) setCurrentQuestion({ ...q, audioUrl: path });
              }} />
              {uploadingFile && <span className="uploading">Uploading...</span>}
            </div>
            <div className="input-group">
              <label>Answer</label>
              <input placeholder="Title" value={q.answer?.title || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: { ...q.answer, title: e.target.value } })} />
              <input placeholder="Artist" value={q.answer?.artist || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: { ...q.answer, artist: e.target.value } })} />
              <select value={q.answer?.decade || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: { ...q.answer, decade: e.target.value } })}>
                <option value="">Decade...</option>
                {['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Points (Title/Artist/Decade)</label>
              <div className="flex-row">
                <input type="number" value={q.points?.title || 5} onChange={(e) => setCurrentQuestion({ ...q, points: { ...q.points, title: parseInt(e.target.value) } })} />
                <input type="number" value={q.points?.artist || 5} onChange={(e) => setCurrentQuestion({ ...q, points: { ...q.points, artist: parseInt(e.target.value) } })} />
                <input type="number" value={q.points?.decade || 5} onChange={(e) => setCurrentQuestion({ ...q, points: { ...q.points, decade: parseInt(e.target.value) } })} />
              </div>
            </div>
          </>
        )}

        {q.type === 'connections' && (
          <div className="input-group">
            <label>Groups (4 groups, 4 words each)</label>
            {(q.connections || [{}, {}, {}, {}]).map((group, gi) => (
              <div key={gi} className="connection-group">
                <input placeholder={`Category ${gi + 1}`} value={group.category || ''} onChange={(e) => {
                  const conns = [...(q.connections || [{}, {}, {}, {}])];
                  conns[gi] = { ...conns[gi], category: e.target.value };
                  setCurrentQuestion({ ...q, connections: conns });
                }} />
                <div className="connection-words">
                  {[0, 1, 2, 3].map(wi => (
                    <input key={wi} placeholder={`Word ${wi + 1}`} value={group.words?.[wi] || ''} onChange={(e) => {
                      const conns = [...(q.connections || [{ category: '', words: ['', '', '', ''] }, {}, {}, {}])];
                      if (!conns[gi].words) conns[gi].words = ['', '', '', ''];
                      conns[gi].words[wi] = e.target.value.toUpperCase();
                      setCurrentQuestion({ ...q, connections: conns });
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {q.type === 'logo_wall' && (
          <div className="input-group">
            <label>Logos ({(q.logos || []).length})</label>
            {(q.logos || []).map((logo, i) => (
              <div key={i} className="logo-item">
                {logo.imageUrl
                  ? <img className="qb-media-thumb sm" src={urlForPath(logo.imageUrl)} alt="" />
                  : <div className="qb-media-thumb sm empty"><Icon name="image" size={18} /></div>}
                <button type="button" className="btn-secondary" onClick={() => openMediaPicker('Choose logo', [{ key: 'logos', label: 'Logos', items: media.logos }], (path) => {
                  const logos = [...(q.logos || [])]; logos[i] = { ...logos[i], imageUrl: path };
                  setCurrentQuestion({ ...q, logos });
                })}>Browse</button>
                <input placeholder="Company name" value={logo.answer || ''} onChange={(e) => {
                  const logos = [...(q.logos || [])]; logos[i] = { ...logos[i], answer: e.target.value };
                  setCurrentQuestion({ ...q, logos });
                }} />
                <button className="btn-icon" aria-label="Remove logo" onClick={() => {
                  const logos = q.logos.filter((_, idx) => idx !== i);
                  setCurrentQuestion({ ...q, logos });
                }}><Icon name="trash" size={16} /></button>
              </div>
            ))}
            {(q.logos || []).length < 12 && (
              <>
                <button className="btn-secondary" onClick={() => setCurrentQuestion({ ...q, logos: [...(q.logos || []), { imageUrl: '', answer: '' }] })}>
                  + Add Logo ({(q.logos || []).length}/12)
                </button>
                <input type="file" accept="image/*" onChange={async (e) => {
                  if ((q.logos || []).length >= 12) return;
                  const path = await uploadFile(e.target.files[0], 'logos');
                  if (path) setCurrentQuestion({ ...q, logos: [...(q.logos || []), { imageUrl: path, answer: '' }] });
                }} />
              </>
            )}
            {(q.logos || []).length >= 12 && <p className="hint">Maximum 12 logos reached</p>}
          </div>
        )}

        <div className="input-group">
          <label>Fun Fact (optional)</label>
          <textarea value={q.answerDetails?.detail || ''} rows={2} placeholder="Add explanation..."
            onChange={(e) => setCurrentQuestion({ ...q, answerDetails: { ...q.answerDetails, detail: e.target.value } })} />
        </div>

        <div className="input-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={addToBank} onChange={(e) => setAddToBank(e.target.checked)} />
            Add to Question Bank
          </label>
        </div>
      </div>
    );
  };

  const restoreActiveTheme = () => { if (activeTheme) applyTheme(activeTheme, 'master'); };
  const handleClose = () => { restoreActiveTheme(); onClose(); };
  const handleBackToList = () => { restoreActiveTheme(); setCurrentView('list'); };

  const roundBankEntries = Object.entries(roundBank);

  return (
    <div className="quiz-builder-overlay">
      <div className="quiz-builder-modal">
        <AnimatePresence>
          {toast && (
            <motion.div className="qb-toast" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <Icon name="check" size={16} /> {toast}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentView === 'list' && (
            <motion.div key="list" className="modal-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="modal-header">
                <h2><Icon name="book" size={20} /> Quizzes</h2>
                <button className="btn-close" onClick={handleClose} aria-label="Close"><Icon name="x" size={18} /></button>
              </div>
              <div className="modal-body">
                <button className="btn-primary" onClick={createNewQuiz}><Icon name="plus" size={18} /> Create Quiz</button>
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="quiz-card">
                    <h3>{quiz.title}</h3>
                    <p>{Object.keys(quiz.rounds || {}).length} rounds</p>
                    <div className="card-actions">
                      <button className="btn-sm" onClick={() => { setCurrentQuiz({ id: quiz.id, ...quiz }); setCurrentView('edit'); }}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => deleteQuiz(quiz.id)}>Delete</button>
                      <button className="btn-sm btn-success" onClick={() => { set(dbRef(database, 'liveGame/activeQuizId'), quiz.id); showToast(`"${quiz.title}" is now live`); }}>Activate</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {currentView === 'edit' && (
            <motion.div key="edit" className="modal-view" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
              <div className="modal-header">
                <button className="btn-back" onClick={handleBackToList} aria-label="Back"><Icon name="arrow-left" size={20} /></button>
                <h2>Edit Quiz</h2>
                <button className="btn-save" onClick={saveQuiz} aria-label="Save quiz"><Icon name="save" size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label>Title</label>
                  <input value={currentQuiz.title} onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Theme</label>
                  <div className="theme-picker-selected" onClick={() => setThemePickerOpen(!themePickerOpen)}>
                    <div className="theme-swatches">
                      <span className="swatch" style={{ background: themes[currentQuiz.theme]?.colors.primary }}></span>
                      <span className="swatch" style={{ background: themes[currentQuiz.theme]?.colors.accent }}></span>
                      <span className="swatch" style={{ background: themes[currentQuiz.theme]?.colors.background }}></span>
                      <span className="swatch" style={{ background: themes[currentQuiz.theme]?.colors.text }}></span>
                    </div>
                    <span className="theme-picker-selected-name">{themes[currentQuiz.theme]?.name || 'Select theme'}</span>
                    <span className={`theme-picker-chevron ${themePickerOpen ? 'open' : ''}`}>&#9660;</span>
                  </div>
                  <AnimatePresence>
                    {themePickerOpen && (
                      <motion.div className="theme-picker-grid" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                        {Object.entries(themes).map(([id, theme]) => (
                          <div key={id} className={`theme-picker-card ${currentQuiz.theme === id ? 'selected' : ''}`} onClick={() => { setCurrentQuiz({ ...currentQuiz, theme: id }); setThemePickerOpen(false); }}>
                            <div className="theme-swatches">
                              <span className="swatch" style={{ background: theme.colors.primary }}></span>
                              <span className="swatch" style={{ background: theme.colors.accent }}></span>
                              <span className="swatch" style={{ background: theme.colors.background }}></span>
                              <span className="swatch" style={{ background: theme.colors.text }}></span>
                            </div>
                            <div className="theme-picker-name">{theme.name}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="rounds-section">
                  <div className="section-header">
                    <h3>Rounds</h3>
                    <div className="rounds-actions">
                      <button className="btn-secondary" onClick={addRound}><Icon name="plus" size={14} /> Round</button>
                      <button className="btn-secondary" onClick={() => setShowRoundBank(true)}><Icon name="book" size={14} /> Library</button>
                      <button className="btn-secondary" onClick={() => setGenerator({ category: Object.keys(questionBank)[0] || 'all', count: 5 })}><Icon name="sparkles" size={14} /> Generate</button>
                    </div>
                  </div>
                  {Object.entries(currentQuiz.rounds || {}).map(([rid, round]) => (
                    <div key={rid} className="round-card">
                      <div className="round-card-head">
                        <input value={round.title} onChange={(e) => setCurrentQuiz({ ...currentQuiz, rounds: { ...currentQuiz.rounds, [rid]: { ...round, title: e.target.value } } })} placeholder="Round title" />
                        <button className="btn-icon" title="Save round to library" aria-label="Save round to library" onClick={() => saveRoundToBank(rid)}><Icon name="save" size={16} /></button>
                        <button className="btn-icon" title="Delete round" aria-label="Delete round" onClick={() => deleteRound(rid)}><Icon name="trash" size={16} /></button>
                      </div>
                      <div className="questions-mini">
                        {Object.entries(round.questions || {}).map(([qid, q]) => (
                          <div key={qid} className="question-mini" onClick={() => editQuestion(rid, qid)}>
                            <Icon name={typeIcon(q.type)} size={18} />
                            <span>{getQuestionPreview(q)}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteQuestion(rid, qid); }} aria-label="Delete question"><Icon name="trash" size={15} /></button>
                          </div>
                        ))}
                        <button className="btn-add-q" onClick={() => addQuestion(rid)}>+ Question</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'question' && (
            <motion.div key="question" className="modal-view" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
              <div className="modal-header">
                <button className="btn-back" onClick={() => setCurrentView('edit')} aria-label="Back"><Icon name="arrow-left" size={20} /></button>
                <h2>Question</h2>
                <button className="btn-save" onClick={saveQuestion} aria-label="Save question"><Icon name="save" size={18} /></button>
              </div>
              <div className="modal-body">
                {!showQuestionBank && (
                  <button className="question-bank-toggle" onClick={() => setShowQuestionBank(true)}>
                    <Icon name="bulb" size={16} /> Load from Question Bank
                  </button>
                )}
                {showQuestionBank ? renderQuestionBank() : renderQuestionEditor()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Round library panel */}
        <AnimatePresence>
          {showRoundBank && (
            <>
              <motion.div className="qb-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRoundBank(false)} />
              <motion.div className="qb-panel" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
                <div className="qb-panel-head"><h3>Round Library</h3><button className="btn-sm" onClick={() => setShowRoundBank(false)}><Icon name="x" size={15} /></button></div>
                <div className="qb-panel-body">
                  {roundBankEntries.length === 0 ? (
                    <p className="hint">No saved rounds yet. Use the save icon on a round to add it here.</p>
                  ) : roundBankEntries.map(([key, r]) => (
                    <div key={key} className="qb-round-card" onClick={() => addRoundFromBank(r)}>
                      <Icon name={typeIcon(r.type)} size={20} />
                      <div className="qb-round-info">
                        <div className="qb-round-title">{r.title}</div>
                        <div className="qb-round-meta">{r.type} • {r.questionCount || Object.keys(r.questions || {}).length} questions</div>
                      </div>
                      <button className="btn-icon" aria-label="Delete saved round" onClick={(e) => { e.stopPropagation(); deleteRoundFromBank(key); }}><Icon name="trash" size={15} /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Random round generator */}
        <AnimatePresence>
          {generator && (
            <>
              <motion.div className="qb-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGenerator(null)} />
              <motion.div className="qb-panel" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
                <div className="qb-panel-head"><h3>Generate a round</h3><button className="btn-sm" onClick={() => setGenerator(null)}><Icon name="x" size={15} /></button></div>
                <div className="qb-panel-body">
                  <div className="input-group">
                    <label>From category</label>
                    <select value={generator.category} onChange={(e) => setGenerator({ ...generator, category: e.target.value })}>
                      <option value="all">All categories</option>
                      {Object.keys(questionBank).map(cat => (
                        <option key={cat} value={cat}>{prettyCategory(cat)} ({questionBank[cat].length})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Number of questions</label>
                    <input type="number" min="1" max="20" value={generator.count} onChange={(e) => setGenerator({ ...generator, count: Math.max(1, parseInt(e.target.value) || 1) })} />
                  </div>
                  <button className="btn-primary" onClick={generateRandomRound}><Icon name="sparkles" size={16} /> Generate round</button>
                  <p className="hint">Pulls random questions from your bank into a new round you can then tweak.</p>
                  <button className="btn-secondary" onClick={importBankFromQuizzes}><Icon name="refresh" size={14} /> Import questions from my quizzes</button>
                  <p className="hint">Your bank only grows when you save questions. Import scans every quiz and adds its questions here (grouped by round type).</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Media picker */}
        <AnimatePresence>
          {mediaPicker && (
            <>
              <motion.div className="qb-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMediaPicker(null)} />
              <motion.div className="qb-panel qb-panel-tall" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
                <div className="qb-panel-head"><h3>{mediaPicker.title}</h3><button className="btn-sm" onClick={() => setMediaPicker(null)}><Icon name="x" size={15} /></button></div>
                {mediaPicker.groups.length > 1 && (
                  <div className="qb-mp-tabs">
                    {mediaPicker.groups.map((g, i) => (
                      <button key={g.key} className={`qb-mp-tab ${mpTab === i ? 'active' : ''}`} onClick={() => setMpTab(i)}>{g.label} ({g.items.length})</button>
                    ))}
                  </div>
                )}
                <div className="qb-mp-grid">
                  {(mediaPicker.groups[mpTab]?.items || []).length === 0 ? (
                    <p className="hint">Nothing here yet — upload a file to add one.</p>
                  ) : (mediaPicker.groups[mpTab].items).map(item => (
                    <button key={item.path} className="qb-mp-thumb" title={item.name} onClick={() => { mediaPicker.onPick(item.path); setMediaPicker(null); }}>
                      <img src={item.url} alt={item.name} loading="lazy" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizBuilder;
