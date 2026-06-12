// Level 1-1: world geometry, colliders, blocks, coins, enemies,
// moving platforms, checkpoint, flagpole and scenery.
import * as THREE from 'three';
import * as TEX from './textures.js';
import { toon } from './materials.js';

const BLOCK = 1;        // block size
const lambert = toon;   // cel-shaded look everywhere

// ---------------------------------------------------------------- particles
class Particles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  }
  burst(pos, color, { n = 10, speed = 5, up = 5, life = 0.7, size = 1 } = {}) {
    const mat = lambert(color);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geo, mat);
      m.position.copy(pos);
      m.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.items.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * r, up * (0.5 + Math.random()), Math.sin(a) * r),
        spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        life, maxLife: life,
      });
      this.scene.add(m);
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.items.splice(i, 1);
        continue;
      }
      p.vel.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.scale.setScalar(Math.max(0.01, p.mesh.scale.x * (p.life / p.maxLife) ** 0.3));
    }
  }
}

// ---------------------------------------------------------------- goomba
class Goomba {
  constructor(scene, x, z, { axis = 'x', range = 4, speed = 1.8, groundY = 0 } = {}) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), lambert(0x9c5a2e));
    body.scale.set(1, 0.85, 1);
    body.position.y = 0.45;
    g.add(body);
    const headTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), lambert(0x7a4520));
    headTop.position.y = 0.47;
    g.add(headTop);
    this.feet = [];
    for (const s of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), lambert(0x4a2a10));
      foot.position.set(0.2 * s, 0.08, 0.05);
      g.add(foot);
      this.feet.push(foot);
    }
    const white = lambert(0xffffff), dark = lambert(0x221408);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), white);
      eye.position.set(0.16 * s, 0.55, 0.36);
      g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dark);
      pupil.position.set(0.15 * s, 0.55, 0.45);
      g.add(pupil);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06), dark);
      brow.position.set(0.16 * s, 0.68, 0.38);
      brow.rotation.z = -0.5 * s;
      g.add(brow);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    g.position.set(x, groundY, z);
    scene.add(g);

    this.mesh = g;
    this.axis = axis;
    this.center = axis === 'x' ? x : z;
    this.range = range;
    this.speed = speed;
    this.dir = 1;
    this.alive = true;
    this.squashTimer = 0;
    this.walkT = Math.random() * 10;
    this.radius = 0.45;
    this.height = 0.85;
  }

  stomp() {
    this.alive = false;
    this.squashTimer = 0.6;
    this.mesh.scale.y = 0.25;
    this.mesh.scale.x = 1.3;
    this.mesh.scale.z = 1.3;
  }

  update(dt) {
    if (!this.alive) {
      if (this.squashTimer > 0) {
        this.squashTimer -= dt;
        if (this.squashTimer <= 0) this.mesh.visible = false;
      }
      return;
    }
    const p = this.mesh.position;
    const v = this.speed * this.dir * dt;
    if (this.axis === 'x') {
      p.x += v;
      if (Math.abs(p.x - this.center) > this.range) this.dir *= -1;
    } else {
      p.z += v;
      if (Math.abs(p.z - this.center) > this.range) this.dir *= -1;
    }
    // face walk direction
    const target = this.axis === 'x'
      ? Math.atan2(this.dir, 0)
      : Math.atan2(0, this.dir);
    this.mesh.rotation.y += (target - this.mesh.rotation.y) * Math.min(1, 8 * dt);
    // waddle
    this.walkT += dt * 9;
    this.mesh.rotation.z = Math.sin(this.walkT) * 0.12;
    this.feet[0].position.z = 0.05 + Math.sin(this.walkT) * 0.12;
    this.feet[1].position.z = 0.05 - Math.sin(this.walkT) * 0.12;
  }
}

