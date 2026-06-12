// Procedurally generated pixel-art textures drawn on 2D canvases.
import * as THREE from 'three';

function makeCanvas(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Seeded-ish noise speckle helper
function speckle(ctx, size, colors, count) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.fillRect((Math.random() * size) | 0, (Math.random() * size) | 0, 2, 2);
  }
}

export function grassTexture() {
  // two-tone checker, Mario-3D-World style (each cell = 1m at repeat w/2)
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#5fcf52';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#4cbb45';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  speckle(ctx, 64, ['#6eda60', '#45b13e', '#57c74c'], 130);
  return toTexture(c);
}

export function flowerTexture() {
  const [c, ctx] = makeCanvas(32);
  ctx.clearRect(0, 0, 32, 32);
  // stem
  ctx.fillStyle = '#2e8b2e';
  ctx.fillRect(14, 16, 4, 16);
  ctx.fillRect(10, 22, 4, 3);
  // petals
  ctx.fillStyle = '#ffffff';
  [[16, 4], [8, 10], [24, 10], [10, 18], [22, 18]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
  });
  // center
  ctx.fillStyle = '#ffc400';
  ctx.beginPath(); ctx.arc(16, 11, 4.5, 0, 7); ctx.fill();
  return toTexture(c);
}

export function tuftTexture() {
  const [c, ctx] = makeCanvas(32);
  ctx.clearRect(0, 0, 32, 32);
  ctx.strokeStyle = '#3fae3f';
  ctx.lineWidth = 3;
  for (const [x0, x1] of [[6, 2], [12, 9], [16, 16], [20, 23], [26, 30]]) {
    ctx.beginPath();
    ctx.moveTo(x0, 32);
    ctx.quadraticCurveTo(x0, 16, x1, 6);
    ctx.stroke();
  }
  return toTexture(c);
}

export function sunTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,250,220,1)');
  g.addColorStop(0.25, 'rgba(255,240,180,0.9)');
  g.addColorStop(0.5, 'rgba(255,225,140,0.35)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function dirtTexture() {
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#9c5a2e';
  ctx.fillRect(0, 0, 64, 64);
  speckle(ctx, 64, ['#8a4d24', '#ab6838', '#7d441f', '#b5713e'], 200);
  // grass lip at top
  ctx.fillStyle = '#3db83d';
  ctx.fillRect(0, 0, 64, 6);
  for (let x = 0; x < 64; x += 8) {
    ctx.fillRect(x + 2, 6, 4, 3);
  }
  return toTexture(c);
}

export function brickTexture() {
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#b5502e';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#7a3018';
  // mortar lines
  for (let y = 0; y <= 64; y += 16) ctx.fillRect(0, y - 2, 64, 4);
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 16;
    for (let x = 0; x < 64; x += 32) {
      ctx.fillRect((x + off) % 64 - 2, row * 16, 4, 16);
    }
  }
  speckle(ctx, 64, ['#c25e3a', '#a8482a'], 80);
  return toTexture(c);
}

export function questionTexture() {
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#f7a000';
  ctx.fillRect(0, 0, 64, 64);
  speckle(ctx, 64, ['#ffb01e', '#e89200'], 90);
  // border + rivets
  ctx.fillStyle = '#8a4d00';
  ctx.fillRect(0, 0, 64, 4); ctx.fillRect(0, 60, 64, 4);
  ctx.fillRect(0, 0, 4, 64); ctx.fillRect(60, 0, 4, 64);
  ctx.fillStyle = '#ffe9b0';
  [[8, 8], [50, 8], [8, 50], [50, 50]].forEach(([x, y]) => ctx.fillRect(x, y, 6, 6));
  // question mark
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 38px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#8a4d00';
  ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
  ctx.fillText('?', 32, 34);
  return toTexture(c);
}

export function usedBlockTexture() {
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(0, 0, 64, 64);
  speckle(ctx, 64, ['#946241', '#7d4f2e'], 90);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(0, 0, 64, 4); ctx.fillRect(0, 60, 64, 4);
  ctx.fillRect(0, 0, 4, 64); ctx.fillRect(60, 0, 4, 64);
  [[8, 8], [50, 8], [8, 50], [50, 50]].forEach(([x, y]) => ctx.fillRect(x, y, 6, 6));
  return toTexture(c);
}

export function stoneTexture() {
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#a8a8b0';
  ctx.fillRect(0, 0, 64, 64);
  speckle(ctx, 64, ['#b8b8c0', '#9898a0', '#c0c0c8'], 160);
  ctx.fillStyle = '#787880';
  ctx.fillRect(0, 0, 64, 3); ctx.fillRect(0, 61, 64, 3);
  ctx.fillRect(0, 0, 3, 64); ctx.fillRect(61, 0, 3, 64);
  return toTexture(c);
}
