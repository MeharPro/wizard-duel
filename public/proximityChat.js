/**
 * Proximity Chat Module
 * WebRTC-based voice chat with distance-based volume
 */

// Configuration
const PROXIMITY_CONFIG = {
    maxDistance: 30,      // Maximum distance to hear someone
    minDistance: 3,       // Distance at which volume is 100%
    maxVolume: 1.0,
    minVolume: 0.0
};

// State
let localStream = null;
let peerConnections = new Map(); // peerId -> RTCPeerConnection
let audioElements = new Map();   // peerId -> HTMLAudioElement
let isEnabled = false;
let myPosition = { x: 0, y: 0, z: 0 };
let peerPositions = new Map();   // peerId -> {x, y, z}
let socket = null;

// ICE Servers (STUN for NAT traversal)
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

/**
 * Initialize proximity chat
 */
export async function initProximityChat(socketInstance) {
    socket = socketInstance;
    setupSocketHandlers();
}

/**
 * Enable proximity chat
 */
export async function enableProximityChat() {
    if (isEnabled) return;

    try {
        // Get microphone access
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });

        isEnabled = true;
        document.getElementById('voice-chat-indicator').style.display = 'flex';
        console.log('🎤 Proximity chat enabled');

        return true;
    } catch (err) {
        console.error('Failed to enable proximity chat:', err);
        alert('Could not access microphone. Please allow microphone access for voice chat.');
        return false;
    }
}

/**
 * Disable proximity chat
 */
export function disableProximityChat() {
    if (!isEnabled) return;

    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close all peer connections
    peerConnections.forEach((pc, peerId) => {
        pc.close();
        removeAudioElement(peerId);
    });
    peerConnections.clear();
    audioElements.clear();
    peerPositions.clear();

    isEnabled = false;
    document.getElementById('voice-chat-indicator').style.display = 'none';
    console.log('🔇 Proximity chat disabled');
}

/**
 * Check if proximity chat is enabled
 */
export function isProximityChatEnabled() {
    return isEnabled;
}

/**
 * Setup socket event handlers for WebRTC signaling
 */
function setupSocketHandlers() {
    socket.on('peer_joined', async ({ peerId, playerName }) => {
        if (!isEnabled) return;
        console.log('New peer joined:', peerId);

        // Create offer and initiate connection
        await createPeerConnection(peerId, true, playerName);
    });

    socket.on('existing_peers', async ({ peers }) => {
        if (!isEnabled) return;
        // We'll wait for offers from existing peers
        console.log('Existing peers:', peers);
    });

    socket.on('peer_left', ({ peerId }) => {
        closePeerConnection(peerId);
    });

    socket.on('webrtc_offer', async ({ fromId, offer }) => {
        if (!isEnabled) return;
        console.log('Received offer from:', fromId);

        await handleOffer(fromId, offer);
    });

    socket.on('webrtc_answer', async ({ fromId, answer }) => {
        const pc = peerConnections.get(fromId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Set remote description for:', fromId);
        }
    });

    socket.on('webrtc_ice_candidate', async ({ fromId, candidate }) => {
        const pc = peerConnections.get(fromId);
        if (pc && candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        }
    });
}

/**
 * Create a peer connection
 */
