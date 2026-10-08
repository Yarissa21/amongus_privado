import { TILE } from '../config.js';

// Leyenda de casillas:
// '#' muro, 'H' seto, 'L' agua del estanque,
// 'w' madera (biblioteca), 'r' madera clara (dormitorio), 'b' azulejo (baño), 'j' goma de colores (cuarto de juegos),
// '.' parquet (pasillo), 'k' cocina, 'c' sala, 'v' alfombra del comedor, 'e' madera oscura (estudio),
// 'l' baldosa (lavandería), 'n' mármol (vestíbulo), 'i' terracota (invernadero), 'x' concreto (garaje),
// 'a' alfombra roja, 'm' tapete de entrada, 'g' pasto, 'p' camino, 'f' flores.
export const ANCHO_MAPA = 64;
export const ALTO_MAPA = 50;

function construir() {
  const g = Array.from({ length: ALTO_MAPA }, () => Array(ANCHO_MAPA).fill('#'));
  const rect = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = c;
  };
  // Planta alta (fila 1-8), pasillo (10-12), planta media (14-24), planta baja (26-33), jardín (35-48)
  rect(1, 1, 13, 8, 'w');
  rect(15, 1, 16, 8, 'r');
  rect(32, 1, 13, 8, 'b');
  rect(46, 1, 17, 8, 'j');
  rect(1, 10, 62, 3, '.');
  rect(1, 14, 13, 11, 'k');
  rect(15, 14, 16, 11, 'c');
  rect(32, 14, 13, 11, 'v');
  rect(46, 14, 17, 11, 'e');
  rect(1, 26, 13, 8, 'l');
  rect(15, 26, 16, 8, 'n');
  rect(32, 26, 13, 8, 'i');
  rect(46, 26, 17, 8, 'x');
  rect(0, 35, 64, 15, 'H');
  rect(1, 35, 62, 14, 'g');

  // Puertas
  for (const x of [6, 22, 37, 53]) rect(x, 9, 2, 1, '.');
  rect(6, 13, 2, 1, '.');
  rect(21, 13, 4, 1, '.');
  rect(37, 13, 2, 1, '.');
  rect(53, 13, 2, 1, '.');
  rect(14, 18, 1, 2, 'c');
  rect(31, 18, 1, 2, 'c');
  rect(45, 18, 1, 2, 'e');
  rect(6, 25, 2, 1, 'l');
  rect(21, 25, 4, 1, 'n');
  rect(37, 25, 2, 1, 'i');
  rect(53, 25, 2, 1, 'x');
  rect(14, 29, 1, 2, 'n');
  rect(31, 29, 1, 2, 'n');
  rect(45, 29, 1, 2, 'x');
  rect(21, 34, 4, 1, 'm');
  rect(52, 34, 6, 1, 'x');

  // Alfombras
  rect(3, 4, 5, 3, 'a');
  rect(19, 4, 8, 3, 'a');
  rect(18, 17, 10, 6, 'a');
  rect(49, 18, 9, 4, 'a');
  rect(21, 26, 4, 8, 'a');

  // Jardín
  rect(21, 35, 4, 3, 'p');
  rect(52, 35, 6, 3, 'p');
  rect(3, 38, 58, 2, 'p');
  rect(2, 41, 6, 2, 'f');
  rect(10, 41, 8, 2, 'f');
  rect(28, 41, 6, 2, 'f');
  rect(1, 35, 3, 1, 'f');
  rect(60, 35, 3, 1, 'f');
  rect(44, 42, 9, 5, 'L');
  return g;
}

export const CASILLAS = construir();

