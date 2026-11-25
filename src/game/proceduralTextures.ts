import * as THREE from 'three';

function createNoiseCanvas(
  size: number,
  drawFn: (ctx: CanvasRenderingContext2D, size: number) => void
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, size);
  return canvas;
}

function makeTiledTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createTerrainDetailTexture(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(101);
  // Subtle neutral-bright detail albedo map that multiplies cleanly with vertex colors
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#e8e8e4';
    ctx.fillRect(0, 0, size, size);

    // Organic blotches for natural meadow / soil / rock variation
    for (let i = 0; i < 420; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rad = 8 + rand() * 26;
      const v = Math.floor(204 + rand() * 44);
      ctx.fillStyle = `rgba(${v},${v},${v - 4},0.16)`;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine grass & earth grain
    for (let i = 0; i < 14000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const v = Math.floor(178 + rand() * 72);
      ctx.fillStyle = `rgba(${v},${v},${v - 6},0.34)`;
      ctx.fillRect(x, y, 1.5 + rand() * 2.2, 1.5 + rand() * 2.2);
    }

    // Crisp grass blade / wind ripple micro-strokes
    for (let i = 0; i < 1600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = rand() > 0.5 ? 'rgba(255,255,250,0.16)' : 'rgba(120,118,108,0.15)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 7, y + 5 + rand() * 8);
      ctx.stroke();
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 16000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 1 + rand() * 3.4;
      const v = Math.floor(78 + rand() * 102);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, r, r);
    }

    // Directional soil & grass micro-ridges
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 1400; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = rand() > 0.45 ? 'rgba(232,232,232,0.24)' : 'rgba(42,42,42,0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 10, y + 6 + rand() * 10);
      ctx.stroke();
    }

    // Scattered pebbles and small relief pockets
    for (let i = 0; i < 380; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rad = 2 + rand() * 5.5;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(34,34,34,0.28)' : 'rgba(242,242,242,0.24)';
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 56, 56),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 72, 72),
  };
}

