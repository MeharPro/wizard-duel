import * as THREE from 'three';

let camera, scene, renderer;
let viewmodel, viewmodelBasePos, viewmodelBaseRot;
const otherPlayers = {};
const projectileMeshes = [];
const effectMeshes = [];
let lastTime = performance.now();
let myId = null;
let myShield = null;

// Visual Elements
let sunLight, skyMesh;
let sunMesh, moonMesh;
let particleSystem;

// Materials Cache
const spellMaterials = {};
const spellGeometries = {};

// --- SHADERS ---
const galaxyVertexShader = `
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const galaxyFragmentShader = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float time;
varying vec3 vWorldPosition;

float rand(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    float h = normalize(vWorldPosition + offset).y;
    vec3 sky = mix(bottomColor, topColor, max(pow(h, 0.4), 0.0));
    
    // Stars
    float star = rand(floor(vWorldPosition.xz * 0.5));
    if (star > 0.995 && h > 0.1) {
        float twinkle = sin(time * 3.0 + star * 100.0) * 0.3 + 0.7;
        sky += vec3(twinkle);
    }
    
    // Milky Way
    float mw = sin(vWorldPosition.x * 0.02) * cos(vWorldPosition.z * 0.02);
    if (mw > 0.6 && h > 0.15) {
        sky += vec3(0.15, 0.05, 0.25) * (mw - 0.6);
    }

    gl_FragColor = vec4(sky, 1.0);
}`;

// Shield Shader
const shieldVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const shieldFragmentShader = `
uniform float time;
uniform vec3 color;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    float ripple = sin(vPosition.y * 10.0 - time * 8.0) * 0.15 + 0.85;
    float hex = sin(vPosition.x * 15.0) * sin(vPosition.y * 15.0) * 0.1 + 0.9;
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
    float alpha = (fresnel * 0.8 + 0.2) * ripple * hex;
    gl_FragColor = vec4(color * (1.0 + fresnel * 0.5), alpha * 0.7);
}`;

// Spell Beam Shader
const beamFragmentShader = `
uniform float time;
uniform vec3 color;
varying vec2 vUv;

void main() {
    float pulse = sin(vUv.x * 20.0 - time * 15.0) * 0.3 + 0.7;
    float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float alpha = edge * pulse;
    vec3 col = color * (1.0 + pulse * 0.5);
    gl_FragColor = vec4(col, alpha);
}`;

export function initWorld(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);

    camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ'; // Important for FPS controls
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambient = new THREE.AmbientLight(0x404080, 0.4);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x6688cc, 0x223344, 0.6);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    sunLight = new THREE.DirectionalLight(0xffffcc, 1.5);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    scene.add(sunLight);

    // --- SKY ---
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x000022) },
            bottomColor: { value: new THREE.Color(0x1a1a3a) },
            offset: { value: 20 },
            time: { value: 0 }
        },
        vertexShader: galaxyVertexShader,
        fragmentShader: galaxyFragmentShader,
        side: THREE.BackSide
    });
    skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // --- SUN MESH ---
    const sunGeo = new THREE.SphereGeometry(15, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        fog: false
    });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(200, 100, 0);
    scene.add(sunMesh);

    // --- MOON MESH ---
    const moonGeo = new THREE.SphereGeometry(10, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({
        color: 0xaabbff,
        fog: false
    });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-200, -100, 0);
    scene.add(moonMesh);

    // --- GROUND ---
    createGround();
    createVegetation();
    createArenaDecor();

    // --- VIEWMODEL ---
    createViewmodel();

    // --- PARTICLES ---
    particleSystem = new ParticleSystem(scene);

    // --- INIT SPELL VISUALS ---
    initSpellVisuals();

    window.addEventListener('resize', onResize);
}

