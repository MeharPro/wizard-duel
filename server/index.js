const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONSTANTS ---
const PORT = process.env.PORT || 3000;
const TICK_RATE = 60;
const SPELL_COOLDOWN = 800;
const PLAYER_SPEED = 12;
const JUMP_FORCE = 12;
const GRAVITY = 25;
const ARENA_SIZE = 50;
const RESPAWN_TIME = 5000; // 5 seconds

// --- CHARACTERS ---
const CHARACTERS = {
    'hary': { name: 'Hary Potter', color: 0xff0000, robeColor: 0x740001, house: 'gryffindor' },
    'hermine': { name: 'Hermine Granger', color: 0xff6600, robeColor: 0x740001, house: 'gryffindor' },
    'roon': { name: 'Roon Weasley', color: 0xff9900, robeColor: 0x740001, house: 'gryffindor' },
    'darco': { name: 'Darco Malfoy', color: 0x00ff00, robeColor: 0x1a472a, house: 'slytherin' },
    'volmort': { name: 'Lord volemort', color: 0x000000, robeColor: 0x111111, house: 'slytherin' },
    'snape': { name: 'Severus Snape', color: 0x333333, robeColor: 0x000000, house: 'slytherin' },
    'humbledore': { name: 'Albus Humbledore', color: 0x9999ff, robeColor: 0x4444aa, house: 'gryffindor' },
    'cuna': { name: 'Cuna Lovegood', color: 0x0099ff, robeColor: 0x0e1a40, house: 'ravenclaw' },
    'cedric': { name: 'Cedric Diggory', color: 0xffcc00, robeColor: 0xecb939, house: 'hufflepuff' },
    'dellatrix': { name: 'Dellatrix Lestrange', color: 0x990099, robeColor: 0x1a472a, house: 'slytherin' }
};

