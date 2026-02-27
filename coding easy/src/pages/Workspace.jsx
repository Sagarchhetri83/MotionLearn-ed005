import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import CameraPreview from '../components/CameraPreview';

const LEVEL_1_SYNTAX = [
    { id: 'print_hello', label: 'Print "Hello"', code: 'printf("Hello World\\n");', type: 'function' },
    { id: 'var_a', label: 'int a = 10', code: 'int a = 10;', type: 'variable' },
    { id: 'var_b', label: 'int b = 5', code: 'int b = 5;', type: 'variable' },
    { id: 'print_sum', label: 'Print Sum (a + b)', code: 'printf("Sum: %d\\n", a + b);', type: 'math' },
    { id: 'print_diff', label: 'Print Diff (a - b)', code: 'printf("Diff: %d\\n", a - b);', type: 'math' },
    { id: 'input_c', label: 'Scan Number (c)', code: 'scanf("%d", &c);', type: 'input' },
    { id: 'print_c', label: 'Print c', code: 'printf("You entered: %d\\n", c);', type: 'function' },
];

const LEVEL_2_SYNTAX = [
    { id: 'var_age', label: 'int age = 8', code: 'int age = 8;', type: 'variable' },
    { id: 'if_greater', label: 'If age > 5', code: 'if (age > 5) {', type: 'condition' },
    { id: 'print_older', label: 'Print "You are older"', code: 'printf("You are older\\n");', type: 'function' },
    { id: 'close_if', label: 'Close If }', code: '}', type: 'control' },
    { id: 'if_else', label: 'If-Else (age >= 10)', code: 'if (age >= 10) {', type: 'condition' },
    { id: 'print_teen', label: 'Print "Almost a teen!"', code: 'printf("Almost a teen!\\n");', type: 'function' },
    { id: 'else_start', label: 'Else {', code: '} else {', type: 'control' },
    { id: 'print_kid', label: 'Print "Still a kid"', code: 'printf("Still a kid\\n");', type: 'function' },
    { id: 'var_score', label: 'int score = 85', code: 'int score = 85;', type: 'variable' },
    { id: 'if_equal', label: 'If score == 100', code: 'if (score == 100) {', type: 'condition' },
    { id: 'print_perfect', label: 'Print "Perfect!"', code: 'printf("Perfect Score!\\n");', type: 'function' },
];

const LEVEL_1_REFERENCE = [
    { term: 'int', definition: 'Whole number (like 1, 2, 10)' },
    { term: 'Variable', definition: 'A box to store a value' },
    { term: 'printf', definition: 'Show text on screen' },
    { term: 'scanf', definition: 'Get input from user' },
    { term: '+', definition: 'Add two numbers' },
    { term: '-', definition: 'Subtract numbers' },
];

const LEVEL_2_REFERENCE = [
    { term: 'if', definition: 'Check if something is true' },
    { term: 'else', definition: 'Do this if condition is false' },
    { term: '>', definition: 'Greater than (5 > 3 is true)' },
    { term: '>=', definition: 'Greater or equal (5 >= 5)' },
    { term: '==', definition: 'Equal to (check if same)' },
    { term: '{ }', definition: 'Group code together' },
];

const LEVEL_3_SYNTAX = [
    { id: 'loop_header', label: 'For Loop (3 times)', code: 'for (int i = 1; i <= 3; i++) {', type: 'control' },
    { id: 'print_loop', label: 'Print i', code: 'printf("Count: %d\\n", i);', type: 'function' },
    { id: 'print_star', label: 'Print "*"', code: 'printf("*");', type: 'function' },
    { id: 'close_loop', label: 'Close Loop }', code: '}', type: 'control' },
    { id: 'var_x', label: 'int x = 0', code: 'int x = 0;', type: 'variable' },
    { id: 'while_header', label: 'While (x < 3)', code: 'while (x < 3) {', type: 'control' },
    { id: 'inc_x', label: 'Increment x (x++)', code: 'x++;', type: 'math' },
];

const LEVEL_3_REFERENCE = [
    { term: 'for', definition: 'Repeat for a specific number of times' },
    { term: 'while', definition: 'Repeat while condition is true' },
    { term: 'i++', definition: 'Increase i by 1' },
    { term: 'Loop', definition: 'Doing the same thing again and again' },
];

