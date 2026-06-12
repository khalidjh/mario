// Player: a chunky plumber model built from primitives + a tuned platformer
// character controller (acceleration, skid, variable jump, coyote time,
// jump buffering, squash & stretch).
import * as THREE from 'three';

const PLAYER = {
  height: 1.5,
  halfW: 0.38,
  maxSpeed: 8.5,
  accelGround: 60,
  accelAir: 32,
  friction: 70,
  jumpVel: 11.8,
  jumpCutVel: 4.5,
  gravityUp: 27,      // while rising & holding jump (floatier apex)
  gravityDown: 40,    // falling / released jump (snappy)
  terminalVel: -30,
  coyoteTime: 0.12,
  jumpBuffer: 0.15,
  stompBounce: 8.5,
  stompBounceHeld: 13,
};

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function buildModel() {
  const g = new THREE.Group();
  const red = lambert(0xd92a1c);
  const blue = lambert(0x2549c7);
  const skin = lambert(0xf3c089);
  const brown = lambert(0x6b3a17);
  const dark = lambert(0x3a2410);
  const white = lambert(0xffffff);

  // torso (red shirt) + overalls
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.45, 0.42), red);
  torso.position.y = 0.62;
  g.add(torso);
  const overalls = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.34, 0.46), blue);
  overalls.position.y = 0.42;
  g.add(overalls);
  // overall straps
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.06), blue);
    strap.position.set(0.17 * s, 0.74, 0.21);
    g.add(strap);
  }

  // head + face
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), skin);
  head.position.y = 1.08;
  g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skin);
  nose.position.set(0, 1.05, 0.34);
  g.add(nose);
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.08), dark);
  mustache.position.set(0, 0.96, 0.31);
  g.add(mustache);
  for (const s of [-1, 1]) {
    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), white);
    eyeW.position.set(0.13 * s, 1.16, 0.28);
    g.add(eyeW);
    const eyeB = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), dark);
    eyeB.position.set(0.13 * s, 1.16, 0.345);
    g.add(eyeB);
  }

  // cap
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), red);
  cap.position.y = 1.18;
  g.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.28), red);
  brim.position.set(0, 1.24, 0.36);
  g.add(brim);
  // cap emblem
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), white);
  emblem.rotation.x = Math.PI / 2 - 0.5;
  emblem.position.set(0, 1.34, 0.30);
  g.add(emblem);

  // arms (pivot at shoulder)
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.38 * s, 0.78, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.16), red);
    arm.position.y = -0.18;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), white);
    hand.position.y = -0.42;
    pivot.add(hand);
    g.add(pivot);
    arms.push(pivot);
  }

  // legs (pivot at hip)
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.16 * s, 0.3, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), blue);
    leg.position.y = -0.12;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), brown);
    shoe.position.set(0, -0.26, 0.05);
    pivot.add(shoe);
    g.add(pivot);
    legs.push(pivot);
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, arms, legs };
}

export class Player {
  constructor(scene) {
    const { group, arms, legs } = buildModel();
    this.model = group;
    this.arms = arms;
    this.legs = legs;

    // root holds position (feet); model child gets squash/stretch + facing
    this.root = new THREE.Group();
    this.root.add(this.model);
    scene.add(this.root);

    this.pos = this.root.position;   // feet position
    this.vel = new THREE.Vector3();
    this.grounded = false;
    this.groundCollider = null;
    this.facing = 0;                 // yaw
    this.coyote = 0;
    this.buffer = 0;
    this.invuln = 0;
    this.runTime = 0;
    this.squash = 1;                 // y-scale animation target blend
    this.dead = false;

    this.events = [];                // strings consumed by main: 'jump','land','headbonk'
    this._headHits = [];
  }

  get aabb() {
    return {
      min: new THREE.Vector3(this.pos.x - PLAYER.halfW, this.pos.y, this.pos.z - PLAYER.halfW),
      max: new THREE.Vector3(this.pos.x + PLAYER.halfW, this.pos.y + PLAYER.height, this.pos.z + PLAYER.halfW),
    };
  }