// ============================================================
// COMPREHENSIVE SPELL DICTIONARY
// ============================================================
const SPELLS = {
    // Offensive
    'expelliarmus': { type: 'expelliarmus', color: 0xff0000, speed: 30, effect: 'disarm', damage: 0 },
    'stupefy': { type: 'stupefy', color: 0xff3333, speed: 28, effect: 'stun', damage: 10 },
    'incendio': { type: 'incendio', color: 0xff6600, speed: 25, effect: 'burn', damage: 20 },
    'confringo': { type: 'confringo', color: 0xff3300, speed: 22, effect: 'explode', damage: 35 },
    'bombarda': { type: 'bombarda', color: 0xcc0000, speed: 20, effect: 'blast', damage: 40 },
    'reducto': { type: 'reducto', color: 0xff00ff, speed: 26, effect: 'destroy', damage: 30 },
    'sectumsempra': { type: 'sectumsempra', color: 0x990000, speed: 35, effect: 'slash', damage: 50 },
    'flipendo': { type: 'flipendo', color: 0x00ffff, speed: 28, effect: 'knockback', damage: 10 },
    'depulso': { type: 'depulso', color: 0x00cccc, speed: 26, effect: 'push', damage: 5 },
    'diffindo': { type: 'diffindo', color: 0xcc6666, speed: 30, effect: 'cut', damage: 25 },
    'petrificus': { type: 'petrificus', color: 0x888888, speed: 24, effect: 'petrify', damage: 0 },
    'glacius': { type: 'glacius', color: 0x66ccff, speed: 22, effect: 'freeze', damage: 15 },
    'aguamenti': { type: 'aguamenti', color: 0x0099ff, speed: 25, effect: 'water', damage: 10 },
    'ventus': { type: 'ventus', color: 0xcccccc, speed: 35, effect: 'wind', damage: 10 },
    'levicorpus': { type: 'levicorpus', color: 0xcc66ff, speed: 24, effect: 'levitate', damage: 0 },
    'impedimenta': { type: 'impedimenta', color: 0x9999cc, speed: 26, effect: 'slow', damage: 5 },
    'incarcerous': { type: 'incarcerous', color: 0x996633, speed: 20, effect: 'bind', damage: 0 },
    'oppugno': { type: 'oppugno', color: 0xffcc00, speed: 25, effect: 'attack', damage: 20 },
    'rictusempra': { type: 'rictusempra', color: 0xffff99, speed: 22, effect: 'tickle', damage: 5 },
    'tarantallegra': { type: 'tarantallegra', color: 0xff99ff, speed: 20, effect: 'dance', damage: 0 },
    'serpensortia': { type: 'serpensortia', color: 0x00ff00, speed: 18, effect: 'snake', damage: 20 },
    'locomotormortis': { type: 'locomotormortis', color: 0x666699, speed: 22, effect: 'leglock', damage: 0 },
    'confundus': { type: 'confundus', color: 0xff99cc, speed: 24, effect: 'confuse', damage: 0 },
    'obliviate': { type: 'obliviate', color: 0xcc99ff, speed: 22, effect: 'forget', damage: 0 },
    'fiendfyre': { type: 'fiendfyre', color: 0xff0000, speed: 15, effect: 'hellfire', damage: 80 },

    // Defensive
    'protego': { type: 'protego', color: 0x0066ff, isShield: true, effect: 'shield', damage: 0 },
    'salvio': { type: 'salvio', color: 0x6666ff, isShield: true, effect: 'hexshield', damage: 0 },

    // Healing
    'episkey': { type: 'episkey', color: 0x00ff99, isUtility: true, effect: 'heal', damage: -30 },
    'vulnera': { type: 'vulnera', color: 0x00ffcc, isUtility: true, effect: 'heal', damage: -50 },

    // Utility
    'lumos': { type: 'lumos', color: 0xffffcc, isUtility: true, effect: 'light', damage: 0 },
    'nox': { type: 'nox', color: 0x333333, isUtility: true, effect: 'dark', damage: 0 },
    'accio': { type: 'accio', color: 0x00ff00, speed: 40, effect: 'pull', damage: 0 },
    'alohomora': { type: 'alohomora', color: 0xffcc00, isUtility: true, effect: 'unlock', damage: 0 },
    'reparo': { type: 'reparo', color: 0x99ccff, isUtility: true, effect: 'repair', damage: 0 },
    'apparate': { type: 'apparate', color: 0x9966ff, isUtility: true, effect: 'teleport', damage: 0 },
    'ascendio': { type: 'ascendio', color: 0x99ffff, isUtility: true, effect: 'rise', damage: 0 },
    'wingardium': { type: 'wingardium', color: 0xffff99, speed: 25, effect: 'levitate', damage: 0 },
    'expectopatronum': { type: 'patronus', color: 0xffffff, speed: 20, effect: 'patronus', damage: 0 },
    'riddikulus': { type: 'riddikulus', color: 0xff99ff, speed: 22, effect: 'boggart', damage: 0 },

    // Dark Arts
    'avadakedavra': { type: 'avadakedavra', color: 0x00ff00, speed: 40, effect: 'kill', damage: 100 },
    'crucio': { type: 'crucio', color: 0xff0066, speed: 30, effect: 'torture', damage: 40 },
    'imperio': { type: 'imperio', color: 0x9900ff, speed: 28, effect: 'control', damage: 0 },
    'morsmorde': { type: 'morsmorde', color: 0x00ff00, isUtility: true, effect: 'darkmark', damage: 0 }
};

