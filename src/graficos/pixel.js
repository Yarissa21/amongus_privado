export const CONTORNO = '#2a2232';

export function lienzo(ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function px(ctx, color, x, y, ancho = 1, alto = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, ancho, alto);
}

// Pinta un contorno de 1 px alrededor de todo lo dibujado (look de sprite de DS).
export function contornear(ctx, x0, y0, ancho, alto, color = CONTORNO) {
  const img = ctx.getImageData(x0, y0, ancho, alto);
  const d = img.data;
  const lleno = (x, y) => x >= 0 && y >= 0 && x < ancho && y < alto && d[(y * ancho + x) * 4 + 3] > 0;
  const borde = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (lleno(x, y)) continue;
      if (lleno(x - 1, y) || lleno(x + 1, y) || lleno(x, y - 1) || lleno(x, y + 1)) borde.push([x, y]);
    }
  }
  ctx.fillStyle = color;
  for (const [x, y] of borde) ctx.fillRect(x0 + x, y0 + y, 1, 1);
}

function aRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function oscurecer(hex, f = 0.25) {
  return aHex(aRgb(hex).map((v) => v * (1 - f)));
}

export function aclarar(hex, f = 0.25) {
  return aHex(aRgb(hex).map((v) => v + (255 - v) * f));
}

// Pseudoaleatorio determinista para que el mapa salga igual en todas las pantallas.
export function azar(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