export const SALAS = [
  { nombre: 'Biblioteca', x: 1, y: 1, w: 13, h: 8 },
  { nombre: 'Dormitorio', x: 15, y: 1, w: 16, h: 8 },
  { nombre: 'Baño', x: 32, y: 1, w: 13, h: 8 },
  { nombre: 'Cuarto de juegos', x: 46, y: 1, w: 17, h: 8 },
  { nombre: 'Pasillo', x: 1, y: 9, w: 62, h: 5 },
  { nombre: 'Cocina', x: 1, y: 14, w: 14, h: 11 },
  { nombre: 'Sala', x: 15, y: 14, w: 16, h: 11 },
  { nombre: 'Comedor', x: 31, y: 14, w: 14, h: 11 },
  { nombre: 'Estudio', x: 45, y: 14, w: 18, h: 11 },
  { nombre: 'Lavandería', x: 1, y: 25, w: 14, h: 9 },
  { nombre: 'Vestíbulo', x: 15, y: 25, w: 16, h: 10 },
  { nombre: 'Invernadero', x: 31, y: 25, w: 14, h: 9 },
  { nombre: 'Garaje', x: 45, y: 25, w: 18, h: 10 },
  { nombre: 'Jardín', x: 0, y: 34, w: 64, h: 16 }
];

export function salaEn(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const sala = SALAS.find((s) => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h);
  return sala ? sala.nombre : 'Pasillo';
}

