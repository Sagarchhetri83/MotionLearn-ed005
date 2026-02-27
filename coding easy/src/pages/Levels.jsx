import React from 'react';
import { Link } from 'react-router-dom';

const LevelCard = ({ level, title, description, locked }) => {
    return (
        <Link
            to={locked ? '#' : `/workspace/${level}`}
            className={`glass-panel level-card ${locked ? 'locked' : ''}`}
            onClick={e => locked && e.preventDefault()}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', color: locked ? 'inherit' : '#818cf8', margin: 0 }}>Level {level}</h2>
                <span style={{ fontSize: '1.5rem' }}>{locked ? '🔒' : '🌟'}</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', margin: '0.5rem 0 0' }}>{title}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', flex: 1 }}>{description}</p>
            <div style={{ marginTop: 'auto' }}>
                <span className={`btn ${locked ? 'btn-secondary' : ''}`} style={{ width: '100%' }}>
                    {locked ? 'Coming Soon' : 'Play Level'}
                </span>
            </div>
        </Link>
    );
};

const Levels = () => {
    return (
        <div className="levels-container fade-in">
            <div className="levels-header">
                <Link to="/" className="btn btn-secondary btn-sm">← Back</Link>
                <h1 className="title-gradient" style={{ margin: 0, fontSize: '2.5rem' }}>Select Your Mission</h1>
            </div>

            <div className="levels-grid">
                <LevelCard
                    level={1}
                    title="First Steps in Coding via Gestures"
                    description="Learn Input, Output, Variables, and basic Operators using hand gestures."
                    locked={false}
                />
                <LevelCard
                    level={2}
                    title="Conditionals & Logic"
                    description="Master If/Else statements and decision making."
                    locked={false}
                />
                <LevelCard
                    level={3}
                    title="Loops & Iteration"
                    description="Learn how to repeat actions efficiently."
                    locked={false}
                />
            </div>
        </div>
    );
};

export default Levels;
