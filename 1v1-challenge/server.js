const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// ── BODMAS GENERATOR ─────────────────────────────────────────────────────────
function generateBODMAS() {
    const templates = [
        () => { const [a, b, c, d] = [rnd(2, 9), rnd(2, 9), rnd(2, 6), rnd(1, 5)]; return { expr: `${a} + ${b} × ${c} − ${d}`, ans: a + b * c - d }; },
        () => { const [a, b, c] = [rnd(2, 8), rnd(2, 8), rnd(2, 6)]; return { expr: `(${a} + ${b}) × ${c}`, ans: (a + b) * c }; },
        () => { const [a, c, d] = [rnd(2, 9), rnd(2, 5), rnd(2, 5)], b = d * rnd(2, 4); return { expr: `${a} × ${c} + ${b} ÷ ${d}`, ans: a * c + b / d }; },
        () => { const [a, b, c] = [rnd(6, 15), rnd(1, 5), rnd(2, 5)]; return { expr: `(${a} − ${b}) × ${c}`, ans: (a - b) * c }; },
        () => { const [a, b, c, d] = [rnd(2, 8), rnd(2, 6), rnd(2, 5), rnd(1, 4)]; return { expr: `${a} × ${b} − ${c} × ${d}`, ans: a * b - c * d }; },
        () => { const [a, b, c] = [rnd(1, 6), rnd(2, 6), rnd(1, 8)]; return { expr: `${a} + (${b} − ${c < b ? c : 1}) × ${rnd(2, 5)}`, ans: (() => { const cc = c < b ? c : 1; return a + (b - cc) * rnd(2, 5); })() }; },
    ];
    for (let i = 0; i < 30; i++) {
        const q = templates[rnd(0, templates.length - 1)]();
        if (Number.isInteger(q.ans) && q.ans >= 0 && q.ans <= 150) return q;
    }
    const [a, b, c] = [rnd(2, 9), rnd(2, 9), rnd(2, 6)];
    return { expr: `${a} + ${b} × ${c}`, ans: a + b * c };
}