// ENHANCED FUZZY MATCHING with comprehensive patterns
const FUZZY_PATTERNS = {
    // Offensive spells - multiple phonetic variations
    'expelliarmus': ['expelliarmus', 'expel', 'armus', 'expeli', 'spell arm', 'expelia', 'expell', 'spell', 'disarm'],
    'stupefy': ['stupefy', 'stupify', 'stupid', 'stupe', 'stup', 'stoopy', 'stupi', 'stoofy'],
    'incendio': ['incendio', 'incendi', 'in send', 'insend', 'send yo', 'cendy', 'fire', 'incend', 'ensen'],
    'confringo': ['confringo', 'confrin', 'con fring', 'confr', 'fringo', 'confer'],
    'bombarda': ['bombarda', 'bomb', 'barda', 'bomber', 'bombar', 'boom'],
    'reducto': ['reducto', 'reduce', 'reduct', 'reduc', 'duct'],
    'sectumsempra': ['sectumsempra', 'sectum', 'sempra', 'sect', 'sectom', 'secto', 'septra', 'sector', 'sectem', 'cut him', 'cut them'],
    'flipendo': ['flipendo', 'flip', 'flipe', 'fli pendo', 'flipen', 'flipping'],
    'depulso': ['depulso', 'depul', 'pulse', 'push'],
    'diffindo': ['diffindo', 'diffin', 'cut', 'difin', 'defend'],
    'petrificus': ['petrificus', 'petrify', 'petri', 'terrific', 'petrific', 'stone', 'petra'],
    'glacius': ['glacius', 'glace', 'glacier', 'glaci', 'freeze', 'ice', 'glass'],
    'aguamenti': ['aguamenti', 'agua', 'aqua', 'aguament', 'water', 'aquaman'],
    'ventus': ['ventus', 'vent', 'wind', 'ventos', 'venus'],
    'levicorpus': ['levicorpus', 'levi corp', 'levicor', 'levy', 'levicore', 'levitate body'],
    'impedimenta': ['impedimenta', 'impedi', 'impede', 'impedi menta', 'slow'],
    'incarcerous': ['incarcerous', 'incarcer', 'chain', 'incarcera', 'carcerous', 'bind'],
    'oppugno': ['oppugno', 'oppu', 'attack', 'opugno', 'pugno'],
    'rictusempra': ['rictusempra', 'rictus', 'tickle', 'rickto', 'recto'],
    'tarantallegra': ['tarantallegra', 'tarant', 'dance', 'tarantula', 'allegra', 'taran'],
    'serpensortia': ['serpensortia', 'serpen', 'snake', 'serpent', 'sortia'],
    'locomotormortis': ['locomotormortis', 'locomotor', 'leg lock', 'loco', 'mortis'],
    'confundus': ['confundus', 'confuse', 'confund', 'confundis', 'confused'],
    'obliviate': ['obliviate', 'oblivi', 'forget', 'oblivion', 'olivia'],
    'fiendfyre': ['fiendfyre', 'fiend', 'hellfire', 'fiendfire', 'friend fire'],

    // Defensive
    'protego': ['protego', 'protect', 'pro tego', 'protec', 'protec go', 'shield', 'proto'],
    'salvio': ['salvio', 'save', 'salv', 'salveo', 'safety'],

    // Healing
    'episkey': ['episkey', 'epis', 'heal', 'episk', 'fix', 'epi'],
    'vulnera': ['vulnera', 'vulner', 'wound', 'vulner', 'heal wounds'],

    // Utility
    'lumos': ['lumos', 'loom', 'lomos', 'lumis', 'light', 'luma', 'luminous'],
    'nox': ['nox', 'dark', 'nocks', 'knox', 'knocks', 'off'],
    'accio': ['accio', 'aki', 'axi', 'axio', 'akio', 'asio', 'come', 'summon', 'atio'],
    'alohomora': ['alohomora', 'aloho', 'unlock', 'aloh', 'alo', 'aloe', 'open'],
    'reparo': ['reparo', 'repair', 'repar', 'fix', 'raparo', 'repare'],
    'apparate': ['apparate', 'apparat', 'teleport', 'appear', 'blink', 'appar'],
    'ascendio': ['ascendio', 'ascend', 'rise', 'up', 'ascend yo', 'ascendi'],
    'wingardium': ['wingardium', 'wingar', 'winged', 'wing guard', 'wingardia', 'wing', 'levitate'],
    'expectopatronum': ['expectopatronum', 'expecto', 'patronum', 'patron', 'expect', 'patronus', 'expec'],
    'riddikulus': ['riddikulus', 'ridiculous', 'ridik', 'ridic', 'ridicule', 'ridd'],

    // Dark Arts - very important to catch
    'avadakedavra': ['avadakedavra', 'avada', 'kedavra', 'cadaver', 'aveda', 'abra', 'killing', 'avada kadabra', 'kill'],
    'crucio': ['crucio', 'cruci', 'crucible', 'crew she', 'torture', 'cruc', 'cruchio', 'cruciatus'],
    'imperio': ['imperio', 'emperi', 'emperor', 'in perio', 'control', 'emporio', 'imperius'],
    'morsmorde': ['morsmorde', 'mors', 'dark mark', 'morse', 'mordre', 'morsmord']
};

