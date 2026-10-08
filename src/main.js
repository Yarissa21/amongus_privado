import Phaser from 'phaser';
import './estilos.css';
import { ANCHO, ALTO, ANCHO_MIN, ANCHO_MAX, MAX_JUGADORES, VELOCIDADES, ROLES } from './config.js';
import SalaLocal from './red/salaLocal.js';
import EscenaMundo from './escena.js';
import UI from './ui/ui.js';
import Partida from './logica/partida.js';
import { NOMBRES_BOT } from './logica/bots.js';
import Red, { ID_ANFITRION, colorLibre, limpiarNombre } from './red/red.js';
import { sonar } from './ui/sonido.js';
import { iniciarMusica, detenerMusica, musicaReunion } from './ui/musica.js';

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: ANCHO,
  height: ALTO,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1a1420',
  banner: false,
  disableContextMenu: true,
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [EscenaMundo]
});

// El alto interno es fijo (216 px) y el ancho se adapta a la proporción de la pantalla, sin franjas negras.
function ajustarTamano() {
  const ancho = Math.round(Phaser.Math.Clamp((ALTO * window.innerWidth) / Math.max(1, window.innerHeight), ANCHO_MIN, ANCHO_MAX));
  if (juego.scale.width !== ancho) juego.scale.setGameSize(ancho, ALTO);
  juego.scale.refresh();
}
window.addEventListener('resize', ajustarTamano);
// También si el contenedor cambia de tamaño sin evento de ventana (barra del navegador móvil, pestaña oculta al cargar...)
if (window.ResizeObserver) new ResizeObserver(ajustarTamano).observe(document.getElementById('juego'));
juego.events.once(Phaser.Core.Events.READY, ajustarTamano);

function nombresBot(usados, cantidad) {
  const libres = NOMBRES_BOT.filter((n) => !usados.some((u) => u.toLowerCase() === n.toLowerCase()));
  return libres.sort(() => Math.random() - 0.5).slice(0, cantidad);
}

// Controlador: une la red, la simulación (en el anfitrión), la escena y la interfaz.
class Control {
  constructor() {
    this.modo = null; // 'solo' | 'anfitrion' | 'cliente'
    this.red = null;
    this.partida = null;
    this.reloj = null;
    this.miId = null;
    this.jugadoresPartida = new Map();
    this.ui = new UI(this);
    this.ui.mostrar('menu');
  }

  get escena() {
    return juego.scene.getScene('mundo');
  }

  // ---------- Entradas desde la interfaz ----------

  accion(nombre) {
    if (this.escena && this.escena.enJuego) this.escena.accion(nombre);
  }

  joystick(x, y) {
    if (this.escena) this.escena.joystick = { x, y };
  }

  // Mensajes del jugador local hacia la simulación
  enviar(msg, rapido = false) {
    if (this.modo === 'cliente') {
      if (rapido) this.red.enviarAnfitrionRapido(msg);
      else this.red.enviarAnfitrion(msg);
    } else if (this.partida) {
      this.partida.recibir(this.miId, msg);
    }
  }

  // ---------- Modos ----------

  // Con bots se usa una sala local: mismos ajustes que en línea, pero sin red.
  jugarSolo(nombre, bots) {
    this.salir(true);
    const sala = new SalaLocal(limpiarNombre(nombre));
    this.red = sala;
    this.modo = 'solo';
    this.miId = sala.miId;
    for (let i = 0; i < Math.min(bots, MAX_JUGADORES - 1); i++) this.agregarBot();
    sala.on('lobby', () => this.ui.mostrarSala(sala));
    this.ui.mostrarSala(sala);
  }

  async crearSala(nombre) {
    this.salir(true);
    const red = new Red();
    await red.crear(nombre);
    this.red = red;
    this.modo = 'anfitrion';
    this.miId = ID_ANFITRION;
    red.on('lobby', () => this.ui.mostrarSala(red));
    red.on('mensaje', (id, d) => {
      if (this.partida) this.partida.recibir(id, d);
    });
    red.on('salio', (id) => {
      if (this.partida) this.partida.quitarJugador(id);
    });
    history.replaceState(null, '', `?sala=${red.codigo}`);
    this.ui.mostrarSala(red);
  }