// Muebles: tipo y casilla superior izquierda. Los tipos (tamaño, colisión y dibujo) están en colision.js y graficos/muebles.js.
export const MUEBLES = [
  // Biblioteca
  { tipo: 'estante', tx: 1, ty: 1 },
  { tipo: 'estante', tx: 3, ty: 1 },
  { tipo: 'estante', tx: 10, ty: 1 },
  { tipo: 'lampara', tx: 12, ty: 1 },
  { tipo: 'escritorio', tx: 8, ty: 5 },
  { tipo: 'sillon', tx: 2, ty: 5 },
  { tipo: 'globo', tx: 12, ty: 5 },
  { tipo: 'planta', tx: 13, ty: 7 },
  // Dormitorio
  { tipo: 'cama', tx: 16, ty: 1 },
  { tipo: 'mesaNoche', tx: 18, ty: 1 },
  { tipo: 'tocador', tx: 21, ty: 1 },
  { tipo: 'armario', tx: 28, ty: 1 },
  { tipo: 'baul', tx: 16, ty: 7 },
  { tipo: 'planta', tx: 30, ty: 7 },
  // Baño
  { tipo: 'tina', tx: 33, ty: 1 },
  { tipo: 'inodoro', tx: 39, ty: 1 },
  { tipo: 'lavabo', tx: 42, ty: 1 },
  { tipo: 'cesto', tx: 44, ty: 7 },
  { tipo: 'planta', tx: 32, ty: 7 },
  // Cuarto de juegos
  { tipo: 'cajaJuguetes', tx: 47, ty: 1 },
  { tipo: 'pizarra', tx: 51, ty: 1 },
  { tipo: 'caballito', tx: 57, ty: 2 },
  { tipo: 'cama', tx: 60, ty: 1 },
  { tipo: 'planta', tx: 46, ty: 7 },
  { tipo: 'baul', tx: 59, ty: 7 },
  // Pasillo
  { tipo: 'reloj', tx: 13, ty: 10 },
  { tipo: 'consola', tx: 33, ty: 10 },
  { tipo: 'reloj', tx: 49, ty: 10 },
  { tipo: 'planta', tx: 1, ty: 10 },
  { tipo: 'planta', tx: 62, ty: 10 },
  // Cocina
  { tipo: 'fregadero', tx: 1, ty: 14 },
  { tipo: 'estufa', tx: 3, ty: 14 },
  { tipo: 'refri', tx: 10, ty: 14 },
  { tipo: 'alacena', tx: 11, ty: 14 },
  { tipo: 'mesaCocina', tx: 5, ty: 19 },
  { tipo: 'basurero', tx: 1, ty: 23 },
  // Sala
  { tipo: 'chimenea', tx: 16, ty: 14 },
  { tipo: 'tv', tx: 27, ty: 14 },
  { tipo: 'lampara', tx: 30, ty: 14 },
  { tipo: 'sofa', tx: 21, ty: 21 },
  { tipo: 'piano', tx: 28, ty: 21 },
  { tipo: 'planta', tx: 15, ty: 23 },
  // Comedor
  { tipo: 'sillaAtras', tx: 35, ty: 16 },
  { tipo: 'sillaAtras', tx: 36, ty: 16 },
  { tipo: 'sillaAtras', tx: 37, ty: 16 },
  { tipo: 'sillaAtras', tx: 38, ty: 16 },
  { tipo: 'mesaComedor', tx: 35, ty: 17 },
  { tipo: 'silla', tx: 35, ty: 19 },
  { tipo: 'silla', tx: 36, ty: 19 },
  { tipo: 'silla', tx: 37, ty: 19 },
  { tipo: 'silla', tx: 38, ty: 19 },
  { tipo: 'aparador', tx: 41, ty: 14 },
  { tipo: 'planta', tx: 32, ty: 14 },
  { tipo: 'planta', tx: 44, ty: 23 },
  { tipo: 'planta', tx: 32, ty: 23 },
  // Estudio
  { tipo: 'estante', tx: 46, ty: 14 },
  { tipo: 'estante', tx: 48, ty: 14 },
  { tipo: 'escritorio', tx: 57, ty: 15 },
  { tipo: 'cajaFuerte', tx: 61, ty: 14 },
  { tipo: 'sillon', tx: 51, ty: 20 },
  { tipo: 'globo', tx: 60, ty: 21 },
  { tipo: 'lampara', tx: 56, ty: 14 },
  { tipo: 'planta', tx: 62, ty: 23 },
  // Lavandería
  { tipo: 'lavadora', tx: 1, ty: 26 },
  { tipo: 'lavadora', tx: 2, ty: 26 },
  { tipo: 'cesto', tx: 4, ty: 26 },
  { tipo: 'tendedero', tx: 9, ty: 27 },
  { tipo: 'cajas', tx: 11, ty: 31 },
  { tipo: 'planta', tx: 1, ty: 32 },
  // Vestíbulo
  { tipo: 'armadura', tx: 16, ty: 26 },
  { tipo: 'perchero', tx: 18, ty: 26 },
  { tipo: 'consola', tx: 26, ty: 26 },
  { tipo: 'armadura', tx: 29, ty: 26 },
  { tipo: 'planta', tx: 15, ty: 32 },
  { tipo: 'planta', tx: 30, ty: 32 },
  // Invernadero
  { tipo: 'mesaPlantas', tx: 33, ty: 27 },
  { tipo: 'planta', tx: 40, ty: 26 },
  { tipo: 'planta', tx: 42, ty: 26 },
  { tipo: 'planta', tx: 44, ty: 26 },
  { tipo: 'planta', tx: 44, ty: 31 },
  { tipo: 'planta', tx: 32, ty: 32 },
  { tipo: 'arbol', tx: 40, ty: 29 },
  // Garaje
  { tipo: 'auto', tx: 48, ty: 27 },
  { tipo: 'mesaTrabajo', tx: 58, ty: 26 },
  { tipo: 'cajas', tx: 60, ty: 31 },
  { tipo: 'cajas', tx: 46, ty: 31 },
  // Jardín
  { tipo: 'pozo', tx: 6, ty: 36 },
  { tipo: 'casaPerro', tx: 39, ty: 36 },
  { tipo: 'lena', tx: 36, ty: 41 },
  { tipo: 'banca', tx: 26, ty: 36 },
  { tipo: 'banca', tx: 47, ty: 40 },
  { tipo: 'arbol', tx: 13, ty: 35 },
  { tipo: 'arbol', tx: 30, ty: 35 },
  { tipo: 'arbol', tx: 42, ty: 40 },
  { tipo: 'arbol', tx: 24, ty: 41 },
  { tipo: 'arbol', tx: 20, ty: 40 },
  { tipo: 'arbol', tx: 58, ty: 41 },
  { tipo: 'arbol', tx: 2, ty: 44 },
  { tipo: 'arbol', tx: 33, ty: 45 },
  { tipo: 'arbol', tx: 60, ty: 45 }
];

const centro = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 + 4 });

