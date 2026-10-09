import { paletaAspecto } from '../config.js';
import { lienzo, px, contornear, oscurecer, aclarar } from './pixel.js';

export const ANCHO_PJ = 16;
export const ALTO_PJ = 22;
// Orden de cuadros en la hoja: abajo 0-2, arriba 3-5, lado 6-8 (mirando a la derecha).
export const DIRS = ['abajo', 'arriba', 'lado'];

const PIEL = '#f8c8a0';
const PIEL_S = '#dc9c74';
const OJO = '#28202c';
const ZAPATO = '#4a3030';

function piernas(ctx, ox, oy, pal, dir, paso) {
  const pan = pal.pantalon;
  const panS = oscurecer(pan, 0.25);
  if (pal.falda) {
    falda(ctx, ox, oy, pal, dir, paso);
    return;
  }
  if (dir === 'lado') {
    if (paso === 0) {
      px(ctx, pan, ox + 6, oy + 17, 4, 3);
      px(ctx, panS, ox + 6, oy + 17, 1, 3);
      px(ctx, ZAPATO, ox + 6, oy + 20, 5, 1);
    } else {
      const a = paso === 1 ? 0 : 1;
      px(ctx, pan, ox + 4 + a, oy + 17, 3, 3);
      px(ctx, panS, ox + 9 - a, oy + 17, 3, 2);
      px(ctx, ZAPATO, ox + 4 + a, oy + 20, 3, 1);
      px(ctx, ZAPATO, ox + 9 - a, oy + 19, 4, 1);
    }
    return;
  }
  const izq = paso === 1 ? 1 : 0;
  const der = paso === 2 ? 1 : 0;
  px(ctx, pan, ox + 5, oy + 17, 3, 3 - izq);
  px(ctx, panS, ox + 8, oy + 17, 3, 3 - der);
  px(ctx, ZAPATO, ox + 5, oy + 20 - izq, 3, 1);
  px(ctx, ZAPATO, ox + 8, oy + 20 - der, 3, 1);
}

// Falda con piernas a la vista
function falda(ctx, ox, oy, pal, dir, paso) {
  const tela = pal.pantalon;
  const telaS = oscurecer(tela, 0.25);
  if (dir === 'lado') {
    const a = paso === 0 ? 0 : 1;
    px(ctx, PIEL, ox + 6 - a, oy + 19, 2, 1);
    px(ctx, PIEL_S, ox + 8 + a, oy + 19, 2, 1);
    px(ctx, ZAPATO, ox + 5 - a, oy + 20, 3, 1);
    px(ctx, ZAPATO, ox + 8 + a, oy + 20, 3, 1);
    px(ctx, tela, ox + 5, oy + 17, 6, 2);
    px(ctx, telaS, ox + 5, oy + 18, 6, 1);
    return;
  }
  const izq = paso === 1 ? 1 : 0;
  const der = paso === 2 ? 1 : 0;
  px(ctx, PIEL, ox + 5, oy + 19 - izq, 2, 1);
  px(ctx, PIEL_S, ox + 9, oy + 19 - der, 2, 1);
  px(ctx, ZAPATO, ox + 5, oy + 20 - izq, 3, 1);
  px(ctx, ZAPATO, ox + 8, oy + 20 - der, 3, 1);
  px(ctx, tela, ox + 4, oy + 17, 8, 2);
  px(ctx, telaS, ox + 10, oy + 17, 2, 2);
  px(ctx, telaS, ox + 4, oy + 18, 8, 1);
}

