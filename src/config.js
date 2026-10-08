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
export const MAX_JUGADORES = 10;

export const RED = {
  prefijo: 'misterio-mansion-',
  largoNombre: 12,
  largoCodigo: 4,
  intentosCodigo: 4,
  esperaConexionMs: 10000,
  intervaloSnapshotMs: 66,
  intervaloPosicionMs: 50
};

// Paletas de los personajes: ropa, pelo, pantalón y estilo de peinado.
export const COLORES = [
  { nombre: 'Rojo', ropa: '#e0483e', pelo: '#3a2418', pantalon: '#384878', estilo: 'gorra', gorra: '#e0483e' },
  { nombre: 'Azul', ropa: '#3c6ee0', pelo: '#f0c048', pantalon: '#2c3450', estilo: 'largo' },
  { nombre: 'Verde', ropa: '#3cae58', pelo: '#6a3a20', pantalon: '#5a4030', estilo: 'corto' },
  { nombre: 'Rosa', ropa: '#f07ab0', pelo: '#a83850', pantalon: '#484070', estilo: 'coletas' },
  { nombre: 'Naranja', ropa: '#f08c30', pelo: '#202020', pantalon: '#3a3a48', estilo: 'corto' },
  { nombre: 'Morado', ropa: '#8a52d0', pelo: '#e8e8f0', pantalon: '#303048', estilo: 'largo' },
  { nombre: 'Amarillo', ropa: '#f0d030', pelo: '#8a4a20', pantalon: '#486048', estilo: 'gorra', gorra: '#3858c0' },
  { nombre: 'Celeste', ropa: '#48c8e8', pelo: '#283050', pantalon: '#384060', estilo: 'coletas' },
  { nombre: 'Blanco', ropa: '#f0f0f0', pelo: '#c86030', pantalon: '#504858', estilo: 'corto' },
  { nombre: 'Negro', ropa: '#3a3a44', pelo: '#d84848', pantalon: '#28283a', estilo: 'gorra', gorra: '#202028' }
];

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
