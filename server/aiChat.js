/**
 * AI Chat Module - Provides AI mentor chat and AI opponent logic
 * Uses OpenRouter for conversational AI and opponent strategy
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt for the AI Mentor (hints and gameplay advice)
const MENTOR_SYSTEM_PROMPT = `You are Master Eldric, a wise and ancient wizard mentor in Wizard Duel Arena. You help players learn spells and combat strategies.

PERSONALITY:
- Wise but friendly, with a hint of mystery
- Encouraging but not too easy on players
- Speaks in a magical, mystical way but stays helpful
- Uses wizard-themed metaphors

YOUR KNOWLEDGE:
You know all the spells in the game:

OFFENSIVE SPELLS:
- Expelliarmus (disarms opponent for 3s)
- Stupefy (stuns for 2s, 10 damage)
- Incendio (fire, 20 damage)
- Confringo (explosion, 35 damage)
- Bombarda (blast, 40 damage)
- Sectumsempra (slash, 50 damage - powerful!)
- Flipendo (knockback + 10 damage)
- Glacius (freeze for 3s, 15 damage)
- Avada Kedavra (instant kill - ONE USE PER LIFE!)

DEFENSIVE SPELLS:
- Protego (shield that blocks one attack)
- Salvio (hex shield, similar to protego)

HEALING SPELLS:
- Episkey (heals 30 HP)
- Vulnera (heals 50 HP)

UTILITY SPELLS:
- Apparate (teleport randomly)
- Ascendio (launch yourself upward)
- Lumos (light) / Nox (dark)

COMBAT TIPS YOU CAN SHARE:
1. Use Protego to block powerful spells like Sectumsempra
2. Combo: Stupefy (stun) -> Sectumsempra (while stunned)
3. Save Avada Kedavra for the perfect moment - you only get ONE!
4. Flipendo is great for pushing enemies out of the arena
5. Glacius freezes enemies - great for setting up attacks
6. Stay mobile! WASD to move, SPACE to jump
7. Speak clearly for voice commands - the game uses voice recognition
8. Hold LEFT CLICK while speaking the spell name

RULES:
- Keep responses SHORT (1-3 sentences usually)
- Be encouraging but give genuine tactical advice
- If they ask how to beat someone, give strategic tips
- Add a bit of magical flair to your responses
- Use emojis sparingly (✨, ⚡, 🔮)`;

// System prompt for AI Opponent decision making
const OPPONENT_SYSTEM_PROMPT = `You are an AI wizard opponent in a duel. Output ONLY a JSON response with your next action.

You receive:
- Your current state (health, position, status)
- Enemy state (health, position, distance)
- Available spells and their effects

Based on the situation, decide your action. Output ONLY this JSON format:
{
  "spell": "spellname",
  "target": "aim" | "evade" | "advance" | "retreat",
  "reason": "brief tactical reason"
}

SPELL OPTIONS:
- "expelliarmus" - disarm (good when enemy is casting)
- "stupefy" - stun + light damage
- "incendio" - fire, moderate damage
- "flipendo" - knockback, disruption
- "glacius" - freeze, setup for combo
- "protego" - shield (use when under attack)
- "sectumsempra" - heavy damage (risky, use wisely)
- "episkey" - heal yourself (when low HP)

TACTICS:
- Low enemy HP + close range = aggressive spell
- Enemy casting = interrupt with stupefy/expelliarmus  
- Low own HP = heal or defensive
- Medium range = projectile spells
- Close range = powerful spells or create distance

BE SMART BUT BEATABLE - make occasional tactical errors (20% chance).`;

/**
 * Chat with the AI Mentor for hints and advice
 */
async function chatWithMentor(message, conversationHistory, apiKey, model) {
    if (!apiKey) {
        throw new Error('API key required');
    }

    const messages = [
        { role: 'system', content: MENTOR_SYSTEM_PROMPT },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: message }
    ];

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://wizard-duel.onrender.com',
                'X-Title': 'Wizard Duel Arena - AI Mentor'
            },
            body: JSON.stringify({
                model: model || 'google/gemini-2.0-flash-001',
                messages: messages,
                temperature: 0.8,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
            throw new Error('No response from AI');
        }

        return reply;
    } catch (err) {
        console.error('Mentor chat error:', err);
        throw err;
    }
}

/**
 * Get AI Opponent's next action based on game state
 */
