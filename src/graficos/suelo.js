import { TILE } from '../config.js';
import { CASILLAS, ANCHO_MAPA, ALTO_MAPA, FUSIBLES } from '../mundo/mapa.js';
import { lienzo, px, hash } from './pixel.js';

const T = TILE;

const PISOS = {
  w: { base: '#c08a58', linea: '#9a6a40', luz: '#d8a470' },
  r: { base: '#dcb488', linea: '#b88e64', luz: '#ecc89c' },
  '.': { base: '#b47c4c', linea: '#8e5c34', luz: '#c89460' },
  c: { base: '#cc9a64', linea: '#a87848', luz: '#e0b078' },
  e: { base: '#8a5a38', linea: '#6a4028', luz: '#a06c44' }
};

const PAPEL = {
  w: { base: '#5e9468', raya: '#4e8058' },
  r: { base: '#eab4c4', raya: '#f4ccd8' },
  b: { base: '#a8d8ec', raya: '#c8e8f4' },
  '.': { base: '#e4d0a4', raya: '#d4bc8c' },
  k: { base: '#f0dc90', raya: '#e4cc78' },
  c: { base: '#d8bc90', raya: '#c8a878' },
  v: { base: '#a8505c', raya: '#94404c' },
  a: { base: '#d8bc90', raya: '#c8a878' },
  m: { base: '#f0e8d4', raya: '#dcd0b8' },
  g: { base: '#f0e6d2', raya: '#d8ccb4' },
  j: { base: '#f8e070', raya: '#f0c040' },
  e: { base: '#6a4a3a', raya: '#5a3a2c' },
  l: { base: '#d8e8f0', raya: '#c0d4e0' },
  n: { base: '#3a6a58', raya: '#2e5848' },
  i: { base: '#c8f0d0', raya: '#a8e0b8' },
  x: { base: '#9a9aa4', raya: '#86868f' }
};

function goma(ctx, x, y, tx, ty) {
  const colores = ['#f07070', '#70b0f0', '#f8d050', '#78d078'];
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const c = colores[(tx * 2 + i + (ty * 2 + j) * 3) % 4];
      px(ctx, c, x + i * 8, y + j * 8, 8, 8);
      px(ctx, 'rgba(255,255,255,0.35)', x + i * 8, y + j * 8, 8, 1);
      px(ctx, 'rgba(0,0,0,0.12)', x + i * 8 + 7, y + j * 8, 1, 8);
    }
  }
}

function concreto(ctx, x, y, tx, ty) {
  px(ctx, '#a4a4ac', x, y, T, T);
  for (let k = 0; k < 5; k++) {
    const ix = Math.floor(hash(tx * 5 + k, ty) * 15);
    const iy = Math.floor(hash(ty * 3 + k, tx) * 15);
    px(ctx, k % 2 ? '#94949c' : '#b4b4bc', x + ix, y + iy, 1, 1);
  }
  if (hash(tx, ty * 7) < 0.08) {
    ctx.fillStyle = 'rgba(30,30,40,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 8, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  px(ctx, '#8c8c94', x, y + T - 1, T, 1);
}

function agua(ctx, x, y, tx, ty) {
  px(ctx, '#4a90d0', x, y, T, T);
  const off = (tx + ty) % 2 ? 0 : 6;
  px(ctx, '#78b8f0', x + 2 + off, y + 4, 5, 1);
  px(ctx, '#78b8f0', x + 8 - off / 2, y + 11, 5, 1);
  const es = (i, j) => CASILLAS[j] && CASILLAS[j][i] === 'L';
  if (!es(tx, ty - 1)) px(ctx, '#9898a0', x, y, T, 3);
  if (!es(tx, ty + 1)) px(ctx, '#9898a0', x, y + T - 2, T, 2);
  if (!es(tx - 1, ty)) px(ctx, '#9898a0', x, y, 2, T);
  if (!es(tx + 1, ty)) px(ctx, '#9898a0', x + T - 2, y, 2, T);
}

function madera(ctx, x, y, col, ty) {
  px(ctx, col.base, x, y, T, T);
  for (let f = 0; f < 4; f++) {
    const yy = y + f * 4;
    px(ctx, col.linea, x, yy + 3, T, 1);
    px(ctx, col.luz, x, yy, T, 1);
    const corte = (Math.floor(hash(x, yy + ty) * 3) * 5 + f * 7) % T;
    px(ctx, col.linea, x + corte, yy, 1, 3);
  }
}

function azulejo(ctx, x, y, a, b, junta) {
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) px(ctx, (i + j) % 2 ? a : b, x + i * 8, y + j * 8, 8, 8);
  }
  px(ctx, junta, x, y, T, 1);
  px(ctx, junta, x, y, 1, T);
  px(ctx, junta, x, y + 8, T, 1);
  px(ctx, junta, x + 8, y, 1, T);
}

