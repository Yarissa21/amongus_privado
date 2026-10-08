import { RED } from '../config.js';
import { ID_ANFITRION } from './red.js';
import { contextoAudio } from '../ui/sonido.js';

// Chat de voz entre todos los jugadores humanos (malla de llamadas WebRTC con PeerJS).
// Cada quien decide localmente a qué volumen escucha a cada otro (proximidad, fantasmas, reunión).
// Mientras el micrófono está apagado se envía una pista de silencio; al activarlo se reemplaza
// la pista en todas las llamadas sin renegociar.
export default class Voz {
  constructor(alCambiar) {
    this.alCambiar = alCambiar; // avisa a la interfaz cuando cambia el estado del micrófono
    this.red = null;
    this.llamadas = new Map(); // jugadorId -> { llamada, ganancia, analizador, audio }
    this.micActivo = false;
    this.mic = null;
    this.pistaSilencio = null;
    this.volumen = () => 1;
    this.reloj = null;
  }

  get disponible() {
    return !!(this.red && this.red.peer && !this.red.local && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  peerDe(jugadorId) {
    return jugadorId === ID_ANFITRION ? RED.prefijo + this.red.codigo : jugadorId;
  }

  pistaActual() {
    if (this.micActivo && this.mic) return this.mic.getAudioTracks()[0];
    if (!this.pistaSilencio) {
      const destino = contextoAudio().createMediaStreamDestination();
      this.pistaSilencio = destino.stream.getAudioTracks()[0];
    }
    return this.pistaSilencio;
  }

  // Se llama cuando hay una sala en línea lista
  conectar(red, miJugadorId, volumen) {
    this.cerrar();
    this.red = red;
    this.miId = miJugadorId;
    this.volumen = volumen;
    if (!this.disponible) return;
    red.peer.on('call', (llamada) => {
      const de = llamada.metadata && llamada.metadata.jugador;
      if (!de) {
        llamada.close();
        return;
      }
      // Si ya había una llamada con esa persona (quizá caída), se reemplaza
      if (this.llamadas.has(de)) {
        this.llamadas.get(de).llamada.close();
        this.quitar(de);
      }
      llamada.answer(new MediaStream([this.pistaActual()]));
      this.registrar(de, llamada);
    });
    let vueltas = 0;
    this.reloj = setInterval(() => {
      this.actualizarVolumenes();
      // Cada ~5 s reintenta las llamadas que falten o se hayan caído
      if (++vueltas % 33 === 0 && this.red) this.sincronizar(this.red.jugadores);
    }, 150);
    this.alCambiar();
  }

  // Abre llamadas con los jugadores humanos que falten y cierra las de quienes se fueron
  sincronizar(jugadores) {
    if (!this.disponible) return;
    const humanos = jugadores.filter((j) => !j.bot && j.id !== this.miId);
    const ids = new Set(humanos.map((j) => j.id));
    for (const [id, l] of this.llamadas) {
      if (!ids.has(id)) {
        l.llamada.close();
        this.quitar(id);
      }
    }
    const miPeer = this.red.peer.id;
    for (const j of humanos) {
      if (this.llamadas.has(j.id)) continue;
      const suPeer = this.peerDe(j.id);
      // Para no llamarse dos veces, llama quien tenga el id menor
      if (miPeer > suPeer) continue;
      const llamada = this.red.peer.call(suPeer, new MediaStream([this.pistaActual()]), { metadata: { jugador: this.miId } });
      if (llamada) this.registrar(j.id, llamada);
    }
  }

  registrar(jugadorId, llamada) {
    const entrada = { llamada, ganancia: null, analizador: null, audio: null };
    this.llamadas.set(jugadorId, entrada);
    // Si en 10 s no llega audio, se descarta para reintentar luego
    setTimeout(() => {
      if (this.llamadas.get(jugadorId) === entrada && !entrada.ganancia) {
        llamada.close();
        this.quitar(jugadorId);
      }
    }, 10000);
    llamada.on('stream', (remoto) => {
      if (entrada.ganancia) return;
      const ctx = contextoAudio();
      // Chrome necesita un <audio> con el stream para que WebAudio lo reproduzca
      const audio = new Audio();
      audio.srcObject = remoto;
      audio.muted = true;
      audio.play().catch(() => {});
      const fuente = ctx.createMediaStreamSource(remoto);
      const ganancia = ctx.createGain();
      ganancia.gain.value = 0;
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 256;
      fuente.connect(analizador);
      fuente.connect(ganancia).connect(ctx.destination);
      Object.assign(entrada, { audio, ganancia, analizador, datos: new Uint8Array(analizador.fftSize) });
    });
    const fin = () => {
      if (this.llamadas.get(jugadorId) === entrada) this.quitar(jugadorId);
    };
    llamada.on('close', fin);
    llamada.on('error', fin);
  }

  quitar(jugadorId) {
    const e = this.llamadas.get(jugadorId);
    if (!e) return;
    if (e.ganancia) e.ganancia.disconnect();
    if (e.audio) e.audio.srcObject = null;
    this.llamadas.delete(jugadorId);
  }

  actualizarVolumenes() {
    const ctx = contextoAudio();
    for (const [id, e] of this.llamadas) {
      if (!e.ganancia) continue;
      const v = Math.max(0, Math.min(1, this.volumen(id)));
      e.ganancia.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
      e.oido = v;
    }
  }

  // ¿Este jugador está hablando y lo oigo?
  hablando(jugadorId) {
    if (jugadorId === this.miId) return this.yoHablando();
    const e = this.llamadas.get(jugadorId);
    if (!e || !e.analizador || !(e.oido > 0.05)) return false;
    return nivel(e.analizador, e.datos) > 0.03;
  }

  yoHablando() {
    if (!this.micActivo || !this.analizadorMic) return false;
    return nivel(this.analizadorMic, this.datosMic) > 0.03;
  }

  async alternarMic() {
    if (!this.disponible) return false;
    if (this.micActivo) {
      this.micActivo = false;
      this.reemplazarPista();
      this.alCambiar();
      return false;
    }
    try {
      if (!this.mic) {
        this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const ctx = contextoAudio();
        this.analizadorMic = ctx.createAnalyser();
        this.analizadorMic.fftSize = 256;
        this.datosMic = new Uint8Array(256);
        ctx.createMediaStreamSource(this.mic).connect(this.analizadorMic);
      }
      this.micActivo = true;
      this.reemplazarPista();
    } catch {
      this.micActivo = false;
      this.alCambiar('No se pudo usar el micrófono (revisa los permisos del navegador)');
      return false;
    }
    this.alCambiar();
    return true;
  }

  reemplazarPista() {
    const pista = this.pistaActual();
    for (const { llamada } of this.llamadas.values()) {
      const pc = llamada.peerConnection;
      if (!pc) continue;
      for (const emisor of pc.getSenders()) {
        if (emisor.track === null || emisor.track.kind === 'audio') emisor.replaceTrack(pista).catch(() => {});
      }
    }
  }

  cerrar() {
    clearInterval(this.reloj);
    this.reloj = null;
    for (const { llamada } of this.llamadas.values()) llamada.close();
    for (const id of [...this.llamadas.keys()]) this.quitar(id);
    this.red = null;
    // El micrófono queda pedido para la próxima sala, pero apagado
    this.micActivo = false;
    if (this.mic) {
      this.mic.getTracks().forEach((t) => t.stop());
      this.mic = null;
      this.analizadorMic = null;
    }
    if (this.alCambiar) this.alCambiar();
  }
}

function nivel(analizador, datos) {
  analizador.getByteTimeDomainData(datos);
  let suma = 0;
  for (let i = 0; i < datos.length; i++) {
    const v = (datos[i] - 128) / 128;
    suma += v * v;
  }
  return Math.sqrt(suma / datos.length);
}
