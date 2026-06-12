// Shared cel-shading helpers: a stepped gradient map + toon material factory.
import * as THREE from 'three';

const steps = new Uint8Array([100, 100, 100, 255, 160, 160, 160, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
const gradientMap = new THREE.DataTexture(steps, 4, 1, THREE.RGBAFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

export function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap });
}

export { gradientMap };