export function createStoneMasonryTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(202);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#534d44';
    ctx.fillRect(0, 0, size, size);

    const rows = 10;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 5;
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        const shade = 128 + Math.floor(rand() * 44);
        const warm = Math.floor(rand() * 20);
        const grad = ctx.createLinearGradient(bx, by, bx, by + rowH);
        grad.addColorStop(0, `rgb(${shade + warm + 12},${shade + Math.floor(warm * 0.7) + 10},${shade})`);
        grad.addColorStop(1, `rgb(${shade + warm - 16},${shade + Math.floor(warm * 0.6) - 16},${shade - 20})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bx + 3, by + 3, colW - 6, rowH - 6, 4);
        ctx.fill();

        // Crisp chiseled stone bevel highlight & underside shadow
        ctx.fillStyle = 'rgba(255,250,236,0.22)';
        ctx.fillRect(bx + 5, by + 4, colW - 10, 4);
        ctx.fillStyle = 'rgba(22,19,16,0.34)';
        ctx.fillRect(bx + 5, by + rowH - 8, colW - 10, 4);
      }
    }

    // Mineral pitting & faint moss weathering in crevices
    for (let i = 0; i < 5200; i++) {
      const v = Math.floor(68 + rand() * 124);
      ctx.fillStyle = `rgba(${v},${v},${v - 4},0.2)`;
      ctx.fillRect(rand() * size, rand() * size, 2.2, 2.2);
    }
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = 'rgba(72, 108, 60, 0.16)';
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 3 + rand() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, size, size);
    const rows = 10;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 5;
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offset;
        const by = r * rowH;
        const v = Math.floor(195 + rand() * 42);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.beginPath();
        ctx.roundRect(bx + 4, by + 4, colW - 8, rowH - 8, 4);
        ctx.fill();
      }
    }
    for (let i = 0; i < 2400; i++) {
      const v = Math.floor(90 + rand() * 120);
      ctx.fillStyle = `rgba(${v},${v},${v},0.28)`;
      ctx.fillRect(rand() * size, rand() * size, 2, 2);
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 1, 1),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 1, 1),
  };
}

export function createCobblestoneTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(303);
  const stones: { cx: number; cy: number; w: number; h: number; base: number; warm: number }[] = [];
  const rows = 12;
  const cols = 12;
  const cellW = 512 / cols;
  const cellH = 512 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = (r % 2) * (cellW * 0.48) + (rand() - 0.5) * 4;
      stones.push({
        cx: (c * cellW + jitterX) % 512,
        cy: r * cellH + (rand() - 0.5) * 3,
        w: cellW * (0.76 + rand() * 0.14),
        h: cellH * (0.74 + rand() * 0.14),
        base: 118 + Math.floor(rand() * 48),
        warm: Math.floor(rand() * 24),
      });
    }
  }

  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#4e473c';
    ctx.fillRect(0, 0, size, size);

    for (const st of stones) {
      const g = ctx.createRadialGradient(
        st.cx + st.w * 0.38,
        st.cy + st.h * 0.32,
        2,
        st.cx + st.w * 0.5,
        st.cy + st.h * 0.5,
        st.w * 0.72
      );
      g.addColorStop(0, `rgb(${st.base + st.warm + 22},${st.base + Math.floor(st.warm * 0.65) + 18},${st.base + 8})`);
      g.addColorStop(1, `rgb(${st.base + st.warm - 14},${st.base + Math.floor(st.warm * 0.5) - 14},${st.base - 18})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(st.cx, st.cy, st.w, st.h, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,23,18,0.52)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Subtle moss dust & weathered grit
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rand() > 0.35 ? 'rgba(72, 108, 56, 0.18)' : 'rgba(235, 224, 198, 0.14)';
      ctx.fillRect(rand() * size, rand() * size, 3.2, 3.2);
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, size, size);
    for (const st of stones) {
      const g = ctx.createRadialGradient(
        st.cx + st.w * 0.5,
        st.cy + st.h * 0.5,
        2,
        st.cx + st.w * 0.5,
        st.cy + st.h * 0.5,
        st.w * 0.65
      );
      g.addColorStop(0, '#f2f2f2');
      g.addColorStop(1, '#9c9c9c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(st.cx + 2, st.cy + 2, st.w - 4, st.h - 4, 8);
      ctx.fill();
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 7, 7),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 7, 7),
  };
}