  respawn(point) {
    this.pos.copy(point);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.groundCollider = null;
    this.invuln = 2;
    this.dead = false;
    this.facing = 0;
    this.model.visible = true;
  }

  bounce(strong) {
    this.vel.y = strong ? PLAYER.stompBounceHeld : PLAYER.stompBounce;
    this.grounded = false;
  }

  hurt(fromPos) {
    if (this.invuln > 0) return false;
    this.invuln = 1.6;
    const away = new THREE.Vector3().subVectors(this.pos, fromPos);
    away.y = 0;
    if (away.lengthSq() < 0.001) away.set(-1, 0, 0);
    away.normalize().multiplyScalar(7);
    this.vel.x = away.x;
    this.vel.z = away.z;
    this.vel.y = 6;
    this.grounded = false;
    return true;
  }

  update(dt, input, colliders) {
    const P = PLAYER;
    this._headHits.length = 0;

    // ----- ride moving platform -----
    if (this.grounded && this.groundCollider && this.groundCollider.vel) {
      this.pos.addScaledVector(this.groundCollider.vel, dt);
    }

    // ----- horizontal movement (camera-relative: forward = +X, right = -Z) -----
    const wishX = input.move.y;
    const wishZ = -input.move.x;
    const wishLen = Math.min(1, Math.hypot(wishX, wishZ));
    const accel = this.grounded ? P.accelGround : P.accelAir;

    if (wishLen > 0.05) {
      const nx = wishX / Math.max(wishLen, 0.001) * wishLen;
      const nz = wishZ / Math.max(wishLen, 0.001) * wishLen;
      this.vel.x += nx * accel * dt;
      this.vel.z += nz * accel * dt;
      const maxSp = P.maxSpeed * wishLen;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > maxSp) {
        // only clamp, don't kill momentum from bounces
        const over = Math.max(maxSp, sp - P.friction * dt * 1.5);
        this.vel.x *= over / sp;
        this.vel.z *= over / sp;
      }
      // face movement direction (smooth turn)
      const targetYaw = Math.atan2(this.vel.x, this.vel.z);
      let d = targetYaw - this.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.facing += d * Math.min(1, 14 * dt);
    } else {
      // friction
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > 0) {
        const drop = (this.grounded ? P.friction : P.friction * 0.15) * dt;
        const ns = Math.max(0, sp - drop);
        this.vel.x *= ns / sp;
        this.vel.z *= ns / sp;
      }
    }

    // ----- jumping: buffer + coyote -----
    this.coyote = this.grounded ? P.coyoteTime : Math.max(0, this.coyote - dt);
    if (input.consumeJump()) this.buffer = P.jumpBuffer;
    else this.buffer = Math.max(0, this.buffer - dt);

    if (this.buffer > 0 && this.coyote > 0) {
      this.vel.y = P.jumpVel;
      this.grounded = false;
      this.coyote = 0;
      this.buffer = 0;
      this.squash = 1.25;          // stretch on takeoff
      this.events.push('jump');
    }
    // variable jump height: releasing early cuts upward velocity
    if (!input.jumpHeld && this.vel.y > P.jumpCutVel) {
      this.vel.y = P.jumpCutVel;
    }

    // ----- gravity -----
    const g = (this.vel.y > 0 && input.jumpHeld) ? P.gravityUp : P.gravityDown;
    this.vel.y = Math.max(P.terminalVel, this.vel.y - g * dt);

    // ----- integrate & collide, axis by axis -----
    const wasFalling = this.vel.y;
    const wasGrounded = this.grounded;
    this.grounded = false;
    const prevGroundCollider = this.groundCollider;
    this.groundCollider = null;

    this._moveAxis('x', this.vel.x * dt, colliders);
    this._moveAxis('z', this.vel.z * dt, colliders);
    this._moveAxis('y', this.vel.y * dt, colliders);

    if (!wasGrounded && this.grounded) {
      this.squash = Math.max(0.55, 1 + wasFalling * 0.022);  // land squash by impact
      if (wasFalling < -10) this.events.push('land');
    }
    if (!this.grounded) this.groundCollider = null;
    else if (!this.groundCollider) this.groundCollider = prevGroundCollider;

    // ----- timers & animation -----
    if (this.invuln > 0) this.invuln -= dt;
    this._animate(dt, wishLen);

    return this._headHits;
  }

  _moveAxis(axis, amount, colliders) {
    if (amount === 0 && axis !== 'y') return;
    this.pos[axis] += amount;
    const hw = PLAYER.halfW, h = PLAYER.height;

    for (const c of colliders) {
      if (c.dead) continue;
      const minX = this.pos.x - hw, maxX = this.pos.x + hw;
      const minY = this.pos.y,      maxY = this.pos.y + h;
      const minZ = this.pos.z - hw, maxZ = this.pos.z + hw;
      if (maxX <= c.min.x || minX >= c.max.x) continue;
      if (maxY <= c.min.y || minY >= c.max.y) continue;
      if (maxZ <= c.min.z || minZ >= c.max.z) continue;

      if (axis === 'y') {
        if (amount <= 0) {
          // landing on top
          this.pos.y = c.max.y;
          this.vel.y = 0;
          this.grounded = true;
          this.groundCollider = c;
        } else {
          // bonk head on bottom
          this.pos.y = c.min.y - h;
          if (this.vel.y > 0) {
            this.vel.y = 0;
            this._headHits.push(c);
          }
        }
      } else if (axis === 'x') {
        this.pos.x = amount > 0 ? c.min.x - hw : c.max.x + hw;
        this.vel.x = 0;
      } else {
        this.pos.z = amount > 0 ? c.min.z - hw : c.max.z + hw;
        this.vel.z = 0;
      }
    }
  }

  _animate(dt, moveAmount) {
    // facing
    this.model.rotation.y = this.facing;

    // squash & stretch eases back to 1
    this.squash += (1 - this.squash) * Math.min(1, 10 * dt);
    const sy = this.squash;
    const sxz = 1 + (1 - sy) * 0.6;
    this.model.scale.set(sxz, sy, sxz);

    const speed = Math.hypot(this.vel.x, this.vel.z);

    if (!this.grounded) {
      // jump pose: arms up, legs split
      const up = this.vel.y > 0 ? 1 : 0.4;
      this.arms[0].rotation.x += (-2.4 * up - this.arms[0].rotation.x) * 12 * dt;
      this.arms[1].rotation.x += (-0.6 - this.arms[1].rotation.x) * 12 * dt;
      this.legs[0].rotation.x += (0.7 - this.legs[0].rotation.x) * 12 * dt;
      this.legs[1].rotation.x += (-0.7 - this.legs[1].rotation.x) * 12 * dt;
    } else if (speed > 0.5) {
      // run cycle
      this.runTime += dt * (4 + speed * 1.6);
      const swing = Math.sin(this.runTime) * Math.min(1, speed / 6);
      this.legs[0].rotation.x = swing * 1.1;
      this.legs[1].rotation.x = -swing * 1.1;
      this.arms[0].rotation.x = -swing * 0.9;
      this.arms[1].rotation.x = swing * 0.9;
      this.model.position.y = Math.abs(Math.cos(this.runTime)) * 0.06;
      // lean into run
      this.model.rotation.x = Math.min(0.18, speed * 0.02);
    } else {
      // idle: gentle bob
      this.runTime += dt * 2;
      this.model.position.y = Math.sin(this.runTime) * 0.015;
      this.model.rotation.x *= 0.9;
      for (const a of this.arms) a.rotation.x *= 0.85;
      for (const l of this.legs) l.rotation.x *= 0.85;
    }

    // invulnerability blink
    this.model.visible = this.invuln > 0 ? (Math.floor(this.invuln * 12) % 2 === 0) : true;
  }
}

export { PLAYER };