// Match spell with comprehensive fuzzy logic
function matchSpell(transcript) {
    if (!transcript) return null;

    const clean = transcript.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const words = clean.split(/\s+/);
    const combined = clean.replace(/\s+/g, '');

    // 1. Direct match (no spaces)
    if (SPELLS[combined]) return SPELLS[combined];

    // 2. Each word direct match
    for (const word of words) {
        if (SPELLS[word]) return SPELLS[word];
    }

    // 3. Fuzzy pattern match
    for (const [spellName, patterns] of Object.entries(FUZZY_PATTERNS)) {
        for (const pattern of patterns) {
            // Check if pattern exists in original transcript
            if (clean.includes(pattern)) {
                return SPELLS[spellName];
            }
            // Check each word
            for (const word of words) {
                if (word.includes(pattern) || pattern.includes(word)) {
                    if (word.length >= 3) return SPELLS[spellName];
                }
            }
        }
    }

    // 4. Levenshtein distance (typo tolerance)
    for (const spellName of Object.keys(SPELLS)) {
        for (const word of words) {
            if (word.length >= 4) {
                const dist = levenshtein(word, spellName);
                if (dist <= 3) return SPELLS[spellName];
                // Also check against patterns
                const patterns = FUZZY_PATTERNS[spellName] || [];
                for (const p of patterns) {
                    if (levenshtein(word, p) <= 2) return SPELLS[spellName];
                }
            }
        }
    }

    // 5. Substring match for longer spell names
    for (const spellName of Object.keys(SPELLS)) {
        if (spellName.length > 6 && combined.includes(spellName.substring(0, 5))) {
            return SPELLS[spellName];
        }
    }

    return null;
}

function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
                ? matrix[i - 1][j - 1]
                : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[b.length][a.length];
}

app.use(express.static(path.join(__dirname, '../public')));

// --- GAME STATE ---
class GameRoom {
    constructor(roomId, hostId, hostName, gameMode = 'endless', killTarget = 0, timeLimit = 0) {
        this.id = roomId;
        this.hostId = hostId;
        this.hostName = hostName;
        this.players = {};
        this.projectiles = [];
        this.effects = [];
        this.projectileIdCounter = 0;
        this.effectIdCounter = 0;
        this.createdAt = Date.now();

        // Game mode settings
        this.gameMode = gameMode;
        this.killTarget = killTarget;
        this.timeLimit = timeLimit; // in seconds
        this.startTime = Date.now();
        this.gameEnded = false;
        this.winner = null;
    }

    addPlayer(socket, name, character) {
        const charData = CHARACTERS[character] || CHARACTERS['hary'];
        this.players[socket.id] = {
            id: socket.id,
            x: (Math.random() - 0.5) * 30,
            z: (Math.random() - 0.5) * 30,
            y: 0,
            vy: 0,
            rot: 0,
            state: 'IDLE',
            health: 100,
            maxHealth: 100,
            name: name || 'Wizard',
            character: character || 'hary',
            characterData: charData,
            activeSpell: null,
            isGrounded: true,
            lumosActive: false,
            statusEnd: 0,
            kills: 0,
            deaths: 0,
            avadaUses: 0,
            respawnTime: 0
        };
        socket.join(this.id);
    }

    removePlayer(socketId) {
        delete this.players[socketId];
    }