function cuerpo(ctx, ox, oy, pal, dir, paso) {
  const ropa = pal.ropa;
  const ropaS = oscurecer(ropa, 0.22);
  const ropaC = aclarar(ropa, 0.25);
  if (dir === 'lado') {
    px(ctx, ropa, ox + 5, oy + 11, 6, 6);
    px(ctx, ropaS, ox + 5, oy + 11, 1, 6);
    px(ctx, pal.pantalon, ox + 5, oy + 16, 6, 1);
    const brazo = paso === 1 ? 1 : paso === 2 ? -1 : 0;
    px(ctx, ropaS, ox + 7 + brazo, oy + 12, 2, 3);
    px(ctx, PIEL, ox + 7 + brazo, oy + 15, 2, 1);
    return;
  }
  px(ctx, ropa, ox + 5, oy + 11, 6, 6);
  px(ctx, ropaC, ox + 6, oy + 11, 2, 1);
  px(ctx, ropaS, ox + 10, oy + 11, 1, 6);
  px(ctx, pal.pantalon, ox + 5, oy + 16, 6, 1);
  const bi = paso === 1 ? -1 : 0;
  const bd = paso === 2 ? -1 : 0;
  px(ctx, ropa, ox + 3, oy + 11, 2, 3 + bi + 1);
  px(ctx, ropaS, ox + 11, oy + 11, 2, 3 + bd + 1);
  px(ctx, PIEL, ox + 3, oy + 15 + bi, 2, 1);
  px(ctx, PIEL, ox + 11, oy + 15 + bd, 2, 1);
  if (dir === 'abajo') px(ctx, ropaS, ox + 7, oy + 12, 2, 1);
}

function cabeza(ctx, ox, oy, pal, dir) {
  const pelo = pal.pelo;
  const peloS = oscurecer(pelo, 0.3);
  const peloC = aclarar(pelo, 0.3);
  const gorra = pal.gorra || pelo;
  const gorraS = oscurecer(gorra, 0.3);
  const conGorra = pal.estilo === 'gorra';

  // Cuello y cara
  px(ctx, PIEL_S, ox + 6, oy + 10, 4, 1);
  if (dir === 'abajo') {
    px(ctx, PIEL, ox + 4, oy + 4, 8, 6);
    px(ctx, PIEL_S, ox + 4, oy + 9, 8, 1);
    px(ctx, OJO, ox + 6, oy + 6, 1, 2);
    px(ctx, OJO, ox + 9, oy + 6, 1, 2);
    px(ctx, '#f09898', ox + 5, oy + 8, 1, 1);
    px(ctx, '#f09898', ox + 10, oy + 8, 1, 1);
  } else if (dir === 'lado') {
    px(ctx, PIEL, ox + 5, oy + 4, 7, 6);
    px(ctx, PIEL, ox + 12, oy + 6, 1, 2);
    px(ctx, PIEL_S, ox + 5, oy + 9, 6, 1);
    px(ctx, OJO, ox + 10, oy + 6, 1, 2);
  }

  // Pelo
  if (dir === 'arriba') {
    px(ctx, pelo, ox + 3, oy + 2, 10, 8);
    px(ctx, pelo, ox + 4, oy + 1, 8, 1);
    px(ctx, peloS, ox + 4, oy + 8, 8, 2);
    px(ctx, peloC, ox + 5, oy + 2, 4, 1);
  } else if (dir === 'abajo') {
    px(ctx, pelo, ox + 4, oy + 1, 8, 1);
    px(ctx, pelo, ox + 3, oy + 2, 10, 3);
    px(ctx, pelo, ox + 3, oy + 5, 1, 3);
    px(ctx, pelo, ox + 12, oy + 5, 1, 3);
    px(ctx, pelo, ox + 4, oy + 5, 2, 1);
    px(ctx, pelo, ox + 9, oy + 5, 3, 1);
    px(ctx, peloC, ox + 5, oy + 2, 3, 1);
    px(ctx, peloS, ox + 11, oy + 3, 1, 2);
  } else {
    px(ctx, pelo, ox + 4, oy + 1, 7, 1);
    px(ctx, pelo, ox + 3, oy + 2, 10, 2);
    px(ctx, pelo, ox + 3, oy + 4, 4, 5);
    px(ctx, pelo, ox + 7, oy + 4, 5, 1);
    px(ctx, peloS, ox + 3, oy + 7, 2, 2);
    px(ctx, peloC, ox + 6, oy + 2, 4, 1);
  }

  if (pal.estilo === 'largo') {
    if (dir === 'arriba') px(ctx, pelo, ox + 3, oy + 9, 10, 4);
    else if (dir === 'abajo') {
      px(ctx, pelo, ox + 2, oy + 5, 2, 7);
      px(ctx, pelo, ox + 12, oy + 5, 2, 7);
      px(ctx, peloS, ox + 2, oy + 10, 2, 2);
      px(ctx, peloS, ox + 12, oy + 10, 2, 2);
    } else {
      px(ctx, pelo, ox + 2, oy + 4, 4, 9);
      px(ctx, peloS, ox + 2, oy + 10, 3, 3);
    }
  }
  if (pal.estilo === 'coletas') {
    if (dir === 'lado') {
      px(ctx, pelo, ox + 1, oy + 5, 3, 4);
      px(ctx, peloS, ox + 1, oy + 8, 2, 1);
    } else {
      px(ctx, pelo, ox + 1, oy + 4, 2, 5);
      px(ctx, pelo, ox + 13, oy + 4, 2, 5);
      px(ctx, '#f8e040', ox + 2, oy + 4, 1, 1);
      px(ctx, '#f8e040', ox + 13, oy + 4, 1, 1);
    }
  }
  if (conGorra) {
    if (dir === 'arriba') {
      px(ctx, gorra, ox + 3, oy + 1, 10, 5);
      px(ctx, gorraS, ox + 3, oy + 5, 10, 1);
      px(ctx, '#f0f0f0', ox + 7, oy + 2, 2, 2);
    } else if (dir === 'abajo') {
      px(ctx, gorra, ox + 4, oy + 0, 8, 1);
      px(ctx, gorra, ox + 3, oy + 1, 10, 3);
      px(ctx, '#f8f8f8', ox + 6, oy + 1, 4, 2);
      px(ctx, gorraS, ox + 2, oy + 4, 12, 1);
    } else {
      px(ctx, gorra, ox + 4, oy + 0, 7, 1);
      px(ctx, gorra, ox + 3, oy + 1, 9, 3);
      px(ctx, '#f8f8f8', ox + 7, oy + 1, 3, 2);
      px(ctx, gorraS, ox + 6, oy + 4, 8, 1);
    }
  }
}

