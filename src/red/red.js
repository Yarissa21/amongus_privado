import { Peer } from 'peerjs';
import { RED, MAX_JUGADORES, COLORES, configInicial } from '../config.js';

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ID_ANFITRION = 'anfitrion';

export function limpiarNombre(nombre) {
  const limpio = String(nombre || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, RED.largoNombre);
  return limpio || 'Jugador';
}

function generarCodigo() {
  let c = '';
  for (let i = 0; i < RED.largoCodigo; i++) c += LETRAS[Math.floor(Math.random() * LETRAS.length)];
  return c;
}

function mensajeError(error) {
  switch (error && error.type) {
    case 'peer-unavailable':
      return 'No existe una sala con ese código';
    case 'browser-incompatible':
      return 'Tu navegador no permite jugar en red';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Sin conexión con el servidor. Revisa tu internet';
    default:
      return 'Error de conexión';
  }
}

export class Emisor {
  constructor() {
    this.oyentes = new Map();
  }
  on(evento, f) {
    if (!this.oyentes.has(evento)) this.oyentes.set(evento, new Set());
    this.oyentes.get(evento).add(f);
    return () => this.oyentes.get(evento).delete(f);
  }
  emit(evento, ...args) {
    const set = this.oyentes.get(evento);
    if (set) [...set].forEach((f) => f(...args));
  }
}

export function colorLibre(jugadores) {
  const usados = new Set(jugadores.map((j) => j.color));
  for (let i = 0; i < COLORES.length; i++) if (!usados.has(i)) return i;
  return 0;
}

// Sala en red. El anfitrión guarda la lista de jugadores (incluidos bots) y reenvía todo.
export default class Red extends Emisor {
  constructor() {
    super();
    this.peer = null;
    this.esAnfitrion = false;
    this.codigo = '';
    this.miId = null;
    this.jugadores = [];
    this.config = configInicial();
    this.clientes = new Map();
    this.rapidos = new Map();
    this.anfitrion = null;
    this.rapido = null;
    this.enPartida = false;
    this.cerrada = false;
  }

  crear(nombre) {
    this.esAnfitrion = true;
    this.miId = ID_ANFITRION;
    this.jugadores = [{ id: ID_ANFITRION, nombre: limpiarNombre(nombre), color: 0 }];
    return this.abrirAnfitrion(RED.intentosCodigo);
  }

  abrirAnfitrion(intentos) {
    return new Promise((resolver, rechazar) => {
      const codigo = generarCodigo();
      const peer = new Peer(RED.prefijo + codigo, { debug: 0 });
      peer.on('open', () => {
        this.peer = peer;
        this.codigo = codigo;
        peer.on('connection', (c) => this.alConectar(c));
        peer.on('disconnected', () => {
          if (!this.cerrada) peer.reconnect();
        });
        resolver(codigo);
      });
      peer.on('error', (error) => {
        if (this.peer === peer) return;
        peer.destroy();
        if (error.type === 'unavailable-id' && intentos > 1) this.abrirAnfitrion(intentos - 1).then(resolver, rechazar);
        else rechazar(new Error(mensajeError(error)));
      });
    });
  }

  alConectar(conexion) {
    if (conexion.metadata && conexion.metadata.canal === 'rapido') {
      conexion.on('open', () => {
        if (this.clientes.has(conexion.peer)) this.rapidos.set(conexion.peer, conexion);
        else conexion.close();
      });
      conexion.on('data', (d) => {
        if (this.rapidos.get(conexion.peer) === conexion) this.emit('mensaje', conexion.peer, d);
      });
      conexion.on('close', () => {
        if (this.rapidos.get(conexion.peer) === conexion) this.rapidos.delete(conexion.peer);
      });
      return;
    }
    conexion.on('data', (d) => {
      if (!this.clientes.has(conexion.peer)) {
        this.recibirSaludo(conexion, d);
        return;
      }
      if (d && d.t === 'color') {
        this.cambiarColor(conexion.peer, d.color);
        return;
      }
      this.emit('mensaje', conexion.peer, d);
    });
    conexion.on('close', () => this.quitarCliente(conexion.peer));
    conexion.on('error', () => this.quitarCliente(conexion.peer));
  }