// ── REACTION DATABASE ─────────────────────────────────────────────────────────
const REACTIONS = {
    'H₂+O₂': { product: '2H₂O', display: '2H₂ + O₂ → 2H₂O', damage: 20, bonus: 10, type: 'synthesis', exo: true },
    'HCl+NaOH': { product: 'NaCl+H₂O', display: 'HCl + NaOH → NaCl + H₂O', damage: 20, bonus: 10, type: 'acid-base', exo: true },
    'C+O₂': { product: 'CO₂', display: 'C + O₂ → CO₂', damage: 20, bonus: 0, type: 'combustion', exo: true },
    'Na+Cl₂': { product: 'NaCl', display: '2Na + Cl₂ → 2NaCl', damage: 20, bonus: 5, type: 'synthesis', exo: true },
    'Fe+O₂': { product: 'Fe₂O₃', display: '4Fe + 3O₂ → 2Fe₂O₃', damage: 20, bonus: 0, type: 'oxidation', exo: false },
    'H₂SO₄+NaOH': { product: 'Na₂SO₄+H₂O', display: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O', damage: 20, bonus: 10, type: 'acid-base', exo: true },
    'CaCO₃+HCl': { product: 'CaCl₂+CO₂', display: 'CaCO₃ + 2HCl → CaCl₂+H₂O+CO₂', damage: 20, bonus: 5, type: 'decomp', exo: false },
};
const ALL_CHEMS = ['H₂', 'O₂', 'HCl', 'NaOH', 'C', 'Na', 'Cl₂', 'Fe', 'H₂SO₄', 'CaCO₃'];

function generateChemicals() {
    const reactionKeys = Object.keys(REACTIONS);
    const pick = reactionKeys[rnd(0, reactionKeys.length - 1)];
    const [c1, c2] = pick.split('+');
    const others = ALL_CHEMS.filter(c => c !== c1 && c !== c2).sort(() => Math.random() - 0.5).slice(0, 4);
    return [c1, c2, ...others].sort(() => Math.random() - 0.5);
}

// ── BLOCK COMBOS ──────────────────────────────────────────────────────────────
const BLOCK_COMBOS = {
    'acid+base': { shield: 30, name: 'Neutral Shield' },
    'energy+shield': { shield: 40, name: 'Power Shield' },
    'neutral+neutral': { shield: 20, name: 'Double Guard' },
    'acid+acid': { shield: 10, name: 'Acid Wall', selfDmg: 5 },
    'base+base': { shield: 10, name: 'Base Wall' },
    'energy+acid': { shield: 25, name: 'Energy Acid' },
    'energy+base': { shield: 25, name: 'Energy Base' },
    'neutral+shield': { shield: 15, name: 'Neutral Guard' },
};

// ── GAME PHASES ───────────────────────────────────────────────────────────────
const PHASE_ORDER = ['bodmas', 'chemical', 'blocks'];
const PHASE_TIME = { bodmas: 15, chemical: 20, blocks: 20 };

function getOpponent(room, sid) {
    return room.players.find(p => p.id !== sid);
}

function startPhase(roomId) {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;
    room.phaseAnswered = {};
    clearInterval(room.timer);

    let payload = { phase: room.phase, timeLeft: PHASE_TIME[room.phase] };

    if (room.phase === 'bodmas') {
        const q = generateBODMAS();
        room.currentQ = q;
        payload.question = q.expr;
    } else if (room.phase === 'chemical') {
        const chems = generateChemicals();
        room.currentChems = chems;
        payload.chemicals = chems;
    }

    room.timeLeft = payload.timeLeft;
    io.to(roomId).emit('phase-start', payload);

    room.timer = setInterval(() => {
        room.timeLeft--;
        io.to(roomId).emit('timer-tick', { timeLeft: room.timeLeft });
        if (room.timeLeft <= 0) { clearInterval(room.timer); advancePhase(roomId); }
    }, 1000);
}

function advancePhase(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    clearInterval(room.timer);

    const idx = PHASE_ORDER.indexOf(room.phase);
    if (idx === PHASE_ORDER.length - 1) {
        room.round++;
        if (room.round > 3) { endGame(roomId); return; }
        room.phase = 'bodmas';
    } else {
        room.phase = PHASE_ORDER[idx + 1];
    }

    const [p1, p2] = room.players;
    if (room.states[p1.id].hp <= 0 || room.states[p2.id].hp <= 0) { endGame(roomId); return; }
    io.to(roomId).emit('phase-end', { round: room.round, nextPhase: room.phase, states: room.states });
    setTimeout(() => startPhase(roomId), 2500);
}

function applyDamage(room, attackerId, dmg) {
    const opp = getOpponent(room, attackerId);
    if (!opp) return 0;
    const os = room.states[opp.id];
    const absorbed = Math.min(os.defense, dmg);
    os.defense = Math.max(0, os.defense - absorbed);
    const actual = Math.max(0, dmg - absorbed);
    os.hp = Math.max(0, os.hp - actual);
    return actual;
}

function endGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    clearInterval(room.timer);
    const [p1, p2] = room.players;
    const s1 = room.states[p1.id], s2 = room.states[p2.id];
    const winner = s1.hp > s2.hp ? p1.name : s2.hp > s1.hp ? p2.name : 'Draw';
    io.to(roomId).emit('game-over', { winner, states: room.states });
}