    update() {
        const now = Date.now();
        const dt = 1 / TICK_RATE;

        // Check win conditions
        if (!this.gameEnded) {
            this.checkWinConditions(now);
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.z += p.vz * dt;
            p.lifetime -= dt;

            if (Math.hypot(p.x, p.z) > ARENA_SIZE + 10 || p.lifetime <= 0) {
                if (['confringo', 'bombarda', 'reducto', 'fiendfyre'].includes(p.type)) {
                    this.effects.push({ id: this.effectIdCounter++, type: 'explosion', x: p.x, y: 2, z: p.z, color: SPELLS[p.type]?.color || 0xff0000, lifetime: 0.5 });
                }
                this.projectiles.splice(i, 1);
                continue;
            }

            // Collision
            for (const id in this.players) {
                const player = this.players[id];
                if (p.ownerId === id || player.state === 'DEAD') continue;

                const dist = Math.hypot(p.x - player.x, p.z - player.z);
                if (dist < 2 && Math.abs(2 - (player.y + 2)) < 4) {
                    // SHIELD LOGIC: Protego/Salvio blocks projectile matching spells
                    if (player.activeSpell === 'protego' || player.activeSpell === 'salvio') {
                        // Shield takes the hit
                        player.activeSpell = null; // Break shield on hit
                        this.effects.push({ id: this.effectIdCounter++, type: 'shield_break', x: player.x, y: 2, z: player.z, lifetime: 0.5 });
                    } else {
                        // Direct hit
                        this.applySpellEffect(player, p.type, p.ownerId);
                    }
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Cleanup effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].lifetime -= dt;
            if (this.effects[i].lifetime <= 0) this.effects.splice(i, 1);
        }

        // Player physics & respawn
        for (const id in this.players) {
            const p = this.players[id];

            // Respawn check
            if (p.state === 'DEAD' && p.respawnTime > 0 && now >= p.respawnTime) {
                this.respawnPlayer(p);
            }

            // Gravity
            if (!p.isGrounded && p.state !== 'DEAD') {
                p.vy -= GRAVITY * dt;
                p.y += p.vy * dt;
                if (p.y <= 0) {
                    p.y = 0;
                    p.vy = 0;
                    p.isGrounded = true;
                }
            }

            // Status expiry
            if (now > p.statusEnd && ['DISARMED', 'STUNNED', 'FROZEN', 'DANCING', 'SILENCED', 'CONFUSED', 'SLOWED', 'LEVITATING'].includes(p.state)) {
                p.state = 'IDLE';
            }

            // Slow regen
            if (p.state !== 'DEAD' && p.health < p.maxHealth) {
                p.health = Math.min(p.maxHealth, p.health + 0.3 * dt);
            }
        }
    }

    respawnPlayer(player) {
        player.x = (Math.random() - 0.5) * 30;
        player.z = (Math.random() - 0.5) * 30;
        player.y = 0;
        player.vy = 0;
        player.health = 100;
        player.state = 'IDLE';
        player.respawnTime = 0;
        player.isGrounded = true;
        player.activeSpell = null;
        player.avadaUses = 0; // Reset AK usage on respawn
    }

    checkWinConditions(now) {
        const players = Object.values(this.players);
        if (players.length === 0) return;

        // Kill-based win
        if (this.gameMode === 'kills' && this.killTarget > 0) {
            for (const p of players) {
                if (p.kills >= this.killTarget) {
                    this.endGame(p);
                    return;
                }
            }
        }

        // Time-based win
        if (this.gameMode === 'time' && this.timeLimit > 0) {
            const elapsed = (now - this.startTime) / 1000;
            if (elapsed >= this.timeLimit) {
                // Find player with most kills
                const sorted = players.sort((a, b) => b.kills - a.kills);
                this.endGame(sorted[0]);
                return;
            }
        }
    }

    endGame(winner) {
        this.gameEnded = true;
        this.winner = winner ? winner.name : 'Nobody';
        io.to(this.id).emit('game_over', {
            winner: this.winner,
            winnerId: winner?.id,
            gameMode: this.gameMode,
            killTarget: this.killTarget,
            timeLimit: this.timeLimit
        });
    }

    applySpellEffect(target, spellType, casterId) {
        const now = Date.now();
        const spell = SPELLS[spellType];
        if (!spell) return;

        this.effects.push({ id: this.effectIdCounter++, type: 'hit', spellType, x: target.x, y: 2, z: target.z, color: spell.color, lifetime: 0.5 });

        // Apply damage
        if (spell.damage !== 0) {
            target.health = Math.max(0, Math.min(target.maxHealth, target.health - spell.damage));
        }

        // Effects
        switch (spell.effect) {
            case 'disarm': target.state = 'DISARMED'; target.statusEnd = now + 3000; break;
            case 'stun': target.state = 'STUNNED'; target.statusEnd = now + 2000; break;
            case 'freeze': case 'petrify': case 'bind': case 'leglock': target.state = 'FROZEN'; target.statusEnd = now + 3000; break;
            case 'tickle': target.state = 'STUNNED'; target.statusEnd = now + 2000; break;
            case 'slash': case 'cut': target.state = 'STUNNED'; target.statusEnd = now + 500; break;
            case 'water':
                const waterKb = Math.atan2(target.x - (this.players[casterId]?.x || 0), target.z - (this.players[casterId]?.z || 0));
                target.x += Math.sin(waterKb) * 4; target.z += Math.cos(waterKb) * 4;
                break;
            case 'patronus':
                const patKb = Math.atan2(target.x - (this.players[casterId]?.x || 0), target.z - (this.players[casterId]?.z || 0));
                target.x += Math.sin(patKb) * 15; target.z += Math.cos(patKb) * 15;
                target.vy = 5; target.isGrounded = false;
                break;
            case 'knockback': case 'push': case 'wind':
                const kb = Math.atan2(target.x - (this.players[casterId]?.x || 0), target.z - (this.players[casterId]?.z || 0));
                target.x += Math.sin(kb) * 8; target.z += Math.cos(kb) * 8;
                target.vy = 5; target.isGrounded = false; break;
            case 'explode': case 'blast': case 'destroy': case 'hellfire':
                const exp = Math.atan2(target.x - (this.players[casterId]?.x || 0), target.z - (this.players[casterId]?.z || 0));
                target.x += Math.sin(exp) * 6; target.z += Math.cos(exp) * 6; break;
            case 'levitate': target.state = 'LEVITATING'; target.vy = 10; target.isGrounded = false; target.statusEnd = now + 5000; break;
            case 'pull':
                if (this.players[casterId]) {
                    const dx = this.players[casterId].x - target.x, dz = this.players[casterId].z - target.z;
                    const d = Math.hypot(dx, dz);
                    if (d > 0) { target.x += (dx / d) * 12; target.z += (dz / d) * 12; }
                } break;
            case 'kill': target.health = 0; break;
            case 'torture': target.health = Math.max(0, target.health - 40); target.state = 'STUNNED'; target.statusEnd = now + 1500; break;
            case 'control': case 'confuse': target.state = 'CONFUSED'; target.statusEnd = now + 4000; break;
            case 'dance': target.state = 'DANCING'; target.statusEnd = now + 5000; break;
            case 'slow': target.state = 'SLOWED'; target.statusEnd = now + 3000; break;
            case 'heal': if (target.state === 'DEAD') { target.state = 'IDLE'; target.health = 30; } break;
        }

        // Death handling
        if (target.health <= 0 && target.state !== 'DEAD') {
            target.state = 'DEAD';
            target.deaths++;
            target.respawnTime = now + RESPAWN_TIME;

            // Credit kill
            if (this.players[casterId]) {
                this.players[casterId].kills++;
            }

            // Notify of death
            io.to(target.id).emit('player_died', {
                killer: this.players[casterId]?.name || 'Unknown',
                respawnIn: RESPAWN_TIME
            });
        }
    }

    handleInput(socketId, data) {
        const p = this.players[socketId];
        if (!p || ['STUNNED', 'FROZEN', 'DEAD', 'PETRIFIED'].includes(p.state)) return;

        p.rot = data.rotation;
        let dx = 0, dz = 0;
        const speedMod = p.state === 'SLOWED' ? 0.5 : (p.state === 'DANCING' ? 0.3 : 1);

        if (data.keys.w) { dx += Math.sin(p.rot); dz += Math.cos(p.rot); }
        if (data.keys.s) { dx -= Math.sin(p.rot); dz -= Math.cos(p.rot); }
        if (data.keys.a) { dx += Math.sin(p.rot + Math.PI / 2); dz += Math.cos(p.rot + Math.PI / 2); }
        if (data.keys.d) { dx += Math.sin(p.rot - Math.PI / 2); dz += Math.cos(p.rot - Math.PI / 2); }
        if (p.state === 'CONFUSED') { dx = -dx; dz = -dz; }

        if (data.keys.space && p.isGrounded && p.state !== 'LEVITATING') {
            p.vy = JUMP_FORCE; p.isGrounded = false; p.y += 0.05;
        }

        if (dx !== 0 || dz !== 0) {
            const len = Math.hypot(dx, dz);
            const speed = PLAYER_SPEED * speedMod * (1 / TICK_RATE);
            p.x -= (dx / len) * speed; p.z -= (dz / len) * speed;
            const dist = Math.hypot(p.x, p.z);
            if (dist > ARENA_SIZE) { p.x *= ARENA_SIZE / dist; p.z *= ARENA_SIZE / dist; }
        }
    }

    handleCast(socketId, transcript) {
        const p = this.players[socketId];
        if (!p || ['STUNNED', 'DISARMED', 'FROZEN', 'DEAD', 'SILENCED'].includes(p.state)) return;

        const now = Date.now();
        if (p.lastCastTime && now - p.lastCastTime < SPELL_COOLDOWN) return;

        const spell = matchSpell(transcript);
        if (!spell) {
            io.to(socketId).emit('cast_fail', { message: `Unknown: "${transcript}"` });
            return;
        }

        // ONE-TIME USE CHECK FOR AVADA KEDAVRA
        if (spell.type === 'avadakedavra') {
            if (p.avadaUses >= 1) {
                io.to(socketId).emit('cast_fail', { message: "Avada Kedavra is limited to once per life!" });
                return;
            }
            p.avadaUses++;
        }

        p.lastCastTime = now;
        io.to(socketId).emit('cooldown', { spell: spell.type, duration: SPELL_COOLDOWN });
        io.to(socketId).emit('cast_success', { spell: spell.type });

        if (spell.isShield) {
            p.activeSpell = spell.type;
            setTimeout(() => { if (this.players[socketId]) this.players[socketId].activeSpell = null; }, 4000);
        } else if (spell.isUtility) {
            this.handleUtilitySpell(socketId, spell);
        } else if (spell.speed) {
            this.projectiles.push({
                id: this.projectileIdCounter++,
                ownerId: socketId,
                type: spell.type,
                x: p.x - Math.sin(p.rot) * 1.5,
                z: p.z - Math.cos(p.rot) * 1.5,
                vx: -Math.sin(p.rot) * spell.speed,
                vz: -Math.cos(p.rot) * spell.speed,
                lifetime: 5.0
            });
        }
    }

    handleUtilitySpell(socketId, spell) {
        const p = this.players[socketId];
        switch (spell.effect) {
            case 'light': p.lumosActive = true; break;
            case 'dark': p.lumosActive = false; break;
            case 'teleport': p.x = (Math.random() - 0.5) * 40; p.z = (Math.random() - 0.5) * 40; break;
            case 'rise': p.vy = 15; p.isGrounded = false; break;
            // Healing spells
            case 'heal':
                const healAmount = (spell.type === 'vulnera') ? 50 : 30;
                p.health = Math.min(p.maxHealth, p.health + healAmount);
                break;
        }
    }

    handleRespawn(socketId) {
        const p = this.players[socketId];
        if (p && p.state === 'DEAD') {
            this.respawnPlayer(p);
        }
    }
}

const rooms = new Map();

// Game loop
setInterval(() => {
    rooms.forEach((room) => {
        room.update();
        io.to(room.id).emit('snapshot', {
            players: Object.values(room.players).map(p => ({
                id: p.id, x: p.x, y: p.y, z: p.z, rot: p.rot,
                state: p.state, health: p.health, maxHealth: p.maxHealth,
                name: p.name, character: p.character, characterData: p.characterData,
                activeSpell: p.activeSpell, lumosActive: p.lumosActive,
                kills: p.kills, deaths: p.deaths
            })),
            projectiles: room.projectiles,
            effects: room.effects,
            timestamp: Date.now()
        });
    });
}, 1000 / TICK_RATE);

// Socket handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    let currentRoomId = null;

