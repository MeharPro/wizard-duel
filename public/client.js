import { initWorld, updateWorld } from './world.js';

const socket = io();

// State
const keys = { w: false, a: false, s: false, d: false, space: false };
const state = {
    rotation: 0,
    pitch: 0,
    isCasting: false,
    joined: false,
    isDead: false,
    selectedCharacter: 'hary',
    myId: null
};

// Elements
const canvas = document.querySelector('#game-container');
const lobbyOverlay = document.getElementById('lobby-overlay');
const uiOverlay = document.getElementById('ui-overlay');
const deathOverlay = document.getElementById('death-overlay');
const scoreboardOverlay = document.getElementById('scoreboard-overlay');
const usernameInput = document.getElementById('username-input');
const roomNameInput = document.getElementById('room-name-input');
const joinBtn = document.getElementById('join-btn'); // Host button
const roomListEl = document.getElementById('room-list');
const healthFill = document.getElementById('health-fill');
const statusText = document.getElementById('status-text');
const playerNameEl = document.getElementById('player-name');
const killerNameEl = document.getElementById('killer-name');
const respawnCountdownEl = document.getElementById('respawn-countdown');
const respawnBtn = document.getElementById('respawn-btn');
const characterGrid = document.getElementById('character-grid');
const timeLimitInput = document.getElementById('time-limit');
const avadaLimitInput = document.getElementById('avada-limit');
const gameTimerEl = document.getElementById('game-timer');
const inviteLinkBtn = document.getElementById('invite-link-btn');
const activeRoomIdEl = document.getElementById('active-room-id');
const transcriptionEl = document.getElementById('transcription'); // Added back for speech recognition feedback

// Setup Audio Context for Voice
let audioContext;
let analyser;

// Voice Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        state.isCasting = true;
        transcriptionEl.textContent = '🎙️ Listening...';
        transcriptionEl.style.color = '#ff6666';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice Command:', transcript);
        transcriptionEl.textContent = `✨ "${transcript}"`;
        transcriptionEl.style.color = '#ffd700';
        if (state.joined && !state.isDead) {
            socket.emit('cast', transcript);
        }
    };

    recognition.onend = () => {
        state.isCasting = false;
        // If we want continuous listening, we'd restart here, but the new code implies push-to-talk
        // if (state.isCasting) recognition.start();
    };

    recognition.onerror = (e) => {
        state.isCasting = false;
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
            transcriptionEl.textContent = '⚠️ ' + e.error;
            transcriptionEl.style.color = '#ff6666';
        }
    };
} else {
    alert("Speech Recognition API not supported in this browser. Use Chrome.");
}

// --- LOBBY & JOINING ---

// Check for invite link
const urlParams = new URLSearchParams(window.location.search);
const inviteRoomId = urlParams.get('room');
if (inviteRoomId) {
    roomNameInput.value = inviteRoomId;
    // Auto-select "Join" tab functionality if needed, or just highlight it
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="join"]').classList.add('active');
    document.getElementById('join-panel').classList.add('active');
}

// Character Selection
characterGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.character-option');
    if (option) {
        document.querySelectorAll('.character-option').forEach(el => el.classList.remove('selected'));
        option.classList.add('selected');
        state.selectedCharacter = option.dataset.character;
    }
});

// Refresh Rooms
function refreshRooms() {
    socket.emit('get_rooms');
}
setInterval(refreshRooms, 3000);
refreshRooms();

socket.on('room_list', (rooms) => {
    roomListEl.innerHTML = '';
    if (rooms.length === 0) {
        roomListEl.innerHTML = '<div class="no-rooms">No active games. Host one!</div>';
    } else {
        rooms.forEach(room => {
            const li = document.createElement('div');
            li.className = 'room-item';
            li.innerHTML = `
                <div>
                    <strong>${room.id}</strong> (Host: ${room.host})<br>
                    <small>${room.players}/${room.maxPlayers} Wizards | Time: ${Math.floor(room.timeLeft / 60)}:${(room.timeLeft % 60).toString().padStart(2, '0')}</small>
                </div>
                <button onclick="joinRoom('${room.id}')">Join</button>
            `;
            roomListEl.appendChild(li);
        });
    }
});

window.joinRoom = (roomId) => {
    const name = usernameInput.value || 'Wizard';
    socket.emit('join_game', { name, character: state.selectedCharacter, roomId });
};

joinBtn.addEventListener('click', () => {
    const name = usernameInput.value || 'Wizard';
    const roomName = roomNameInput.value.trim();

    // Get Settings
    const settings = {
        timeLimit: parseInt(timeLimitInput.value) * 60, // Convert mins to seconds
        avadaLimit: parseInt(avadaLimitInput.value)
    };

    socket.emit('host_game', { name, character: state.selectedCharacter, roomName, settings });
});

socket.on('host_error', (data) => alert(data.message));
socket.on('join_error', (data) => alert(data.message));

function setMyId(id) {
    state.myId = id;
}

socket.on('joined', (data) => {
    state.joined = true;
    state.isDead = false;
    setMyId(data.id);
    lobbyOverlay.style.display = 'none';
    deathOverlay.style.display = 'none';
    uiOverlay.style.display = 'flex';
    playerNameEl.textContent = usernameInput.value || 'Wizard';
    activeRoomIdEl.textContent = `Room: ${data.room}`;

    // Setup Invite Link
    inviteLinkBtn.onclick = () => {
        const url = `${window.location.origin}?room=${data.room}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Invite link copied to clipboard!');
        });
    };

    document.body.requestPointerLock();
    initWorld(canvas);
});

socket.on('game_over', (data) => {
    alert("GAME OVER! Check standard console for scoreboard.");
    setTimeout(() => {
        window.location.reload();
    }, 5000);
});

// --- GAMEPLAY UI ---

respawnBtn.addEventListener('click', () => {
    if (!respawnBtn.disabled) {
        socket.emit('request_respawn'); // Changed to request_respawn as per original
        deathOverlay.style.display = 'none';
        state.isDead = false;
    }
});

socket.on('player_died', ({ killer, respawnIn }) => {
    state.isDead = true;
    deathOverlay.style.display = 'flex';
    killerNameEl.textContent = killer;
    respawnBtn.disabled = true;

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