function createGround() {
    // Main arena floor
    const floorGeo = new THREE.CircleGeometry(55, 64);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1a2d1a,
        roughness: 0.9,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Arena ring
    const ringGeo = new THREE.RingGeometry(48, 52, 64);
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        roughness: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    // Magic circle in center
    const circleGeo = new THREE.RingGeometry(8, 10, 32);
    const circleMat = new THREE.MeshBasicMaterial({
        color: 0x4466aa,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.03;
    scene.add(circle);
}

function createVegetation() {
    const treeCount = 40;
    for (let i = 0; i < treeCount; i++) {
        const tree = createTree();
        const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 55 + Math.random() * 30;
        tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        tree.scale.setScalar(0.7 + Math.random() * 0.6);
        scene.add(tree);
    }

    // Grass instances
    const grassGeo = new THREE.ConeGeometry(0.08, 0.4, 3);
    grassGeo.translate(0, 0.2, 0);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x3a5a2a });
    const grass = new THREE.InstancedMesh(grassGeo, grassMat, 3000);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < 3000; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 48;
        dummy.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.scale.setScalar(0.5 + Math.random() * 0.5);
        dummy.updateMatrix();
        grass.setMatrixAt(i, dummy.matrix);
    }
    scene.add(grass);
}

function createTree() {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    trunk.castShadow = true;
    group.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(3, 8, 8);
    const leavesMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a1a,
        roughness: 0.8,
        flatShading: true
    });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 7;
    leaves.castShadow = true;
    group.add(leaves);

    return group;
}

function createArenaDecor() {
    // Stone pillars around arena
    const pillarGeo = new THREE.CylinderGeometry(1, 1.2, 6, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 });

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(Math.cos(angle) * 50, 3, Math.sin(angle) * 50);
        pillar.castShadow = true;
        scene.add(pillar);

        // Flame on top
        const flameGeo = new THREE.ConeGeometry(0.5, 1.5, 8);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(Math.cos(angle) * 50, 7, Math.sin(angle) * 50);
        scene.add(flame);

        const flameLight = new THREE.PointLight(0xff6600, 0.5, 15);
        flameLight.position.copy(flame.position);
        scene.add(flameLight);
    }
}

function createViewmodel() {
    viewmodel = new THREE.Group();

    // Wand
    const wandGeo = new THREE.CylinderGeometry(0.012, 0.025, 0.5, 8);
    wandGeo.rotateX(Math.PI / 2);
    const wandMat = new THREE.MeshStandardMaterial({
        color: 0x2a1a10,
        roughness: 0.6,
        metalness: 0.2
    });
    const wand = new THREE.Mesh(wandGeo, wandMat);
    wand.position.z = -0.35;
    viewmodel.add(wand);

    // Handle details
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 8);
    handleGeo.rotateX(Math.PI / 2);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.8 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.z = -0.08;
    viewmodel.add(handle);

    // Glowing tip
    const tipGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x66ffff });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.z = -0.6;
    tip.name = 'wandTip';
    viewmodel.add(tip);

    const tipLight = new THREE.PointLight(0x66ffff, 0.3, 2);
    tipLight.position.copy(tip.position);
    viewmodel.add(tipLight);

    viewmodelBasePos = new THREE.Vector3(0.22, -0.25, -0.35);
    viewmodelBaseRot = new THREE.Euler(0, 0, 0);
    viewmodel.position.copy(viewmodelBasePos);
    camera.add(viewmodel);
}

function initSpellVisuals() {
    // Pre-create geometries and materials for each spell type
    const spellConfigs = {
        'expelliarmus': { geo: 'beam', color: 0xff0000 },
        'stupify': { geo: 'bolt', color: 0xffff00 },
        'incendio': { geo: 'fire', color: 0xff6600 },
        'confringo': { geo: 'orb', color: 0xff3300 },
        'bombarda': { geo: 'orb', color: 0xcc0000 },
        'sectumsempra': { geo: 'slash', color: 0x990000 },
        'flipendo': { geo: 'wave', color: 0x00ffff },
        'reducto': { geo: 'orb', color: 0xff00ff },
        'petrificus': { geo: 'beam', color: 0x888888 },
        'glacius': { geo: 'crystal', color: 0x66ccff },
        'accio': { geo: 'spiral', color: 0x00ff00 },
        'levicorpus': { geo: 'beam', color: 0xcc66ff },
        'wingardium': { geo: 'beam', color: 0xffff99 },
        'aguamenti': { geo: 'stream', color: 0x0099ff },
        'ventus': { geo: 'wave', color: 0xcccccc },
        'avadakedavra': { geo: 'beam', color: 0x00ff00 },
        'crucio': { geo: 'bolt', color: 0xff0066 },
        'imperio': { geo: 'wave', color: 0x9900ff }
    };

    for (const [spell, config] of Object.entries(spellConfigs)) {
        let geo;
        switch (config.geo) {
            case 'beam':
                geo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
                break;
            case 'bolt':
                geo = new THREE.IcosahedronGeometry(0.35, 1);
                break;
            case 'orb':
                geo = new THREE.SphereGeometry(0.4, 16, 16);
                break;
            case 'fire':
                geo = new THREE.ConeGeometry(0.3, 0.8, 8);
                break;
            case 'crystal':
                geo = new THREE.OctahedronGeometry(0.4);
                break;
            case 'wave':
                geo = new THREE.TorusGeometry(0.4, 0.15, 8, 16);
                break;
            case 'slash':
                geo = new THREE.BoxGeometry(0.05, 0.8, 1.5);
                break;
            case 'stream':
                geo = new THREE.CylinderGeometry(0.2, 0.1, 2, 8);
                break;
            case 'spiral':
                geo = new THREE.TorusKnotGeometry(0.2, 0.08, 32, 8);
                break;
            default:
                geo = new THREE.SphereGeometry(0.3, 8, 8);
        }
        spellGeometries[spell] = geo;
        spellMaterials[spell] = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.9
        });
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function setMyId(id) {
    myId = id;
}

