import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainQuizApp from './MainQuizApp';
import Presenter from './components/Presenter/Presenter';

function App() {
  return (
    <Routes>
      <Route path="/presenter" element={<Presenter />} />
      <Route path="/" element={<MainQuizApp />} />
    </Routes>
  );
}

export default App;