    // Get room list
    socket.on('get_rooms', () => {
        const roomList = [];
        rooms.forEach((room, id) => {
            roomList.push({
                id: id,
                host: room.hostName,
                players: Object.keys(room.players).length,
                maxPlayers: 8
            });
        });
        socket.emit('room_list', roomList);
    });

    // Host a game
    socket.on('host_game', ({ name, character, roomName, gameMode, killTarget, timeLimit }) => {
        const roomId = roomName || `room_${Date.now()}`;
        if (rooms.has(roomId)) {
            socket.emit('host_error', { message: 'Room already exists' });
            return;
        }

        const room = new GameRoom(roomId, socket.id, name, gameMode || 'endless', killTarget || 0, timeLimit || 0);
        rooms.set(roomId, room);
        room.addPlayer(socket, name, character);
        currentRoomId = roomId;

        socket.emit('joined', {
            room: roomId,
            id: socket.id,
            isHost: true,
            gameMode: room.gameMode,
            killTarget: room.killTarget,
            timeLimit: room.timeLimit
        });
        socket.emit('character_list', Object.entries(CHARACTERS).map(([k, v]) => ({ id: k, ...v })));
        console.log(`${name} hosted ${roomId} [${gameMode}, kills:${killTarget}, time:${timeLimit}s]`);
    });