export function setCameraRotation(yaw, pitch) {
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

// --- PARTICLE SYSTEM ---
class ParticleSystem {
    constructor(scene) {
        this.particles = [];
        this.scene = scene;

        const geo = new THREE.BufferGeometry();
        const mat = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            map: this.createTexture(),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.points = new THREE.Points(geo, mat);
        this.points.frustumCulled = false;
        scene.add(this.points);
    }

    createTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    emit(pos, color, count = 15, speed = 3, lifetime = 1) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: pos.x + (Math.random() - 0.5),
                y: pos.y + (Math.random() - 0.5),
                z: pos.z + (Math.random() - 0.5),
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                vz: (Math.random() - 0.5) * speed,
                life: lifetime,
                maxLife: lifetime,
                color: new THREE.Color(color)
            });
        }
    }

    update(dt) {
        const positions = [];
        const colors = [];

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= 2 * dt; // Gravity

            const fade = p.life / p.maxLife;
            positions.push(p.x, p.y, p.z);
            colors.push(p.color.r * fade, p.color.g * fade, p.color.b * fade);
        }

        const geo = this.points.geometry;
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
}

// --- WIZARD MESH ---
function createWizardMesh(robeColor = 0x222233, accentColor = 0xff4444) {
    const group = new THREE.Group();

    // Body (robe)
    const bodyGeo = new THREE.CapsuleGeometry(0.8, 2.5, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: robeColor,
        roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2;
    body.castShadow = true;
    body.name = 'robe';
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xeeccaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.8;
    group.add(head);

    // Wizard hat
    const hatGeo = new THREE.ConeGeometry(0.6, 1.2, 8);
    const hatMat = new THREE.MeshStandardMaterial({ color: robeColor });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 4.7;
    hat.rotation.x = 0.1;
    group.add(hat);

    // Color accent (house colors)
    const accentGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.2, 8);
    const accentMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const accent = new THREE.Mesh(accentGeo, accentMat);
    accent.position.y = 2.5;
    group.add(accent);

    return group;
}

