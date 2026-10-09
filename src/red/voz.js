import { RED } from '../config.js';
import { ID_ANFITRION } from './red.js';
import { contextoAudio } from '../ui/sonido.js';

// Chat de voz entre todos los jugadores humanos (malla de llamadas WebRTC con PeerJS).
// Cada quien decide localmente a qué volumen escucha a cada otro (proximidad, fantasmas, reunión).
//
// - Mientras el micrófono está apagado se envía una pista de silencio; al activarlo se reemplaza
//   la pista en todas las llamadas sin renegociar.
// - Si dos jugadores no logran conectarse directo (redes móviles, NAT estrictos), el anfitrión
//   les retransmite el audio ("relevo"): él ya tiene una llamada con cada uno.
// - En iPhone/iPad (Safari) WebAudio no reproduce audio remoto de forma fiable: ahí se usa el
//   elemento <audio> y la proximidad es "se oye / no se oye".

const ESPERA_AUDIO_MS = 10000;
const ESPERA_RELEVO_MS = 15000;
const ES_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default class Voz {
  constructor(alCambiar) {
    this.alCambiar = alCambiar; // avisa a la interfaz cuando cambia el estado
    this.red = null;
    this.llamadas = new Map(); // jugadorId -> entrada
    this.relevos = []; // llamadas que el anfitrión hace para retransmitir audio
    this.micActivo = false;
    this.mic = null;
    this.pistaSilencio = null;
    this.volumen = () => 1;
    this.reloj = null;
  }

  get disponible() {
    return !!(this.red && this.red.peer && !this.red.local && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  get soyAnfitrion() {
    return !!(this.red && this.red.esAnfitrion);
  }

  peerDe(jugadorId) {
    return jugadorId === ID_ANFITRION ? RED.prefijo + this.red.codigo : jugadorId;
  }

  silencio() {
    if (!this.pistaSilencio) {
      const destino = contextoAudio().createMediaStreamDestination();
      this.pistaSilencio = destino.stream.getAudioTracks()[0];
    }
    return this.pistaSilencio;
  }

  pistaActual() {
    if (this.micActivo && this.mic) return this.mic.getAudioTracks()[0];
    return this.silencio();
  }

  // Se llama cuando hay una sala en línea lista
  conectar(red, miJugadorId, volumen) {
    this.cerrar();
    this.red = red;
    this.miId = miJugadorId;
    this.volumen = volumen;
    if (!this.disponible) return;
    red.peer.on('call', (llamada) => this.alRecibirLlamada(llamada));
    let vueltas = 0;
    this.reloj = setInterval(() => {
      this.actualizarVolumenes();
      vueltas++;
      // Cada ~3 s: reintenta llamadas que falten y refresca el estado en pantalla
      if (vueltas % 20 === 0 && this.red) {
        this.sincronizar(this.red.jugadores);
        this.alCambiar();
      }
    }, 150);
    this.alCambiar();
  }

  alRecibirLlamada(llamada) {
    const meta = llamada.metadata || {};
    const de = meta.jugador;
    if (!de) {
      llamada.close();
      return;
    }
    // Si ya había una llamada con esa persona (caída o sin audio), se reemplaza
    const anterior = this.llamadas.get(de);
    if (anterior) {
      if (anterior.llamada) anterior.llamada.close();
      this.quitar(de);
    }
    // En un relevo no hace falta mandar audio de vuelta: el anfitrión ya lo recibe por la llamada directa
    llamada.answer(new MediaStream([meta.relevo ? this.silencio() : this.pistaActual()]));
    this.registrar(de, llamada, !!meta.relevo);
  }

  // Abre llamadas con los jugadores humanos que falten y cierra las de quienes se fueron
  sincronizar(jugadores) {
    if (!this.disponible || !jugadores) return;
    const humanos = jugadores.filter((j) => !j.bot && j.id !== this.miId);
    const ids = new Set(humanos.map((j) => j.id));
    for (const [id, e] of this.llamadas) {
      if (!ids.has(id)) {
        if (e.llamada) e.llamada.close();
        this.quitar(id);
      }
    }
    const miPeer = this.red.peer.id;
    for (const j of humanos) {
      const e = this.llamadas.get(j.id);
      if (e) {
        // Relevo pedido que nunca llegó: se vuelve a intentar desde cero
        if (e.esperandoRelevo && Date.now() - e.esperandoRelevo > ESPERA_RELEVO_MS) this.quitar(j.id);
        else continue;
      }
      const suPeer = this.peerDe(j.id);
      // Para no llamarse dos veces, llama quien tenga el id menor
      if (miPeer > suPeer) continue;
      const llamada = this.red.peer.call(suPeer, new MediaStream([this.pistaActual()]), { metadata: { jugador: this.miId } });
      if (llamada) this.registrar(j.id, llamada, false);
    }
  }

  registrar(jugadorId, llamada, relevo) {
    const entrada = { llamada, relevo, ganancia: null, analizador: null, audio: null, remoto: null };
    this.llamadas.set(jugadorId, entrada);
    const fallo = () => {
      if (this.llamadas.get(jugadorId) !== entrada || entrada.remoto) return;
      llamada.close();
      this.pedirRelevo(jugadorId);
    };
    setTimeout(fallo, ESPERA_AUDIO_MS);
    const vigilarIce = () => {
      const pc = llamada.peerConnection;
      if (!pc) return setTimeout(vigilarIce, 500);
      pc.addEventListener('iceconnectionstatechange', () => {
        if (pc.iceConnectionState === 'failed') {
          if (entrada.remoto) {
            // Se cayó una llamada que funcionaba: se libera para reconectar
            if (this.llamadas.get(jugadorId) === entrada) this.quitar(jugadorId);
          } else fallo();
        }
      });
    };
    vigilarIce();
    llamada.on('stream', (remoto) => this.alRecibirAudio(entrada, remoto));
    const fin = () => {
      if (this.llamadas.get(jugadorId) === entrada && !entrada.esperandoRelevo) this.quitar(jugadorId);
    };
    llamada.on('close', fin);
    llamada.on('error', fin);
  }

  alRecibirAudio(entrada, remoto) {
    if (entrada.remoto) return;
    entrada.remoto = remoto;
    const ctx = contextoAudio();
    const audio = new Audio();
    audio.autoplay = true;
    audio.playsInline = true;
    audio.srcObject = remoto;
    entrada.audio = audio;
    // El analizador sirve para saber quién está hablando
    try {
      const fuente = ctx.createMediaStreamSource(remoto);
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 256;
      fuente.connect(analizador);
      entrada.analizador = analizador;
      entrada.datos = new Uint8Array(analizador.fftSize);
      if (!ES_IOS) {
        // Chrome/Firefox/Android: volumen continuo con WebAudio (el <audio> queda mudo, pero es necesario)
        const ganancia = ctx.createGain();
        ganancia.gain.value = 0;
        fuente.connect(ganancia).connect(ctx.destination);
        entrada.ganancia = ganancia;
        audio.muted = true;
      }
    } catch {
      entrada.ganancia = null;
    }
    if (!entrada.ganancia) audio.muted = true; // en iOS se activa según la distancia
    audio.play().catch(() => {});
    this.alCambiar();
  }

  // El jugador no pudo conectarse directo con otro: se le pide al anfitrión que retransmita
  pedirRelevo(jugadorId) {
    const e = this.llamadas.get(jugadorId);
    if (e && e.llamada) e.llamada.close();
    this.quitar(jugadorId);
    if (this.soyAnfitrion || jugadorId === ID_ANFITRION) return; // con el anfitrión se reintenta directo
    this.llamadas.set(jugadorId, { esperandoRelevo: Date.now() });
    this.red.enviarAnfitrion({ t: 'vozRelevo', con: jugadorId });
    this.alCambiar();
  }

  // (Solo anfitrión) retransmite el audio entre dos jugadores que no se conectan directo
  relevar(a, b) {
    if (!this.soyAnfitrion) return;
    // Ambos lados pueden pedirlo a la vez: un solo relevo por pareja cada 20 s
    const clave = [a, b].sort().join('|');
    this.ultimoRelevo = this.ultimoRelevo || new Map();
    if (Date.now() - (this.ultimoRelevo.get(clave) || 0) < 20000) return;
    this.ultimoRelevo.set(clave, Date.now());
    const ea = this.llamadas.get(a);
    const eb = this.llamadas.get(b);
    if (!ea || !eb || !ea.remoto || !eb.remoto) return;
    const pa = ea.remoto.getAudioTracks()[0];
    const pb = eb.remoto.getAudioTracks()[0];
    if (!pa || !pb) return;
    const hacia = (destino, pista, de) => {
      const llamada = this.red.peer.call(this.peerDe(destino), new MediaStream([pista]), { metadata: { jugador: de, relevo: true } });
      if (llamada) this.relevos.push(llamada);
    };
    hacia(b, pa, a);
    hacia(a, pb, b);
  }

  quitar(jugadorId) {
    const e = this.llamadas.get(jugadorId);
    if (!e) return;
    if (e.ganancia) e.ganancia.disconnect();
    if (e.audio) {
      e.audio.pause();
      e.audio.srcObject = null;
    }
    this.llamadas.delete(jugadorId);
  }

  actualizarVolumenes() {
    const ctx = contextoAudio();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    for (const [id, e] of this.llamadas) {
      if (!e.remoto) continue;
      const v = Math.max(0, Math.min(1, this.volumen(id)));
      e.oido = v;
      if (e.ganancia) e.ganancia.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
      else if (e.audio) {
        e.audio.muted = v < 0.15;
        if (e.audio.paused) e.audio.play().catch(() => {});
      }
    }
  }

  // Estado de la voz con un jugador, para mostrarlo en la sala
  estado(jugadorId) {
    if (!this.disponible || jugadorId === this.miId) return null;
    const e = this.llamadas.get(jugadorId);
    if (!e) return 'esperando';
    if (e.remoto) return e.relevo ? 'relevo' : 'ok';
    return e.esperandoRelevo ? 'relevando' : 'conectando';
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
    contextoAudio();
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
    for (const e of this.llamadas.values()) {
      if (!e.llamada || e.relevo) continue;
      const pc = e.llamada.peerConnection;
      if (!pc) continue;
      for (const emisor of pc.getSenders()) {
        if (emisor.track === null || emisor.track.kind === 'audio') emisor.replaceTrack(pista).catch(() => {});
      }
    }
  }

  cerrar() {
    clearInterval(this.reloj);
    this.reloj = null;
    for (const e of this.llamadas.values()) if (e.llamada) e.llamada.close();
    for (const id of [...this.llamadas.keys()]) this.quitar(id);
    this.relevos.forEach((l) => l.close());
    this.relevos = [];
    this.red = null;
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