async function getOpponentAction(gameState, apiKey, model, difficulty = 'normal') {
    if (!apiKey) {
        // Fallback to simple AI if no API key
        return getSimpleAIAction(gameState, difficulty);
    }

    const context = `
GAME STATE:
- Your HP: ${gameState.aiHealth}/100
- Your Status: ${gameState.aiStatus}
- Enemy HP: ${gameState.playerHealth}/100
- Enemy Status: ${gameState.playerStatus}
- Distance: ${gameState.distance.toFixed(1)} units
- Enemy is ${gameState.playerCasting ? 'CASTING a spell' : 'not casting'}
- Your last spell: ${gameState.lastAiSpell || 'none'}
- Time in fight: ${gameState.fightTime}s

Difficulty: ${difficulty} (${difficulty === 'easy' ? 'make more mistakes' : difficulty === 'hard' ? 'be optimal' : 'balanced play'})
`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://wizard-duel.onrender.com',
                'X-Title': 'Wizard Duel Arena - AI Opponent'
            },
            body: JSON.stringify({
                model: model || 'google/gemini-2.0-flash-001',
                messages: [
                    { role: 'system', content: OPPONENT_SYSTEM_PROMPT },
                    { role: 'user', content: context }
                ],
                temperature: difficulty === 'easy' ? 1.0 : difficulty === 'hard' ? 0.3 : 0.6,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            return getSimpleAIAction(gameState, difficulty);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return getSimpleAIAction(gameState, difficulty);
        }

        // Parse JSON from response
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.log('AI response parse error, using simple AI');
        }

        return getSimpleAIAction(gameState, difficulty);
    } catch (err) {
        console.error('AI opponent error:', err);
        return getSimpleAIAction(gameState, difficulty);
    }
}

/**
 * Simple rule-based AI fallback
 */
function getSimpleAIAction(gameState, difficulty) {
    const { aiHealth, playerHealth, distance, playerCasting, aiStatus } = gameState;

    // Mistake chance based on difficulty
    const mistakeChance = difficulty === 'easy' ? 0.4 : difficulty === 'hard' ? 0.1 : 0.2;
    const makeMistake = Math.random() < mistakeChance;

    // If stunned/frozen, can't act
    if (['STUNNED', 'FROZEN', 'DEAD'].includes(aiStatus)) {
        return { spell: null, target: 'wait', reason: 'Cannot act while ' + aiStatus };
    }

    // Mistake: random spell
    if (makeMistake) {
        const randomSpells = ['stupefy', 'incendio', 'flipendo', 'glacius'];
        return {
            spell: randomSpells[Math.floor(Math.random() * randomSpells.length)],
            target: 'aim',
            reason: 'Tactical assessment'
        };
    }

    // Low HP priority: heal
    if (aiHealth < 30) {
        return { spell: 'episkey', target: 'self', reason: 'Critical HP - healing' };
    }

    // Enemy casting: interrupt
    if (playerCasting) {
        return { spell: 'stupefy', target: 'aim', reason: 'Interrupting enemy cast' };
    }

    // Enemy low HP: go aggressive
    if (playerHealth < 25 && distance < 15) {
        return { spell: 'sectumsempra', target: 'aim', reason: 'Finishing blow' };
    }

    // Medium HP and close: balanced
    if (distance < 10) {
        const closeSpells = ['flipendo', 'stupefy', 'glacius'];
        return {
            spell: closeSpells[Math.floor(Math.random() * closeSpells.length)],
            target: 'aim',
            reason: 'Close combat'
        };
    }

    // Long range: projectile spells
    if (distance > 20) {
        const rangeSpells = ['incendio', 'stupefy', 'expelliarmus'];
        return {
            spell: rangeSpells[Math.floor(Math.random() * rangeSpells.length)],
            target: 'aim',
            reason: 'Long range attack'
        };
    }

    // Default: balanced attack
    const defaultSpells = ['stupefy', 'incendio', 'glacius', 'flipendo'];
    return {
        spell: defaultSpells[Math.floor(Math.random() * defaultSpells.length)],
        target: 'aim',
        reason: 'Standard attack'
    };
}

/**
 * Generate a taunt or comment from the AI opponent
 */
async function getOpponentTaunt(situation, apiKey, model) {
    const taunts = {
        gameStart: [
            "⚔️ Let's see what you've got, young wizard...",
            "🔮 The ancient arts favor the prepared mind.",
            "✨ May your wand arm be true!"
        ],
        playerHit: [
            "Ha! Your reflexes need work!",
            "You'll need more than luck against me!",
            "Too slow, wizard!"
        ],
        aiHit: [
            "A lucky shot! It won't happen again.",
            "Impressive... but I'm just getting started.",
            "You have some skill after all!"
        ],
        lowHealth: [
            "You think you've won? Think again!",
            "Cornered wizards are the most dangerous!",
            "The fight isn't over yet!"
        ],
        victory: [
            "🏆 Victory! But you fought well, young one.",
            "Your training is complete... for now.",
            "A worthy duel! Return when you're stronger."
        ],
        defeat: [
            "Well fought, wizard! You have bested me.",
            "The student has surpassed the master!",
            "✨ You've earned this victory!"
        ]
    };

    const situationTaunts = taunts[situation] || taunts.gameStart;
    return situationTaunts[Math.floor(Math.random() * situationTaunts.length)];
}

module.exports = {
    chatWithMentor,
    getOpponentAction,
    getSimpleAIAction,
    getOpponentTaunt,
    MENTOR_SYSTEM_PROMPT,
    OPPONENT_SYSTEM_PROMPT
};