function alfombra(ctx, x, y, tx, ty, base, borde, adorno) {
  const es = (i, j) => CASILLAS[j] && CASILLAS[j][i] === CASILLAS[ty][tx];
  px(ctx, base, x, y, T, T);
  if ((tx + ty) % 2 === 0) {
    px(ctx, adorno, x + 6, y + 6, 4, 4);
    px(ctx, base, x + 7, y + 7, 2, 2);
  } else {
    px(ctx, adorno, x + 7, y + 3, 2, 2);
    px(ctx, adorno, x + 7, y + 11, 2, 2);
  }
  if (!es(tx, ty - 1)) px(ctx, borde, x, y, T, 3);
  if (!es(tx, ty + 1)) px(ctx, borde, x, y + T - 3, T, 3);
  if (!es(tx - 1, ty)) px(ctx, borde, x, y, 3, T);
  if (!es(tx + 1, ty)) px(ctx, borde, x + T - 3, y, 3, T);
}

function pasto(ctx, x, y, tx, ty) {
  px(ctx, '#90d070', x, y, T, T);
  for (let k = 0; k < 4; k++) {
    const h = hash(tx * 4 + k, ty * 7 + k);
    const ix = Math.floor(h * 12) + 1;
    const iy = Math.floor(hash(ty + k, tx * 3) * 12) + 2;
    if (h < 0.55) {
      px(ctx, '#70b458', x + ix, y + iy, 1, 2);
      px(ctx, '#70b458', x + ix + 2, y + iy, 1, 2);
      px(ctx, '#70b458', x + ix + 1, y + iy + 1, 1, 1);
    } else if (h < 0.7) {
      px(ctx, '#b0e890', x + ix, y + iy, 2, 1);
    }
  }
}

function camino(ctx, x, y, tx, ty) {
  px(ctx, '#ecd8a4', x, y, T, T);
  for (let k = 0; k < 3; k++) {
    const ix = Math.floor(hash(tx + k * 5, ty) * 13);
    const iy = Math.floor(hash(ty + k * 3, tx) * 13);
    px(ctx, '#d4bc84', x + ix, y + iy, 2, 1);
    px(ctx, '#f8ecc4', x + ix, y + iy - 1, 2, 1);
  }
  const borde = (i, j) => CASILLAS[j] && CASILLAS[j][i] !== 'p' && CASILLAS[j][i] !== 'm';
  if (borde(tx, ty - 1)) px(ctx, '#c8b07c', x, y, T, 1);
  if (borde(tx, ty + 1)) px(ctx, '#c8b07c', x, y + T - 1, T, 1);
  if (borde(tx - 1, ty)) px(ctx, '#c8b07c', x, y, 1, T);
  if (borde(tx + 1, ty)) px(ctx, '#c8b07c', x + T - 1, y, 1, T);
}

function flores(ctx, x, y, tx, ty) {
  pasto(ctx, x, y, tx, ty);
  const colores = ['#f04858', '#f8f8f8', '#f8d040', '#f080c0'];
  const c = colores[(tx * 3 + ty) % colores.length];
  for (const [fx, fy] of [[3, 3], [10, 5], [5, 10], [12, 12]]) {
    px(ctx, '#3c8c40', x + fx + 1, y + fy + 2, 1, 2);
    px(ctx, c, x + fx, y + fy, 3, 1);
    px(ctx, c, x + fx + 1, y + fy - 1, 1, 3);
    px(ctx, '#f8e070', x + fx + 1, y + fy, 1, 1);
  }
}

