import { TILE } from '../config.js';
import { CASILLAS, ANCHO_MAPA, ALTO_MAPA, MUEBLES } from './mapa.js';

// Tamaño del sprite de cada mueble y su rectángulo sólido [x, y, ancho, alto] relativo al sprite.
export const TIPOS_MUEBLE = {
  estante: { w: 32, h: 32, solido: [0, 6, 32, 26] },
  lampara: { w: 16, h: 28, solido: [3, 20, 10, 8] },
  escritorio: { w: 32, h: 24, solido: [0, 6, 32, 16] },
  sillon: { w: 16, h: 24, solido: [1, 8, 14, 14] },
  globo: { w: 16, h: 24, solido: [3, 14, 10, 10] },
  planta: { w: 16, h: 24, solido: [3, 14, 10, 10] },
  cama: { w: 32, h: 48, solido: [0, 2, 32, 44] },
  mesaNoche: { w: 16, h: 20, solido: [0, 4, 16, 16] },
  tocador: { w: 32, h: 32, solido: [0, 12, 32, 20] },
  armario: { w: 32, h: 32, solido: [0, 4, 32, 28] },
  baul: { w: 32, h: 16, solido: [0, 2, 32, 14] },
  tina: { w: 48, h: 32, solido: [0, 4, 48, 28] },
  inodoro: { w: 16, h: 24, solido: [1, 4, 14, 18] },
  lavabo: { w: 16, h: 28, solido: [0, 14, 16, 14] },
  cesto: { w: 16, h: 16, solido: [2, 4, 12, 12] },
  reloj: { w: 16, h: 32, solido: [1, 6, 14, 26] },
  consola: { w: 32, h: 20, solido: [0, 6, 32, 14] },
  fregadero: { w: 32, h: 32, solido: [0, 8, 32, 24] },
  estufa: { w: 32, h: 32, solido: [0, 8, 32, 24] },
  refri: { w: 16, h: 32, solido: [0, 4, 16, 28] },
  alacena: { w: 32, h: 32, solido: [0, 4, 32, 28] },
  mesaCocina: { w: 32, h: 32, solido: [1, 8, 30, 20] },
  basurero: { w: 16, h: 16, solido: [2, 3, 12, 13] },
  chimenea: { w: 32, h: 32, solido: [0, 6, 32, 26] },
  tv: { w: 32, h: 32, solido: [0, 16, 32, 16] },
  sofa: { w: 48, h: 24, solido: [0, 4, 48, 18] },
  piano: { w: 32, h: 32, solido: [0, 4, 32, 26] },
  mesaComedor: { w: 64, h: 32, solido: [0, 6, 64, 24] },
  silla: { w: 16, h: 16, solido: null },
  sillaAtras: { w: 16, h: 16, solido: null },
  aparador: { w: 32, h: 32, solido: [0, 8, 32, 24] },
  pozo: { w: 32, h: 32, solido: [1, 12, 30, 20] },
  casaPerro: { w: 32, h: 32, solido: [1, 8, 30, 24] },
  lena: { w: 32, h: 16, solido: [0, 4, 32, 12] },
  banca: { w: 32, h: 16, solido: [0, 4, 32, 10] },
  arbol: { w: 32, h: 48, solido: [9, 36, 14, 10] },
  cajaJuguetes: { w: 32, h: 24, solido: [0, 6, 32, 18] },
  pizarra: { w: 32, h: 24, solido: [0, 12, 32, 12] },
  caballito: { w: 24, h: 24, solido: [2, 12, 20, 12] },
  cajaFuerte: { w: 16, h: 24, solido: [0, 6, 16, 18] },
  lavadora: { w: 16, h: 24, solido: [0, 4, 16, 20] },
  tendedero: { w: 32, h: 24, solido: [0, 16, 32, 8] },
  cajas: { w: 32, h: 24, solido: [0, 6, 32, 18] },
  armadura: { w: 16, h: 32, solido: [1, 20, 14, 12] },
  perchero: { w: 16, h: 28, solido: [3, 20, 10, 8] },
  mesaPlantas: { w: 48, h: 24, solido: [0, 6, 48, 16] },
  auto: { w: 48, h: 32, solido: [0, 6, 48, 24] },
  mesaTrabajo: { w: 48, h: 24, solido: [0, 6, 48, 18] }
};