// Tareas: casilla donde hay que pararse.
export const TAREAS = [
  { id: 'libros', nombre: 'Ordenar los libros', ...centro(2, 3) },
  { id: 'diario', nombre: 'Leer el diario', ...centro(8, 7) },
  { id: 'cama', nombre: 'Tender la cama', ...centro(17, 4) },
  { id: 'ropa', nombre: 'Doblar la ropa', ...centro(28, 3) },
  { id: 'baul', nombre: 'Buscar en el baúl', ...centro(18, 7) },
  { id: 'tina', nombre: 'Limpiar la tina', ...centro(34, 3) },
  { id: 'espejo', nombre: 'Limpiar el espejo', ...centro(42, 3) },
  { id: 'juguetes', nombre: 'Guardar los juguetes', ...centro(48, 3) },
  { id: 'pizarra', nombre: 'Borrar la pizarra', ...centro(52, 3) },
  { id: 'reloj', nombre: 'Dar cuerda al reloj', ...centro(13, 12) },
  { id: 'platos', nombre: 'Lavar los platos', ...centro(2, 16) },
  { id: 'sopa', nombre: 'Cocinar la sopa', ...centro(4, 16) },
  { id: 'hielo', nombre: 'Sacar hielo', ...centro(10, 16) },
  { id: 'basura', nombre: 'Sacar la basura', ...centro(2, 23) },
  { id: 'fuego', nombre: 'Avivar la chimenea', ...centro(17, 16) },
  { id: 'tele', nombre: 'Arreglar la tele', ...centro(27, 16) },
  { id: 'piano', nombre: 'Afinar el piano', ...centro(27, 22) },
  { id: 'plata', nombre: 'Pulir la plata', ...centro(42, 16) },
  { id: 'cartas', nombre: 'Ordenar las cartas', ...centro(57, 17) },
  { id: 'caja', nombre: 'Abrir la caja fuerte', ...centro(61, 16) },
  { id: 'lavadora', nombre: 'Lavar la ropa sucia', ...centro(2, 28) },
  { id: 'tender', nombre: 'Tender la ropa', ...centro(10, 29) },
  { id: 'armadura', nombre: 'Pulir la armadura', ...centro(16, 28) },
  { id: 'plantas', nombre: 'Trasplantar las plantas', ...centro(34, 29) },
  { id: 'auto', nombre: 'Arreglar el auto', ...centro(49, 29) },
  { id: 'agua', nombre: 'Sacar agua del pozo', ...centro(7, 38) },
  { id: 'flores', nombre: 'Regar las flores', ...centro(14, 40) },
  { id: 'lena', nombre: 'Cortar leña', ...centro(37, 40) },
  { id: 'perro', nombre: 'Alimentar al perro', ...centro(39, 38) },
  { id: 'peces', nombre: 'Alimentar a los peces', ...centro(48, 41) }
].map((t) => ({ ...t, sala: salaEn(t.x, t.y) }));

// Pasadizos secretos (solo el asesino): cada uno lleva al siguiente.
export const PASADIZOS = [
  { nombre: 'Biblioteca', ...centro(11, 3) },
  { nombre: 'Dormitorio', ...centro(29, 3) },
  { nombre: 'Cuarto de juegos', ...centro(58, 5) },
  { nombre: 'Estudio', ...centro(47, 16) },
  { nombre: 'Sala', ...centro(16, 16) },
  { nombre: 'Cocina', ...centro(12, 16) }
];

export const FUSIBLES = { ...centro(30, 10), tx: 30, ty: 9 };

// Mesa del comedor: campana de emergencia y asientos para las reuniones.
export const MESA = { x: 35 * TILE, y: 17 * TILE, w: 4 * TILE, h: 2 * TILE };

export const ASIENTOS = [
  ...[0, 1, 2, 3].map((i) => ({ x: MESA.x + 8 + i * TILE, y: MESA.y - 3 })),
  ...[0, 1, 2, 3].map((i) => ({ x: MESA.x + 8 + i * TILE, y: MESA.y + MESA.h + 16 })),
  { x: MESA.x - 12, y: MESA.y + 20 },
  { x: MESA.x + MESA.w + 12, y: MESA.y + 20 }
];

export const INICIO = { x: 23 * TILE, y: 18 * TILE + 8 };

export function puntoInicio(i, total) {
  const ang = (i / Math.max(1, total)) * Math.PI * 2;
  return { x: Math.round(INICIO.x + Math.cos(ang) * 30), y: Math.round(INICIO.y + Math.sin(ang) * 16) };
}