    // Join a game
    socket.on('join_game', ({ name, character, roomId }) => {
        if (!rooms.has(roomId)) {
            socket.emit('join_error', { message: 'Room not found' });
            return;
        }

        const room = rooms.get(roomId);
        if (Object.keys(room.players).length >= 8) {
            socket.emit('join_error', { message: 'Room is full' });
            return;
        }

        room.addPlayer(socket, name, character);
        currentRoomId = roomId;

        socket.emit('joined', { room: roomId, id: socket.id, isHost: false });
        socket.emit('character_list', Object.entries(CHARACTERS).map(([k, v]) => ({ id: k, ...v })));
        console.log(`${name} joined ${roomId}`);
    });

    // Legacy join (backwards compatible)
    socket.on('join_room', ({ room, name }) => {
        if (currentRoomId) {
            rooms.get(currentRoomId)?.removePlayer(socket.id);
        }
        currentRoomId = room || 'default';
        if (!rooms.has(currentRoomId)) {
            rooms.set(currentRoomId, new GameRoom(currentRoomId, socket.id, name));
        }
        rooms.get(currentRoomId).addPlayer(socket, name, 'hary');
        socket.emit('joined', { room: currentRoomId, id: socket.id });
        socket.emit('character_list', Object.entries(CHARACTERS).map(([k, v]) => ({ id: k, ...v })));
    });

    socket.on('request_respawn', () => {
        if (currentRoomId && rooms.has(currentRoomId)) {
            rooms.get(currentRoomId).handleRespawn(socket.id);
        }
    });

    socket.on('disconnect', () => {
        if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            room.removePlayer(socket.id);
            if (Object.keys(room.players).length === 0) {
                rooms.delete(currentRoomId);
            }
        }
    });

    socket.on('input', (data) => {
        if (currentRoomId && rooms.has(currentRoomId)) {
            rooms.get(currentRoomId).handleInput(socket.id, data);
        }
    });

    socket.on('voice_cast', (data) => {
        if (currentRoomId && rooms.has(currentRoomId)) {
            rooms.get(currentRoomId).handleCast(socket.id, data.transcript);
        }
    });
});

server.listen(PORT, () => {
    console.log(`✨ Wizard Duel Arena running on http://localhost:${PORT}`);
    console.log(`🧙 ${Object.keys(CHARACTERS).length} characters available`);
    console.log(`📚 ${Object.keys(SPELLS).length} spells loaded`);
});
