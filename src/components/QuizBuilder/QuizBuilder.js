import React, { useState, useEffect } from 'react';
import { database, storage } from '../../index';
import { ref as dbRef, set, get, push, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import './QuizBuilder.css';
import { themes, applyTheme } from '../../utils/themes';

const QuizBuilder = ({ onClose, activeTheme }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [currentView, setCurrentView] = useState('list');
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState({ audio: [], images: [], logos: [] });
  const [questionBank, setQuestionBank] = useState({});
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankFilter, setBankFilter] = useState('all');
  const [addToBank, setAddToBank] = useState(true);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  // Live preview: apply theme whenever currentQuiz.theme changes in edit view
  useEffect(() => {
    if (currentView === 'edit' && currentQuiz?.theme) {
      applyTheme(currentQuiz.theme, 'master');
    }
  }, [currentQuiz?.theme, currentView]);

  const questionTypes = [
    { id: 'text_input', name: 'Text Input', icon: '✍️' },
    { id: 'multiple_choice', name: 'Multiple Choice', icon: '📝' },
    { id: 'true_false', name: 'True/False', icon: '❓' },
    { id: 'image_input', name: 'Image Question', icon: '🖼️' },
    { id: 'ordering', name: 'Order Items', icon: '🔢' },
    { id: 'music', name: 'Music Round', icon: '🎵' },
    { id: 'connections', name: 'Connections', icon: '🔗' },
    { id: 'logo_wall', name: 'Logo Wall', icon: '🏢' },
  ];

  useEffect(() => {
    loadQuizzes();
    loadMediaLibrary();
    loadQuestionBank();
  }, []);

  const loadQuestionBank = async () => {
    const bankRef = dbRef(database, 'questionBank');
    const snapshot = await get(bankRef);
    if (snapshot.exists()) {
      setQuestionBank(snapshot.val());
    }
  };

  const saveToQuestionBank = async (question, category = 'general') => {
    const bankRef = dbRef(database, `questionBank/${category}`);
    const snapshot = await get(bankRef);
    const questions = snapshot.exists() ? snapshot.val() : [];

    const newQuestion = {
      ...question,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    questions.push(newQuestion);
    await set(bankRef, questions);
    await loadQuestionBank();
  };

  const loadMediaLibrary = async () => {
    try {
      const audioRef = storageRef(storage, 'assets/audio');
      const imagesRef = storageRef(storage, 'assets/celebs-age-25');
      const flagsRef = storageRef(storage, 'assets/flags');
      const memesRef = storageRef(storage, 'assets/memes');
      const logosRef = storageRef(storage, 'assets/logos');

      const [audioList, imagesList, flagsList, memesList, logosList] = await Promise.all([
        listAll(audioRef).catch(() => ({ items: [] })),
        listAll(imagesRef).catch(() => ({ items: [] })),
        listAll(flagsRef).catch(() => ({ items: [] })),
        listAll(memesRef).catch(() => ({ items: [] })),
        listAll(logosRef).catch(() => ({ items: [] })),
      ]);

      const audioUrls = await Promise.all(
          audioList.items.map(async (item) => ({
            name: item.name,
            path: item.fullPath,
            url: await getDownloadURL(item),
          }))
      );

      const allImages = [
        ...(await Promise.all(imagesList.items.map(async (item) => ({
          name: item.name,
          path: item.fullPath,
          url: await getDownloadURL(item),
        })))),
        ...(await Promise.all(flagsList.items.map(async (item) => ({
          name: item.name,
          path: item.fullPath,
          url: await getDownloadURL(item),
        })))),
        ...(await Promise.all(memesList.items.map(async (item) => ({
          name: item.name,
          path: item.fullPath,
          url: await getDownloadURL(item),
        })))),
      ];

      const logoUrls = await Promise.all(
          logosList.items.map(async (item) => ({
            name: item.name,
            path: item.fullPath,
            url: await getDownloadURL(item),
          }))
      );

      setMediaLibrary({ audio: audioUrls, images: allImages, logos: logoUrls });
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  const uploadFile = async (file, category) => {
    if (!file) return null;
    setUploadingFile(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const fileRef = storageRef(storage, `assets/${category}/${fileName}`);
      await uploadBytes(fileRef, file);
      await loadMediaLibrary();
      setUploadingFile(false);
      return `assets/${category}/${fileName}`;
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadingFile(false);
      alert('Upload failed');
      return null;
    }
  };

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
      alert('Saved!');
      loadQuizzes();
      // Restore the active quiz theme when going back to list
      if (activeTheme) {
        applyTheme(activeTheme, 'master');
      }
      setCurrentView('list');
      setCurrentQuiz(null);
    } catch (error) {
      alert('Save failed');
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!confirm('Delete quiz?')) return;
    await remove(dbRef(database, `quizzes/${quizId}`));
    loadQuizzes();
  };

  const addRound = () => {
    const roundId = `round${Object.keys(currentQuiz.rounds || {}).length + 1}`;
    setCurrentQuiz({
      ...currentQuiz,
      rounds: { ...currentQuiz.rounds, [roundId]: { title: 'New Round', type: 'knowledge', questions: {} } },
    });
  };

  const addQuestion = (roundId) => {
    const round = currentQuiz.rounds[roundId];
    const questionId = `q${Object.keys(round.questions || {}).length + 1}`;
    setCurrentRound({ id: roundId, ...round });
    setCurrentQuestion({ id: questionId, type: 'text_input', text: '', answer: '', points: 10 });
    setCurrentView('question');
    setShowQuestionBank(false);
  };

  const editQuestion = (roundId, questionId) => {
    const round = currentQuiz.rounds[roundId];
    setCurrentRound({ id: roundId, ...round });
    setCurrentQuestion({ id: questionId, ...round.questions[questionId] });
    setCurrentView('question');
    setShowQuestionBank(false);
  };

  const loadQuestionFromBank = (bankQuestion) => {
    const round = currentRound;
    const questionId = `q${Object.keys(round.questions || {}).length + 1}`;

    const questionData = { ...bankQuestion };
    delete questionData.id;
    delete questionData.createdAt;

    setCurrentQuestion({ id: questionId, ...questionData });
    setShowQuestionBank(false);
  };

  const saveQuestion = async () => {
    const questionData = { ...currentQuestion };
    delete questionData.id;

    // Auto-populate words for connections
    if (questionData.type === 'connections' && questionData.connections) {
      questionData.words = questionData.connections.flatMap(g => g.words).filter(w => w);
    }

    // Save to question bank if checkbox is checked
    if (addToBank && questionData.text && questionData.answer) {
      const category = currentRound?.type || 'general';
      await saveToQuestionBank(questionData, category);
    }

    const updatedRound = {
      ...currentRound,
      questions: { ...currentRound.questions, [currentQuestion.id]: questionData },
    };
    delete updatedRound.id;

    setCurrentQuiz({
      ...currentQuiz,
      rounds: { ...currentQuiz.rounds, [currentRound.id]: updatedRound },
    });

    setCurrentView('edit');
  };

  const deleteQuestion = (roundId, qId) => {
    if (!confirm('Delete?')) return;
    const questions = { ...currentQuiz.rounds[roundId].questions };
    delete questions[qId];
    setCurrentQuiz({
      ...currentQuiz,
      rounds: {
        ...currentQuiz.rounds,
        [roundId]: { ...currentQuiz.rounds[roundId], questions }
      }
    });
  };

  const getQuestionPreview = (q) => {
    const preview = q.text?.substring(0, 40) || 'Untitled';
    return preview.length < q.text?.length ? preview + '...' : preview;
  };

  const renderQuestionBank = () => {
    const categories = Object.keys(questionBank);
    const filteredQuestions = bankFilter === 'all'
        ? Object.values(questionBank).flat()
        : questionBank[bankFilter] || [];

    return (
        <div className="question-bank-panel">
          <div className="bank-header">
            <h3>Question Bank ({filteredQuestions.length})</h3>
            <button onClick={() => setShowQuestionBank(false)} className="btn-sm">✕ Close</button>
          </div>

          <div className="bank-filters">
            <button
                className={`filter-btn ${bankFilter === 'all' ? 'active' : ''}`}
                onClick={() => setBankFilter('all')}
            >
              All
            </button>
            {categories.map(cat => (
                <button
                    key={cat}
                    className={`filter-btn ${bankFilter === cat ? 'active' : ''}`}
                    onClick={() => setBankFilter(cat)}
                >
                  {cat}
                </button>
            ))}
          </div>

          <div className="bank-questions">
            {filteredQuestions.length === 0 ? (
                <div className="bank-empty">
                  <p>No questions in this category yet</p>
                  <p className="hint">Save questions with "Add to Bank" checked</p>
                </div>
            ) : (
                filteredQuestions.map((q, idx) => (
                    <div key={idx} className="bank-question-card" onClick={() => loadQuestionFromBank(q)}>
                      <div className="bank-q-icon">
                        {questionTypes.find(t => t.id === q.type)?.icon || '❓'}
                      </div>
                      <div className="bank-q-content">
                        <div className="bank-q-text">{getQuestionPreview(q)}</div>
                        <div className="bank-q-meta">
                          {q.type.replace('_', ' ')} • {q.points || 10} pts
                        </div>
                      </div>
                    </div>
                ))
            )}
          </div>
        </div>
    );
  };

  const renderQuestionEditor = () => {
    const q = currentQuestion;

    return (
        <div className="question-editor">
          <div className="input-group">
            <label>Question Type</label>
            <select value={q.type} onChange={(e) => setCurrentQuestion({ ...q, type: e.target.value })}>
              {questionTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
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

          {/* Text Input */}
          {q.type === 'text_input' && (
              <div className="input-group">
                <label>Answer</label>
                <input type="text" value={q.answer || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: e.target.value })} />
              </div>
          )}

          {/* Multiple Choice */}
          {q.type === 'multiple_choice' && (
              <>
                <div className="input-group">
                  <label>Options</label>
                  {['a', 'b', 'c', 'd'].map(key => (
                      <input
                          key={key}
                          type="text"
                          placeholder={`Option ${key.toUpperCase()}`}
                          value={q.options?.[key] || ''}
                          onChange={(e) => setCurrentQuestion({ ...q, options: { ...q.options, [key]: e.target.value } })}
                      />
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

          {/* True/False */}
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

          {/* Image Input */}
          {q.type === 'image_input' && (
              <>
                <div className="input-group">
                  <label>Image</label>
                  <select value={q.imageUrl || ''} onChange={(e) => setCurrentQuestion({ ...q, imageUrl: e.target.value })}>
                    <option value="">Select...</option>
                    {mediaLibrary.images.map(img => <option key={img.path} value={img.path}>{img.name}</option>)}
                  </select>
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const path = await uploadFile(e.target.files[0], 'celebs-age-25');
                    if (path) setCurrentQuestion({ ...q, imageUrl: path });
                  }} />
                  {uploadingFile && <span className="uploading">Uploading...</span>}
                </div>
                <div className="input-group">
                  <label>Answer</label>
                  <input type="text" value={q.answer || ''} onChange={(e) => setCurrentQuestion({ ...q, answer: e.target.value })} />
                </div>
              </>
          )}

          {/* Ordering */}
          {q.type === 'ordering' && (
              <>
                <div className="input-group">
                  <label>Items ({(q.options || []).length})</label>
                  {(q.options || []).map((opt, i) => (
                      <div key={i} className="flex-row">
                        <input
                            value={opt}
                            onChange={(e) => {
                              const opts = [...(q.options || [])];
                              opts[i] = e.target.value;
                              setCurrentQuestion({ ...q, options: opts });
                            }}
                            placeholder="Item"
                        />
                        <button className="btn-icon" onClick={() => {
                          const opts = q.options.filter((_, idx) => idx !== i);
                          setCurrentQuestion({ ...q, options: opts });
                        }}>🗑️</button>
                      </div>
                  ))}
                  <button className="btn-secondary" onClick={() => setCurrentQuestion({ ...q, options: [...(q.options || []), ''] })}>
                    + Add Item
                  </button>
                </div>
                <div className="input-group">
                  <label>Correct Order</label>
                  {(q.answer || []).map((item, i) => (
                      <select
                          key={i}
                          value={item}
                          onChange={(e) => {
                            const ans = [...(q.answer || [])];
                            ans[i] = e.target.value;
                            setCurrentQuestion({ ...q, answer: ans });
                          }}
                      >
                        <option value="">Select...</option>
                        {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                  ))}
                  {(q.answer?.length || 0) < (q.options?.length || 0) && (
                      <button className="btn-secondary" onClick={() => setCurrentQuestion({ ...q, answer: [...(q.answer || []), ''] })}>
                        + Add to Order
                      </button>
                  )}
                </div>
              </>
          )}

          {/* Music */}
          {q.type === 'music' && (
              <>
                <div className="input-group">
                  <label>Audio File</label>
                  <select value={q.audioUrl || ''} onChange={(e) => setCurrentQuestion({ ...q, audioUrl: e.target.value })}>
                    <option value="">Select...</option>
                    {mediaLibrary.audio.map(a => <option key={a.path} value={a.path}>{a.name}</option>)}
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

          {/* Connections */}
          {q.type === 'connections' && (
              <div className="input-group">
                <label>Groups (4 groups, 4 words each)</label>
                {(q.connections || [{},{},{},{}]).map((group, gi) => (
                    <div key={gi} className="connection-group">
                      <input
                          placeholder={`Category ${gi + 1}`}
                          value={group.category || ''}
                          onChange={(e) => {
                            const conns = [...(q.connections || [{},{},{},{}])];
                            conns[gi] = { ...conns[gi], category: e.target.value };
                            setCurrentQuestion({ ...q, connections: conns });
                          }}
                      />
                      <div className="connection-words">
                        {[0,1,2,3].map(wi => (
                            <input
                                key={wi}
                                placeholder={`Word ${wi + 1}`}
                                value={group.words?.[wi] || ''}
                                onChange={(e) => {
                                  const conns = [...(q.connections || [{category:'',words:['','','','']},{},{},{}])];
                                  if (!conns[gi].words) conns[gi].words = ['','','',''];
                                  conns[gi].words[wi] = e.target.value.toUpperCase();
                                  setCurrentQuestion({ ...q, connections: conns });
                                }}
                            />
                        ))}
                      </div>
                    </div>
                ))}
              </div>
          )}

          {/* Logo Wall */}
          {q.type === 'logo_wall' && (
              <div className="input-group">
                <label>Logos ({(q.logos || []).length})</label>
                {(q.logos || []).map((logo, i) => (
                    <div key={i} className="logo-item">
                      <select value={logo.imageUrl || ''} onChange={(e) => {
                        const logos = [...(q.logos || [])];
                        logos[i] = { ...logos[i], imageUrl: e.target.value };
                        setCurrentQuestion({ ...q, logos });
                      }}>
                        <option value="">Select logo...</option>
                        {mediaLibrary.logos.map(l => <option key={l.path} value={l.path}>{l.name}</option>)}
                      </select>
                      <input
                          placeholder="Company name"
                          value={logo.answer || ''}
                          onChange={(e) => {
                            const logos = [...(q.logos || [])];
                            logos[i] = { ...logos[i], answer: e.target.value };
                            setCurrentQuestion({ ...q, logos });
                          }}
                      />
                      <button className="btn-icon" onClick={() => {
                        const logos = q.logos.filter((_, idx) => idx !== i);
                        setCurrentQuestion({ ...q, logos });
                      }}>🗑️</button>
                    </div>
                ))}
                <button className="btn-secondary" onClick={() => setCurrentQuestion({ ...q, logos: [...(q.logos || []), { imageUrl: '', answer: '' }] })}>
                  + Add Logo
                </button>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const path = await uploadFile(e.target.files[0], 'logos');
                  if (path) setCurrentQuestion({ ...q, logos: [...(q.logos || []), { imageUrl: path, answer: '' }] });
                }} />
              </div>
          )}

          <div className="input-group">
            <label>Fun Fact (optional)</label>
            <textarea
                value={q.answerDetails?.detail || ''}
                onChange={(e) => setCurrentQuestion({ ...q, answerDetails: { ...q.answerDetails, detail: e.target.value } })}
                rows={2}
                placeholder="Add explanation..."
            />
          </div>

          <div className="input-group">
            <label className="checkbox-label">
              <input
                  type="checkbox"
                  checked={addToBank}
                  onChange={(e) => setAddToBank(e.target.checked)}
              />
              Add to Question Bank
            </label>
          </div>
        </div>
    );
  };

  const restoreActiveTheme = () => {
    if (activeTheme) {
      applyTheme(activeTheme, 'master');
    }
  };

  const handleClose = () => {
    restoreActiveTheme();
    onClose();
  };

  const handleBackToList = () => {
    restoreActiveTheme();
    setCurrentView('list');
  };

  return (
      <div className="quiz-builder-overlay">
        <div className="quiz-builder-modal">
          <AnimatePresence mode="wait">
            {currentView === 'list' && (
                <motion.div key="list" className="modal-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="modal-header">
                    <h2>📚 Quizzes</h2>
                    <button className="btn-close" onClick={handleClose}>✕</button>
                  </div>
                  <div className="modal-body">
                    <button className="btn-primary" onClick={createNewQuiz}>✨ Create Quiz</button>
                    {quizzes.map(quiz => (
                        <div key={quiz.id} className="quiz-card">
                          <h3>{quiz.title}</h3>
                          <p>{Object.keys(quiz.rounds || {}).length} rounds</p>
                          <div className="card-actions">
                            <button className="btn-sm" onClick={() => { setCurrentQuiz({ id: quiz.id, ...quiz }); setCurrentView('edit'); }}>Edit</button>
                            <button className="btn-sm btn-danger" onClick={() => deleteQuiz(quiz.id)}>Delete</button>
                            <button className="btn-sm btn-success" onClick={() => { set(dbRef(database, 'liveGame/activeQuizId'), quiz.id); alert('Activated!'); }}>Activate</button>
                          </div>
                        </div>
                    ))}
                  </div>
                </motion.div>
            )}

            {currentView === 'edit' && (
                <motion.div key="edit" className="modal-view" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
                  <div className="modal-header">
                    <button className="btn-back" onClick={handleBackToList}>←</button>
                    <h2>Edit Quiz</h2>
                    <button className="btn-save" onClick={saveQuiz}>💾</button>
                  </div>
                  <div className="modal-body">
                    <div className="input-group">
                      <label>Title</label>
                      <input value={currentQuiz.title} onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Theme</label>
                      <div
                        className="theme-picker-selected"
                        onClick={() => setThemePickerOpen(!themePickerOpen)}
                      >
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
                          <motion.div
                            className="theme-picker-grid"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            {Object.entries(themes).map(([id, theme]) => (
                              <div
                                key={id}
                                className={`theme-picker-card ${currentQuiz.theme === id ? 'selected' : ''}`}
                                onClick={() => {
                                  setCurrentQuiz({ ...currentQuiz, theme: id });
                                  setThemePickerOpen(false);
                                }}
                              >
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
                        <button className="btn-secondary" onClick={addRound}>+ Round</button>
                      </div>
                      {Object.entries(currentQuiz.rounds || {}).map(([rid, round]) => (
                          <div key={rid} className="round-card">
                            <input
                                value={round.title}
                                onChange={(e) => setCurrentQuiz({
                                  ...currentQuiz,
                                  rounds: { ...currentQuiz.rounds, [rid]: { ...round, title: e.target.value } }
                                })}
                                placeholder="Round title"
                            />
                            <div className="questions-mini">
                              {Object.entries(round.questions || {}).map(([qid, q]) => (
                                  <div key={qid} className="question-mini" onClick={() => editQuestion(rid, qid)}>
                                    <span>{questionTypes.find(t => t.id === q.type)?.icon}</span>
                                    <span>{getQuestionPreview(q)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteQuestion(rid, qid); }}>🗑️</button>
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
                    <button className="btn-back" onClick={() => setCurrentView('edit')}>←</button>
                    <h2>Question</h2>
                    <button className="btn-save" onClick={saveQuestion}>💾</button>
                  </div>
                  <div className="modal-body">
                    {!showQuestionBank && (
                        <button className="question-bank-toggle" onClick={() => setShowQuestionBank(true)}>
                          💡 Load from Question Bank
                        </button>
                    )}
                    {showQuestionBank ? renderQuestionBank() : renderQuestionEditor()}
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  );
};

export default QuizBuilder;