// ---------------------------------------------------------------- level
export class Level {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];     // {min,max, block?, delta?}
    this.coins = [];         // {mesh, baseY, taken}
    this.enemies = [];
    this.platforms = [];     // moving platforms
    this.fx = [];            // short-lived animations (coin pops, block bounces)
    this.particles = new Particles(scene);

    this.spawn = new THREE.Vector3(0, 0.2, 0);
    this.checkpoint = { x: 121, taken: false, mesh: null };
    this.flag = { x: 196, z: 0, mesh: null, cloth: null, reached: false };

    this._mats = this._makeMaterials();
    this._coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.09, 20);
    this._coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd23e, metalness: 0.85, roughness: 0.18,
      emissive: 0x4a2f00, envMapIntensity: 1.3,
    });

    this._build();
  }

  _makeMaterials() {
    const texToon = (map) => {
      const m = toon(0xffffff);
      m.map = map;
      return m;
    };
    return {
      grassTop: texToon(TEX.grassTexture()),
      dirtSide: texToon(TEX.dirtTexture()),
      dirtPlain: lambert(0x8a4d24),
      brick: texToon(TEX.brickTexture()),
      question: texToon(TEX.questionTexture()),
      used: texToon(TEX.usedBlockTexture()),
      stone: texToon(TEX.stoneTexture()),
      pipe: lambert(0x1cb51c),
      pipeDark: lambert(0x0e8a0e),
    };
  }

  _addCollider(minX, minY, minZ, maxX, maxY, maxZ, extra = {}) {
    const c = {
      min: new THREE.Vector3(minX, minY, minZ),
      max: new THREE.Vector3(maxX, maxY, maxZ),
      ...extra,
    };
    this.colliders.push(c);
    return c;
  }

  // ground slab: top at y=0 unless given
  _ground(x1, x2, z1, z2, { top = 0, thick = 2.5 } = {}) {
    const w = x2 - x1, d = z2 - z1;
    const topMat = this._mats.grassTop.clone();
    topMat.map = topMat.map.clone();
    topMat.map.wrapS = topMat.map.wrapT = THREE.RepeatWrapping;
    topMat.map.repeat.set(w / 2, d / 2);
    const sideMatX = this._mats.dirtSide.clone();
    sideMatX.map = sideMatX.map.clone();
    sideMatX.map.wrapS = sideMatX.map.wrapT = THREE.RepeatWrapping;
    sideMatX.map.repeat.set(d / 2, 1);
    const sideMatZ = this._mats.dirtSide.clone();
    sideMatZ.map = sideMatZ.map.clone();
    sideMatZ.map.wrapS = sideMatZ.map.wrapT = THREE.RepeatWrapping;
    sideMatZ.map.repeat.set(w / 2, 1);

    const geo = new THREE.BoxGeometry(w, thick, d);
    const mesh = new THREE.Mesh(geo, [
      sideMatX, sideMatX, topMat, this._mats.dirtPlain, sideMatZ, sideMatZ,
    ]);
    mesh.position.set((x1 + x2) / 2, top - thick / 2, (z1 + z2) / 2);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this._addCollider(x1, top - thick, z1, x2, top, z2);
  }

  // unit block (brick / question) centered at (x, y, z)
  _block(x, y, z, type) {
    const mat = type === 'question' ? this._mats.question : this._mats.brick;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const h = BLOCK / 2;
    const block = { mesh, type, used: false, baseY: y };
    this._addCollider(x - h, y - h, z - h, x + h, y + h, z + h, { block });
  }

  _pipe(x, z, height) {
    const r = 0.85;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, 20), this._mats.pipe);
    body.position.set(x, height / 2, z);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.16, r + 0.16, 0.5, 20), this._mats.pipeDark);
    lip.position.set(x, height - 0.25, z);
    body.castShadow = lip.castShadow = true;
    body.receiveShadow = lip.receiveShadow = true;
    this.scene.add(body, lip);
    const s = r + 0.16;
    this._addCollider(x - s, 0, z - s, x + s, height, z + s);
  }

  _coin(x, y, z) {
    const mesh = new THREE.Mesh(this._coinGeo, this._coinMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.coins.push({ mesh, baseY: y, taken: false, t: Math.random() * 10 });
  }

  _coinRow(x, y, z, n, dx = 1.2, dz = 0) {
    for (let i = 0; i < n; i++) this._coin(x + i * dx, y, z + i * dz);
  }

  _coinArc(x0, x1, z, peak) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = x0 + (x1 - x0) * t;
      const y = 1.2 + Math.sin(t * Math.PI) * peak;
      this._coin(x, y, z);
    }
  }

  _goomba(x, z, opts) {
    this.enemies.push(new Goomba(this.scene, x, z, opts));
  }

  // floating stone platform, top at y
  _stone(x, y, z, w, d, thick = 0.8) {
    const mat = this._mats.stone.clone();
    mat.map = mat.map.clone();
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(w / 2, d / 2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), mat);
    mesh.position.set(x, y - thick / 2, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    this._addCollider(x - w / 2, y - thick, z - d / 2, x + w / 2, y, z + d / 2);
    return mesh;
  }

  // moving platform oscillating on an axis
  _movingPlatform(x, y, z, { w = 3, d = 3, axis = 'x', amp = 4, period = 4, phase = 0 } = {}) {
    const thick = 0.6;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, thick, d), lambert(0xd96a25));
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.2, 0.18, d + 0.2),
      lambert(0xf7a000));
    edge.position.y = thick / 2;
    mesh.add(edge);
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    const collider = this._addCollider(
      x - w / 2, y - thick, z - d / 2, x + w / 2, y, z + d / 2,
      { vel: new THREE.Vector3() });
    const plat = { mesh, collider, base: new THREE.Vector3(x, y, z), w, d, thick, axis, amp, period, phase, t: 0 };
    this.platforms.push(plat);
    this._placePlatform(plat, 0);
    return plat;
  }

  _placePlatform(p, t) {
    const w = (Math.PI * 2) / p.period;
    const off = Math.sin(t * w + p.phase) * p.amp;
    const speed = Math.cos(t * w + p.phase) * p.amp * w;   // analytic d(off)/dt
    const pos = p.base.clone();
    pos[p.axis] += off;
    p.mesh.position.set(pos.x, pos.y - p.thick / 2, pos.z);
    p.collider.min.set(pos.x - p.w / 2, pos.y - p.thick, pos.z - p.d / 2);
    p.collider.max.set(pos.x + p.w / 2, pos.y, pos.z + p.d / 2);
    p.collider.vel.set(0, 0, 0);
    p.collider.vel[p.axis] = speed;
  }

  // ---------------------------------------------------------------- layout
  _build() {
    // ground slabs (pits between them)
    this._ground(-12, 46, -8, 8);
    this._ground(50, 86, -8, 8);
    this._ground(118, 152, -8, 8);
    this._ground(156, 216, -8, 8);

    // --- section 1: learn to jump & bonk ---
    this._block(10, 3, 0, 'question');
    this._block(16, 3, 0, 'brick');
    this._block(17, 3, 0, 'question');
    this._block(18, 3, 0, 'brick');
    this._block(19, 3, 0, 'question');
    this._block(20, 3, 0, 'brick');
    this._block(18, 6, 0, 'question');
    this._coinRow(14, 1.2, 3, 4);
    this._pipe(27, -3, 2);
    this._pipe(35, 3, 3);
    this._coin(35, 4.2, 3);
    this._goomba(24, 1, { axis: 'x', range: 4 });
    this._goomba(32, -1, { axis: 'z', range: 3.5 });
    this._coinRow(40, 1.2, 0, 3);
    this._coinArc(44, 52, 0, 2.4);

    // --- section 2: goomba alley ---
    this._goomba(57, 0, { axis: 'x', range: 5, speed: 2.2 });
    this._goomba(61, -4, { axis: 'z', range: 3 });
    this._block(64, 3, -2, 'brick');
    this._block(65, 3, -2, 'brick');
    this._block(66, 3, -2, 'question');
    this._block(67, 3, -2, 'brick');
    this._block(68, 3, -2, 'brick');
    this._coinRow(64, 4.4, -2, 5, 1);
    this._coinRow(66, 1.2, 4, 3);
    this._goomba(74, 2, { axis: 'x', range: 4, speed: 2.4 });
    this._block(78, 3, 0, 'question');
    this._goomba(81, -2, { axis: 'z', range: 4, speed: 2 });

    // --- section 3: sky crossing (pit 86..118) ---
    this._stone(90, 1, 2, 3.5, 3.5);
    this._stone(95, 1.8, -1, 3, 3);
    this._coin(95, 3, -1);
    this._movingPlatform(102, 2.2, 1, { axis: 'x', amp: 3.5, period: 4.4 });
    this._coinArc(99, 106, 1, 2.2);
    this._stone(109, 2.6, -1, 3, 3);
    this._movingPlatform(113.5, 3, 1.5, { axis: 'y', amp: 1.8, period: 3.6, phase: 1.5 });
    this._coin(113.5, 5.6, 1.5);

    // --- section 4: checkpoint & stairs ---
    this._buildCheckpoint(121, 0);
    this._goomba(127, 0, { axis: 'x', range: 4, speed: 2.2 });
    this._stone(132, 1, -3, 2.5, 2.5);
    this._stone(135, 2, -3, 2.5, 2.5);
    this._stone(138, 3, -3, 2.5, 2.5);
    this._coin(132, 2, -3); this._coin(135, 3, -3); this._coin(138, 4, -3);
    this._block(140, 3, 2, 'question');
    this._block(141, 3, 2, 'brick');
    this._block(142, 3, 2, 'question');
    this._goomba(146, 1, { axis: 'z', range: 4, speed: 2.4 });
    this._coinArc(150, 158, 0, 2.4);

    // --- section 5: goomba squad, grand staircase, flag ---
    this._goomba(162, 0, { axis: 'x', range: 3, speed: 2.6 });
    this._goomba(165, 3, { axis: 'x', range: 3, speed: 2.6 });
    this._goomba(165, -3, { axis: 'x', range: 3, speed: 2.6 });
    this._coinRow(170, 1.2, -2, 4);
    this._coinRow(170, 1.2, 2, 4);
    // staircase
    this._stairBlock(180, 1);
    this._stairBlock(182, 2);
    this._stairBlock(184, 3);
    this._stairBlock(186, 4);
    this._coin(186, 5.2, 0);
    this._buildFlag(this.flag.x, this.flag.z);
    this._buildCastle(207, 0);

    this._scenery();
  }

  _stairBlock(x, h) {
    const mat = this._mats.stone.clone();
    mat.map = mat.map.clone();
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(2, h);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, h, 5), mat);
    mesh.position.set(x + 1, h / 2, 0);
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    this._addCollider(x, 0, -2.5, x + 2, h, 2.5);
  }

  _buildCheckpoint(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 10), lambert(0xcccccc));
    pole.position.set(x, 2, z - 5);
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(
      [0, 0, 0, 1.1, -0.4, 0, 0, -0.8, 0], 3));
    flagGeo.computeVertexNormals();
    const cloth = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: 0xdd3322, side: THREE.DoubleSide }));
    cloth.position.set(x, 4, z - 5);
    pole.castShadow = true;
    this.scene.add(pole, cloth);
    this.checkpoint.mesh = cloth;
  }

  _buildFlag(x, z) {
    const poleH = 10;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, poleH, 12), lambert(0x3aaa3a));
    pole.position.set(x, poleH / 2, z);
    pole.castShadow = true;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), lambert(0xffd23e));
    ball.position.set(x, poleH + 0.2, z);
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(
      [0, 0, 0, -2, -0.7, 0, 0, -1.4, 0], 3));
    flagGeo.computeVertexNormals();
    const cloth = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({
      color: 0xffffff, side: THREE.DoubleSide }));
    cloth.position.set(x - 0.12, poleH - 0.3, z);
    // emblem on flag
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.3, 5),
      new THREE.MeshLambertMaterial({ color: 0x2bb52b, side: THREE.DoubleSide }));
    star.position.set(x - 1, poleH - 0.95, z + 0.01);
    this.scene.add(pole, ball, cloth, star);
    this.flag.mesh = pole;
    this.flag.cloth = cloth;
    this.flag.star = star;
    // base block
    this._stone(x, 0.6, z, 1.6, 1.6, 0.6);
  }

  _buildCastle(x, z) {
    const stone = lambert(0xb9b9c4);
    const dark = lambert(0x8e8e9c);
    const main = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 7), stone);
    main.position.set(x, 3, z);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 4), dark);
    tower.position.set(x, 4.5, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 2.5, 4), lambert(0xc23a2e));
    roof.position.set(x, 10.2, z);
    roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 16, 1, false, 0, Math.PI),
      lambert(0x2a1a0a));
    door.rotation.z = Math.PI / 2;
    door.rotation.y = Math.PI / 2;
    door.position.set(x - 4, 1.1, z);
    const doorBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 2.2), lambert(0x2a1a0a));
    doorBase.position.set(x - 4, 1.1, z);
    // crenellations
    const group = new THREE.Group();
    group.add(main, tower, roof, door, doorBase);
    for (let i = -1; i <= 1; i++) {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stone);
      c1.position.set(x - 3.5 + 0.1, 6.5, z + i * 3);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stone);
      c2.position.set(x + i * 3, 6.5, z - 3);
      group.add(c1, c2);
    }
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(group);
    this._addCollider(x - 4, 0, z - 3.5, x + 4, 6, z + 3.5);
  }

  _scenery() {
    const hillMat = lambert(0x2f9e44);
    const hillMat2 = lambert(0x37b24d);
    for (let i = 0; i < 22; i++) {
      const x = -10 + i * 11 + Math.random() * 6;
      const z = (Math.random() > 0.5 ? 1 : -1) * (22 + Math.random() * 18);
      const r = 4 + Math.random() * 7;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10),
        Math.random() > 0.5 ? hillMat : hillMat2);
      hill.scale.y = 0.5;
      hill.position.set(x, -r * 0.42, z);
      this.scene.add(hill);
    }
    // clouds
    const cloudMat = lambert(0xffffff);
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const n = 3 + (Math.random() * 3 | 0);
      for (let j = 0; j < n; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random(), 10, 8), cloudMat);
        s.position.set(j * 1.4 - n * 0.7, Math.random() * 0.5, Math.random() * 0.6);
        c.add(s);
      }
      c.position.set(-10 + i * 17 + Math.random() * 8, 11 + Math.random() * 7,
        (Math.random() - 0.5) * 40);
      this.scene.add(c);
      this.clouds.push({ mesh: c, speed: 0.3 + Math.random() * 0.5 });
    }
    // distant low-poly mountains, silhouetted in the fog
    const mtnMats = [lambert(0x7fb2d9), lambert(0x8fc3e3), lambert(0x6fa0c9)];
    for (let i = 0; i < 12; i++) {
      const h = 18 + Math.random() * 14;
      const r = 14 + Math.random() * 10;
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mtnMats[i % 3]);
      const side = i % 2 === 0 ? 1 : -1;
      m.position.set(-20 + i * 22 + Math.random() * 10, h / 2 - 2,
        side * (48 + Math.random() * 25));
      m.rotation.y = Math.random() * Math.PI;
      this.scene.add(m);
    }
    // flowers & grass tufts sprinkled on the ground slabs
    const flowerMat = new THREE.SpriteMaterial({ map: TEX.flowerTexture(), transparent: true });
    const tuftMat = new THREE.SpriteMaterial({ map: TEX.tuftTexture(), transparent: true });
    const slabs = [[-10, 44], [52, 84], [120, 150], [158, 176]];
    for (const [x1, x2] of slabs) {
      for (let i = 0; i < 14; i++) {
        const isFlower = i % 3 === 0;
        const s = new THREE.Sprite(isFlower ? flowerMat : tuftMat);
        const sc = isFlower ? 0.65 : 0.55;
        s.scale.setScalar(sc);
        s.position.set(x1 + Math.random() * (x2 - x1),
          sc / 2 - 0.04, (Math.random() - 0.5) * 14);
        this.scene.add(s);
      }
    }
    // bushes on ground sections
    const bushMat = lambert(0x2bb52b);
    const bushAt = [[4, 6], [20, -6], [38, 5], [55, 6], [70, -6], [125, 6], [144, -6], [163, 6], [192, 6]];
    for (const [x, z] of bushAt) {
      const b = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 - Math.abs(j - 1) * 0.18, 10, 8), bushMat);
        s.position.set((j - 1) * 0.8, 0.5 - Math.abs(j - 1) * 0.15, 0);
        b.add(s);
      }
      b.position.set(x, 0, z);
      this.scene.add(b);
    }
  }

  // ------------------------------------------------------------ interactions
  // Called when the player bonks a collider from below.
  hitBlock(collider, sfx) {
    const b = collider.block;
    if (!b) { sfx.bump(); return 0; }
    if (b.type === 'question') {
      if (b.used) { sfx.bump(); this._bounceBlock(b); return 0; }
      b.used = true;
      b.mesh.material = this._mats.used;
      this._bounceBlock(b);
      this._coinPop(b.mesh.position);
      sfx.coin();
      return 1;  // coins awarded
    }
    // brick: smash it
    collider.dead = true;
    this.scene.remove(b.mesh);
    this.particles.burst(b.mesh.position, 0xb5502e, { n: 10, speed: 4, up: 6, life: 0.8, size: 1.4 });
    sfx.brick();
    return 0;
  }

  _bounceBlock(b) {
    this.fx.push({
      type: 'blockBounce', mesh: b.mesh, baseY: b.baseY, t: 0, dur: 0.26,
    });
  }

  _coinPop(blockPos) {
    const mesh = new THREE.Mesh(this._coinGeo, this._coinMat);
    mesh.position.copy(blockPos).y += 0.8;
    this.scene.add(mesh);
    this.fx.push({ type: 'coinPop', mesh, t: 0, dur: 0.55, startY: mesh.position.y });
  }

  update(dt, playerPos) {
    // platforms
    for (const p of this.platforms) {
      p.t += dt;
      this._placePlatform(p, p.t);
    }
    // coins idle spin
    for (const c of this.coins) {
      if (c.taken) continue;
      c.t += dt;
      c.mesh.rotation.z = c.t * 3;
      c.mesh.position.y = c.baseY + Math.sin(c.t * 2.2) * 0.12;
    }
    // enemies (only near player, for perf)
    for (const e of this.enemies) {
      if (Math.abs(e.mesh.position.x - playerPos.x) < 45) e.update(dt);
    }
    // fx
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      if (f.type === 'blockBounce') {
        f.mesh.position.y = f.baseY + Math.sin(k * Math.PI) * 0.35;
      } else if (f.type === 'coinPop') {
        f.mesh.position.y = f.startY + k * 2.2 - k * k * 1.2;
        f.mesh.rotation.y = k * 14;
        if (k >= 1) this.scene.remove(f.mesh);
      }
      if (k >= 1) this.fx.splice(i, 1);
    }
    // checkpoint flag wave / flag cloth wave
    const t = performance.now() / 1000;
    if (this.checkpoint.mesh) this.checkpoint.mesh.rotation.y = Math.sin(t * 3) * 0.25;
    if (this.flag.cloth) {
      this.flag.cloth.rotation.y = Math.sin(t * 2.5) * 0.2;
      if (this.flag.star) this.flag.star.rotation.y = this.flag.cloth.rotation.y;
    }
    // clouds drift
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 240) c.mesh.position.x = -30;
    }
    this.particles.update(dt);
  }
}
