import * as THREE from 'three';

function createNoiseCanvas(size: number, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, size);
  return canvas;
}

export function createTerrainDetailTexture(maxAnisotropy: number): {
  bumpMap: THREE.CanvasTexture;
} {
  const canvas = createNoiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 2.5;
      const v = Math.floor(96 + Math.random() * 64);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, r, r);
    }
    // Subtle grass/soil directional streaks
    ctx.strokeStyle = 'rgba(210,210,210,0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 360; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y + 4 + Math.random() * 6);
      ctx.stroke();
    }
  });

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(36, 36);
  bumpMap.anisotropy = maxAnisotropy;
  return { bumpMap };
}

export function createStoneMasonryTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const colorCanvas = createNoiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#8b8477';
    ctx.fillRect(0, 0, size, size);

    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4;
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        const shade = 128 + Math.floor(Math.random() * 34);
        const warm = Math.floor(Math.random() * 14);
        ctx.fillStyle = `rgb(${shade + warm},${shade + Math.floor(warm * 0.6)},${shade - 8})`;
        ctx.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);
      }
    }

    // Subtle mortar speckles
    for (let i = 0; i < 1200; i++) {
      const v = Math.floor(85 + Math.random() * 90);
      ctx.fillStyle = `rgba(${v},${v},${v},0.18)`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  });

  const bumpCanvas = createNoiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#383838';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4;
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(bx + 3, by + 3, colW - 6, rowH - 6);
      }
    }
  });

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createTimberTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const colorCanvas = createNoiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#6f4e31';
    ctx.fillRect(0, 0, size, size);
    const planks = 6;
    const pw = size / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 92 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgb(${shade + 22},${Math.floor(shade * 0.78)},${Math.floor(shade * 0.5)})`;
      ctx.fillRect(i * pw + 2, 0, pw - 4, size);
      ctx.strokeStyle = 'rgba(42,24,12,0.35)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 16; g++) {
        const gx = i * pw + 4 + Math.random() * (pw - 8);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (Math.random() - 0.5) * 4, size);
        ctx.stroke();
      }
    }
  });

  const bumpCanvas = createNoiseCanvas(256, (ctx, size) => {
    ctx.fillStyle = '#909090';
    ctx.fillRect(0, 0, size, size);
    const planks = 6;
    const pw = size / planks;
    ctx.fillStyle = '#202020';
    for (let i = 0; i < planks; i++) {
      ctx.fillRect(i * pw, 0, 3, size);
    }
  });

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = createNoiseCanvas(128, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(10, 14, 18, 0.58)');
    g.addColorStop(0.55, 'rgba(10, 14, 18, 0.28)');
    g.addColorStop(1, 'rgba(10, 14, 18, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