function seto(ctx, x, y, tx, ty) {
  px(ctx, '#2f6a3a', x, y, T, T);
  const off = (tx + ty) % 2 ? 0 : 4;
  for (const [cx, cy] of [[4 + off, 4], [12 - off, 10]]) {
    ctx.fillStyle = '#4a9850';
    ctx.beginPath();
    ctx.arc(x + cx, y + cy, 6, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, '#78c070', x + cx - 3, y + cy - 4, 3, 2);
  }
  px(ctx, '#245430', x, y + T - 2, T, 2);
}

function muroArriba(ctx, x, y) {
  px(ctx, '#4e3a3c', x, y, T, T);
  px(ctx, '#5e4648', x + 1, y + 1, T - 2, T - 2);
}

function muroFrente(ctx, x, y, tx, ty, debajo) {
  const papel = PAPEL[debajo === 'f' || debajo === 'p' ? 'g' : debajo] || PAPEL['.'];
  px(ctx, '#4e3a3c', x, y, T, 3);
  if (debajo === 'g' || debajo === 'f' || debajo === 'p') {
    // Fachada exterior de madera
    px(ctx, papel.base, x, y + 3, T, 13);
    for (let k = 0; k < 4; k++) px(ctx, papel.raya, x, y + 5 + k * 3, T, 1);
    px(ctx, '#8a6a4a', x, y + 14, T, 2);
    if (tx % 4 === 2 && !(tx >= 20 && tx <= 25) && !(tx >= 51 && tx <= 58)) {
      px(ctx, '#ffffff', x + 3, y + 4, 10, 8);
      px(ctx, '#88b8e0', x + 4, y + 5, 8, 6);
      px(ctx, '#c4e0f4', x + 4, y + 5, 3, 2);
      px(ctx, '#ffffff', x + 7, y + 5, 1, 6);
    }
    return;
  }
  px(ctx, papel.base, x, y + 3, T, 10);
  if (debajo === 'b' || debajo === 'k' || debajo === 'l' || debajo === 'i' || debajo === 'x') {
    for (let k = 0; k < 2; k++) px(ctx, papel.raya, x, y + 6 + k * 4, T, 1);
    px(ctx, papel.raya, x + 7, y + 3, 1, 10);
  } else if (debajo === 'r' || debajo === 'j') {
    for (let k = 0; k < 3; k++) px(ctx, papel.raya, x + 3 + ((k * 5 + tx) % 12), y + 5 + k * 3, 2, 1);
  } else {
    px(ctx, papel.raya, x + 3, y + 3, 2, 10);
    px(ctx, papel.raya, x + 11, y + 3, 2, 10);
  }
  px(ctx, '#8a5a3a', x, y + 13, T, 2);
  px(ctx, '#6a4028', x, y + 15, T, 1);
}

function cuadroPared(ctx, x, y, variante) {
  px(ctx, '#7a4a28', x + 3, y + 3, 10, 9);
  px(ctx, '#d8a850', x + 4, y + 4, 8, 7);
  const fondos = ['#8cc4e8', '#f0c8a0', '#98d090'];
  px(ctx, fondos[variante % 3], x + 5, y + 5, 6, 5);
  if (variante % 3 === 0) {
    px(ctx, '#5a9a50', x + 5, y + 8, 6, 2);
    px(ctx, '#f8f0a0', x + 9, y + 6, 1, 1);
  } else if (variante % 3 === 1) {
    px(ctx, '#3a2a28', x + 7, y + 6, 2, 2);
    px(ctx, '#5a3a58', x + 6, y + 8, 4, 2);
  } else {
    px(ctx, '#e04848', x + 6, y + 7, 2, 2);
    px(ctx, '#f8e040', x + 9, y + 6, 1, 2);
  }
}

function caja(ctx, x, y) {
  px(ctx, '#7a7a88', x + 3, y + 3, 10, 10);
  px(ctx, '#a0a0b0', x + 4, y + 4, 8, 8);
  px(ctx, '#f8d040', x + 6, y + 5, 4, 2);
  px(ctx, '#404048', x + 7, y + 8, 2, 3);
}

