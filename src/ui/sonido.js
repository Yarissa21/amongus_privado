// Efectos simples con WebAudio (sin archivos de audio).
let ctx = null;
let activo = true;
try {
  activo = localStorage.getItem('mm-sonido') !== '0';
} catch {
  activo = true;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tono(frec, inicio, dur, tipo = 'square', vol = 0.08, frecFinal = null) {
  const a = audio();
  if (!a || !activo) return;
  const t = a.currentTime + inicio;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frec, t);
  if (frecFinal) osc.frequency.exponentialRampToValueAtTime(frecFinal, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const EFECTOS = {
  click: () => tono(880, 0, 0.05, 'square', 0.05),
  tarea: () => {
    tono(660, 0, 0.08);
    tono(990, 0.08, 0.14);
  },
  matar: () => {
    tono(180, 0, 0.25, 'sawtooth', 0.12, 50);
    tono(90, 0.05, 0.3, 'square', 0.08, 40);
  },
  reunion: () => {
    for (let i = 0; i < 3; i++) {
      tono(880, i * 0.3, 0.14, 'square', 0.07);
      tono(660, i * 0.3 + 0.15, 0.14, 'square', 0.07);
    }
  },
  voto: () => tono(520, 0, 0.06, 'triangle', 0.08),
  expulsar: () => tono(500, 0, 0.9, 'triangle', 0.1, 80),
  apagon: () => tono(300, 0, 0.5, 'sawtooth', 0.06, 60),
  luces: () => {
    tono(400, 0, 0.08);
    tono(800, 0.08, 0.12);
  },
  victoria: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.12, 0.2, 'square', 0.07)),
  derrota: () => [392, 330, 262, 196].forEach((f, i) => tono(f, i * 0.18, 0.25, 'triangle', 0.09)),
  rol: () => {
    tono(220, 0, 0.5, 'triangle', 0.1);
    tono(330, 0.25, 0.6, 'triangle', 0.08);
  },
  pasadizo: () => tono(200, 0, 0.3, 'sine', 0.1, 600),
  // Grito del alertador
  grito: () => {
    tono(900, 0, 0.7, 'sawtooth', 0.07, 380);
    tono(1100, 0.04, 0.6, 'square', 0.035, 500);
  },
  alien: () => {
    tono(120, 0, 0.6, 'sawtooth', 0.09, 400);
    tono(60, 0.1, 0.5, 'square', 0.06, 30);
  },
  escudo: () => {
    tono(1400, 0, 0.15, 'triangle', 0.08, 2200);
    tono(1800, 0.08, 0.25, 'triangle', 0.06, 900);
  },
  // Golpe disonante al ver un cuerpo
  cuerpo: () => {
    tono(185, 0, 1.4, 'sawtooth', 0.06);
    tono(196, 0, 1.4, 'sawtooth', 0.06);
    tono(262, 0.02, 1.2, 'square', 0.035);
    tono(70, 0, 0.9, 'sine', 0.25, 35);
  }
};

export function sonar(nombre) {
  const f = EFECTOS[nombre];
  if (f) f();
}

export function alternarSonido() {
  activo = !activo;
  try {
    localStorage.setItem('mm-sonido', activo ? '1' : '0');
  } catch {
    /* sin almacenamiento */
  }
  if (activo) audio();
  return activo;
}

export function sonidoActivo() {
  return activo;
}

export function contextoAudio() {
  return audio();
}

export function nota(frec, dur = 0.35) {
  tono(frec, 0, dur, 'triangle', 0.12);
}