export function createRoofShingleTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(404);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#5e2418';
    ctx.fillRect(0, 0, size, size);
    const rows = 14;
    const cols = 10;
    const rw = size / cols;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + off;
        const y = r * rh;
        const rCol = 138 + Math.floor(rand() * 46);
        const gCol = 54 + Math.floor(rand() * 24);
        const bCol = 36 + Math.floor(rand() * 18);
        const grad = ctx.createLinearGradient(x, y, x, y + rh);
        grad.addColorStop(0, `rgb(${rCol + 18},${gCol + 10},${bCol + 6})`);
        grad.addColorStop(1, `rgb(${rCol - 18},${gCol - 10},${bCol - 8})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 1, rw - 4, rh - 1, [2, 2, 12, 12]);
        ctx.fill();
        ctx.fillStyle = 'rgba(22,8,4,0.42)';
        ctx.fillRect(x + 2, y + rh - 5, rw - 4, 4);
      }
    }
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,210,170,0.08)' : 'rgba(20,10,8,0.14)';
      ctx.fillRect(rand() * size, rand() * size, 3, 6);
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, size, size);
    const rows = 14;
    const cols = 10;
    const rw = size / cols;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + off;
        const y = r * rh;
        const grad = ctx.createLinearGradient(x, y, x, y + rh);
        grad.addColorStop(0, '#9a9a9a');
        grad.addColorStop(1, '#eaeaea');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 2, rw - 6, rh - 4, [2, 2, 10, 10]);
        ctx.fill();
      }
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 2, 2),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 2, 2),
  };
}

export function createSandstoneTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(505);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#ae8348';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4;
      const cw = size / cols;
      const off = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const shade = 192 + Math.floor(rand() * 34);
        ctx.fillStyle = `rgb(${shade},${Math.floor(shade * 0.79)},${Math.floor(shade * 0.49)})`;
        ctx.fillRect(c * cw + off + 3, r * rh + 3, cw - 6, rh - 6);
        ctx.fillStyle = 'rgba(255,244,210,0.18)';
        ctx.fillRect(c * cw + off + 4, r * rh + 4, cw - 8, 4);
      }
    }
    // Wind-carved desert strata bands
    for (let i = 0; i < 240; i++) {
      const y = rand() * size;
      ctx.strokeStyle = rand() > 0.4 ? 'rgba(128, 84, 34, 0.24)' : 'rgba(255, 234, 180, 0.16)';
      ctx.lineWidth = 1.5 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (rand() - 0.5) * 8);
      ctx.stroke();
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#383838';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const rh = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4;
      const cw = size / cols;
      const off = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = '#d6d6d6';
        ctx.fillRect(c * cw + off + 4, r * rh + 4, cw - 8, rh - 8);
      }
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 1, 1),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 1, 1),
  };
}

export function createTimberTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(606);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#4e321c';
    ctx.fillRect(0, 0, size, size);
    const planks = 8;
    const pw = size / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 90 + Math.floor(rand() * 38);
      const grad = ctx.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
      grad.addColorStop(0, `rgb(${shade + 12},${Math.floor(shade * 0.72)},${Math.floor(shade * 0.42)})`);
      grad.addColorStop(0.5, `rgb(${shade + 28},${Math.floor(shade * 0.84)},${Math.floor(shade * 0.52)})`);
      grad.addColorStop(1, `rgb(${shade + 8},${Math.floor(shade * 0.68)},${Math.floor(shade * 0.38)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(i * pw + 2, 0, pw - 4, size);

      // Fine curved wood grain fibers
      for (let g = 0; g < 34; g++) {
        const gx = i * pw + 4 + rand() * (pw - 8);
        ctx.strokeStyle = rand() > 0.25 ? 'rgba(38,20,10,0.34)' : 'rgba(195,146,96,0.16)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(
          gx + (rand() - 0.5) * 8,
          size * 0.33,
          gx + (rand() - 0.5) * 8,
          size * 0.66,
          gx + (rand() - 0.5) * 5,
          size
        );
        ctx.stroke();
      }
      // Subtle wood knot
      if (rand() > 0.35) {
        const kx = i * pw + pw * (0.3 + rand() * 0.4);
        const ky = 60 + rand() * (size - 120);
        ctx.strokeStyle = 'rgba(34,18,8,0.48)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 5, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Iron rivets at plank ends
      ctx.fillStyle = 'rgba(26,24,22,0.7)';
      ctx.beginPath();
      ctx.arc(i * pw + pw * 0.5, 20, 3.5, 0, Math.PI * 2);
      ctx.arc(i * pw + pw * 0.5, size - 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#a4a4a4';
    ctx.fillRect(0, 0, size, size);
    const planks = 8;
    const pw = size / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(i * pw, 0, 4, size);
      for (let g = 0; g < 18; g++) {
        ctx.strokeStyle = g % 2 === 0 ? 'rgba(220,220,220,0.22)' : 'rgba(40,40,40,0.24)';
        ctx.lineWidth = 1.5;
        const gx = i * pw + 6 + rand() * (pw - 12);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (rand() - 0.5) * 4, size);
        ctx.stroke();
      }
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 1, 1),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 1, 1),
  };
}

export function createDarkBarkTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(707);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#261d17';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 240; i++) {
      const x = rand() * size;
      const w = 3 + rand() * 9;
      const v = 26 + Math.floor(rand() * 34);
      ctx.fillStyle = `rgb(${v + 16},${v + 6},${v})`;
      ctx.fillRect(x, 0, w, size);
    }
    // Deep bark crevices + mossy ancient forest lichen
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = 'rgba(10,8,6,0.45)';
      ctx.fillRect(rand() * size, rand() * size, 2.5, 42 + rand() * 80);
    }
    for (let i = 0; i < 95; i++) {
      ctx.fillStyle = 'rgba(46, 94, 58, 0.28)';
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * size, 6 + rand() * 10, 14 + rand() * 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#707070';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 220; i++) {
      const x = rand() * size;
      const w = 2 + rand() * 6;
      ctx.fillStyle = i % 2 === 0 ? '#dcdcdc' : '#1e1e1e';
      ctx.fillRect(x, 0, w, size);
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 1, 2),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 1, 2),
  };
}

