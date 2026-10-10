import { TIPOS_MUEBLE } from '../mundo/colision.js';
import { lienzo, px, contornear, azar } from './pixel.js';

const M = { base: '#c4874c', osc: '#8f5a2e', cla: '#e2ad72', fondo: '#5a3820' };
const BLANCO = '#f6f4f0';
const LIBROS = ['#d84848', '#4878d0', '#48a858', '#e8c040', '#9858c0', '#e08038', '#3a9aa8'];

function circulo(ctx, color, cx, cy, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

const DIBUJOS = {
  estante(ctx, w, h, r) {
    px(ctx, M.osc, 1, 1, 30, 30);
    px(ctx, M.cla, 1, 1, 30, 2);
    for (let i = 0; i < 3; i++) {
      const y = 4 + i * 9;
      px(ctx, M.fondo, 3, y, 26, 7);
      let x = 4;
      while (x < 27) {
        const ancho = r() < 0.5 ? 2 : 3;
        const alto = 5 + Math.floor(r() * 3);
        const c = LIBROS[Math.floor(r() * LIBROS.length)];
        if (r() < 0.12) {
          x += 2;
          continue;
        }
        px(ctx, c, x, y + 7 - alto, Math.min(ancho, 27 - x), alto);
        px(ctx, '#ffffff33', x, y + 7 - alto + 1, 1, 1);
        x += ancho;
      }
      px(ctx, M.base, 2, y + 7, 28, 2);
    }
  },
  lampara(ctx) {
    px(ctx, '#f8e8a0', 3, 2, 10, 7);
    px(ctx, '#f0d070', 3, 7, 10, 2);
    px(ctx, '#fff8d0', 5, 3, 3, 3);
    px(ctx, '#7a5a3a', 7, 9, 2, 16);
    px(ctx, '#5a3a28', 4, 24, 8, 3);
  },
  escritorio(ctx) {
    px(ctx, M.base, 1, 7, 30, 5);
    px(ctx, M.cla, 1, 7, 30, 1);
    px(ctx, M.osc, 1, 12, 30, 10);
    px(ctx, M.base, 3, 14, 11, 6);
    px(ctx, M.base, 18, 14, 11, 6);
    px(ctx, '#f0d060', 8, 16, 2, 1);
    px(ctx, '#f0d060', 23, 16, 2, 1);
    px(ctx, BLANCO, 5, 3, 10, 5);
    px(ctx, '#c8c0b0', 10, 3, 1, 5);
    px(ctx, '#7a8090', 6, 5, 3, 1);
    px(ctx, '#3a6a3a', 23, 2, 4, 2);
    px(ctx, '#e8c040', 22, 4, 6, 4);
  },
  sillon(ctx) {
    px(ctx, '#3e7a5a', 1, 2, 14, 12);
    px(ctx, '#58a078', 3, 3, 10, 9);
    px(ctx, '#3e7a5a', 1, 12, 14, 10);
    px(ctx, '#68b088', 3, 13, 10, 5);
    px(ctx, M.osc, 2, 21, 2, 2);
    px(ctx, M.osc, 12, 21, 2, 2);
  },
  globo(ctx) {
    circulo(ctx, '#4a90d0', 8, 7, 6);
    px(ctx, '#58b058', 5, 4, 3, 3);
    px(ctx, '#58b058', 9, 8, 3, 3);
    px(ctx, '#a8d8f8', 5, 3, 2, 1);
    px(ctx, '#c8a050', 7, 13, 2, 5);
    px(ctx, M.osc, 3, 18, 10, 5);
    px(ctx, M.base, 4, 18, 8, 2);
  },
  planta(ctx) {
    circulo(ctx, '#3a8a40', 8, 8, 6);
    circulo(ctx, '#58b050', 6, 6, 4);
    circulo(ctx, '#58b050', 11, 9, 3);
    px(ctx, '#88d070', 5, 4, 2, 1);
    px(ctx, '#c86040', 4, 14, 8, 9);
    px(ctx, '#e0805a', 3, 14, 10, 2);
    px(ctx, '#a04830', 4, 20, 8, 1);
  },
  cama(ctx) {
    px(ctx, M.osc, 1, 1, 30, 9);
    px(ctx, M.base, 3, 3, 26, 5);
    px(ctx, BLANCO, 2, 9, 28, 36);
    px(ctx, '#ffffff', 5, 10, 22, 7);
    px(ctx, '#d8d8e0', 5, 16, 22, 1);
    px(ctx, '#5878c8', 2, 20, 28, 25);
    px(ctx, '#7898e0', 2, 20, 28, 3);
    px(ctx, '#4868b0', 2, 41, 28, 4);
    for (let i = 0; i < 4; i++) px(ctx, '#7898e0', 6 + i * 6, 28, 3, 3);
    px(ctx, M.osc, 1, 44, 30, 3);
  },
  mesaNoche(ctx) {
    px(ctx, M.base, 1, 7, 14, 12);
    px(ctx, M.cla, 1, 7, 14, 2);
    px(ctx, M.osc, 2, 12, 12, 1);
    px(ctx, '#f0d060', 7, 14, 2, 1);
    px(ctx, '#f8e080', 5, 1, 6, 4);
    px(ctx, '#a07040', 7, 5, 2, 2);
  },
  tocador(ctx) {
    px(ctx, M.osc, 7, 1, 18, 13);
    px(ctx, '#a8d8f0', 9, 3, 14, 9);
    px(ctx, '#e0f4fc', 10, 4, 3, 4);
    px(ctx, M.base, 1, 13, 30, 18);
    px(ctx, M.cla, 1, 13, 30, 2);
    for (let i = 0; i < 2; i++) {
      px(ctx, M.osc, 3, 17 + i * 6, 26, 1);
      px(ctx, '#f0d060', 15, 19 + i * 6, 2, 1);
    }
    px(ctx, '#f080b0', 4, 10, 3, 3);
  },
  armario(ctx) {
    px(ctx, M.osc, 1, 1, 30, 30);
    px(ctx, M.base, 2, 3, 28, 27);
    px(ctx, M.cla, 2, 3, 28, 1);
    px(ctx, M.osc, 15, 4, 2, 26);
    px(ctx, '#f0d060', 12, 15, 2, 3);
    px(ctx, '#f0d060', 18, 15, 2, 3);
    px(ctx, M.cla, 4, 6, 9, 1);
    px(ctx, M.cla, 19, 6, 9, 1);
  },
  baul(ctx) {
    px(ctx, '#9a6030', 1, 3, 30, 12);
    px(ctx, '#bc7c40', 1, 3, 30, 5);
    px(ctx, '#d8c070', 6, 3, 2, 12);
    px(ctx, '#d8c070', 24, 3, 2, 12);
    px(ctx, '#f0d860', 14, 7, 4, 4);
    px(ctx, '#3a2818', 15, 9, 2, 1);
  },
  tina(ctx) {
    px(ctx, '#f0f4f8', 1, 5, 46, 24);
    px(ctx, '#d0dce8', 1, 26, 46, 3);
    px(ctx, '#90c8e8', 4, 8, 40, 16);
    px(ctx, '#b8e0f4', 6, 10, 12, 2);
    px(ctx, '#b8e0f4', 24, 16, 8, 2);
    px(ctx, '#ffffff', 30, 10, 4, 3);
    px(ctx, '#ffffff', 34, 12, 3, 2);
    px(ctx, '#b0b0bc', 5, 2, 6, 4);
    px(ctx, '#d8d8e0', 6, 2, 2, 2);
    px(ctx, '#c8b070', 3, 29, 3, 2);
    px(ctx, '#c8b070', 42, 29, 3, 2);
  },
  inodoro(ctx) {
    px(ctx, '#f4f4f8', 3, 1, 10, 8);
    px(ctx, '#d4d8e0', 3, 7, 10, 2);
    px(ctx, '#c0c0c8', 10, 3, 2, 1);
    px(ctx, '#f4f4f8', 2, 9, 12, 11);
    px(ctx, '#a8d0e8', 4, 11, 8, 6);
    px(ctx, '#d4d8e0', 3, 19, 10, 3);
  },
  lavabo(ctx) {
    px(ctx, '#c8a050', 2, 1, 12, 12);
    px(ctx, '#b8e0f4', 3, 2, 10, 10);
    px(ctx, '#e8f8ff', 4, 3, 3, 4);
    px(ctx, '#f4f4f8', 1, 15, 14, 6);
    px(ctx, '#90c0dc', 3, 16, 10, 3);
    px(ctx, '#b0b0bc', 7, 13, 2, 3);
    px(ctx, '#e0e4ec', 5, 21, 6, 6);
  },
  cesto(ctx) {
    px(ctx, '#c8a060', 2, 5, 12, 10);
    for (let i = 0; i < 3; i++) px(ctx, '#a07840', 2, 7 + i * 3, 12, 1);
    px(ctx, '#f0f0f8', 4, 2, 8, 4);
    px(ctx, '#88c0e8', 6, 3, 4, 2);
  },
  reloj(ctx) {
    px(ctx, M.osc, 2, 1, 12, 30);
    px(ctx, M.base, 3, 2, 10, 28);
    circulo(ctx, '#f8f0d8', 8, 8, 4);
    px(ctx, '#2a2020', 8, 5, 1, 4);
    px(ctx, '#2a2020', 8, 8, 3, 1);
    px(ctx, '#3a2818', 5, 15, 6, 12);
    px(ctx, '#e8c050', 7, 16, 2, 7);
    circulo(ctx, '#f0d060', 8, 24, 2);
    px(ctx, M.cla, 3, 2, 10, 1);
  },
  consola(ctx) {
    px(ctx, M.base, 1, 7, 30, 4);
    px(ctx, M.cla, 1, 7, 30, 1);
    px(ctx, M.osc, 2, 11, 2, 8);
    px(ctx, M.osc, 28, 11, 2, 8);
    px(ctx, M.osc, 4, 11, 24, 2);
    px(ctx, '#4878c0', 12, 2, 7, 6);
    px(ctx, '#6898e0', 13, 3, 2, 3);
    px(ctx, '#f04858', 11, 0, 3, 3);
    px(ctx, '#f8d040', 17, 0, 3, 3);
    px(ctx, '#f8f8f8', 14, 1, 3, 2);
  },
  fregadero(ctx) {
    px(ctx, '#d8d0bc', 1, 1, 30, 8);
    px(ctx, '#c4b8a0', 1, 4, 30, 1);
    px(ctx, '#e8e0d0', 1, 9, 30, 5);
    px(ctx, '#98b8d0', 5, 10, 14, 3);
    px(ctx, '#b0b0b8', 11, 5, 2, 5);
    px(ctx, '#ffffff', 22, 5, 7, 2);
    px(ctx, '#ffffff', 22, 7, 7, 2);
    px(ctx, '#c8a070', 1, 14, 30, 17);
    px(ctx, '#a88050', 15, 15, 2, 15);
    px(ctx, '#f0d060', 12, 20, 2, 2);
    px(ctx, '#f0d060', 18, 20, 2, 2);
  },
  estufa(ctx, w, h, r, cuadro) {
    px(ctx, '#e8e8f0', 1, 9, 30, 22);
    px(ctx, '#c8c8d4', 1, 9, 30, 1);
    px(ctx, '#3a3a44', 4, 10, 7, 3);
    px(ctx, '#3a3a44', 21, 10, 7, 3);
    px(ctx, '#404048', 5, 16, 22, 11);
    px(ctx, '#f09040', 7, 18, 18, 7);
    px(ctx, '#f8c060', 9, 20, 14, 3);
    px(ctx, '#c8c8d4', 5, 15, 22, 1);
    px(ctx, '#a0a0b0', 4, 4, 9, 7);
    px(ctx, '#c8c8d4', 5, 4, 7, 1);
    px(ctx, '#e8e8f0', 6 + (cuadro || 0), 1, 2, 2);
  },
  refri(ctx) {
    px(ctx, '#f0f4fa', 1, 1, 14, 30);
    px(ctx, '#c8d0dc', 1, 11, 14, 1);
    px(ctx, '#d0d8e4', 13, 1, 2, 30);
    px(ctx, '#909098', 11, 4, 1, 5);
    px(ctx, '#909098', 11, 14, 1, 7);
    px(ctx, '#f04858', 4, 15, 3, 3);
    px(ctx, '#48a8f0', 6, 20, 3, 2);
  },
  alacena(ctx) {
    px(ctx, M.osc, 1, 1, 30, 30);
    px(ctx, '#d8eef8', 3, 3, 26, 12);
    px(ctx, M.osc, 15, 3, 2, 12);
    for (let i = 0; i < 3; i++) {
      circulo(ctx, BLANCO, 7 + i * 3, 9, 3);
      circulo(ctx, '#f8d0a0', 21 + i * 3, 9, 2);
    }
    px(ctx, M.base, 3, 17, 26, 13);
    px(ctx, M.osc, 15, 17, 2, 13);
    px(ctx, '#f0d060', 12, 22, 2, 2);
    px(ctx, '#f0d060', 18, 22, 2, 2);
  },
  mesaCocina(ctx) {
    px(ctx, '#e8a868', 2, 9, 28, 13);
    px(ctx, '#f8c888', 2, 9, 28, 2);
    px(ctx, '#c08048', 2, 20, 28, 2);
    px(ctx, M.osc, 4, 22, 3, 8);
    px(ctx, M.osc, 25, 22, 3, 8);
    px(ctx, '#f0f0f0', 11, 11, 10, 6);
    circulo(ctx, '#f04848', 14, 11, 2);
    circulo(ctx, '#f8d040', 18, 12, 2);
    circulo(ctx, '#78c048', 16, 9, 2);
    px(ctx, '#c08048', 3, 2, 8, 6);
    px(ctx, '#e0a060', 3, 2, 8, 2);
    px(ctx, '#c08048', 21, 2, 8, 6);
    px(ctx, '#e0a060', 21, 2, 8, 2);
  },
  basurero(ctx) {
    px(ctx, '#7a8a98', 3, 4, 10, 11);
    px(ctx, '#9aaab8', 2, 3, 12, 3);
    px(ctx, '#5a6a78', 6, 7, 1, 7);
    px(ctx, '#5a6a78', 9, 7, 1, 7);
    px(ctx, '#c0ccd8', 6, 1, 4, 2);
  },
  chimenea(ctx, w, h, r, cuadro) {
    px(ctx, '#a89888', 1, 2, 30, 29);
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 4; i++) px(ctx, '#90806e', 1 + i * 8 + (j % 2) * 4, 3 + j * 5, 1, 4);
      px(ctx, '#90806e', 1, 6 + j * 5, 30, 1);
    }
    px(ctx, M.osc, 0, 9, 32, 4);
    px(ctx, M.cla, 0, 9, 32, 1);
    px(ctx, '#2a1810', 7, 15, 18, 16);
    px(ctx, '#5a3a28', 9, 27, 14, 3);
    const f = cuadro || 0;
    px(ctx, '#f06020', 10, 20 + f, 12, 8 - f);
    px(ctx, '#f8a030', 12 - f, 22, 8, 6);
    px(ctx, '#f8e070', 14 + f, 24, 4, 4);
    px(ctx, '#f8a030', 11 + f * 2, 18 - f, 3, 3);
  },
  tv(ctx) {
    px(ctx, M.osc, 1, 18, 30, 13);
    px(ctx, M.base, 3, 20, 12, 9);
    px(ctx, M.base, 17, 20, 12, 9);
    px(ctx, '#383840', 4, 3, 24, 16);
    px(ctx, '#6890b0', 6, 5, 20, 12);
    px(ctx, '#98c0e0', 7, 6, 6, 3);
    px(ctx, '#202028', 15, 0, 1, 3);
    px(ctx, '#202028', 18, 0, 1, 3);
  },
  sofa(ctx) {
    px(ctx, '#b84040', 1, 1, 46, 11);
    px(ctx, '#d05858', 3, 3, 42, 7);
    px(ctx, '#b84040', 1, 6, 7, 16);
    px(ctx, '#b84040', 40, 6, 7, 16);
    px(ctx, '#e06868', 8, 12, 32, 9);
    px(ctx, '#c04848', 23, 12, 2, 9);
    px(ctx, '#f08080', 9, 12, 13, 2);
    px(ctx, '#f08080', 26, 12, 13, 2);
    px(ctx, M.osc, 3, 21, 3, 2);
    px(ctx, M.osc, 42, 21, 3, 2);
  },
  piano(ctx) {
    px(ctx, '#28242c', 1, 1, 30, 24);
    px(ctx, '#48444e', 2, 2, 28, 3);
    px(ctx, '#f8f8f8', 2, 16, 28, 6);
    for (let i = 0; i < 9; i++) if (i % 3 !== 2) px(ctx, '#202024', 4 + i * 3, 16, 2, 3);
    px(ctx, '#e8d8a8', 8, 7, 6, 6);
    px(ctx, '#e8d8a8', 18, 7, 6, 6);
    px(ctx, '#28242c', 3, 25, 3, 6);
    px(ctx, '#28242c', 26, 25, 3, 6);
  },
  mesaComedor(ctx) {
    px(ctx, M.osc, 1, 5, 62, 24);
    px(ctx, '#f6f2ea', 2, 6, 60, 20);
    px(ctx, '#c04048', 2, 14, 60, 4);
    px(ctx, '#e0d8c8', 2, 25, 60, 1);
    for (const x of [8, 22, 38, 52]) {
      circulo(ctx, '#ffffff', x + 2, 10, 3);
      circulo(ctx, '#e8e0d0', x + 2, 22, 3);
    }
    // Campana de emergencia
    px(ctx, '#f0c840', 28, 6, 8, 7);
    px(ctx, '#f8e070', 29, 6, 3, 3);
    px(ctx, '#c09020', 27, 12, 10, 2);
    px(ctx, '#8a6010', 31, 4, 2, 2);
    px(ctx, M.osc, 3, 29, 3, 2);
    px(ctx, M.osc, 58, 29, 3, 2);
  },
  silla(ctx) {
    px(ctx, M.osc, 3, 1, 10, 3);
    px(ctx, M.base, 3, 4, 10, 7);
    px(ctx, M.cla, 3, 4, 10, 1);
    px(ctx, M.osc, 3, 11, 2, 4);
    px(ctx, M.osc, 11, 11, 2, 4);
  },
  sillaAtras(ctx) {
    px(ctx, M.osc, 3, 1, 10, 9);
    px(ctx, M.base, 5, 3, 6, 5);
    px(ctx, M.osc, 3, 10, 2, 5);
    px(ctx, M.osc, 11, 10, 2, 5);
  },
  aparador(ctx) {
    px(ctx, M.osc, 1, 10, 30, 21);
    px(ctx, M.cla, 1, 9, 30, 3);
    px(ctx, M.base, 3, 13, 12, 7);
    px(ctx, M.base, 17, 13, 12, 7);
    px(ctx, M.base, 3, 22, 26, 7);
    px(ctx, '#f0d060', 8, 16, 2, 1);
    px(ctx, '#f0d060', 22, 16, 2, 1);
    px(ctx, '#f0d060', 15, 25, 2, 1);
    px(ctx, '#d0d8e0', 5, 3, 7, 6);
    px(ctx, '#f0f4f8', 6, 4, 2, 2);
    px(ctx, '#b0b8c4', 12, 5, 2, 2);
    px(ctx, '#d0d8e0', 20, 6, 8, 3);
    px(ctx, '#f8f0c0', 24, 1, 1, 5);
  },
  pozo(ctx) {
    px(ctx, '#b05038', 3, 1, 26, 6);
    px(ctx, '#d06848', 3, 1, 26, 2);
    px(ctx, M.osc, 5, 7, 2, 10);
    px(ctx, M.osc, 25, 7, 2, 10);
    px(ctx, '#8a6a40', 7, 8, 18, 1);
    px(ctx, '#a07040', 14, 9, 4, 4);
    px(ctx, '#9898a0', 2, 15, 28, 15);
    px(ctx, '#b8b8c0', 2, 15, 28, 2);
    for (let j = 0; j < 3; j++) {
      px(ctx, '#78787f', 2, 19 + j * 4, 28, 1);
      for (let i = 0; i < 4; i++) px(ctx, '#78787f', 4 + i * 7 + (j % 2) * 3, 19 + j * 4, 1, 4);
    }
    px(ctx, '#284860', 5, 16, 22, 2);
  },
  casaPerro(ctx) {
    px(ctx, '#c04040', 2, 2, 28, 4);
    px(ctx, '#c04040', 0, 6, 32, 5);
    px(ctx, '#e05858', 4, 2, 24, 2);
    px(ctx, '#c08850', 3, 11, 26, 19);
    for (let i = 0; i < 4; i++) px(ctx, '#a07040', 3, 14 + i * 4, 26, 1);
    px(ctx, '#2a1810', 11, 17, 10, 13);
    // Perrito
    px(ctx, '#e8c890', 12, 22, 8, 7);
    px(ctx, '#a07850', 11, 21, 2, 4);
    px(ctx, '#a07850', 19, 21, 2, 4);
    px(ctx, '#202020', 14, 24, 1, 1);
    px(ctx, '#202020', 17, 24, 1, 1);
    px(ctx, '#3a2a2a', 15, 26, 2, 1);
  },
  lena(ctx) {
    for (let fila = 0; fila < 2; fila++) {
      for (let i = 0; i < 5 - fila; i++) {
        const x = 3 + i * 6 + fila * 3;
        const y = 8 - fila * 5;
        circulo(ctx, '#8a5a30', x + 2.5, y + 3, 3);
        circulo(ctx, '#d8a870', x + 2.5, y + 3, 2);
        px(ctx, '#a07040', x + 2, y + 3, 1, 1);
      }
    }
    px(ctx, '#a8a8b0', 26, 1, 2, 6);
    px(ctx, '#7a5030', 26, 7, 2, 6);
  },
  banca(ctx) {
    px(ctx, M.osc, 1, 2, 30, 3);
    px(ctx, M.base, 1, 5, 30, 4);
    px(ctx, M.cla, 1, 5, 30, 1);
    px(ctx, '#505058', 3, 9, 2, 5);
    px(ctx, '#505058', 27, 9, 2, 5);
  },
  arbol(ctx) {
    px(ctx, '#7a5030', 12, 30, 8, 16);
    px(ctx, '#5a3820', 12, 30, 2, 16);
    circulo(ctx, '#2e7034', 16, 20, 14);
    circulo(ctx, '#3e8a40', 11, 16, 9);
    circulo(ctx, '#3e8a40', 21, 18, 9);
    circulo(ctx, '#58a850', 13, 11, 7);
    circulo(ctx, '#58a850', 20, 14, 5);
    px(ctx, '#88d070', 10, 7, 4, 2);
    px(ctx, '#88d070', 19, 11, 3, 2);
  },
  cajaJuguetes(ctx) {
    px(ctx, '#e05858', 1, 8, 30, 15);
    px(ctx, '#f07878', 1, 8, 30, 3);
    px(ctx, '#f8d040', 4, 13, 24, 2);
    px(ctx, '#4878d0', 4, 2, 6, 7);
    px(ctx, '#78a8f0', 5, 3, 2, 2);
    circulo(ctx, '#58b858', 16, 5, 4);
    px(ctx, '#e8b860', 21, 1, 7, 8);
    px(ctx, '#3a2818', 23, 3, 1, 1);
    px(ctx, '#3a2818', 26, 3, 1, 1);
    px(ctx, '#f8f8f8', 9, 17, 3, 3);
    px(ctx, '#f8f8f8', 20, 17, 3, 3);
  },
  pizarra(ctx) {
    px(ctx, M.osc, 1, 1, 30, 16);
    px(ctx, '#2e5a40', 3, 3, 26, 12);
    px(ctx, '#f0f0f0', 6, 6, 7, 1);
    px(ctx, '#f0f0f0', 6, 9, 10, 1);
    px(ctx, '#f8e070', 19, 6, 6, 5);
    px(ctx, '#f0f0f0', 18, 12, 8, 1);
    px(ctx, M.base, 2, 16, 28, 2);
    px(ctx, M.osc, 4, 18, 2, 5);
    px(ctx, M.osc, 26, 18, 2, 5);
  },
  caballito(ctx) {
    px(ctx, '#a05828', 2, 20, 20, 2);
    px(ctx, '#a05828', 1, 18, 3, 3);
    px(ctx, '#a05828', 20, 18, 3, 3);
    px(ctx, '#e8c890', 5, 10, 13, 7);
    px(ctx, '#e8c890', 15, 3, 6, 9);
    px(ctx, '#7a4a28', 14, 2, 3, 8);
    px(ctx, '#2a2020', 18, 5, 1, 1);
    px(ctx, '#d84848', 8, 10, 6, 3);
    px(ctx, '#e8c890', 6, 16, 2, 3);
    px(ctx, '#e8c890', 15, 16, 2, 3);
    px(ctx, '#7a4a28', 3, 11, 3, 4);
  },
  cajaFuerte(ctx) {
    px(ctx, '#505868', 1, 6, 14, 17);
    px(ctx, '#687080', 1, 6, 14, 2);
    px(ctx, '#3a404c', 3, 9, 10, 12);
    circulo(ctx, '#c0c8d4', 8, 14, 3);
    px(ctx, '#505868', 8, 12, 1, 2);
    px(ctx, '#f0d060', 11, 18, 1, 2);
  },
  lavadora(ctx) {
    px(ctx, '#f0f4fa', 1, 3, 14, 20);
    px(ctx, '#c8d0dc', 1, 7, 14, 1);
    px(ctx, '#90c050', 3, 4, 2, 2);
    px(ctx, '#d04848', 11, 4, 2, 2);
    circulo(ctx, '#90989f', 8, 15, 5);
    circulo(ctx, '#88c0e8', 8, 15, 4);
    px(ctx, '#ffffff', 6, 13, 2, 2);
    px(ctx, '#e070a0', 8, 16, 3, 2);
  },
  tendedero(ctx) {
    px(ctx, '#808890', 2, 6, 2, 17);
    px(ctx, '#808890', 28, 6, 2, 17);
    px(ctx, '#c8c8d0', 3, 7, 26, 1);
    px(ctx, '#4878d0', 5, 8, 7, 8);
    px(ctx, '#3a60b0', 5, 8, 1, 8);
    px(ctx, '#f0f0f0', 14, 8, 5, 6);
    px(ctx, '#e05858', 21, 8, 6, 9);
    px(ctx, '#f8d040', 7, 7, 1, 2);
    px(ctx, '#f8d040', 16, 7, 1, 2);
    px(ctx, '#f8d040', 23, 7, 1, 2);
  },
  cajas(ctx) {
    px(ctx, '#c49a5c', 1, 9, 16, 14);
    px(ctx, '#d8b070', 1, 9, 16, 3);
    px(ctx, '#a07840', 8, 9, 2, 14);
    px(ctx, '#c49a5c', 15, 4, 15, 19);
    px(ctx, '#d8b070', 15, 4, 15, 3);
    px(ctx, '#a07840', 21, 4, 2, 19);
    px(ctx, '#3a3030', 24, 14, 4, 2);
  },
  armadura(ctx) {
    px(ctx, '#b8c0cc', 4, 1, 8, 8);
    px(ctx, '#e0e6ee', 5, 2, 3, 3);
    px(ctx, '#2a2a34', 5, 5, 6, 1);
    px(ctx, '#d84848', 7, 0, 2, 2);
    px(ctx, '#a8b0bc', 2, 9, 12, 10);
    px(ctx, '#d0d8e2', 4, 10, 4, 6);
    px(ctx, '#8890a0', 1, 10, 2, 8);
    px(ctx, '#8890a0', 13, 10, 2, 8);
    px(ctx, '#98a0ac', 4, 19, 3, 8);
    px(ctx, '#98a0ac', 9, 19, 3, 8);
    px(ctx, '#6a4a2a', 1, 27, 14, 4);
    px(ctx, '#d0d8e2', 14, 2, 1, 16);
  },
  perchero(ctx) {
    px(ctx, M.osc, 7, 3, 2, 22);
    px(ctx, M.osc, 3, 3, 10, 2);
    px(ctx, '#7a3a8a', 2, 5, 4, 9);
    px(ctx, '#3a5a8a', 10, 5, 4, 7);
    px(ctx, '#2a2a30', 4, 1, 8, 2);
    px(ctx, M.osc, 4, 25, 8, 2);
  },
  mesaPlantas(ctx) {
    px(ctx, M.base, 1, 9, 46, 6);
    px(ctx, M.cla, 1, 9, 46, 1);
    px(ctx, M.osc, 3, 15, 3, 8);
    px(ctx, M.osc, 42, 15, 3, 8);
    for (const x of [4, 15, 27, 37]) {
      px(ctx, '#c86040', x, 5, 7, 5);
      circulo(ctx, '#58b050', x + 3.5, 3, 3);
    }
    px(ctx, '#7a5030', 21, 6, 4, 3);
  },
  auto(ctx) {
    px(ctx, '#c83c3c', 2, 12, 44, 13);
    px(ctx, '#c83c3c', 10, 4, 26, 9);
    px(ctx, '#88c0e8', 13, 6, 9, 6);
    px(ctx, '#88c0e8', 24, 6, 9, 6);
    px(ctx, '#e05858', 2, 12, 44, 2);
    px(ctx, '#f8f0a0', 42, 15, 3, 3);
    px(ctx, '#f0a040', 2, 15, 2, 3);
    px(ctx, '#a02a2a', 2, 22, 44, 3);
    circulo(ctx, '#2a2a30', 12, 25, 5);
    circulo(ctx, '#2a2a30', 36, 25, 5);
    circulo(ctx, '#a0a0a8', 12, 25, 2);
    circulo(ctx, '#a0a0a8', 36, 25, 2);
  },
  mesaTrabajo(ctx) {
    px(ctx, '#7a5a3a', 1, 9, 46, 5);
    px(ctx, '#9a7a50', 1, 9, 46, 1);
    px(ctx, '#5a4028', 3, 14, 3, 9);
    px(ctx, '#5a4028', 42, 14, 3, 9);
    px(ctx, '#606870', 6, 1, 36, 8);
    for (let i = 0; i < 5; i++) px(ctx, '#2a2a30', 9 + i * 7, 3, 1, 1);
    px(ctx, '#c8c8d0', 8, 4, 2, 5);
    px(ctx, '#d84848', 16, 4, 5, 2);
    px(ctx, '#f0d060', 26, 3, 2, 5);
    px(ctx, '#d84848', 34, 11, 6, 2);
  },
  tocadiscos(ctx) {
    px(ctx, M.osc, 1, 10, 30, 13);
    px(ctx, M.base, 2, 11, 28, 4);
    px(ctx, M.cla, 1, 10, 30, 1);
    px(ctx, '#3a2a20', 3, 16, 26, 5);
    circulo(ctx, '#202024', 12, 6, 6);
    circulo(ctx, '#d84848', 12, 6, 2);
    px(ctx, '#c0c0c8', 22, 2, 2, 8);
    px(ctx, '#c0c0c8', 18, 8, 5, 1);
    px(ctx, '#e8c050', 26, 4, 3, 3);
  },
  arpa(ctx) {
    px(ctx, '#d8a840', 3, 2, 4, 34);
    px(ctx, '#f0c860', 3, 2, 2, 34);
    px(ctx, '#d8a840', 5, 2, 16, 4);
    px(ctx, '#d8a840', 17, 6, 4, 26);
    for (let i = 0; i < 5; i++) px(ctx, '#f8f0d0', 8 + i * 2, 6, 1, 26 - i * 3);
    px(ctx, M.osc, 2, 34, 20, 5);
  },
  diana(ctx) {
    px(ctx, M.osc, 7, 12, 2, 11);
    px(ctx, M.osc, 3, 21, 10, 2);
    circulo(ctx, '#202024', 8, 7, 6);
    circulo(ctx, '#f0e8c8', 8, 7, 5);
    circulo(ctx, '#d83c3c', 8, 7, 3);
    circulo(ctx, '#2e9a48', 8, 7, 1.5);
    px(ctx, '#f0d050', 10, 4, 3, 1);
  },
  barra(ctx) {
    px(ctx, M.osc, 1, 10, 46, 13);
    px(ctx, M.cla, 1, 8, 46, 3);
    for (let i = 0; i < 4; i++) px(ctx, M.base, 4 + i * 11, 13, 8, 8);
    px(ctx, '#8ad0f0', 8, 2, 3, 6);
    px(ctx, '#d84848', 20, 1, 4, 7);
    px(ctx, '#f0d050', 34, 3, 3, 5);
  },
  mesaBillar(ctx) {
    px(ctx, '#6a3a1a', 1, 2, 62, 26);
    px(ctx, '#2e7a4a', 4, 5, 56, 19);
    px(ctx, '#3a9a5a', 4, 5, 56, 2);
    for (const [x, y] of [[4, 5], [31, 4], [58, 5], [4, 22], [31, 23], [58, 22]]) px(ctx, '#101014', x, y, 2, 2);
    circulo(ctx, '#ffffff', 18, 14, 2);
    circulo(ctx, '#d83c3c', 40, 12, 2);
    circulo(ctx, '#f0c820', 44, 15, 2);
    circulo(ctx, '#3858d8', 40, 17, 2);
    px(ctx, '#c8a060', 10, 10, 6, 1);
    px(ctx, '#6a3a1a', 3, 28, 4, 3);
    px(ctx, '#6a3a1a', 57, 28, 4, 3);
  },
  estanteVino(ctx) {
    px(ctx, M.osc, 1, 1, 30, 30);
    for (let fila = 0; fila < 4; fila++) {
      for (let i = 0; i < 6; i++) {
        const x = 3 + i * 4.5;
        const y = 4 + fila * 7;
        circulo(ctx, '#1a1418', x + 2, y + 2, 2);
        if ((fila + i) % 3) circulo(ctx, fila % 2 ? '#7a1a2a' : '#3a5a2a', x + 2, y + 2, 1.5);
      }
    }
  },
  barril(ctx) {
    px(ctx, '#8a5a2a', 2, 6, 12, 17);
    px(ctx, '#a06c34', 3, 6, 4, 17);
    px(ctx, '#6a4020', 2, 9, 12, 1);
    px(ctx, '#6a4020', 2, 19, 12, 1);
    px(ctx, '#b07a40', 3, 3, 10, 4);
    px(ctx, '#d0a060', 5, 4, 6, 2);
  },
  lapida(ctx) {
    px(ctx, '#9898a0', 3, 3, 10, 12);
    px(ctx, '#9898a0', 4, 2, 8, 1);
    px(ctx, '#b8b8c0', 4, 3, 3, 10);
    px(ctx, '#6a6a74', 7, 5, 2, 6);
    px(ctx, '#6a6a74', 5, 7, 6, 2);
    px(ctx, '#5a8a40', 2, 13, 4, 2);
    px(ctx, '#5a8a40', 11, 14, 3, 1);
  },
  fuente(ctx, w, h, r, cuadro) {
    ctx.fillStyle = '#a8a8b0';
    ctx.beginPath();
    ctx.ellipse(24, 28, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a9ad8';
    ctx.beginPath();
    ctx.ellipse(24, 27, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, '#8ec0f0', 14, 25, 6, 1);
    px(ctx, '#a8a8b0', 21, 8, 6, 19);
    px(ctx, '#c8c8d0', 22, 8, 2, 19);
    ctx.fillStyle = '#a8a8b0';
    ctx.beginPath();
    ctx.ellipse(24, 9, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const f = cuadro || 0;
    px(ctx, '#c8e8ff', 23, 1 + f, 2, 6);
    px(ctx, '#a8d8f8', 18 - f, 4, 2, 3);
    px(ctx, '#a8d8f8', 28 + f, 4, 2, 3);
  },
  monitores(ctx) {
    px(ctx, '#4a4a56', 1, 18, 46, 13);
    px(ctx, '#6a6a78', 1, 18, 46, 2);
    for (let i = 0; i < 3; i++) {
      const x = 2 + i * 15;
      px(ctx, '#202028', x, 3, 14, 12);
      px(ctx, ['#2e6a8a', '#2e7a4a', '#5a4a7a'][i], x + 1, 4, 12, 10);
      for (let k = 0; k < 5; k++) px(ctx, 'rgba(255,255,255,0.15)', x + 1, 5 + k * 2, 12, 1);
      px(ctx, '#202028', x + 6, 15, 2, 3);
    }
    px(ctx, '#f04848', 41, 22, 2, 2);
    px(ctx, '#48e060', 37, 22, 2, 2);
    px(ctx, '#202028', 6, 22, 20, 3);
  },
  arbolSeco(ctx) {
    px(ctx, '#5a4030', 13, 14, 6, 32);
    px(ctx, '#4a3020', 13, 14, 2, 32);
    px(ctx, '#5a4030', 6, 10, 8, 2);
    px(ctx, '#5a4030', 5, 4, 2, 7);
    px(ctx, '#5a4030', 18, 8, 9, 2);
    px(ctx, '#5a4030', 25, 2, 2, 7);
    px(ctx, '#5a4030', 15, 2, 2, 12);
    px(ctx, '#5a4030', 10, 18, 4, 2);
  }
};

// Devuelve { tipo: [canvas por cuadro] }. La chimenea y la estufa tienen animación.
export function dibujarMuebles() {
  const texturas = {};
  for (const [tipo, def] of Object.entries(TIPOS_MUEBLE)) {
    const cuadros = tipo === 'chimenea' || tipo === 'estufa' || tipo === 'fuente' ? 2 : 1;
    texturas[tipo] = [];
    for (let k = 0; k < cuadros; k++) {
      const { canvas, ctx } = lienzo(def.w, def.h);
      DIBUJOS[tipo](ctx, def.w, def.h, azar(tipo.length * 977 + 13), k);
      contornear(ctx, 0, 0, def.w, def.h);
      texturas[tipo].push(canvas);
    }
  }
  return texturas;
}
