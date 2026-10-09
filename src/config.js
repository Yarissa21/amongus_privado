// Resolución interna (pixel art): el canvas se escala manteniendo los píxeles nítidos.
export const ANCHO = 384;
export const ALTO = 216;
export const ANCHO_MIN = 288;
export const ANCHO_MAX = 520;
export const TILE = 16;

export const VELOCIDAD = 70; // px por segundo
export const VELOCIDAD_FANTASMA = 90;

export const VISION = {
  inocente: 118,
  asesino: 136,
  apagon: 46
};

export const DISTANCIA = {
  usar: 16,
  matar: 24,
  reportar: 36,
  campana: 18,
  investigar: 30,
  camara: 120
};

export const TIEMPOS = {
  enfriamientoMatar: 28,
  primerMatar: 15,
  enfriamientoSabotaje: 45,
  apagonAutomatico: 30,
  arreglarLuces: 2,
  tarea: 3,
  reunion: 75,
  esperaVoto: 5,
  resultado: 6,
  expulsion: 12, // resultado con alguien arrojado al pozo (votos + animación)
  revelarRol: 6,
  esperaCampana: 15,
  pasadizo: 1,
  disfraz: 20,
  enfriamientoDisfraz: 30,
  primerDisfraz: 15,
  bateriaMedico: 25,
  invisible: 10,
  enfriamientoInvisible: 30,
  primerInvisible: 15,
  alien: 8,
  veneno: 20,
  escudo: 20,
  enfriamientoEscudo: 30,
  matarTrasEscudo: 10,
  grito: 7
};

export const TAREAS_POR_JUGADOR = 6;
export const MIN_JUGADORES = 4;
export const MAX_JUGADORES = 15;

export const RED = {
  prefijo: 'misterio-mansion-',
  largoNombre: 12,
  largoCodigo: 4,
  intentosCodigo: 4,
  esperaConexionMs: 10000,
  intervaloSnapshotMs: 66,
  intervaloPosicionMs: 50,
  intervaloPingMs: 2000,
  // Servidores para que los teléfonos encuentren cómo conectarse entre sí (voz y datos).
  // Si se cuenta con un servidor TURN propio, agregarlo aquí mejora aún más la conexión.
  ice: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  // Sin noticias de alguien durante este tiempo = se fue (aunque cerrara la pestaña de golpe)
  tiempoCaidaMs: 8000
};

// Colores de los personajes (ropa, pelo, pantalón/falda). Cada jugador elige uno y su género.
export const COLORES = [
  { nombre: 'Rojo', ropa: '#d83c3c', pelo: '#3a2418', pantalon: '#384878' },
  { nombre: 'Negro', ropa: '#34343e', pelo: '#d84848', pantalon: '#22222e' },
  { nombre: 'Blanco', ropa: '#f2f2f2', pelo: '#c86030', pantalon: '#504858' },
  { nombre: 'Rosado', ropa: '#f07ab0', pelo: '#a83850', pantalon: '#484070' },
  { nombre: 'Azul', ropa: '#3858d8', pelo: '#f0c048', pantalon: '#2c3450' },
  { nombre: 'Cyan', ropa: '#38d0e0', pelo: '#283050', pantalon: '#2c4a60' },
  { nombre: 'Amarillo', ropa: '#f0c820', pelo: '#8a4a20', pantalon: '#486048' },
  { nombre: 'Morado', ropa: '#8a4ad0', pelo: '#e8e8f0', pantalon: '#303048' },
  { nombre: 'Anaranjado', ropa: '#f08428', pelo: '#202020', pantalon: '#3a3a48' },
  { nombre: 'Banana', ropa: '#f8ec88', pelo: '#6a4a2a', pantalon: '#6a6050' },
  { nombre: 'Coral', ropa: '#f8806c', pelo: '#3a2a2a', pantalon: '#40486a' },
  { nombre: 'Lima', ropa: '#a8e040', pelo: '#4a3020', pantalon: '#3a5030' },
  { nombre: 'Verde', ropa: '#2e9a48', pelo: '#e0b040', pantalon: '#2a3a2a' },
  { nombre: 'Gris', ropa: '#8a8a96', pelo: '#202028', pantalon: '#4a4a56' },
  { nombre: 'Marrón', ropa: '#9a4a2a', pelo: '#f0d080', pantalon: '#3a2a20' },
  { nombre: 'Café', ropa: '#6a4428', pelo: '#181010', pantalon: '#2e2018' }
];

export const GENEROS = { h: 'Hombre', m: 'Mujer' };