const CUADROS = [
  [3, 9], [10, 9], [17, 9], [27, 9], [34, 9], [42, 9], [47, 9], [58, 9],
  [6, 0], [19, 0], [26, 0], [36, 0], [50, 0], [56, 0],
  [26, 13], [34, 13], [41, 13], [19, 13], [51, 13], [59, 13],
  [11, 25], [19, 25], [26, 25], [34, 25], [50, 25]
];

export function dibujarSuelo() {
  const { canvas, ctx } = lienzo(ANCHO_MAPA * T, ALTO_MAPA * T);
  for (let ty = 0; ty < ALTO_MAPA; ty++) {
    for (let tx = 0; tx < ANCHO_MAPA; tx++) {
      const c = CASILLAS[ty][tx];
      const x = tx * T;
      const y = ty * T;
      switch (c) {
        case 'w':
        case 'r':
        case '.':
        case 'c':
        case 'e':
          madera(ctx, x, y, PISOS[c], ty);
          break;
        case 'j':
          goma(ctx, x, y, tx, ty);
          break;
        case 'l':
          azulejo(ctx, x, y, '#f2f4f6', '#dce0e6', '#b8c0c8');
          break;
        case 'n':
          azulejo(ctx, x, y, '#f4f0e8', '#c4bcb0', '#a8a094');
          break;
        case 'i':
          azulejo(ctx, x, y, '#dc8a5e', '#c8744a', '#a85a38');
          break;
        case 'x':
          concreto(ctx, x, y, tx, ty);
          break;
        case 'L':
          agua(ctx, x, y, tx, ty);
          break;
        case 'b':
          azulejo(ctx, x, y, '#e8f4fa', '#cce6f2', '#b0d0e0');
          break;
        case 'k':
          azulejo(ctx, x, y, '#f4e6c8', '#dcc498', '#c8ae80');
          break;
        case 'v':
          alfombra(ctx, x, y, tx, ty, '#8c3c4c', '#d8b060', '#a85464');
          break;
        case 'a':
          alfombra(ctx, x, y, tx, ty, '#c84848', '#e8c060', '#e07060');
          break;
        case 'm':
          madera(ctx, x, y, PISOS['.'], ty);
          px(ctx, '#7a9a58', x + 1, y + 2, T - 2, T - 4);
          px(ctx, '#90b068', x + 3, y + 4, T - 6, T - 8);
          break;
        case 'g':
          pasto(ctx, x, y, tx, ty);
          break;
        case 'p':
          camino(ctx, x, y, tx, ty);
          break;
        case 'f':
          flores(ctx, x, y, tx, ty);
          break;
        case 'H':
          seto(ctx, x, y, tx, ty);
          break;
        case '#': {
          const debajo = ty + 1 < ALTO_MAPA ? CASILLAS[ty + 1][tx] : '#';
          if (debajo === '#' || debajo === 'H') muroArriba(ctx, x, y);
          else muroFrente(ctx, x, y, tx, ty, debajo);
          break;
        }
        default:
          px(ctx, '#000000', x, y, T, T);
      }
    }
  }
  // Sombra suave bajo los muros
  for (let ty = 1; ty < ALTO_MAPA; ty++) {
    for (let tx = 0; tx < ANCHO_MAPA; tx++) {
      const c = CASILLAS[ty][tx];
      if (c === '#' || c === 'H') continue;
      if (CASILLAS[ty - 1][tx] === '#') {
        ctx.fillStyle = 'rgba(40,20,30,0.22)';
        ctx.fillRect(tx * T, ty * T, T, 3);
      }
      if (tx > 0 && CASILLAS[ty][tx - 1] === '#') {
        ctx.fillStyle = 'rgba(40,20,30,0.15)';
        ctx.fillRect(tx * T, ty * T, 2, T);
      }
    }
  }
  CUADROS.forEach(([tx, ty], i) => cuadroPared(ctx, tx * T, ty * T, i));
  caja(ctx, FUSIBLES.tx * T, FUSIBLES.ty * T);
  return canvas;
}

