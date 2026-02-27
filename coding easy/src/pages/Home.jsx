import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      {/* Background decorations */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <div className="glass-panel hero-card fade-in">
        <div style={{ fontSize: '4rem' }}>👋 💻</div>
        <h1 className="title-gradient" style={{ fontSize: '3rem', margin: '0' }}>
          Gesture Coding
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          The magical way to learn computer programming.<br />
          Use your hands to build code, control the computer, and solve puzzles.
          <br /><span style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem', display: 'block' }}>Perfect for Std 3-6 Students</span>
        </p>

        <Link to="/levels" className="btn" style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}>
          Start Learning Now 🚀
        </Link>
      </div>

      <div style={{ position: 'absolute', bottom: '1rem', fontSize: '0.8rem', opacity: 0.4 }}>
        Powered by MediaPipe & React
      </div>
    </div>
  );
};

export default Home;
