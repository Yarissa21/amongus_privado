import { contextoAudio } from './sonido.js';

// Ambiente de suspenso generado en tiempo real (sin archivos): zumbido grave, viento,
// notas sueltas de caja de música con eco, crujidos y latidos que aumentan con la tensión.

let activa = true;
try {
  activa = localStorage.getItem('mm-musica') !== '0';
} catch {
  activa = true;
}

let n = null; // nodos de audio mientras suena
let tension = 0;
let enReunion = false;
const timers = new Set();

const ESCALA = [440, 466.2, 523.3, 587.3, 622.3, 698.5, 830.6, 880, 932.3, 1046.5];

function despues(ms, f) {
  const t = setTimeout(() => {
    timers.delete(t);
    if (n) f();
  }, ms);
  timers.add(t);
}

function bufferRuido(a) {
  const largo = a.sampleRate * 2;
  const b = a.createBuffer(1, largo, a.sampleRate);
  const d = b.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < largo; i++) {
    // Ruido "café": más grave y suave que el blanco
    ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = ultimo * 3.5;
  }
  return b;
}

function nota(frec, cuando, dur, vol, destino) {
  const a = n.a;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'triangle';
  o.frequency.value = frec;
  g.gain.setValueAtTime(0.0001, cuando);
  g.gain.exponentialRampToValueAtTime(vol, cuando + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, cuando + dur);
  o.connect(g);
  g.connect(destino);
  g.connect(n.eco);
  o.start(cuando);
  o.stop(cuando + dur + 0.05);
}

function melodia() {
  if (!enReunion) {
    const a = n.a;
    const t = a.currentTime + 0.05;
    const notas = 2 + Math.floor(Math.random() * 3);
    let i = Math.floor(Math.random() * ESCALA.length);
    for (let k = 0; k < notas; k++) {
      i = Math.max(0, Math.min(ESCALA.length - 1, i + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2))));
      nota(ESCALA[i] * (Math.random() < 0.3 ? 0.5 : 1), t + k * 0.42, 1.6, 0.03 + tension * 0.015, n.maestro);
    }
  }
  despues(3500 + Math.random() * 5000 - tension * 2500, melodia);
}

function crujido() {
  if (!enReunion) {
    const a = n.a;
    const t = a.currentTime;
    if (Math.random() < 0.55) {
      // Puerta que cruje
      const o = a.createOscillator();
      const f = a.createBiquadFilter();
      const g = a.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90 + Math.random() * 40, t);
      o.frequency.linearRampToValueAtTime(60 + Math.random() * 30, t + 1.1);
      f.type = 'bandpass';
      f.frequency.value = 700;
      f.Q.value = 8;
      g.gain.setValueAtTime(0.0001, t);
      for (let k = 0; k < 6; k++) g.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.05, t + 0.1 + k * 0.17);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      o.connect(f).connect(g).connect(n.maestro);
      o.start(t);
      o.stop(t + 1.3);
    } else {
      // Golpe sordo lejano
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.6);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g).connect(n.maestro);
      o.start(t);
      o.stop(t + 0.9);
    }
  }
  despues(12000 + Math.random() * 14000, crujido);
}

function golpeCorazon(cuando, vol) {
  const a = n.a;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(65, cuando);
  o.frequency.exponentialRampToValueAtTime(38, cuando + 0.14);
  g.gain.setValueAtTime(vol, cuando);
  g.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.2);
  o.connect(g).connect(n.maestro);
  o.start(cuando);
  o.stop(cuando + 0.25);
}

function latido() {
  let espera = 900;
  if (!enReunion && tension > 0.35) {
    const t = n.a.currentTime + 0.02;
    const vol = 0.12 + tension * 0.22;
    golpeCorazon(t, vol);
    golpeCorazon(t + 0.2, vol * 0.65);
    espera = 60000 / (62 + tension * 70);
  }
  despues(espera, latido);
}