export function dibujarCuadro(ctx, ox, oy, pal, dir, paso) {
  piernas(ctx, ox, oy, pal, dir, paso);
  cuerpo(ctx, ox, oy, pal, dir, paso);
  cabeza(ctx, ox, oy, pal, dir);
  contornear(ctx, ox, oy, ANCHO_PJ, ALTO_PJ);
}

// Hoja de 9 cuadros para un color.
export function hojaPersonaje(indice) {
  const pal = paletaAspecto(indice);
  const { canvas, ctx } = lienzo(ANCHO_PJ * 9, ALTO_PJ);
  DIRS.forEach((dir, d) => {
    for (let paso = 0; paso < 3; paso++) {
      const cuadro = lienzo(ANCHO_PJ, ALTO_PJ);
      // Se dibuja con 1 px de margen implícito: el contorno usa el espacio libre del cuadro.
      dibujarCuadro(cuadro.ctx, 0, 0, pal, dir, paso);
      ctx.drawImage(cuadro.canvas, (d * 3 + paso) * ANCHO_PJ, 0);
    }
  });
  return canvas;
}

// Retrato (cara de frente) para la interfaz HTML.
export function retrato(indice, escala = 4) {
  const pal = paletaAspecto(indice);
  const cuadro = lienzo(ANCHO_PJ, ALTO_PJ);
  dibujarCuadro(cuadro.ctx, 0, 0, pal, 'abajo', 0);
  const { canvas, ctx } = lienzo(ANCHO_PJ * escala, ALTO_PJ * escala);
  ctx.drawImage(cuadro.canvas, 0, 0, ANCHO_PJ * escala, ALTO_PJ * escala);
  return canvas.toDataURL();
}

// Cuerpo tirado en el suelo, con charco.
export function hojaCuerpo(indice) {
  const pal = paletaAspecto(indice);
  const { canvas, ctx } = lienzo(28, 18);
  ctx.fillStyle = '#9a1c24';
  ctx.beginPath();
  ctx.ellipse(14, 11, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c42a32';
  ctx.beginPath();
  ctx.ellipse(12, 10, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const cuadro = lienzo(ANCHO_PJ, ALTO_PJ);
  dibujarCuadro(cuadro.ctx, 0, 0, pal, 'abajo', 0);
  ctx.save();
  ctx.translate(3, 16);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(cuadro.canvas, 0, 0);
  ctx.restore();
  return canvas;
}
