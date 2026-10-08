import { COLORES, configInicial } from '../config.js';
import { Emisor } from './red.js';

// Sala sin red para jugar con bots. Imita la parte de Red que usan la interfaz y el controlador,
// así la sala de espera y sus ajustes funcionan igual que en línea.
export default class SalaLocal extends Emisor {
  constructor(nombre) {
    super();
    this.esAnfitrion = true;
    this.local = true;
    this.codigo = '';
    this.miId = 'yo';
    this.jugadores = [{ id: 'yo', nombre, color: 0 }];
    this.config = configInicial();
    this.enPartida = false;
  }

  enviarLobby() {
    this.emit('lobby', this.jugadores);
  }

  elegirColor(color) {
    const c = color | 0;
    if (c < 0 || c >= COLORES.length || this.jugadores.some((j) => j.color === c && j.id !== this.miId)) return;
    this.jugadores[0].color = c;
    this.enviarLobby();
  }

  enviar() {}
  enviarRapido() {}
  enviarATodos() {}

  cerrar() {
    this.oyentes.clear();
  }
}
