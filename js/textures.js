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
  const [c, ctx] = makeCanvas(64);
  ctx.fillStyle = '#3db83d';
  ctx.fillRect(0, 0, 64, 64);
  speckle(ctx, 64, ['#56d156', '#2fa12f', '#48c648', '#35ad35'], 240);
  return toTexture(c);
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
