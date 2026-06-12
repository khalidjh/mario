import * as THREE from 'three';
import { Input } from './input.js';
import { SFX } from './audio.js';
import { Player } from './player.js';
import { Level } from './level.js';
import * as TEXGEN from './textures.js';

// ------------------------------------------------------------- renderer
const canvas = document.getElementById('game-canvas');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: dpr < 2,           // skip MSAA on high-dpi phones; dpr does the work
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const isTouchDevice = 'ontouchstart' in window;

// ------------------------------------------------------------- scene
const scene = new THREE.Scene();
const HORIZON = 0xbfe3ff;
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 50, 165);

// gradient sky dome (follows the camera)
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    topColor: { value: new THREE.Color(0x2e7fe8) },
    horizonColor: { value: new THREE.Color(HORIZON) },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    varying vec3 vDir;
    void main() {
      float h = normalize(vDir).y;
      float t = pow(max(h, 0.0), 0.55);
      gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
    }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(240, 24, 12), skyMat);
skyDome.frustumCulled = false;
skyDome.renderOrder = -10;
scene.add(skyDome);

// sun glow sprite, sitting in the same direction the light comes from
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: TEXGEN.sunTexture(),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
}));
sunSprite.scale.setScalar(70);
scene.add(sunSprite);

// simple sky-gradient environment map: gives metals (coins!) something to reflect
function makeEnvironment() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, '#9fd2ff');
  g.addColorStop(0.5, '#fff4dc');
  g.addColorStop(0.62, '#cfeacb');
  g.addColorStop(1, '#4d9b4d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.environment = makeEnvironment();

scene.add(new THREE.HemisphereLight(0xcfe5ff, 0x8a6a45, 0.85));
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
fillLight.position.set(-30, 20, -25);
scene.add(fillLight);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isTouchDevice ? 1024 : 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0015;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------------------------------------- game objects
const input = new Input();
const sfx = new SFX();
const level = new Level(scene);
const player = new Player(scene);
player.respawn(level.spawn);
player.invuln = 0;

const NULL_INPUT = { move: { x: 0, y: 0 }, jumpHeld: false, consumeJump: () => false };

// ------------------------------------------------------------- game state
const game = {
  mode: 'title',          // title | playing | win | gameover
  coins: 0,
  lives: 3,
  time: 300,
  winTimer: 0,
  spawnPoint: level.spawn.clone(),
};

// HUD
const hudCoins = document.getElementById('hud-coins');
const hudTime = document.getElementById('hud-time');
const hudLives = document.getElementById('hud-lives');
function updateHUD() {
  hudCoins.textContent = '×' + String(game.coins).padStart(2, '0');
  hudTime.textContent = 'TIME ' + Math.max(0, Math.ceil(game.time));
  hudLives.textContent = '♥'.repeat(Math.max(0, game.lives));
}

// Overlays
const overlayTitle = document.getElementById('overlay-title');
const overlayWin = document.getElementById('overlay-win');
const overlayGameover = document.getElementById('overlay-gameover');
const statsLine = document.getElementById('stats-line');
const hint = document.getElementById('controls-hint');
hint.innerHTML = ('ontouchstart' in window)
  ? 'Drag left side of screen to move<br>Tap <b>A</b> to jump (hold = higher!)'
  : 'WASD / Arrows to move · SPACE to jump (hold = higher!)';

document.getElementById('btn-start').addEventListener('click', () => {
  sfx.unlock();
  overlayTitle.classList.add('hidden');
  game.mode = 'playing';
});
document.getElementById('btn-replay').addEventListener('click', () => location.reload());
document.getElementById('btn-retry').addEventListener('click', () => location.reload());
// unlock audio on any first interaction (mobile autoplay policy)
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

// ------------------------------------------------------------- gameplay
function loseLife() {
  game.lives -= 1;
  updateHUD();
  if (game.lives <= 0) {
    sfx.die();
    game.mode = 'gameover';
    setTimeout(() => overlayGameover.classList.remove('hidden'), 900);
  } else {
    sfx.die();
    game.time = 300;
    player.respawn(game.spawnPoint);
  }
}

function winLevel() {
  if (game.mode !== 'playing') return;
  game.mode = 'win';
  level.flag.reached = true;
  sfx.win();
  const timeBonus = Math.ceil(game.time);
  statsLine.innerHTML = `COINS ×${game.coins} &nbsp;·&nbsp; TIME ${timeBonus}`;
  level.particles.burst(
    new THREE.Vector3(level.flag.x, 9, level.flag.z), 0xffd23e,
    { n: 24, speed: 6, up: 4, life: 1.4 });
  setTimeout(() => overlayWin.classList.remove('hidden'), 2200);
}

function checkCoins() {
  const p = player.pos;
  for (const c of level.coins) {
    if (c.taken) continue;
    const m = c.mesh.position;
    if (Math.abs(m.x - p.x) < 0.8 &&
        Math.abs(m.z - p.z) < 0.8 &&
        m.y > p.y - 0.3 && m.y < p.y + 1.8) {
      c.taken = true;
      level.scene.remove(c.mesh);
      game.coins += 1;
      sfx.coin();
      level.particles.burst(m, 0xffd23e, { n: 6, speed: 2.5, up: 3, life: 0.5, size: 0.7 });
    }
  }
}

function checkEnemies() {
  const p = player.pos;
  for (const e of level.enemies) {
    if (!e.alive) continue;
    const m = e.mesh.position;
    if (Math.abs(m.x - p.x) > 30) continue;
    const dx = Math.abs(m.x - p.x), dz = Math.abs(m.z - p.z);
    const overlapXZ = dx < e.radius + 0.38 && dz < e.radius + 0.38;
    const overlapY = p.y < m.y + e.height && p.y + 1.5 > m.y;
    if (!overlapXZ || !overlapY) continue;

    const stomping = player.vel.y < -1 && p.y > m.y + e.height * 0.45;
    if (stomping) {
      e.stomp();
      player.bounce(input.jumpHeld);
      sfx.stomp();
      level.particles.burst(m, 0x9c5a2e, { n: 8, speed: 3, up: 3, life: 0.6 });
    } else if (player.hurt(m)) {
      sfx.hurt();
      game.lives -= 1;
      updateHUD();
      if (game.lives <= 0) {
        game.mode = 'gameover';
        sfx.die();
        setTimeout(() => overlayGameover.classList.remove('hidden'), 900);
      }
    }
  }
}

function checkProgress() {
  const p = player.pos;
  // checkpoint
  if (!level.checkpoint.taken && p.x > level.checkpoint.x) {
    level.checkpoint.taken = true;
    game.spawnPoint.set(level.checkpoint.x, 1, 0);
    level.checkpoint.mesh.material.color.set(0x2bb52b);
    sfx.checkpoint();
  }
  // flagpole
  const f = level.flag;
  if (!f.reached) {
    const d = Math.hypot(p.x - f.x, p.z - f.z);
    if (d < 1.3 && p.y < 9) winLevel();
  }
  // fell into a pit
  if (p.y < -12 && game.mode === 'playing') loseLife();
}

// ------------------------------------------------------------- camera
const camPos = new THREE.Vector3(-9, 7, 0);
const camLook = new THREE.Vector3(5, 1.5, 0);
function updateCamera(dt) {
  const p = player.pos;
  const targetPos = new THREE.Vector3(
    p.x - 9.5,
    Math.max(5.5, p.y * 0.45 + 5.8),
    p.z * 0.55);
  const targetLook = new THREE.Vector3(p.x + 4.5, p.y * 0.6 + 1.5, p.z * 0.75);
  const k = 1 - Math.exp(-5 * dt);
  camPos.lerp(targetPos, k);
  camLook.lerp(targetLook, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  // keep the sun (and its shadow box) centered on the player
  sun.position.set(p.x + 18, 35, p.z + 14);
  sun.target.position.set(p.x, 0, p.z);
  // sky + sun glow track the camera so the backdrop never runs out
  skyDome.position.copy(camera.position);
  sunSprite.position.set(camera.position.x + 95, camera.position.y + 75, camera.position.z + 65);
}

// movement basis: camera forward/right flattened onto the ground plane
const camFwd = new THREE.Vector3(1, 0, 0);
const camRight = new THREE.Vector3(0, 0, 1);
function updateMoveBasis() {
  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  if (camFwd.lengthSq() < 0.0001) camFwd.set(1, 0, 0);
  camFwd.normalize();
  camRight.crossVectors(camFwd, THREE.Object3D.DEFAULT_UP).normalize();
}

// ------------------------------------------------------------- main loop
const clock = new THREE.Clock();
let winSlide = 0;

function tick() {
  requestAnimationFrame(tick);
  let dt = Math.min(clock.getDelta(), 0.05);
  if (dt <= 0) dt = 0.0001;

  input.poll();
  updateMoveBasis();
  const activeInput = game.mode === 'playing' ? input : NULL_INPUT;

  if (game.mode === 'playing' || game.mode === 'win' || game.mode === 'gameover') {
    // substep physics so fast falls can't tunnel through thin platforms
    const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      const headHits = player.update(sdt, activeInput, level.colliders, camFwd, camRight);
      for (const hit of headHits) {
        game.coins += level.hitBlock(hit, sfx);
      }
    }
    // player events -> feedback
    for (const ev of player.events) {
      if (ev === 'jump') sfx.jump();
      if (ev === 'land') {
        level.particles.burst(
          player.pos.clone(), 0xd9c9a0, { n: 5, speed: 2, up: 1.5, life: 0.4, size: 0.6 });
      }
    }
    player.events.length = 0;

    if (game.mode === 'playing') {
      game.time -= dt;
      if (game.time <= 0) { game.time = 300; loseLife(); }
      checkCoins();
      checkEnemies();
      checkProgress();
    }

    // flag slides down after winning
    if (game.mode === 'win' && level.flag.cloth && winSlide < 7.5) {
      const slide = Math.min(7.5 - winSlide, 5 * dt);
      winSlide += slide;
      level.flag.cloth.position.y -= slide;
      if (level.flag.star) level.flag.star.position.y -= slide;
    }
    updateHUD();
  }

  level.update(dt, player.pos);
  updateCamera(dt);
  renderer.render(scene, camera);
}

updateHUD();
tick();

// small debug hook (used by automated smoke tests)
window.__gameDebug = () => ({
  mode: game.mode,
  x: +player.pos.x.toFixed(2),
  y: +player.pos.y.toFixed(2),
  z: +player.pos.z.toFixed(2),
  coins: game.coins,
  lives: game.lives,
});