// Aspecto = color + género: indexa los sprites y retratos (2 por color).
export const NUM_ASPECTOS = COLORES.length * 2;

export function aspecto(j) {
  return ((j.color | 0) % COLORES.length) * 2 + (j.genero === 'm' ? 1 : 0);
}

// Paleta completa para dibujar un aspecto: los hombres llevan pelo corto o gorra y pantalón;
// las mujeres, pelo largo o coletas y falda.
export function paletaAspecto(a) {
  const i = Math.floor(a / 2) % COLORES.length;
  const c = COLORES[i];
  const mujer = a % 2 === 1;
  return {
    ...c,
    estilo: mujer ? (i % 2 ? 'coletas' : 'largo') : i % 2 ? 'gorra' : 'corto',
    gorra: c.ropa,
    falda: mujer
  };
}

// Multiplicadores de velocidad de caminado que el anfitrión puede elegir en la sala.
export const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Roles especiales. Cada jugador del equipo indicado tiene "probabilidad"% de recibirlo
// (el anfitrión la cambia en la sala). Cada rol sale una sola vez por partida. Para agregar un rol nuevo basta con sumarlo aquí
// y darle su habilidad en partida.js / escena.js.
export const ROLES = {
  alertador: {
    uso: 'Pasivo: si te matan, todos sabrán desde dónde gritaste.',
    equipo: 'inocente',
    nombre: 'Alertador',
    descripcion: 'Si lo asesinan lanza un grito y todos ven desde dónde vino.',
    probabilidad: 100
  },
  medico: {
    uso: 'Tecla V: abrir la tableta de signos vitales (batería 25 s).',
    equipo: 'inocente',
    nombre: 'Médico',
    descripcion: 'Tiene una tableta con los signos vitales de todos (tecla V). Su batería dura 25 s en total.',
    probabilidad: 100
  },
  juez: {
    uso: 'Termina tus tareas y en la votación usa ⚖ Veredicto.',
    equipo: 'inocente',
    nombre: 'Juez',
    descripcion: 'Al terminar sus tareas puede dictar un veredicto en una votación: sale quien él elija, pero si no es asesino sale él.',
    probabilidad: 100
  },
  detective: {
    uso: 'Tecla V junto a alguien: dónde estaba durante un asesinato.',
    equipo: 'inocente',
    nombre: 'Detective',
    descripcion: 'Tras un asesinato, acércate a alguien y usa V: sabrás dónde estaba en ese momento (3 casos, 3 sospechosos por caso).',
    probabilidad: 100
  },
  camarografo: {
    uso: 'Tecla V: esconder la cámara donde estás parado.',
    equipo: 'inocente',
    nombre: 'Camarógrafo',
    descripcion: 'Esconde una cámara (V) que fotografía el asesinato que ocurra cerca. Aparece tras la votación y cualquiera puede recogerla.',
    probabilidad: 100
  },
  angel: {
    uso: 'Al morir, tecla V: dar un escudo a un vivo.',
    equipo: 'inocente',
    nombre: 'Ángel',
    descripcion: 'Cuando muere, puede dar un escudo (V) a un vivo: el asesino no podrá matarlo mientras dure.',
    probabilidad: 100
  },
  cambiaformas: {
    uso: 'Tecla C: disfrazarte de otro jugador 20 s.',
    equipo: 'asesino',
    nombre: 'Cambiaformas',
    descripcion: 'Puede disfrazarse de otro jugador durante 20 s (tecla C) para incriminarlo.',
    probabilidad: 100
  },
  venenosa: {
    uso: 'Pasivo: los cuerpos de tus víctimas desaparecen a los 20 s.',
    equipo: 'asesino',
    nombre: 'Venenosa',
    descripcion: 'Los cuerpos de sus víctimas se desintegran a los 20 s.',
    probabilidad: 100
  },
  fantasma: {
    uso: 'Tecla V: volverte invisible 10 s (puedes matar así).',
    equipo: 'asesino',
    nombre: 'Fantasma',
    descripcion: 'Puede volverse invisible 10 s (tecla V) y matar sin ser visto.',
    probabilidad: 100
  },
  alien: {
    uso: 'Pasivo: tus víctimas mueren 8 s después del ataque.',
    equipo: 'asesino',
    nombre: 'Alien',
    descripcion: 'Sus víctimas siguen caminando 8 s antes de morir, dándole tiempo de escapar.',
    probabilidad: 100
  }
};

export function configInicial() {
  return {
    asesinos: 1,
    velocidad: 1,
    roles: Object.fromEntries(Object.entries(ROLES).map(([id, r]) => [id, r.probabilidad]))
  };
}