const SOLIDOS = MUEBLES.filter((m) => TIPOS_MUEBLE[m.tipo].solido).map((m) => {
  const [x, y, w, h] = TIPOS_MUEBLE[m.tipo].solido;
  return { x: m.tx * TILE + x, y: m.ty * TILE + y, w, h };
});

export function casillaSolida(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= ANCHO_MAPA || ty >= ALTO_MAPA) return true;
  const c = CASILLAS[ty][tx];
  return c === '#' || c === 'H' || c === 'L';
}

// Solo los muros y setos tapan la vista (el agua no).
export function bloqueaVista(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= ANCHO_MAPA || ty >= ALTO_MAPA) return true;
  const c = CASILLAS[ty][tx];
  return c === '#' || c === 'H';
}

// Caja de colisión del jugador alrededor de los pies.
const CAJA = { izq: 5, der: 5, arriba: 5, abajo: 1 };

export function libre(x, y) {
  const x0 = x - CAJA.izq;
  const x1 = x + CAJA.der;
  const y0 = y - CAJA.arriba;
  const y1 = y + CAJA.abajo;
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor(y1 / TILE); ty++) {
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
      if (casillaSolida(tx, ty)) return false;
    }
  }
  for (const s of SOLIDOS) {
    if (x1 > s.x && x0 < s.x + s.w && y1 > s.y && y0 < s.y + s.h) return false;
  }
  return true;
}

export function mover(x, y, dx, dy) {
  let nx = x;
  let ny = y;
  if (dx && libre(x + dx, y)) nx = x + dx;
  if (dy && libre(nx, y + dy)) ny = y + dy;
  return { x: nx, y: ny };
}

// Rejilla para los bots: una casilla es caminable si el jugador cabe parado en su centro.
export const CAMINABLE = Array.from({ length: ALTO_MAPA }, (_, ty) =>
  Array.from({ length: ANCHO_MAPA }, (_, tx) => libre(tx * TILE + TILE / 2, ty * TILE + TILE / 2 + 4))
);

export function caminable(tx, ty) {
  return tx >= 0 && ty >= 0 && tx < ANCHO_MAPA && ty < ALTO_MAPA && CAMINABLE[ty][tx];
}

// Busca la casilla caminable más cercana a un punto (para destinos que caen sobre un mueble).
export function casillaCercana(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (caminable(tx, ty)) return { tx, ty };
  for (let r = 1; r < 6; r++) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) === r && caminable(tx + i, ty + j)) return { tx: tx + i, ty: ty + j };
      }
    }
  }
  return { tx, ty };
}

// Camino más corto (BFS con diagonales) entre dos casillas.
export function buscarCamino(desde, hasta) {
  if (!caminable(hasta.tx, hasta.ty)) hasta = casillaCercana(hasta.tx * TILE + 8, hasta.ty * TILE + 8);
  const clave = (tx, ty) => ty * ANCHO_MAPA + tx;
  const previo = new Map([[clave(desde.tx, desde.ty), -1]]);
  const cola = [[desde.tx, desde.ty]];
  const meta = clave(hasta.tx, hasta.ty);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (cola.length) {
    const [x, y] = cola.shift();
    if (clave(x, y) === meta) break;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!caminable(nx, ny) || previo.has(clave(nx, ny))) continue;
      if (dx && dy && (!caminable(x + dx, y) || !caminable(x, y + dy))) continue;
      previo.set(clave(nx, ny), clave(x, y));
      cola.push([nx, ny]);
    }
  }
  if (!previo.has(meta)) return [];
  const camino = [];
  for (let k = meta; k !== -1; k = previo.get(k)) camino.push({ tx: k % ANCHO_MAPA, ty: Math.floor(k / ANCHO_MAPA) });
  camino.reverse();
  return camino;
}

// ¿Hay línea de visión entre dos puntos? (solo los muros la tapan, no los muebles)
export function hayLinea(x0, y0, x1, y1) {
  const pasos = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let i = 1; i < pasos; i++) {
    const x = x0 + ((x1 - x0) * i) / pasos;
    const y = y0 - 4 + ((y1 - y0) * i) / pasos;
    if (bloqueaVista(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}