// --- MAIN UPDATE ---
export function updateSelf(me, others, projectiles, effects) {
    if (!me) return;

    // Camera position (smooth follow Y for jump)
    camera.position.x = me.x;
    camera.position.z = me.z;
    camera.position.y = (me.y || 0) + 3.2;

    // Local Shield
    if (me.activeSpell === 'protego') {
        if (!myShield) {
            const shieldGeo = new THREE.SphereGeometry(2.2, 32, 32);
            const shieldMat = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0x0066ff) }
                },
                vertexShader: shieldVertexShader,
                fragmentShader: shieldFragmentShader,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            myShield = new THREE.Mesh(shieldGeo, shieldMat);
            scene.add(myShield);
        }
        myShield.position.set(me.x, (me.y || 0) + 2, me.z);
        if (myShield.material.uniforms) {
            myShield.material.uniforms.time.value = performance.now() / 1000;
        }
    } else {
        if (myShield) {
            scene.remove(myShield);
            myShield.geometry.dispose();
            myShield.material.dispose();
            myShield = null;
        }
    }

    // Update other players
    const currentIds = new Set(others.map(p => p.id));

    // Remove players who left
    for (const id in otherPlayers) {
        if (!currentIds.has(id)) {
            scene.remove(otherPlayers[id]);
            delete otherPlayers[id];
        }
    }

    // Add/update other players
    for (const p of others) {
        let mesh = otherPlayers[p.id];
        if (!mesh) {
            // Use character data for colors
            const robeColor = p.characterData?.robeColor || 0x222233;
            const accentColor = p.characterData?.color || 0xff4444;
            mesh = createWizardMesh(robeColor, accentColor);
            scene.add(mesh);
            otherPlayers[p.id] = mesh;
        }

        // Smooth interpolation
        mesh.position.lerp(new THREE.Vector3(p.x, p.y || 0, p.z), 0.2);
        mesh.rotation.y = p.rot;

        // Status visual
        if (p.state === 'FROZEN') {
            mesh.children.forEach(c => { if (c.material && c.name !== 'shield') c.material.color.setHex(0x6699ff); });
        } else if (p.state === 'STUNNED') {
            mesh.children.forEach(c => { if (c.material && c.name !== 'shield') c.material.color.setHex(0xffff00); });
        } else if (p.state === 'DEAD') {
            mesh.visible = false;
        } else {
            mesh.visible = true;
        }

        // Shield visual for other players
        let shield = mesh.getObjectByName('shield');
        if (p.activeSpell === 'protego' || p.activeSpell === 'salvio') {
            if (!shield) {
                const shieldGeo = new THREE.SphereGeometry(2.2, 32, 32);
                const shieldMat = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        color: { value: new THREE.Color(0x0066ff) }
                    },
                    vertexShader: shieldVertexShader,
                    fragmentShader: shieldFragmentShader,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                shield = new THREE.Mesh(shieldGeo, shieldMat);
                shield.name = 'shield';
                shield.position.y = 2;
                mesh.add(shield);
            }
            if (shield.material.uniforms) {
                shield.material.uniforms.time.value = performance.now() / 1000;
            }
        } else if (shield) {
            mesh.remove(shield);
            shield.geometry.dispose();
            shield.material.dispose();
        }
    }

    // Update projectiles
    const projIds = new Set(projectiles.map(p => p.id));

    // Remove old projectiles
    for (let i = projectileMeshes.length - 1; i >= 0; i--) {
        const pm = projectileMeshes[i];
        if (!projIds.has(pm.id)) {
            particleSystem.emit(pm.mesh.position, pm.color, 25, 5, 0.8);
            scene.remove(pm.mesh);
            if (pm.light) scene.remove(pm.light);
            projectileMeshes.splice(i, 1);
        }
    }

    // Add/update projectiles
    for (const p of projectiles) {
        let pm = projectileMeshes.find(m => m.id === p.id);

        if (!pm) {
            const geo = spellGeometries[p.type] || new THREE.SphereGeometry(0.3);
            const mat = spellMaterials[p.type] || new THREE.MeshBasicMaterial({ color: 0xffffff });
            const mesh = new THREE.Mesh(geo.clone(), mat.clone());

            const color = mat.color.getHex();
            const light = new THREE.PointLight(color, 1.5, 10);
            scene.add(light);
            scene.add(mesh);

            pm = { id: p.id, mesh, light, type: p.type, color };
            projectileMeshes.push(pm);

            // Wand recoil if I cast
            if (p.ownerId === myId) {
                triggerWandRecoil();
            }
        }

        // Update position
        pm.mesh.position.set(p.x, 2, p.z);
        pm.light.position.copy(pm.mesh.position);

        // Rotation based on spell type
        if (['expelliarmus', 'sectumsempra', 'petrificus', 'levicorpus', 'avadakedavra'].includes(p.type)) {
            pm.mesh.lookAt(p.x + p.vx, 2, p.z + p.vz);
            pm.mesh.rotateX(Math.PI / 2);
        } else {
            pm.mesh.rotation.x += 0.1;
            pm.mesh.rotation.y += 0.05;
        }

        // Trail particles
        particleSystem.emit(pm.mesh.position, pm.color, 2, 1, 0.4);
    }

    // Process effects
    if (effects) {
        for (const fx of effects) {
            if (fx.type === 'explosion' || fx.type === 'hit') {
                particleSystem.emit({ x: fx.x, y: fx.y, z: fx.z }, fx.color || 0xff6600, 40, 8, 1);
            } else if (fx.type === 'shield_break') {
                particleSystem.emit({ x: fx.x, y: fx.y, z: fx.z }, 0x0066ff, 50, 10, 0.8);
            }
        }
    }

    // Viewmodel recovery
    if (viewmodel) {
        viewmodel.position.lerp(viewmodelBasePos, 0.15);
        viewmodel.rotation.x = THREE.MathUtils.lerp(viewmodel.rotation.x, viewmodelBaseRot.x, 0.15);
        viewmodel.rotation.z = THREE.MathUtils.lerp(viewmodel.rotation.z, viewmodelBaseRot.z, 0.15);
    }
}

