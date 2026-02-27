import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Levels from './pages/Levels';
import Workspace from './pages/Workspace';

function App() {
  return (
    <Router>
      <div className="min-h-screen text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/levels" element={<Levels />} />
          <Route path="/workspace/:levelId" element={<Workspace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