async function createPeerConnection(peerId, initiator = false, playerName = 'Player') {
    if (peerConnections.has(peerId)) {
        return peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.set(peerId, pc);

    // Add local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    // Handle incoming audio stream
    pc.ontrack = (event) => {
        console.log('Received audio track from:', peerId);
        createAudioElement(peerId, event.streams[0], playerName);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc_ice_candidate', {
                targetId: peerId,
                candidate: event.candidate
            });
        }
    };

    // Connection state handling
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}:`, pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            closePeerConnection(peerId);
        }
    };

    // If we're the initiator, create and send offer
    if (initiator) {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('webrtc_offer', {
                targetId: peerId,
                offer: pc.localDescription
            });

            console.log('Sent offer to:', peerId);
        } catch (err) {
            console.error('Error creating offer:', err);
        }
    }

    return pc;
}

/**
 * Handle incoming offer
 */
async function handleOffer(fromId, offer) {
    const pc = await createPeerConnection(fromId, false);

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', {
            targetId: fromId,
            answer: pc.localDescription
        });

        console.log('Sent answer to:', fromId);
    } catch (err) {
        console.error('Error handling offer:', err);
    }
}

/**
 * Close a peer connection
 */
function closePeerConnection(peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
        pc.close();
        peerConnections.delete(peerId);
    }

    removeAudioElement(peerId);
    peerPositions.delete(peerId);
}

/**
 * Create audio element for a peer
 */
function createAudioElement(peerId, stream, playerName) {
    // Remove existing if any
    removeAudioElement(peerId);

    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.dataset.peerId = peerId;
    audio.dataset.playerName = playerName;

    // Add to DOM (hidden)
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioElements.set(peerId, audio);

    // Update voice indicator UI
    updateVoiceIndicatorUI();
}

/**
 * Remove audio element for a peer
 */
function removeAudioElement(peerId) {
    const audio = audioElements.get(peerId);
    if (audio) {
        audio.srcObject = null;
        audio.remove();
        audioElements.delete(peerId);
    }

    // Update voice indicator UI
    updateVoiceIndicatorUI();
}

/**
 * Update local player position
 */
export function updateMyPosition(x, y, z) {
    myPosition = { x, y, z };
    updateAllVolumes();
}

/**
 * Update peer positions from game snapshot
 */
export function updatePeerPositions(players) {
    players.forEach(player => {
        if (player.id !== socket?.id) {
            peerPositions.set(player.id, {
                x: player.x,
                y: player.y || 0,
                z: player.z,
                name: player.name
            });
        }
    });
    updateAllVolumes();
}

/**
 * Update volume for all audio elements based on distance
 */
function updateAllVolumes() {
    if (!isEnabled) return;

    audioElements.forEach((audio, peerId) => {
        const peerPos = peerPositions.get(peerId);
        if (!peerPos) return;

        const distance = Math.sqrt(
            Math.pow(myPosition.x - peerPos.x, 2) +
            Math.pow(myPosition.y - peerPos.y, 2) +
            Math.pow(myPosition.z - peerPos.z, 2)
        );

        let volume;
        if (distance <= PROXIMITY_CONFIG.minDistance) {
            volume = PROXIMITY_CONFIG.maxVolume;
        } else if (distance >= PROXIMITY_CONFIG.maxDistance) {
            volume = PROXIMITY_CONFIG.minVolume;
        } else {
            // Linear falloff
            const range = PROXIMITY_CONFIG.maxDistance - PROXIMITY_CONFIG.minDistance;
            const normalizedDist = (distance - PROXIMITY_CONFIG.minDistance) / range;
            volume = PROXIMITY_CONFIG.maxVolume * (1 - normalizedDist);
        }

        audio.volume = Math.max(0, Math.min(1, volume));
    });
}

/**
 * Update the voice indicator UI
 */
function updateVoiceIndicatorUI() {
    const container = document.getElementById('voice-chat-indicator');
    if (!container) return;

    container.innerHTML = '';

    audioElements.forEach((audio, peerId) => {
        const peerPos = peerPositions.get(peerId);
        const playerName = peerPos?.name || audio.dataset.playerName || 'Player';

        const div = document.createElement('div');
        div.className = 'voice-user';
        div.id = `voice-${peerId}`;

        div.innerHTML = `
            <span class="name">${playerName}</span>
            <div class="volume-bar">
                <div class="volume-level" style="width: ${audio.volume * 100}%"></div>
            </div>
        `;

        container.appendChild(div);
    });
}

// Periodically update UI
setInterval(() => {
    if (isEnabled) {
        updateVoiceIndicatorUI();
    }
}, 100);