function triggerWandRecoil() {
    if (viewmodel) {
        viewmodel.position.z += 0.15;
        viewmodel.position.y += 0.08;
        viewmodel.rotation.x = -0.3;
        viewmodel.rotation.z = 0.1;
    }
}

export function updateWorld() {
    const now = performance.now() * 0.001;
    const dt = Math.min(now - (lastTime * 0.001), 0.1);
    lastTime = now * 1000;

    // Day/night cycle (VERY SLOW: ~10 min full cycle)
    const cycleSpeed = 0.0008; // Very slow rotation
    const cycle = now * cycleSpeed;
    const sunAngle = cycle * Math.PI * 2;

    // Sun orbits the scene
    const orbitRadius = 200;
    const sunX = Math.sin(sunAngle) * orbitRadius;
    const sunY = Math.cos(sunAngle) * orbitRadius;
    const sunZ = Math.sin(sunAngle * 0.5) * 50;

    if (sunMesh) {
        sunMesh.position.set(sunX, sunY, sunZ);
    }

    // Moon is opposite the sun
    if (moonMesh) {
        moonMesh.position.set(-sunX, -sunY, -sunZ);
    }

    // DirectionalLight follows sun
    sunLight.position.set(sunX * 0.3, Math.max(sunY * 0.3, 10), sunZ * 0.3);

    // Calculate time of day (0 = midnight, 0.5 = noon)
    const timeOfDay = (Math.cos(sunAngle) + 1) / 2; // 0 to 1

    // Light intensity based on sun position
    sunLight.intensity = Math.max(0.2, timeOfDay * 1.8);

    // Sky color blending
    if (skyMesh) {
        skyMesh.material.uniforms.time.value = now;

        // Night colors
        const nightTop = new THREE.Color(0x000011);
        const nightBottom = new THREE.Color(0x0a0a2a);

        // Day colors
        const dayTop = new THREE.Color(0x4488cc);
        const dayBottom = new THREE.Color(0x88bbee);

        // Sunrise/sunset colors
        const sunsetTop = new THREE.Color(0xff6644);
        const sunsetBottom = new THREE.Color(0xffaa33);

        // Calculate blend
        let topColor, bottomColor;

        if (timeOfDay < 0.2) {
            // Night to dawn
            const t = timeOfDay / 0.2;
            topColor = nightTop.clone().lerp(sunsetTop, t);
            bottomColor = nightBottom.clone().lerp(sunsetBottom, t);
        } else if (timeOfDay < 0.35) {
            // Dawn to day
            const t = (timeOfDay - 0.2) / 0.15;
            topColor = sunsetTop.clone().lerp(dayTop, t);
            bottomColor = sunsetBottom.clone().lerp(dayBottom, t);
        } else if (timeOfDay < 0.65) {
            // Full day
            topColor = dayTop;
            bottomColor = dayBottom;
        } else if (timeOfDay < 0.8) {
            // Day to dusk
            const t = (timeOfDay - 0.65) / 0.15;
            topColor = dayTop.clone().lerp(sunsetTop, t);
            bottomColor = dayBottom.clone().lerp(sunsetBottom, t);
        } else {
            // Dusk to night
            const t = (timeOfDay - 0.8) / 0.2;
            topColor = sunsetTop.clone().lerp(nightTop, t);
            bottomColor = sunsetBottom.clone().lerp(nightBottom, t);
        }

        skyMesh.material.uniforms.topColor.value.copy(topColor);
        skyMesh.material.uniforms.bottomColor.value.copy(bottomColor);
    }

    // Scene fog and background follow time
    const fogColor = new THREE.Color().lerpColors(
        new THREE.Color(0x0a0a1a),
        new THREE.Color(0x88bbee),
        timeOfDay
    );
    scene.fog.color.copy(fogColor);
    scene.background.copy(fogColor);

    // Particles
    particleSystem.update(dt);

    renderer.render(scene, camera);
}
