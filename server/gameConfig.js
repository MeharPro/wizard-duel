/**
 * Game Configuration - The ONLY file the AI model can modify
 * All game mechanics remain in index.js - this file contains ONLY tunable assets
 */

const DEFAULT_CONFIG = {
    // Meta information
    meta: {
        name: "Wizard Duel Arena",
        description: "A magical voice-controlled battle game",
        theme: "wizard",
        createdAt: null,
        createdBy: null
    },

    // Character definitions (visual only - no stats that affect gameplay)
    characters: {
        'hary': { name: 'Hary Potter', color: 0xff0000, robeColor: 0x740001, house: 'gryffindor' },
        'hermine': { name: 'Hermine Granger', color: 0xff6600, robeColor: 0x740001, house: 'gryffindor' },
        'roon': { name: 'Roon Weasley', color: 0xff9900, robeColor: 0x740001, house: 'gryffindor' },
        'darco': { name: 'Darco Malfoy', color: 0x00ff00, robeColor: 0x1a472a, house: 'slytherin' },
        'volmort': { name: 'Lord Volemort', color: 0x000000, robeColor: 0x111111, house: 'slytherin' },
        'snape': { name: 'Severus Snape', color: 0x333333, robeColor: 0x000000, house: 'slytherin' },
        'humbledore': { name: 'Albus Humbledore', color: 0x9999ff, robeColor: 0x4444aa, house: 'gryffindor' },
        'cuna': { name: 'Cuna Lovegood', color: 0x0099ff, robeColor: 0x0e1a40, house: 'ravenclaw' },
        'cedric': { name: 'Cedric Diggory', color: 0xffcc00, robeColor: 0xecb939, house: 'hufflepuff' },
        'dellatrix': { name: 'Dellatrix Lestrange', color: 0x990099, robeColor: 0x1a472a, house: 'slytherin' }
    },

    // Spell visual and voice definitions
    // NOTE: damage, speed, effect type are LOCKED - only visual/voice aspects are tunable
    spells: {
        // Offensive
        'expelliarmus': { voiceCommands: ['expelliarmus', 'expel', 'disarm'], displayName: 'Expelliarmus', color: 0xff0000, projectileType: 'beam', trailParticles: true },
        'stupefy': { voiceCommands: ['stupefy', 'stupify', 'stupe'], displayName: 'Stupefy', color: 0xff3333, projectileType: 'bolt', trailParticles: true },
        'incendio': { voiceCommands: ['incendio', 'fire', 'burn'], displayName: 'Incendio', color: 0xff6600, projectileType: 'fire', trailParticles: true },
        'confringo': { voiceCommands: ['confringo', 'explode'], displayName: 'Confringo', color: 0xff3300, projectileType: 'orb', trailParticles: true },
        'bombarda': { voiceCommands: ['bombarda', 'bomb', 'boom'], displayName: 'Bombarda', color: 0xcc0000, projectileType: 'orb', trailParticles: true },
        'reducto': { voiceCommands: ['reducto', 'reduce'], displayName: 'Reducto', color: 0xff00ff, projectileType: 'orb', trailParticles: true },
        'sectumsempra': { voiceCommands: ['sectumsempra', 'sectum', 'cut'], displayName: 'Sectumsempra', color: 0x990000, projectileType: 'slash', trailParticles: true },
        'flipendo': { voiceCommands: ['flipendo', 'flip', 'push'], displayName: 'Flipendo', color: 0x00ffff, projectileType: 'wave', trailParticles: true },
        'depulso': { voiceCommands: ['depulso', 'push away'], displayName: 'Depulso', color: 0x00cccc, projectileType: 'wave', trailParticles: false },
        'diffindo': { voiceCommands: ['diffindo', 'cut'], displayName: 'Diffindo', color: 0xcc6666, projectileType: 'slash', trailParticles: false },
        'petrificus': { voiceCommands: ['petrificus', 'petrify', 'freeze'], displayName: 'Petrificus Totalus', color: 0x888888, projectileType: 'beam', trailParticles: true },
        'glacius': { voiceCommands: ['glacius', 'ice', 'freeze'], displayName: 'Glacius', color: 0x66ccff, projectileType: 'crystal', trailParticles: true },
        'aguamenti': { voiceCommands: ['aguamenti', 'water'], displayName: 'Aguamenti', color: 0x0099ff, projectileType: 'stream', trailParticles: true },
        'ventus': { voiceCommands: ['ventus', 'wind'], displayName: 'Ventus', color: 0xcccccc, projectileType: 'wave', trailParticles: false },
        'levicorpus': { voiceCommands: ['levicorpus', 'levitate'], displayName: 'Levicorpus', color: 0xcc66ff, projectileType: 'beam', trailParticles: true },
        'impedimenta': { voiceCommands: ['impedimenta', 'slow'], displayName: 'Impedimenta', color: 0x9999cc, projectileType: 'wave', trailParticles: false },
        'incarcerous': { voiceCommands: ['incarcerous', 'bind', 'chain'], displayName: 'Incarcerous', color: 0x996633, projectileType: 'beam', trailParticles: false },
        'oppugno': { voiceCommands: ['oppugno', 'attack'], displayName: 'Oppugno', color: 0xffcc00, projectileType: 'swarm', trailParticles: true },
        'rictusempra': { voiceCommands: ['rictusempra', 'tickle'], displayName: 'Rictusempra', color: 0xffff99, projectileType: 'wave', trailParticles: false },
        'tarantallegra': { voiceCommands: ['tarantallegra', 'dance'], displayName: 'Tarantallegra', color: 0xff99ff, projectileType: 'wave', trailParticles: true },
        'serpensortia': { voiceCommands: ['serpensortia', 'snake'], displayName: 'Serpensortia', color: 0x00ff00, projectileType: 'creature', trailParticles: false },
        'locomotormortis': { voiceCommands: ['locomotormortis', 'leg lock'], displayName: 'Locomotor Mortis', color: 0x666699, projectileType: 'beam', trailParticles: false },
        'confundus': { voiceCommands: ['confundus', 'confuse'], displayName: 'Confundus', color: 0xff99cc, projectileType: 'wave', trailParticles: true },
        'obliviate': { voiceCommands: ['obliviate', 'forget'], displayName: 'Obliviate', color: 0xcc99ff, projectileType: 'wave', trailParticles: true },
        'fiendfyre': { voiceCommands: ['fiendfyre', 'hellfire'], displayName: 'Fiendfyre', color: 0xff0000, projectileType: 'fire', trailParticles: true },

        // Defensive
        'protego': { voiceCommands: ['protego', 'protect', 'shield'], displayName: 'Protego', color: 0x0066ff, projectileType: 'shield', trailParticles: false },
        'salvio': { voiceCommands: ['salvio', 'save'], displayName: 'Salvio Hexia', color: 0x6666ff, projectileType: 'shield', trailParticles: false },

        // Healing
        'episkey': { voiceCommands: ['episkey', 'heal', 'fix'], displayName: 'Episkey', color: 0x00ff99, projectileType: 'glow', trailParticles: true },
        'vulnera': { voiceCommands: ['vulnera', 'heal wounds'], displayName: 'Vulnera Sanentur', color: 0x00ffcc, projectileType: 'glow', trailParticles: true },

        // Utility
        'lumos': { voiceCommands: ['lumos', 'light'], displayName: 'Lumos', color: 0xffffcc, projectileType: 'glow', trailParticles: false },
        'nox': { voiceCommands: ['nox', 'dark', 'off'], displayName: 'Nox', color: 0x333333, projectileType: 'glow', trailParticles: false },
        'accio': { voiceCommands: ['accio', 'come', 'summon'], displayName: 'Accio', color: 0x00ff00, projectileType: 'spiral', trailParticles: true },
        'alohomora': { voiceCommands: ['alohomora', 'unlock', 'open'], displayName: 'Alohomora', color: 0xffcc00, projectileType: 'glow', trailParticles: false },
        'reparo': { voiceCommands: ['reparo', 'repair', 'fix'], displayName: 'Reparo', color: 0x99ccff, projectileType: 'glow', trailParticles: true },
        'apparate': { voiceCommands: ['apparate', 'teleport', 'blink'], displayName: 'Apparate', color: 0x9966ff, projectileType: 'glow', trailParticles: true },
        'ascendio': { voiceCommands: ['ascendio', 'rise', 'up'], displayName: 'Ascendio', color: 0x99ffff, projectileType: 'glow', trailParticles: true },
        'wingardium': { voiceCommands: ['wingardium', 'levitate', 'float'], displayName: 'Wingardium Leviosa', color: 0xffff99, projectileType: 'beam', trailParticles: true },
        'expectopatronum': { voiceCommands: ['expecto patronum', 'patronus', 'patronum'], displayName: 'Expecto Patronum', color: 0xffffff, projectileType: 'creature', trailParticles: true },
        'riddikulus': { voiceCommands: ['riddikulus', 'ridiculous'], displayName: 'Riddikulus', color: 0xff99ff, projectileType: 'wave', trailParticles: true },

        // Dark Arts
        'avadakedavra': { voiceCommands: ['avada kedavra', 'avada', 'kill'], displayName: 'Avada Kedavra', color: 0x00ff00, projectileType: 'beam', trailParticles: true },
        'crucio': { voiceCommands: ['crucio', 'torture'], displayName: 'Crucio', color: 0xff0066, projectileType: 'bolt', trailParticles: true },
        'imperio': { voiceCommands: ['imperio', 'control'], displayName: 'Imperio', color: 0x9900ff, projectileType: 'wave', trailParticles: true },
        'morsmorde': { voiceCommands: ['morsmorde', 'dark mark'], displayName: 'Morsmordre', color: 0x00ff00, projectileType: 'glow', trailParticles: true }
    },

    // Environment visuals
    environment: {
        sky: {
            dayTopColor: 0x4488cc,
            dayBottomColor: 0x88bbee,
            nightTopColor: 0x000022,
            nightBottomColor: 0x1a1a3a,
            sunsetTopColor: 0xff6644,
            sunsetBottomColor: 0xffaa33,
            starsEnabled: true
        },
        ground: {
            floorColor: 0x1a2d1a,
            ringColor: 0x3a2a1a,
            magicCircleColor: 0x4466aa
        },
        fog: {
            color: 0x0a0a1a,
            density: 0.008
        },
        lighting: {
            ambientColor: 0x404080,
            ambientIntensity: 0.4,
            sunColor: 0xffffcc,
            sunIntensity: 1.5
        },
        decorations: {
            treesEnabled: true,
            treeCount: 40,
            grassEnabled: true,
            grassCount: 3000,
            pillarsEnabled: true,
            pillarCount: 8,
            flameColor: 0xff6600
        }
    },

    // UI text customization
    ui: {
        title: "Wizard Duel Arena",
        subtitle: "Cast spells with your voice!",
        deathMessage: "You were defeated by",
        respawnText: "Respawn",
        victoryText: "Victory!",
        defeatText: "Defeat"
    }
};

// Deep clone utility
function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
}

// Merge custom config over default (deep merge)
function mergeConfigs(base, custom) {
    const result = cloneConfig(base);

    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    deepMerge(result, custom);
    return result;
}

// Validate config structure (ensure no forbidden modifications)
function validateConfig(config) {
    // Ensure critical keys exist
    const required = ['characters', 'spells', 'environment'];
    for (const key of required) {
        if (!config[key]) {
            throw new Error(`Missing required config key: ${key}`);
        }
    }
    return true;
}

module.exports = {
    DEFAULT_CONFIG,
    cloneConfig,
    mergeConfigs,
    validateConfig
};