// ── SOCKET HANDLERS ───────────────────────────────────────────────────────────
io.on('connection', socket => {
    console.log('+ connected', socket.id);

    socket.on('create-room', ({ name }) => {
        const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        rooms[roomId] = {
            id: roomId, players: [{ id: socket.id, name: name || 'Player 1' }],
            states: { [socket.id]: { hp: 100, energy: 0, defense: 0, combo: 0, name: name || 'Player 1' } },
            phase: 'bodmas', round: 1, timer: null, timeLeft: 15, phaseAnswered: {},
            currentQ: null, currentChems: []
        };
        socket.join(roomId); socket.roomId = roomId;
        socket.emit('room-created', { roomId, yourId: socket.id });
    });

    socket.on('join-room', ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room) { socket.emit('error', { msg: 'Room not found!' }); return; }
        if (room.players.length >= 2) { socket.emit('error', { msg: 'Room is full!' }); return; }
        room.players.push({ id: socket.id, name: name || 'Player 2' });
        room.states[socket.id] = { hp: 100, energy: 0, defense: 0, combo: 0, name: name || 'Player 2' };
        socket.join(roomId); socket.roomId = roomId;
        io.to(roomId).emit('game-start', { players: room.players, states: room.states });
        room.players.forEach(p => io.to(p.id).emit('your-id', { yourId: p.id }));
        setTimeout(() => startPhase(roomId), 2000);
    });

    socket.on('submit-bodmas', ({ answer }) => {
        const room = rooms[socket.roomId];
        if (!room || room.phase !== 'bodmas' || room.phaseAnswered[socket.id]) return;
        room.phaseAnswered[socket.id] = true;
        const ps = room.states[socket.id];
        const correct = parseInt(answer) === room.currentQ.ans;
        if (correct) {
            ps.energy += 10; ps.combo++;
            const dmg = 10 + (ps.combo >= 3 ? 5 : 0);
            const actual = applyDamage(room, socket.id, dmg);
            io.to(room.id).emit('bodmas-result', { correct: true, by: socket.id, damage: actual, combo: ps.combo, states: room.states });
            const opp = getOpponent(room, socket.id);
            if (opp && room.states[opp.id].hp <= 0) { clearInterval(room.timer); setTimeout(() => endGame(room.id), 1200); return; }
            clearInterval(room.timer);
            setTimeout(() => advancePhase(room.id), 2200);
        } else {
            ps.hp = Math.max(0, ps.hp - 5); ps.combo = 0;
            io.to(room.id).emit('bodmas-result', { correct: false, by: socket.id, selfDmg: 5, states: room.states });
            if (ps.hp <= 0) { clearInterval(room.timer); setTimeout(() => endGame(room.id), 1200); }
        }
    });

    socket.on('submit-chemical', ({ c1, c2 }) => {
        const room = rooms[socket.roomId];
        if (!room || room.phase !== 'chemical' || room.phaseAnswered[socket.id]) return;
        room.phaseAnswered[socket.id] = true;
        const ps = room.states[socket.id];
        const reaction = REACTIONS[`${c1}+${c2}`] || REACTIONS[`${c2}+${c1}`];
        if (reaction) {
            const total = reaction.damage + reaction.bonus;
            const actual = applyDamage(room, socket.id, total);
            ps.energy += 5;
            io.to(room.id).emit('chemical-result', { success: true, by: socket.id, reaction, damage: actual, states: room.states });
        } else {
            ps.hp = Math.max(0, ps.hp - 10);
            io.to(room.id).emit('chemical-result', { success: false, by: socket.id, selfDmg: 10, states: room.states });
        }
        const [p1, p2] = room.players;
        if (room.states[p1.id].hp <= 0 || room.states[p2.id].hp <= 0) { clearInterval(room.timer); setTimeout(() => endGame(room.id), 1500); return; }
        if (Object.keys(room.phaseAnswered).length >= 2) { clearInterval(room.timer); setTimeout(() => advancePhase(room.id), 2200); }
    });

    socket.on('submit-blocks', ({ b1, b2 }) => {
        const room = rooms[socket.roomId];
        if (!room || room.phase !== 'blocks' || room.phaseAnswered[socket.id]) return;
        room.phaseAnswered[socket.id] = true;
        const ps = room.states[socket.id];
        const combo = BLOCK_COMBOS[`${b1}+${b2}`] || BLOCK_COMBOS[`${b2}+${b1}`];
        if (combo) {
            ps.defense += combo.shield;
            if (combo.selfDmg) ps.hp = Math.max(0, ps.hp - combo.selfDmg);
            io.to(room.id).emit('blocks-result', { success: true, by: socket.id, combo, states: room.states });
        } else {
            io.to(room.id).emit('blocks-result', { success: false, by: socket.id, states: room.states });
        }
        if (Object.keys(room.phaseAnswered).length >= 2) { clearInterval(room.timer); setTimeout(() => advancePhase(room.id), 2200); }
    });

    socket.on('rematch', () => {
        const room = rooms[socket.roomId];
        if (!room) return;
        room.rematchVotes = (room.rematchVotes || 0) + 1;
        if (room.rematchVotes >= 2) {
            room.rematchVotes = 0; room.round = 1; room.phase = 'bodmas';
            room.players.forEach(p => { room.states[p.id] = { ...room.states[p.id], hp: 100, energy: 0, defense: 0, combo: 0 }; });
            io.to(room.id).emit('rematch-start', { players: room.players, states: room.states });
            setTimeout(() => startPhase(room.id), 1500);
        } else {
            io.to(room.id).emit('rematch-waiting', { votes: room.rematchVotes });
        }
    });

    socket.on('disconnect', () => {
        const room = rooms[socket.roomId];
        if (room) {
            clearInterval(room.timer);
            const opp = getOpponent(room, socket.id);
            if (opp) io.to(opp.id).emit('opponent-left');
            delete rooms[socket.roomId];
        }
        console.log('- disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`🎮 STEM Arena running → http://localhost:${PORT}`));