  recibirSaludo(conexion, d) {
    if (!d || d.t !== 'hola') return;
    const rechazar = (motivo) => {
      conexion.send({ t: 'rechazo', motivo });
      setTimeout(() => conexion.close(), 500);
    };
    if (this.enPartida) return rechazar('La partida ya empezó');
    if (this.jugadores.length >= MAX_JUGADORES) {
      // Si hay bots, uno deja su lugar
      const bot = this.jugadores.find((j) => j.bot);
      if (!bot) return rechazar('La sala está llena');
      this.jugadores = this.jugadores.filter((j) => j !== bot);
    }
    this.clientes.set(conexion.peer, conexion);
    let nombre = limpiarNombre(d.nombre);
    if (this.jugadores.some((j) => j.nombre.toLowerCase() === nombre.toLowerCase())) nombre = `${nombre.slice(0, RED.largoNombre - 2)} ${this.jugadores.length + 1}`;
    this.jugadores.push({ id: conexion.peer, nombre, color: colorLibre(this.jugadores) });
    this.enviarLobby();
  }

  quitarCliente(id) {
    if (!this.clientes.has(id)) return;
    this.clientes.delete(id);
    const r = this.rapidos.get(id);
    if (r) r.close();
    this.rapidos.delete(id);
    this.jugadores = this.jugadores.filter((j) => j.id !== id);
    this.emit('salio', id);
    if (!this.enPartida) this.enviarLobby();
  }

  cambiarColor(id, color) {
    if (this.enPartida) return;
    const c = color | 0;
    if (c < 0 || c >= COLORES.length || this.jugadores.some((j) => j.color === c && j.id !== id)) return;
    const j = this.jugadores.find((x) => x.id === id);
    if (!j) return;
    j.color = c;
    this.enviarLobby();
  }

  elegirColor(color) {
    if (this.esAnfitrion) this.cambiarColor(this.miId, color);
    else this.enviarAnfitrion({ t: 'color', color });
  }

  enviarLobby() {
    this.enviarATodos({ t: 'lobby', jugadores: this.jugadores, codigo: this.codigo, config: this.config });
    this.emit('lobby', this.jugadores);
  }

  unirse(codigo, nombre) {
    this.esAnfitrion = false;
    this.codigo = String(codigo || '').toUpperCase().trim();
    return new Promise((resolver, rechazar) => {
      let resuelto = false;
      const fallar = (texto) => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(espera);
        this.cerrar();
        rechazar(new Error(texto));
      };
      const espera = setTimeout(() => fallar('No se encontró la sala'), RED.esperaConexionMs);
      const peer = new Peer({ debug: 0 });
      this.peer = peer;
      peer.on('open', (id) => {
        this.miId = id;
        const conexion = peer.connect(RED.prefijo + this.codigo, { reliable: true, serialization: 'json' });
        this.anfitrion = conexion;
        conexion.on('open', () => conexion.send({ t: 'hola', nombre: limpiarNombre(nombre) }));
        conexion.on('data', (d) => {
          if (d.t === 'rechazo') {
            fallar(d.motivo);
            return;
          }
          if (d.t === 'lobby') {
            this.jugadores = d.jugadores;
            this.config = d.config;
            if (!resuelto) {
              resuelto = true;
              clearTimeout(espera);
              this.abrirCanalRapido(peer);
              resolver();
            }
            this.emit('lobby', d.jugadores);
            return;
          }
          this.emit('mensaje', ID_ANFITRION, d);
        });
        conexion.on('close', () => this.perderAnfitrion());
        conexion.on('error', () => this.perderAnfitrion());
      });
      peer.on('error', (error) => {
        if (!resuelto) fallar(mensajeError(error));
      });
    });
  }

  abrirCanalRapido(peer) {
    const r = peer.connect(RED.prefijo + this.codigo, { reliable: false, serialization: 'json', metadata: { canal: 'rapido' } });
    r.on('open', () => (this.rapido = r));
    r.on('data', (d) => this.emit('mensaje', ID_ANFITRION, d));
    r.on('close', () => {
      if (this.rapido === r) this.rapido = null;
    });
  }

  perderAnfitrion() {
    if (this.cerrada) return;
    this.emit('perdida');
    this.cerrar();
  }

  enviar(id, msg) {
    const c = this.clientes.get(id);
    if (c && c.open) c.send(msg);
  }

  enviarRapido(id, msg) {
    const r = this.rapidos.get(id);
    if (r && r.open) r.send(msg);
    else this.enviar(id, msg);
  }

  enviarATodos(msg) {
    this.clientes.forEach((c) => {
      if (c.open) c.send(msg);
    });
  }

  enviarAnfitrion(msg) {
    if (this.anfitrion && this.anfitrion.open) this.anfitrion.send(msg);
  }

  enviarAnfitrionRapido(msg) {
    if (this.rapido && this.rapido.open) this.rapido.send(msg);
    else this.enviarAnfitrion(msg);
  }

  cerrar() {
    if (this.cerrada) return;
    this.cerrada = true;
    this.oyentes.clear();
    this.clientes.clear();
    this.rapidos.clear();
    if (this.peer) this.peer.destroy();
  }
}