  async unirse(codigo, nombre) {
    this.salir(true);
    const red = new Red();
    red.on('mensaje', (_, d) => {
      if (d.t === 'sala') {
        this.terminarPartidaLocal();
        this.ui.mostrarSala(red);
        return;
      }
      this.recibir(d);
    });
    red.on('lobby', () => {
      if (!red.enPartida && !this.escena.enJuego) this.ui.mostrarSala(red);
    });
    red.on('perdida', () => {
      this.salir(true);
      this.ui.mostrarMenu('Se perdió la conexión con el anfitrión');
    });
    this.red = red;
    this.modo = 'cliente';
    await red.unirse(codigo, nombre);
    this.miId = red.miId;
    this.ui.mostrarSala(red);
  }

  agregarBot() {
    const red = this.red;
    if (!red || !red.esAnfitrion || red.jugadores.length >= MAX_JUGADORES) return;
    const [nombre] = nombresBot(red.jugadores.map((j) => j.nombre), 1);
    red.jugadores.push({ id: `bot-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, nombre: nombre || `Bot ${red.jugadores.length}`, color: colorLibre(red.jugadores), bot: true });
    red.enviarLobby();
  }

  quitarBot() {
    const red = this.red;
    if (!red || !red.esAnfitrion) return;
    const i = red.jugadores.map((j) => !!j.bot).lastIndexOf(true);
    if (i < 0) return;
    red.jugadores.splice(i, 1);
    red.enviarLobby();
  }

  alternarAsesinos() {
    const red = this.red;
    if (!red || !red.esAnfitrion) return;
    red.config.asesinos = red.config.asesinos === 1 ? 2 : 1;
    red.enviarLobby();
  }

  cambiarVelocidad(paso) {
    const red = this.red;
    if (!red || !red.esAnfitrion) return;
    const i = Math.max(0, VELOCIDADES.indexOf(red.config.velocidad));
    red.config.velocidad = VELOCIDADES[Math.max(0, Math.min(VELOCIDADES.length - 1, i + paso))];
    red.enviarLobby();
  }

  cambiarProbabilidad(rol, paso) {
    const red = this.red;
    if (!red || !red.esAnfitrion || !ROLES[rol]) return;
    const actual = red.config.roles[rol] ?? ROLES[rol].probabilidad;
    red.config.roles = { ...red.config.roles, [rol]: Math.max(0, Math.min(100, actual + paso)) };
    red.enviarLobby();
  }

  iniciarPartida() {
    const red = this.red;
    if (!red || !red.esAnfitrion) return;
    red.enPartida = true;
    this.empezarPartidaLocal(red.jugadores.map((j) => ({ ...j })), red.config);
  }

  // La simulación corre en esta pestaña (modo solo o anfitrión).
  empezarPartidaLocal(jugadores, config) {
    this.terminarPartidaLocal();
    this.partida = new Partida({
      jugadores,
      config,
      enviar: (id, msg) => {
        if (id === this.miId) queueMicrotask(() => this.recibir(msg));
        else if (this.red && !this.partida.jugadores.get(id)?.bot) {
          if (msg.t === 's') this.red.enviarRapido(id, msg);
          else this.red.enviar(id, msg);
        }
      },
      alTerminar: () => {}
    });
    this.partida.iniciar();
    let antes = performance.now();
    // Intervalo propio: la simulación sigue aunque la pestaña no esté visible.
    this.reloj = setInterval(() => {
      const ahora = performance.now();
      const dt = Math.min(0.25, (ahora - antes) / 1000);
      antes = ahora;
      if (this.partida) this.partida.actualizar(dt);
    }, 33);
  }

  terminarPartidaLocal() {
    detenerMusica();
    clearInterval(this.reloj);
    this.reloj = null;
    this.partida = null;
    if (this.escena && this.escena.enJuego) this.escena.detener();
  }

  otraPartida() {
    if (this.modo === 'solo' || this.modo === 'anfitrion') {
      this.terminarPartidaLocal();
      this.red.enPartida = false;
      this.red.enviarATodos({ t: 'sala' });
      this.red.enviarLobby();
      this.ui.mostrarSala(this.red);
    }
  }

  salir(silencioso = false) {
    this.terminarPartidaLocal();
    if (this.red) this.red.cerrar();
    this.red = null;
    this.modo = null;
    if (location.search) history.replaceState(null, '', location.pathname);
    if (!silencioso) this.ui.mostrarMenu();
  }

  // ---------- Mensajes hacia el jugador local ----------

  recibir(msg) {
    const escena = this.escena;
    switch (msg.t) {
      case 'inicio': {
        this.jugadoresPartida = new Map(msg.jugadores.map((j) => [j.id, j]));
        this.rol = msg.rol;
        this.companeros = new Set(msg.companeros);
        if (this.red) this.red.enPartida = true;
        this.ui.minijuegos.cerrar(false);
        this.ui.cancelarTemporizadores();
        this.ui.mostrar('hud');
        this.ui.mostrarHud();
        escena.empezar({ ...msg, miId: this.miId });
        this.subrol = msg.subrol;
        iniciarMusica();
        musicaReunion(false);
        this.ui.mostrarRol({ ...msg, miId: this.miId }, this.jugadoresPartida);
        sonar('rol');
        break;
      }
      case 's':
      case 'tp':
      case 'tareaHecha':
      case 'casos':
        escena.alMensaje(msg);
        break;
      case 'infectado':
        escena.alMensaje(msg);
        this.ui.minijuegos.cerrar(false);
        break;
      case 'pista':
        sonar('tarea');
        this.ui.aviso(`🔎 ${msg.texto}`, 6000);
        break;
      case 'foto':
        sonar('tarea');
        this.ui.mostrarFotoPrivada(msg.foto, this.jugadoresPartida);
        break;
      case 'vitalesFin':
        if (this.ui.minijuegos.id === 'vitales') this.ui.minijuegos.cerrar(false);
        this.ui.aviso('La batería de la tableta se agotó', 3000);
        break;
      case 'muerte':
        escena.alMensaje(msg);
        if (this.ui.minijuegos.id === 'vitales') this.ui.minijuegos.cerrar(false);
        this.ui.cartel(
          {
            sub: '¡Oh, no!',
            titulo: 'TE ASESINARON',
            clase: 'rojo',
            texto:
              this.subrol === 'angel'
                ? 'Ahora eres un ángel: usa V para dar un escudo a un vivo. También puedes seguir haciendo tus tareas.'
                : this.rol === 'inocente'
                  ? 'Ahora eres un fantasma: atraviesas paredes y puedes seguir haciendo tus tareas.'
                  : 'Ahora eres un fantasma.'
          },
          3500
        );
        sonar('matar');
        break;
      case 'aviso':
        escena.alMensaje(msg);
        if (msg.tipo === 'apagon') {
          sonar('apagon');
          this.ui.aviso(this.rol === 'asesino' ? 'Apagaste las luces' : '¡Se fue la luz! Arregla los fusibles del pasillo', 5000);
        } else if (msg.tipo === 'luces') {
          if (this.ui.minijuegos.id === 'fusibles') this.ui.minijuegos.cerrar(false);
          sonar('luces');
          this.ui.aviso('Volvió la luz', 2000);
        } else if (msg.tipo === 'grito') {
          if (msg.id !== this.miId) this.ui.aviso('¡Se escuchó un grito! Mira la marca roja', 4000);
        } else if (msg.tipo === 'escudoRoto') {
          if (this.rol === 'asesino' && escena.yo && escena.yo.vivo) this.ui.aviso('¡Tenía un escudo de ángel! El ataque falló', 3000);
        } else if (msg.tipo === 'escudoDado') {
          const j = this.jugadoresPartida.get(msg.id);
          this.ui.aviso(`Escudo puesto sobre ${j ? j.nombre : '?'}`, 2500);
        } else if (msg.tipo === 'camaraPuesta') {
          this.ui.aviso(`Cámara escondida (${msg.sala}). Aparecerá después de la votación.`, 4000);
        } else if (msg.tipo === 'salio') {
          const j = this.jugadoresPartida.get(msg.id);
          if (j) this.ui.aviso(`${j.nombre} se desconectó`, 3000);
        }
        break;
      case 'reunion':
        musicaReunion(true);
        this.ui.minijuegos.cerrar(false);
        escena.alMensaje(msg);
        this.ui.ocultarAviso();
        document.getElementById('cartel').hidden = true;
        this.ui.abrirReunion(msg, this.jugadoresPartida, this.miId, this.rol === 'asesino' ? this.companeros : null, {
          juez: !!(escena.estado.yo.h && escena.estado.yo.h.listo),
          foto: !!escena.estado.yo.foto
        });
        break;
      case 'chat':
        this.ui.mensajeChat(msg);
        break;
      case 'voto':
        this.ui.marcarVoto(msg.quien);
        break;
      case 'resultado':
        this.ui.mostrarResultado(msg);
        break;
      case 'reanudar':
        musicaReunion(false);
        escena.alMensaje(msg);
        this.ui.cerrarReunion();
        break;
      case 'fin':
        detenerMusica();
        this.ui.mostrarFin(msg, this.jugadoresPartida, this.miId, this.modo);
        break;
    }
  }
}

const control = new Control();
juego.registry.set('enlace', { enviar: (m, r) => control.enviar(m, r), ui: control.ui });
if (import.meta.env.DEV) window.control = control;