export function iniciarMusica() {
  const a = contextoAudio();
  if (!a || n) return;
  const maestro = a.createGain();
  maestro.gain.value = 0.0001;
  maestro.connect(a.destination);

  // Zumbido grave con filtro que "respira"
  const filtro = a.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 240;
  filtro.Q.value = 5;
  const dron = a.createGain();
  dron.gain.value = 0.045;
  filtro.connect(dron).connect(maestro);
  const fuentes = [
    [55, 'sawtooth'],
    [55.35, 'sawtooth'],
    [77.8, 'triangle'],
    [110.4, 'triangle']
  ].map(([f, tipo]) => {
    const o = a.createOscillator();
    o.type = tipo;
    o.frequency.value = f;
    o.connect(filtro);
    o.start();
    return o;
  });
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoG = a.createGain();
  lfoG.gain.value = 110;
  lfo.connect(lfoG).connect(filtro.frequency);
  lfo.start();

  // Viento
  const ruido = a.createBufferSource();
  ruido.buffer = bufferRuido(a);
  ruido.loop = true;
  const banda = a.createBiquadFilter();
  banda.type = 'bandpass';
  banda.frequency.value = 420;
  banda.Q.value = 0.7;
  const viento = a.createGain();
  viento.gain.value = 0.05;
  const lfo2 = a.createOscillator();
  lfo2.frequency.value = 0.11;
  const lfo2G = a.createGain();
  lfo2G.gain.value = 260;
  lfo2.connect(lfo2G).connect(banda.frequency);
  ruido.connect(banda).connect(viento).connect(maestro);
  ruido.start();
  lfo2.start();

  // Eco para la caja de música
  const eco = a.createDelay(1.5);
  eco.delayTime.value = 0.42;
  const realimentacion = a.createGain();
  realimentacion.gain.value = 0.38;
  const salidaEco = a.createGain();
  salidaEco.gain.value = 0.45;
  eco.connect(realimentacion).connect(eco);
  eco.connect(salidaEco).connect(maestro);

  n = { a, maestro, filtro, dron, viento, eco, fuentes: [...fuentes, lfo, lfo2, ruido] };
  aplicarVolumen(2.5);
  despues(1500, melodia);
  despues(6000, crujido);
  despues(1000, latido);
}

function aplicarVolumen(rampa = 0.6) {
  if (!n) return;
  const t = n.a.currentTime;
  const objetivo = activa ? (enReunion ? 0.45 : 1) : 0.0001;
  n.maestro.gain.cancelScheduledValues(t);
  n.maestro.gain.setValueAtTime(Math.max(0.0001, n.maestro.gain.value), t);
  n.maestro.gain.exponentialRampToValueAtTime(objetivo, t + rampa);
}

// 0 = calma, 1 = máxima tensión
export function fijarTension(valor) {
  tension = Math.max(0, Math.min(1, valor));
  if (!n) return;
  const t = n.a.currentTime;
  n.filtro.frequency.setTargetAtTime(200 + tension * 520, t, 1.2);
  n.dron.gain.setTargetAtTime(0.04 + tension * 0.05, t, 1.2);
  n.viento.gain.setTargetAtTime(0.04 + tension * 0.04, t, 1.5);
}

export function musicaReunion(valor) {
  enReunion = valor;
  aplicarVolumen();
}

export function detenerMusica() {
  if (!n) return;
  const actual = n;
  n = null;
  timers.forEach(clearTimeout);
  timers.clear();
  const t = actual.a.currentTime;
  actual.maestro.gain.cancelScheduledValues(t);
  actual.maestro.gain.setValueAtTime(Math.max(0.0001, actual.maestro.gain.value), t);
  actual.maestro.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => {
    actual.fuentes.forEach((f) => {
      try {
        f.stop();
      } catch {
        /* ya detenida */
      }
    });
    actual.maestro.disconnect();
  }, 1400);
}

export function alternarMusica() {
  activa = !activa;
  try {
    localStorage.setItem('mm-musica', activa ? '1' : '0');
  } catch {
    /* sin almacenamiento */
  }
  aplicarVolumen(0.3);
  return activa;
}

export function musicaActiva() {
  return activa;
}
