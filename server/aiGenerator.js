/**
 * AI Generator - Uses OpenRouter to generate game configurations
 * This module ONLY generates JSON that modifies gameConfig.js values
 * It NEVER touches game mechanics or core code
 */

const { DEFAULT_CONFIG, mergeConfigs, validateConfig } = require('./gameConfig');

// OpenRouter configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt that strictly constrains the AI to JSON-only output
const SYSTEM_PROMPT = `You are a game configuration generator. You ONLY output valid JSON that modifies a game's visual and audio settings.

RULES:
1. You MUST output ONLY valid JSON - no markdown, no explanations, just pure JSON
2. You can ONLY modify these categories:
   - meta: name, description, theme
   - characters: name, color (hex number), robeColor (hex number), house (string)
   - spells: voiceCommands (array of strings the player says), displayName, color (hex number), projectileType (beam/bolt/orb/fire/wave/slash/crystal/stream/spiral/creature/shield/glow/swarm)
   - environment: sky colors, ground colors, fog, lighting colors, decoration settings
   - ui: title, subtitle, deathMessage, respawnText, victoryText, defeatText

3. You CANNOT modify game mechanics like damage, speed, effects - those are locked
4. Colors must be hex numbers (e.g., 0xff0000 for red)
5. Keep the same spell keys but change their visual representation

EXAMPLE - If user says "space battle":
{
  "meta": { "name": "Space Duel", "description": "Intergalactic laser battle", "theme": "space" },
  "characters": {
    "hary": { "name": "Captain Starlight", "color": 16777215, "robeColor": 255 },
    "darco": { "name": "Dark Nebula", "color": 8388736, "robeColor": 0 }
  },
  "spells": {
    "expelliarmus": { "voiceCommands": ["pew pew", "laser", "shoot"], "displayName": "Laser Blast", "color": 65280 },
    "avadakedavra": { "voiceCommands": ["death ray", "obliterate"], "displayName": "Death Ray", "color": 16711680 }
  },
  "environment": {
    "sky": { "dayTopColor": 0, "dayBottomColor": 657930, "nightTopColor": 0, "nightBottomColor": 328965, "starsEnabled": true },
    "ground": { "floorColor": 2236962, "magicCircleColor": 65535 }
  },
  "ui": { "title": "Space Duel", "deathMessage": "You were vaporized by" }
}

EXAMPLE - If user says "trash talk battle":
{
  "meta": { "name": "Roast Arena", "description": "Words hurt more than sticks", "theme": "trashtalk" },
  "spells": {
    "expelliarmus": { "voiceCommands": ["you suck", "loser", "noob"], "displayName": "Sick Burn", "color": 16744448 },
    "stupefy": { "voiceCommands": ["shut up", "be quiet"], "displayName": "Silence!", "color": 16776960 },
    "avadakedavra": { "voiceCommands": ["your mom", "cry about it", "get rekt"], "displayName": "Ultimate Roast", "color": 16711680 }
  },
  "ui": { "title": "Roast Arena", "deathMessage": "You got roasted by", "victoryText": "You're the Roast Master!" }
}

Now generate a configuration based on the user's request. Output ONLY the JSON, nothing else.`;

/**
 * Generate a game configuration using OpenRouter
 * @param {string} prompt - User's description of the game they want
 * @param {string} apiKey - OpenRouter API key
 * @param {string} model - Model to use (default: anthropic/claude-3.5-sonnet)
 * @returns {Promise<object>} - Merged configuration object
 */
async function generateGameConfig(prompt, apiKey, model = 'anthropic/claude-3.5-sonnet') {
    if (!apiKey) {
        throw new Error('OpenRouter API key is required');
    }

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://wizard-duel.onrender.com',
                'X-Title': 'Wizard Duel Arena'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in OpenRouter response');
        }

        // Parse the JSON response
        let customConfig;
        try {
            // Try to extract JSON if wrapped in markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : content;
            customConfig = JSON.parse(jsonStr.trim());
        } catch (parseErr) {
            throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
        }

        // Merge with defaults and validate
        const mergedConfig = mergeConfigs(DEFAULT_CONFIG, customConfig);
        validateConfig(mergedConfig);

        // Add metadata
        mergedConfig.meta.createdAt = new Date().toISOString();
        mergedConfig.meta.originalPrompt = prompt;

        return mergedConfig;

    } catch (err) {
        console.error('AI generation error:', err);
        throw err;
    }
}

/**
 * Save a custom configuration to disk
 * @param {string} roomId - Room/game ID
 * @param {object} config - Configuration to save
 * @param {string} savePath - Directory to save configs
 */
async function saveConfig(roomId, config, savePath = './custom_games') {
    const fs = require('fs').promises;
    const path = require('path');

    // Ensure directory exists
    await fs.mkdir(savePath, { recursive: true });

    const filePath = path.join(savePath, `${roomId}.json`);
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));

    return filePath;
}

/**
 * Load a custom configuration from disk
 * @param {string} roomId - Room/game ID
 * @param {string} savePath - Directory where configs are saved
 * @returns {Promise<object|null>} - Configuration or null if not found
 */
async function loadConfig(roomId, savePath = './custom_games') {
    const fs = require('fs').promises;
    const path = require('path');

    const filePath = path.join(savePath, `${roomId}.json`);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null;
        }
        throw err;
    }
}

/**
 * List all saved custom games
 * @param {string} savePath - Directory where configs are saved
 * @returns {Promise<Array>} - List of saved game metadata
 */
async function listSavedGames(savePath = './custom_games') {
    const fs = require('fs').promises;
    const path = require('path');

    try {
        const files = await fs.readdir(savePath);
        const games = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const config = await loadConfig(file.replace('.json', ''), savePath);
                if (config) {
                    games.push({
                        id: file.replace('.json', ''),
                        name: config.meta?.name || 'Unnamed Game',
                        theme: config.meta?.theme || 'custom',
                        createdAt: config.meta?.createdAt
                    });
                }
            }
        }

        return games;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

module.exports = {
    generateGameConfig,
    saveConfig,
    loadConfig,
    listSavedGames,
    SYSTEM_PROMPT
};