const Workspace = () => {
    const { levelId } = useParams();
    const [mode, setMode] = useState('build');
    const [codeLines, setCodeLines] = useState([]);
    const [outputLines, setOutputLines] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const CURRENT_SYNTAX = levelId === '1' ? LEVEL_1_SYNTAX : (levelId === '2' ? LEVEL_2_SYNTAX : LEVEL_3_SYNTAX);
    const CURRENT_REFERENCE = levelId === '1' ? LEVEL_1_REFERENCE : (levelId === '2' ? LEVEL_2_REFERENCE : LEVEL_3_REFERENCE);

    const [memory, setMemory] = useState({ a: 10, b: 5, c: 0, age: 8, score: 85 });
    const lastActionTime = useRef(0);
    const outputRef = useRef(null);

    useEffect(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }, [outputLines]);

    const addToOutput = (text) => {
        setOutputLines(prev => [...prev, `> ${text}`]);
    };

    const handleRunCode = () => {
        addToOutput("--- RUNNING ---");
        let currentMem = { ...memory };
        const linesToRun = mode === 'build' ? codeLines : [codeLines[codeLines.length - 1]];

        if (!linesToRun || linesToRun.length === 0) {
            addToOutput("No code to run!");
            return;
        }
        executeLines(linesToRun, currentMem);
    };

    const executeLines = (lines, mem) => {
        let conditionStack = [];
        let skipUntilClose = false;
        let loopStack = []; // Stores { startLineIndex, type, max, current }

        for (let pc = 0; pc < lines.length; pc++) {
            const line = lines[pc];

            // Level 1 Logic
            if (line.includes('printf("Hello')) addToOutput("Hello World");
            else if (line.includes('int a')) mem.a = 10;
            else if (line.includes('int b')) mem.b = 5;
            else if (line.includes('a + b')) addToOutput(`Sum: ${mem.a + mem.b}`);
            else if (line.includes('a - b')) addToOutput(`Diff: ${mem.a - mem.b}`);
            else if (line.includes('scanf')) {
                const val = Math.floor(Math.random() * 100);
                addToOutput(`[Input] User entered: ${val}`);
                mem.c = val;
            }
            else if (line.includes('entered: %d')) addToOutput(`You entered: ${mem.c}`);

            // Level 2 Logic - Variables
            else if (line.includes('int age')) {
                const match = line.match(/int age = (\d+)/);
                if (match) mem.age = parseInt(match[1]);
            }
            else if (line.includes('int score')) {
                const match = line.match(/int score = (\d+)/);
                if (match) mem.score = parseInt(match[1]);
            }

            // Level 2 Logic - Conditionals
            else if (line.includes('if (age > 5)')) {
                addToOutput(`[Check] Is ${mem.age} > 5? ${mem.age > 5 ? 'Yes' : 'No'}`);
                if (mem.age > 5) conditionStack.push(true);
                else { conditionStack.push(false); skipUntilClose = true; }
            }
            else if (line.includes('if (age >= 10)')) {
                addToOutput(`[Check] Is ${mem.age} >= 10? ${mem.age >= 10 ? 'Yes' : 'No'}`);
                if (mem.age >= 10) conditionStack.push(true);
                else { conditionStack.push(false); skipUntilClose = true; }
            }
            else if (line.includes('if (score == 100)')) {
                addToOutput(`[Check] Is ${mem.score} == 100? ${mem.score === 100 ? 'Yes' : 'No'}`);
                if (mem.score === 100) conditionStack.push(true);
                else { conditionStack.push(false); skipUntilClose = true; }
            }
            else if (line.includes('} else {')) {
                skipUntilClose = !skipUntilClose;
            }

            // Level 3 Logic - Loops
            else if (line.includes('for (int i = 1; i <= 3; i++)')) {
                if (mem.i === undefined) mem.i = 1;
                // Start loop
                // Check condition
                if (mem.i <= 3) {
                    // Enter loop
                    // Push to stack to know where to return
                    // If we are already in this loop (checked via stack), we continue.
                    const key = `for-${pc}`;
                    const existing = loopStack.find(l => l.key === key);
                    if (!existing) {
                        loopStack.push({ key, startPc: pc, type: 'for', variable: 'i', limit: 3 });
                    }
                } else {
                    // Skip to end
                    skipUntilClose = true;
                    // Cleanup mem.i if needed or keep it
                }
            }
            else if (line.includes('int x = 0')) {
                mem.x = 0;
            }
            else if (line.includes('while (x < 3)')) {
                const key = `while-${pc}`;
                const existing = loopStack.find(l => l.key === key);
                // Check condition
                if (mem.x !== undefined && mem.x < 3) {
                    if (!existing) {
                        loopStack.push({ key, startPc: pc, type: 'while', variable: 'x', limit: 3 });
                    }
                } else {
                    skipUntilClose = true;
                }
            }
            else if (line.includes('x++;')) {
                if (!skipUntilClose && mem.x !== undefined) mem.x++;
            }

            // General Close Brace
            else if (line === '}') {
                if (conditionStack.length > 0) {
                    conditionStack.pop();
                    skipUntilClose = false;
                }
                else if (loopStack.length > 0) {
                    // Check if we need to loop back
                    const currentLoop = loopStack[loopStack.length - 1];
                    if (!skipUntilClose) {
                        if (currentLoop.type === 'for') {
                            mem[currentLoop.variable]++;
                            if (mem[currentLoop.variable] <= currentLoop.limit) {
                                pc = currentLoop.startPc; // Jump back
                            } else {
                                loopStack.pop();
                                delete mem[currentLoop.variable]; // Cleanup
                            }
                        }
                        else if (currentLoop.type === 'while') {
                            // Jump back to check condition again
                            pc = currentLoop.startPc - 1; // -1 because loop will ++ to startPc
                        }
                    } else {
                        // We were skipping, so we just stop skipping
                        skipUntilClose = false;
                        // But if we were skipping because loop finished?
                        // If skipUntilClose was true, and we hit }, likely we just exit the block.
                    }
                }
                else {
                    skipUntilClose = false;
                }
            }

            // Level 3 Outputs
            else if (!skipUntilClose) {
                if (line.includes('Count: %d')) addToOutput(`Count: ${mem.i !== undefined ? mem.i : mem.x}`);
                else if (line.includes('Print "*"')) addToOutput('*');

                // Existing Level 2 Outputs
                else if (line.includes('You are older')) addToOutput("You are older");
                else if (line.includes('Almost a teen')) addToOutput("Almost a teen!");
                else if (line.includes('Still a kid')) addToOutput("Still a kid");
                else if (line.includes('Perfect Score')) addToOutput("Perfect Score!");
            }
        }
        setMemory(mem);
    };

    const handleSyntaxSelect = (item) => {
        if (mode === 'instant') {
            addToOutput(`[Instant] Executing: ${item.label}`);
            executeLines([item.code], { ...memory });
        } else {
            setCodeLines(prev => [...prev, item.code]);
        }
    };

    const clearCode = () => {
        setCodeLines([]);
        setOutputLines([]);
        addToOutput("Workspace cleared.");
    };

    const onGesture = ({ gesture, cursorY }) => {
        const now = Date.now();

        // Remap cursorY from 0.1-0.9 to 0-1 range to make edges easier to reach
        // This means the top 10% selects index 0, and bottom 10% selects last index
        let adjustedY = (cursorY - 0.1) / 0.8;
        if (adjustedY < 0) adjustedY = 0;
        if (adjustedY > 1) adjustedY = 0.99;

        let idx = Math.floor(adjustedY * CURRENT_SYNTAX.length);
        if (idx < 0) idx = 0;
        if (idx >= CURRENT_SYNTAX.length) idx = CURRENT_SYNTAX.length - 1;
        setSelectedIndex(idx);

        if (now - lastActionTime.current < 1500) return;

        if (gesture === 'THUMB_UP') {
            handleRunCode();
            lastActionTime.current = now;
            return;
        }

        if (gesture === 'THUMB_DOWN') {
            clearCode();
            lastActionTime.current = now;
            return;
        }

        if (gesture === 'TWO_FINGERS') {
            handleSyntaxSelect(CURRENT_SYNTAX[idx]);
            lastActionTime.current = now;
        }
    };

    return (
        <div className="workspace-container">
            <div className="glass-panel workspace-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/levels" className="btn btn-secondary btn-sm">← Exit</Link>
                    <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
                        Level {levelId}: {levelId === '1' ? 'Basics' : (levelId === '2' ? 'Conditionals & Logic' : 'Loops & Iteration')}
                    </h1>
                </div>

                <div className="header-controls">
                    <button
                        className={`toggle-btn ${mode === 'instant' ? 'active' : ''}`}
                        onClick={() => { setMode('instant'); clearCode(); }}
                    >
                        ⚡ Instant Output
                    </button>
                    <button
                        className={`toggle-btn ${mode === 'build' ? 'active' : ''}`}
                        onClick={() => { setMode('build'); clearCode(); }}
                    >
                        🛠️ Code Build
                    </button>
                </div>

                <div style={{ width: '200px' }}></div>
            </div>

            <div className="workspace-main">
                {/* Left Panel: Syntax */}
                <div className="glass-panel syntax-list">
                    <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.7, padding: '0 0.5rem' }}>Toolbox</h2>
                    {CURRENT_SYNTAX.map((item, idx) => (
                        <button
                            key={item.id}
                            onClick={() => handleSyntaxSelect(item)}
                            className={`syntax-item ${selectedIndex === idx ? 'selected' : ''}`}
                        >
                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.6 }}>{item.code}</div>
                            <div style={{ fontWeight: 600 }}>{item.label}</div>
                        </button>
                    ))}

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <p>👆 Index: Select</p>
                        <p>✌️ 2 Fingers: Add Block</p>
                        <p>👍 Thumb Up: Run</p>
                        <p>👎 Thumb Down: Clear</p>
                    </div>
                </div>

                {/* Center Panel: Builder */}
                <div className="glass-panel editor-panel">
                    <div className="editor-toolbar">
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', opacity: 0.7 }}>main.c</span>
                        {mode === 'build' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={clearCode} className="btn btn-secondary btn-sm" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>Clear</button>
                                <button onClick={handleRunCode} className="btn btn-sm" style={{ background: '#22c55e' }}>RUN ▶</button>
                            </div>
                        )}
                    </div>
                    <div className="code-area">
                        {codeLines.length === 0 && <div style={{ opacity: 0.3, textAlign: 'center', marginTop: '3rem' }}>
                            Use gestures to add blocks...
                        </div>}
                        {codeLines.map((line, i) => (
                            <div key={i} className="code-line">
                                <span className="line-num">{i + 1}</span>
                                <span style={{ color: '#bfdbfe' }}>{line}</span>
                            </div>
                        ))}
                        <div className="code-line">
                            <span className="line-num">{codeLines.length + 1}</span>
                            <div className="cursor"></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Output */}
                <div className="glass-panel output-terminal">
                    <div className="term-header">Terminal Output</div>
                    <div ref={outputRef} className="term-body">
                        {outputLines.map((line, i) => (
                            <div key={i} style={{ marginBottom: '0.25rem' }}>{line}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Camera Component */}
            <div className="camera-widget">
                <div className="camera-container">
                    <CameraPreview onGesture={onGesture} />
                </div>
                <div className="camera-status">MediaPipe Active</div>
            </div>

            {/* Reference Guide - Below Camera */}
            <div className="reference-guide">
                <div style={{
                    padding: '0.75rem',
                    background: 'rgba(99, 102, 241, 0.2)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#c084fc',
                    textAlign: 'center'
                }}>
                    📖 Quick Reference
                </div>
                <div style={{ padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
                    {CURRENT_REFERENCE.map((item, idx) => (
                        <div key={idx} style={{
                            marginBottom: '0.8rem',
                            padding: '0.8rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '0.6rem',
                            borderLeft: '4px solid #6366f1'
                        }}>
                            <div style={{
                                fontWeight: 700,
                                color: '#c084fc',
                                fontFamily: 'monospace',
                                fontSize: '1.2rem',
                                marginBottom: '0.4rem',
                                letterSpacing: '0.5px'
                            }}>
                                {item.term}
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                lineHeight: '1.5',
                                color: '#e2e8f0'
                            }}>
                                {item.definition}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Workspace;