/**
 * Crystalline glacial ice & wind-packed arctic snow textures for the 4x North Pole continent.
 */
export function createGlacialIceTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(808);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#dff6ff');
    grad.addColorStop(0.5, '#b8e6fa');
    grad.addColorStop(1, '#d6f2ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle glacial blue snowdrifts & frost crystals
    for (let i = 0; i < 260; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(90,175,220,0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y, 16 + rand() * 38, 6 + rand() * 16, rand() * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crisp crystalline glacier fracture lines
    for (let i = 0; i < 65; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = rand() > 0.4 ? 'rgba(56, 152, 210, 0.34)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 90, y + (rand() - 0.5) * 90);
      ctx.stroke();
    }
    // Sparkle snow dust
    for (let i = 0; i < 3200; i++) {
      ctx.fillStyle = rand() > 0.35 ? 'rgba(255,255,255,0.42)' : 'rgba(130,200,235,0.26)';
      ctx.fillRect(rand() * size, rand() * size, 2, 2);
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 320; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(235,235,235,0.25)' : 'rgba(55,55,55,0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y, 18 + rand() * 34, 6 + rand() * 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 70; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = 'rgba(24,24,24,0.48)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 95, y + (rand() - 0.5) * 95);
      ctx.stroke();
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 16, 16),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 18, 18),
  };
}

/**
 * Seamless rippling ocean wave surface & foam texture.
 */
export function createOceanWaveTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(909);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#1b6ea3';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) {
        const wave =
          Math.sin((x / size) * Math.PI * 6 + Math.sin((y / size) * Math.PI * 4)) * 0.5 +
          Math.cos((y / size) * Math.PI * 8 - (x / size) * Math.PI * 4) * 0.5;
        const r = Math.floor(24 + (wave + 1) * 18);
        const g = Math.floor(104 + (wave + 1) * 34);
        const b = Math.floor(156 + (wave + 1) * 36);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 9, 9);
      }
    }
    // Delicate sun-kissed seafoam crests
    for (let i = 0; i < 360; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = 'rgba(186, 236, 255, 0.22)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 14, y - 5, x + 28, y + 1);
      ctx.stroke();
    }
  });

  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 6) {
      for (let x = 0; x < size; x += 6) {
        const w =
          Math.sin((x / size) * Math.PI * 8 + (y / size) * Math.PI * 4) * 0.5 +
          Math.cos((y / size) * Math.PI * 10 - (x / size) * Math.PI * 6) * 0.5;
        const v = Math.floor(128 + w * 88);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 7, 7);
      }
    }
  });

  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 48, 48),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 56, 56),
  };
}

/**
 * Veined bioluminescent Atlantis marble texture.
 */
export function createAtlantisMarbleTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const rand = seeded(1010);
  const colorCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#d9f2f7';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 45; i++) {
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(14, 165, 233, 0.25)' : 'rgba(100, 148, 165, 0.22)';
      ctx.lineWidth = 1.5 + rand() * 3;
      ctx.beginPath();
      let x = rand() * size;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < size) {
        y += 32;
        x += (rand() - 0.5) * 44;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  const bumpCanvas = createNoiseCanvas(512, (ctx, size) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 36; i++) {
      ctx.strokeStyle = 'rgba(70,70,70,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rand() * size, 0);
      ctx.lineTo(rand() * size, size);
      ctx.stroke();
    }
  });
  return {
    map: makeTiledTexture(colorCanvas, maxAnisotropy, true, 2, 2),
    bumpMap: makeTiledTexture(bumpCanvas, maxAnisotropy, false, 2, 2),
  };
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
