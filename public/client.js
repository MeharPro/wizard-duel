import { initWorld, updateWorld, updateSelf, setCameraRotation, setMyId } from './world.js';

const socket = io();

// State
const keys = { w: false, a: false, s: false, d: false, space: false };
const state = {
    rotation: 0,
    pitch: 0,
    isCasting: false,
    joined: false,
    isDead: false,
    selectedCharacter: 'hary'
};

// Elements
const healthFill = document.getElementById('health-fill');
const statusText = document.getElementById('status-text');
const transcriptionEl = document.getElementById('transcription');
const lobbyOverlay = document.getElementById('lobby-overlay');
const deathOverlay = document.getElementById('death-overlay');
const uiOverlay = document.getElementById('ui-overlay');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const roomNameInput = document.getElementById('room-name-input');
const playerNameEl = document.getElementById('player-name');
const playerStatsEl = document.getElementById('player-stats');
const killerNameEl = document.getElementById('killer-name');
const respawnCountdownEl = document.getElementById('respawn-countdown');
const respawnBtn = document.getElementById('respawn-btn');
const roomListEl = document.getElementById('room-list');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-panel`).classList.add('active');
    });
});

// Character selection
document.querySelectorAll('.character-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        state.selectedCharacter = opt.dataset.character;
    });
});

// Refresh rooms
document.getElementById('refresh-btn').addEventListener('click', () => {
    socket.emit('get_rooms');
});

// Game mode option toggles
const winModeSelect = document.getElementById('win-mode');
const killOptions = document.getElementById('kill-options');
const timeOptions = document.getElementById('time-options');
const killTargetSelect = document.getElementById('kill-target');
const killCustomInput = document.getElementById('kill-custom');
const timeLimitSelect = document.getElementById('time-limit');
const timeCustomInput = document.getElementById('time-custom');

winModeSelect.addEventListener('change', () => {
    killOptions.style.display = winModeSelect.value === 'kills' ? 'block' : 'none';
    timeOptions.style.display = winModeSelect.value === 'time' ? 'block' : 'none';
});

killTargetSelect.addEventListener('change', () => {
    killCustomInput.style.display = killTargetSelect.value === 'custom' ? 'block' : 'none';
});

timeLimitSelect.addEventListener('change', () => {
    timeCustomInput.style.display = timeLimitSelect.value === 'custom' ? 'block' : 'none';
});

// Host game
document.getElementById('host-btn').addEventListener('click', () => {
    const name = usernameInput.value || 'Wizard';
    const roomName = roomNameInput.value || '';

    // Get game mode settings
    const gameMode = winModeSelect.value;
    let killTarget = 0;
    let timeLimit = 0;

    if (gameMode === 'kills') {
        killTarget = killTargetSelect.value === 'custom'
            ? parseInt(killCustomInput.value) || 10
            : parseInt(killTargetSelect.value);
    } else if (gameMode === 'time') {
        timeLimit = timeLimitSelect.value === 'custom'
            ? parseInt(timeCustomInput.value) || 120
            : parseInt(timeLimitSelect.value);
    }

    socket.emit('host_game', {
        name,
        character: state.selectedCharacter,
        roomName,
        gameMode,
        killTarget,
        timeLimit
    });
});

// Join game (manual)
document.getElementById('join-btn').addEventListener('click', () => {
    const name = usernameInput.value || 'Wizard';
    const roomId = roomInput.value || 'default';
    socket.emit('join_game', {
        name,
        character: state.selectedCharacter,
        roomId
    });
});

// Room list click
roomListEl.addEventListener('click', (e) => {
    const roomItem = e.target.closest('.room-item');
    if (roomItem) {
        const name = usernameInput.value || 'Wizard';
        socket.emit('join_game', {
            name,
            character: state.selectedCharacter,
            roomId: roomItem.dataset.room
        });
    }
});

// Respawn button
respawnBtn.addEventListener('click', () => {
    socket.emit('request_respawn');
});

// Socket: Room list
socket.on('room_list', (rooms) => {
    if (rooms.length === 0) {
        roomListEl.innerHTML = '<div class="no-rooms">No active games. Host one!</div>';
    } else {
        roomListEl.innerHTML = rooms.map(r => `
            <div class="room-item" data-room="${r.id}">
                <div class="room-info">
                    <div class="room-name">${r.id}</div>
                    <div class="room-host">Host: ${r.host}</div>
                </div>
                <div class="room-players">${r.players}/${r.maxPlayers}</div>
            </div>
        `).join('');
    }
});

// Socket: Joined
socket.on('joined', (data) => {
    state.joined = true;
    state.isDead = false;
    setMyId(data.id);
    lobbyOverlay.style.display = 'none';
    deathOverlay.style.display = 'none';
    uiOverlay.style.display = 'flex';
    playerNameEl.textContent = usernameInput.value || 'Wizard';
    document.body.requestPointerLock();
});

// Socket: Death
socket.on('player_died', ({ killer, respawnIn }) => {
    state.isDead = true;
    deathOverlay.style.display = 'flex';
    killerNameEl.textContent = killer;
    respawnBtn.disabled = true;

    // Countdown
    let countdown = Math.ceil(respawnIn / 1000);
    respawnCountdownEl.textContent = countdown;

    const interval = setInterval(() => {
        countdown--;
        respawnCountdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(interval);
            respawnBtn.disabled = false;
        }
    }, 1000);
});

// Socket: Errors
socket.on('host_error', ({ message }) => alert('Host error: ' + message));
socket.on('join_error', ({ message }) => alert('Join error: ' + message));

// Game Over
socket.on('game_over', ({ winner, winnerId, gameMode, killTarget, timeLimit }) => {
    // Show game over overlay
    const isWinner = winnerId === socket.id;
    const msg = isWinner ? '🏆 Victory!' : `${winner} Wins!`;

    // Create overlay if not exists
    let gameOverOverlay = document.getElementById('game-over-overlay');
    if (!gameOverOverlay) {
        gameOverOverlay = document.createElement('div');
        gameOverOverlay.id = 'game-over-overlay';
        gameOverOverlay.innerHTML = `
            <div class="game-over-box">
                <h2 id="game-over-title">Game Over</h2>
                <p id="game-over-message"></p>
                <button id="return-lobby-btn">Return to Lobby</button>
            </div>
        `;
        document.body.appendChild(gameOverOverlay);

        document.getElementById('return-lobby-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    document.getElementById('game-over-title').textContent = isWinner ? '🏆 Victory!' : '💀 Defeat';
    document.getElementById('game-over-message').textContent = `${winner} wins the match!`;
    gameOverOverlay.style.display = 'flex';
});

// Request rooms on connect
socket.on('connect', () => {
    socket.emit('get_rooms');
});

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
        state.isCasting = true;
        transcriptionEl.textContent = '🎙️ Listening...';
        transcriptionEl.style.color = '#ff6666';
    };

    recognition.onend = () => state.isCasting = false;

    recognition.onresult = (event) => {
        let bestTranscript = '';
        let confidence = 0;

        for (let i = 0; i < event.results.length; i++) {
            for (let j = 0; j < event.results[i].length; j++) {
                if (event.results[i][j].confidence > confidence) {
                    bestTranscript = event.results[i][j].transcript;
                    confidence = event.results[i][j].confidence;
                }
            }
        }

        transcriptionEl.textContent = `✨ "${bestTranscript}"`;
        transcriptionEl.style.color = '#ffd700';

        if (event.results[event.results.length - 1].isFinal) {
            socket.emit('voice_cast', { transcript: bestTranscript });
        }
    };

    recognition.onerror = (e) => {
        state.isCasting = false;
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
            transcriptionEl.textContent = '⚠️ ' + e.error;
        }
    };
}

// Keyboard
window.addEventListener('keydown', (e) => {
    if (!state.joined || state.isDead) return;
    if (e.code === 'Space') { e.preventDefault(); keys.space = true; }
    if (e.code === 'Tab') {
        e.preventDefault();
        document.getElementById('scoreboard').style.display = 'block';
    }
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});

window.addEventListener('keyup', (e) => {
    if (!state.joined) return;
    if (e.code === 'Space') keys.space = false;
    if (e.code === 'Tab') {
        document.getElementById('scoreboard').style.display = 'none';
    }
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// Mouse -> Voice
document.addEventListener('mousedown', (e) => {
    if (!state.joined || state.isDead) return;
    if (e.button === 0 && !state.isCasting && recognition) {
        try { recognition.start(); } catch (err) { }
    }
});

document.addEventListener('mouseup', (e) => {
    if (!state.joined) return;
    if (e.button === 0 && recognition) {
        try { recognition.stop(); } catch (err) { }
    }
});

// Mouse Look
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement && !state.isDead) {
        const sensitivity = 0.002;
        state.rotation -= e.movementX * sensitivity;
        state.pitch -= e.movementY * sensitivity;
        state.pitch = Math.max(-1.4, Math.min(1.4, state.pitch));
        setCameraRotation(state.rotation, state.pitch);
    }
});

document.addEventListener('click', () => {
    if (state.joined && !state.isDead && !document.pointerLockElement) {
        document.body.requestPointerLock();
    }
});

document.addEventListener('contextmenu', e => e.preventDefault());

// ==================== MOBILE CONTROLS ====================
function isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}

if (isTouchDevice()) {
    document.getElementById('mobile-controls').style.display = 'block';

    // Disable pointer lock requirement on mobile
    document.addEventListener('click', () => { /* No-op */ });
}

// Joystick
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
let joystickCenter = { x: 0, y: 0 };
let joystickTouchId = null;

joystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = joystickZone.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
});

joystickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            let dx = touch.clientX - joystickCenter.x;
            let dy = touch.clientY - joystickCenter.y;
            const dist = Math.hypot(dx, dy);
            const maxDist = 35; // Limit knob movement

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

            // WASD Simulation
            const threadhold = 10;
            keys.w = dy < -threadhold;
            keys.s = dy > threadhold;
            keys.a = dx < -threadhold;
            keys.d = dx > threadhold;
        }
    }
});

joystickZone.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
            joystickTouchId = null;
            joystickKnob.style.transform = `translate(-50%, -50%)`;
            keys.w = keys.s = keys.a = keys.d = false;
        }
    }
});

// Camera Touch Layer (Right side)
const touchLayer = document.getElementById('mobile-b-layer');
let cameraTouchId = null;
let lastTouchX = 0;
let lastTouchY = 0;

touchLayer.addEventListener('touchstart', (e) => {
    const touch = e.changedTouches[0];
    cameraTouchId = touch.identifier;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
});

touchLayer.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === cameraTouchId) {
            const dx = touch.clientX - lastTouchX;
            const dy = touch.clientY - lastTouchY;

            const sensitivity = 0.005;
            state.rotation -= dx * sensitivity;
            state.pitch -= dy * sensitivity;
            state.pitch = Math.max(-1.4, Math.min(1.4, state.pitch));
            setCameraRotation(state.rotation, state.pitch);

            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    }
});

touchLayer.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === cameraTouchId) {
            cameraTouchId = null;
        }
    }
});

// Mobile Action Buttons
const jumpBtn = document.getElementById('mobile-jump-btn');
const castBtn = document.getElementById('mobile-cast-btn');

jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys.space = true; jumpBtn.style.transform = 'scale(0.9)'; });
jumpBtn.addEventListener('touchend', (e) => { e.preventDefault(); keys.space = false; jumpBtn.style.transform = 'scale(1)'; });

// Cast Button (Hold to Speak)
castBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!state.isCasting && recognition) {
        try { recognition.start(); } catch (err) { }
        castBtn.style.background = 'rgba(255, 0, 0, 0.5)';
        castBtn.textContent = '👂';
    }
});

castBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (recognition) {
        try { recognition.stop(); } catch (err) { }
        castBtn.style.background = 'rgba(102, 126, 234, 0.3)';
        castBtn.textContent = '🎙️ CAST';
    }
});

// Init
initWorld(document.getElementById('game-container'));

// Game Loop
function animate() {
    requestAnimationFrame(animate);
    if (state.joined && !state.isDead) {
        socket.emit('input', { keys, rotation: state.rotation });
    }
    updateWorld();
}
animate();

// Snapshot
socket.on('snapshot', (snapshot) => {
    if (!state.joined) return;

    const myId = socket.id;
    const me = snapshot.players.find(p => p.id === myId);
    const others = snapshot.players.filter(p => p.id !== myId);

    if (me) {
        // Health
        const healthPct = (me.health / (me.maxHealth || 100)) * 100;
        healthFill.style.width = `${healthPct}%`;
        if (healthPct > 60) healthFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
        else if (healthPct > 30) healthFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        else healthFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';

        // Status
        statusText.textContent = me.state;
        const stateColors = {
            'IDLE': '#ffffff', 'DISARMED': '#ff6666', 'STUNNED': '#ffff66',
            'FROZEN': '#66ccff', 'DEAD': '#666666', 'DANCING': '#ff99ff',
            'SILENCED': '#999999', 'CONFUSED': '#cc99ff', 'SLOWED': '#99ccff',
            'LEVITATING': '#ffcc99'
        };
        statusText.style.color = stateColors[me.state] || '#ffffff';

        // Stats
        playerStatsEl.textContent = `K: ${me.kills} / D: ${me.deaths}`;

        // Handle respawn (death overlay should hide)
        if (me.state !== 'DEAD' && state.isDead) {
            state.isDead = false;
            deathOverlay.style.display = 'none';
            document.body.requestPointerLock();
        }
    }

    // Scoreboard
    const scoresEl = document.getElementById('scores');
    scoresEl.innerHTML = snapshot.players
        .sort((a, b) => b.kills - a.kills)
        .map(p => `
            <div class="score-row">
                <span class="score-name">${p.name}</span>
                <span class="score-kd">${p.kills}K / ${p.deaths}D</span>
            </div>
        `).join('');

    updateSelf(me, others, snapshot.projectiles, snapshot.effects);
});

// Cooldown UI  
socket.on('cooldown', ({ spell, duration }) => {
    document.querySelectorAll('.spell').forEach(el => {
        if (el.textContent.toLowerCase() === spell.toLowerCase()) {
            el.classList.add('cooldown');
            setTimeout(() => el.classList.remove('cooldown'), duration);
        }
    });
});

socket.on('cast_success', ({ spell }) => {
    transcriptionEl.textContent = `⚡ ${spell.toUpperCase()}!`;
    transcriptionEl.style.color = '#00ffff';
});

socket.on('cast_fail', ({ message }) => {
    transcriptionEl.textContent = `❌ ${message}`;
    transcriptionEl.style.color = '#ff6666';
});

// Spell list UI
socket.on('character_list', () => {
    // Populate spell list
    const container = document.getElementById('spell-list');
    const spells = [
        { name: 'Expelliarmus', color: '#ff0000' },
        { name: 'Stupefy', color: '#ff3333' },
        { name: 'Incendio', color: '#ff6600' },
        { name: 'Protego', color: '#0066ff' },
        { name: 'Glacius', color: '#66ccff' },
        { name: 'Flipendo', color: '#00ffff' },
        { name: 'Accio', color: '#00ff00' },
        { name: 'Avada Kedavra', color: '#00ff00' }
    ];
    container.innerHTML = spells.map(s =>
        `<div class="spell" style="border-left-color: ${s.color}">${s.name}</div>`
    ).join('');
});
