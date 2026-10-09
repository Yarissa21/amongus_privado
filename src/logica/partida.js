import { TIEMPOS, DISTANCIA, TAREAS_POR_JUGADOR, RED, ROLES, VELOCIDADES, configInicial, aspecto } from '../config.js';
import { TAREAS, PASADIZOS, FUSIBLES, MESA, ASIENTOS, puntoInicio, salaEn } from '../mundo/mapa.js';
import { hayLinea } from '../mundo/colision.js';
import Bots from './bots.js';

export const DIR = { abajo: 0, arriba: 1, izquierda: 2, derecha: 3 };
// Banderas de la fila de cada jugador en el snapshot
export const BANDERA = { invisible: 1, escudo: 2 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function barajar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distanciaAMesa(p) {
  const cx = Math.max(MESA.x, Math.min(p.x, MESA.x + MESA.w));
  const cy = Math.max(MESA.y, Math.min(p.y, MESA.y + MESA.h));
  return Math.hypot(p.x - cx, p.y - cy);
}

// Simulación autoritativa. Solo existe en el anfitrión (o en el modo con bots).
export default class Partida {
  constructor({ jugadores, config = configInicial(), enviar, alTerminar }) {
    this.enviar = enviar;
    this.alTerminar = alTerminar;
    this.numAsesinos = config.asesinos || 1;
    this.velocidad = VELOCIDADES.includes(config.velocidad) ? config.velocidad : 1;
    this.probRoles = { ...configInicial().roles, ...(config.roles || {}) };
    this.ahora = 0;
    this.fase = 'juego';
    this.cuerpos = [];
    this.camara = null;
    this.luces = { apagadas: false, tiempo: 0 };
    this.reunion = null;
    this.esperaCampana = TIEMPOS.esperaCampana;
    this.relojSnapshot = 0;
    this.jugadores = new Map(
      jugadores.map((j) => [
        j.id,
        {
          id: j.id,
          nombre: j.nombre,
          color: j.color,
          genero: j.genero === 'm' ? 'm' : 'h',
          bot: !!j.bot,
          rol: 'inocente',
          subrol: null,
          vivo: true,
          desconectado: false,
          x: 0,
          y: 0,
          dir: DIR.abajo,
          mov: false,
          tareas: [],
          hechas: new Set(),
          cdMatar: TIEMPOS.primerMatar,
          cdSabotaje: TIEMPOS.enfriamientoSabotaje / 2,
          campanas: 1,
          tp: 0,
          // Habilidades de los roles especiales
          cdDisfraz: TIEMPOS.primerDisfraz,
          disfraz: null,
          cdInvisible: TIEMPOS.primerInvisible,
          invisible: 0,
          infectado: 0,
          escudo: 0,
          cdEscudo: 0,
          bateria: TIEMPOS.bateriaMedico,
          viendoVitales: false,
          casos: [],
          camaraPuesta: false,
          foto: null,
          juezUsado: false,
          enPasadizo: -1
        }
      ])
    );
    this.bots = new Bots(this);
  }

  get lista() {
    return [...this.jugadores.values()];
  }

  iniciar() {
    const lista = barajar(this.lista);
    const maxAsesinos = lista.length >= 12 ? 3 : lista.length >= 7 ? 2 : 1;
    const n = Math.max(1, Math.min(this.numAsesinos, maxAsesinos));
    lista.slice(0, n).forEach((j) => (j.rol = 'asesino'));
    // Roles especiales: cada jugador recibe como mucho uno de su equipo y cada rol sale una sola vez
    const usados = new Set();
    for (const j of barajar(this.lista)) {
      const posibles = barajar(Object.entries(ROLES).filter(([id, r]) => r.equipo === j.rol && !usados.has(id)));
      for (const [id] of posibles) {
        if (Math.random() * 100 < (this.probRoles[id] || 0)) {
          j.subrol = id;
          usados.add(id);
          break;
        }
      }
    }
    this.lista.forEach((j, i) => {
      j.tareas = barajar(TAREAS).slice(0, TAREAS_POR_JUGADOR).map((t) => t.id);
      Object.assign(j, puntoInicio(i, this.jugadores.size));
    });
    const publico = this.lista.map((j) => ({ id: j.id, nombre: j.nombre, color: j.color, genero: j.genero, aspecto: aspecto(j) }));
    const asesinos = this.lista.filter((j) => j.rol === 'asesino').map((j) => j.id);
    for (const j of this.lista) {
      this.enviar(j.id, {
        t: 'inicio',
        jugadores: publico,
        rol: j.rol,
        subrol: j.subrol,
        // Los asesinos conocen el rol especial de su cómplice
        subrolesCompaneros: j.rol === 'asesino' ? Object.fromEntries(asesinos.filter((id) => id !== j.id).map((id) => [id, this.jugadores.get(id).subrol])) : {},
        velocidad: this.velocidad,
        numAsesinos: asesinos.length,
        companeros: j.rol === 'asesino' ? asesinos.filter((id) => id !== j.id) : [],
        tareas: j.tareas,
        x: j.x,
        y: j.y,
        tp: j.tp
      });
    }
    this.bots.iniciar();
  }

  // ---------- Mensajes de los jugadores ----------

  recibir(id, msg) {
    const j = this.jugadores.get(id);
    if (!j || j.desconectado || !msg) return;
    switch (msg.t) {
      case 'p':
        if (this.fase !== 'juego' || (msg.n | 0) < j.tp) return;
        if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
        j.x = msg.x;
        j.y = msg.y;
        j.dir = msg.d | 0;
        j.mov = !!msg.m;
        break;
      case 'matar':
        this.intentarMatar(j, this.jugadores.get(msg.victima));
        break;
      case 'reportar':
        this.intentarReportar(j);
        break;
      case 'campana':
        if (this.fase === 'juego' && j.vivo && !j.infectado && j.campanas > 0 && this.esperaCampana <= 0 && distanciaAMesa(j) <= DISTANCIA.campana + 10) {
          j.campanas--;
          this.iniciarReunion('campana', j.id, null);
        }
        break;
      case 'tarea':
        this.completarTarea(j, msg.tarea);
        break;
      case 'sabotaje':
        if (this.fase === 'juego' && j.rol === 'asesino' && j.vivo && j.cdSabotaje <= 0 && !this.luces.apagadas) {
          this.luces = { apagadas: true, tiempo: TIEMPOS.apagonAutomatico };
          this.lista.filter((o) => o.rol === 'asesino').forEach((o) => (o.cdSabotaje = TIEMPOS.enfriamientoSabotaje));
          this.anunciar({ t: 'aviso', tipo: 'apagon' });
        }
        break;
      case 'disfraz':
        this.disfrazar(j, msg.objetivo);
        break;
      case 'invisible':
        if (this.fase === 'juego' && j.subrol === 'fantasma' && j.vivo && j.cdInvisible <= 0 && !j.invisible) {
          j.invisible = TIEMPOS.invisible;
          j.cdInvisible = TIEMPOS.enfriamientoInvisible;
          this.anunciar({ t: 'aviso', tipo: 'esfumar', x: j.x, y: j.y });
        }
        break;
      case 'vitales':
        if (j.subrol === 'medico' && j.vivo && this.fase === 'juego' && j.bateria > 0) j.viendoVitales = !!msg.abierto;
        else j.viendoVitales = false;
        break;
      case 'investigar':
        this.investigar(j, this.jugadores.get(msg.objetivo), msg.caso | 0);
        break;
      case 'camara':
        if (this.fase === 'juego' && j.subrol === 'camarografo' && j.vivo && !j.camaraPuesta && !this.camara) {
          j.camaraPuesta = true;
          this.camara = { x: j.x, y: j.y, sala: salaEn(j.x, j.y), duenio: j.id, visible: false, foto: null };
          this.enviar(j.id, { t: 'aviso', tipo: 'camaraPuesta', x: j.x, y: j.y, sala: this.camara.sala });
        }
        break;
      case 'recoger':
        if (this.fase === 'juego' && j.vivo && this.camara && this.camara.visible && dist(j, this.camara) <= DISTANCIA.usar + 12) {
          j.foto = this.camara.foto || { vacia: true, sala: this.camara.sala };
          this.camara = null;
          this.enviar(j.id, { t: 'foto', foto: j.foto });
        }
        break;
      case 'mostrarFoto':
        if (this.fase === 'reunion' && j.vivo && j.foto) {
          const foto = j.foto;
          j.foto = null;
          this.anunciar({ t: 'chat', de: j.id, foto, muerto: false });
          this.bots.alFoto(foto);
        }
        break;
      case 'escudo': {
        const o = this.jugadores.get(msg.objetivo);
        if (this.fase !== 'juego' || j.subrol !== 'angel' || j.vivo || j.desconectado || j.cdEscudo > 0) return;
        if (!o || !o.vivo || o.desconectado) return;
        o.escudo = TIEMPOS.escudo;
        j.cdEscudo = TIEMPOS.enfriamientoEscudo;
        this.enviar(j.id, { t: 'aviso', tipo: 'escudoDado', id: o.id });
        break;
      }
      case 'veredicto':
        this.veredicto(j, msg.objetivo);
        break;
      case 'arreglar':
        if (this.fase === 'juego' && this.luces.apagadas && dist(j, FUSIBLES) <= DISTANCIA.usar + 10) this.encenderLuces();
        break;
      case 'pasadizo':
        this.pasadizo(j, msg);
        break;
      case 'chat':
        this.chat(j, msg.texto);
        break;
      case 'votar':
        this.votar(j, msg.objetivo);
        break;
    }
  }

  // Cambiaformas: el asesino toma la apariencia (color y nombre) de otro jugador.
  disfrazar(j, objetivo) {
    const o = this.jugadores.get(objetivo);
    if (this.fase !== 'juego' || j.subrol !== 'cambiaformas' || !j.vivo || j.disfraz || j.cdDisfraz > 0) return;
    if (!o || o.id === j.id || o.desconectado) return;
    j.disfraz = { id: o.id, tiempo: TIEMPOS.disfraz };
    j.cdDisfraz = TIEMPOS.enfriamientoDisfraz;
    this.anunciar({ t: 'aviso', tipo: 'disfraz', x: j.x, y: j.y });
  }

  quitarDisfraz(j) {
    if (!j.disfraz) return;
    j.disfraz = null;
    if (this.fase === 'juego') this.anunciar({ t: 'aviso', tipo: 'disfraz', x: j.x, y: j.y });
  }

  // Pasadizos: el asesino entra, queda escondido, se mueve entre salidas y elige cuándo salir.
  pasadizo(j, msg) {
    if (this.fase !== 'juego' || j.rol !== 'asesino' || !j.vivo) return;
    const n = PASADIZOS.length;
    if (msg.accion === 'entrar') {
      const i = msg.i | 0;
      const p = PASADIZOS[i];
      if (j.enPasadizo >= 0 || !p || dist(j, p) > DISTANCIA.usar + 10) return;
      j.enPasadizo = i;
      this.anunciar({ t: 'aviso', tipo: 'pasadizo', x: p.x, y: p.y });
      this.teletransportar(j, p.x, p.y);
    } else if (msg.accion === 'mover' && j.enPasadizo >= 0) {
      j.enPasadizo = (j.enPasadizo + (msg.dir < 0 ? n - 1 : 1)) % n;
      const p = PASADIZOS[j.enPasadizo];
      this.teletransportar(j, p.x, p.y);
    } else if (msg.accion === 'salir' && j.enPasadizo >= 0) {
      const p = PASADIZOS[j.enPasadizo];
      j.enPasadizo = -1;
      this.teletransportar(j, p.x, p.y);
      this.anunciar({ t: 'aviso', tipo: 'pasadizo', x: p.x, y: p.y });
    }
  }

  // Escondido para los demás: invisible (fantasma) o dentro de un pasadizo
  oculto(j) {
    return j.invisible > 0 || j.enPasadizo >= 0;
  }

  apariencia(j) {
    return j.disfraz ? j.disfraz.id : j.id;
  }

  teletransportar(j, x, y) {
    j.x = x;
    j.y = y;
    j.mov = false;
    j.tp++;
    this.enviar(j.id, { t: 'tp', x, y, n: j.tp });
  }

  // ---------- Asesinatos ----------

  intentarMatar(asesino, victima) {
    if (this.fase !== 'juego' || !asesino || !victima) return;
    if (asesino.rol !== 'asesino' || !asesino.vivo || asesino.cdMatar > 0 || asesino.enPasadizo >= 0) return;
    if (!victima.vivo || victima.infectado || victima.rol === 'asesino' || victima.desconectado) return;
    if (dist(asesino, victima) > DISTANCIA.matar + 8) return;

    // Escudo del ángel: el ataque falla y solo el asesino y los fantasmas lo ven romperse
    if (victima.escudo > 0) {
      victima.escudo = 0;
      asesino.cdMatar = TIEMPOS.matarTrasEscudo;
      const aviso = { t: 'aviso', tipo: 'escudoRoto', x: victima.x, y: victima.y, id: victima.id };
      for (const o of this.lista) if (o.id === asesino.id || !o.vivo) this.enviar(o.id, aviso);
      return;
    }

    asesino.cdMatar = TIEMPOS.enfriamientoMatar;
    this.registrarAsesinato(asesino, victima);

    // Alien: la víctima sigue caminando unos segundos y el asesino no salta sobre ella
    if (asesino.subrol === 'alien') {
      victima.infectado = TIEMPOS.alien;
      victima.viendoVitales = false;
      this.enviar(victima.id, { t: 'infectado', segundos: TIEMPOS.alien });
      return;
    }
    this.teletransportar(asesino, victima.x, victima.y);
    this.morir(victima, asesino);
  }

  // Lo que queda registrado en el momento del ataque: casos del detective, foto de la cámara y testigos bots.
  registrarAsesinato(asesino, victima) {
    const posiciones = Object.fromEntries(this.lista.filter((o) => o.vivo && !o.desconectado).map((o) => [o.id, salaEn(o.x, o.y)]));
    for (const d of this.lista) {
      if (d.subrol !== 'detective' || !d.vivo || d.id === victima.id || d.casos.length >= 3) continue;
      d.casos.push({ victima: victima.id, sala: salaEn(victima.x, victima.y), posiciones, preguntas: [] });
      this.enviarCasos(d);
    }
    const c = this.camara;
    if (c && !c.foto && dist(c, victima) <= DISTANCIA.camara && hayLinea(c.x, c.y, victima.x, victima.y)) {
      c.foto = { victima: victima.id, asesino: asesino.invisible > 0 ? null : this.apariencia(asesino), sala: salaEn(victima.x, victima.y) };
    }
    this.bots.alMatar(asesino, victima);
  }

  morir(victima, asesino, { cuerpo = true, silencioso = false } = {}) {
    victima.vivo = false;
    victima.mov = false;
    victima.infectado = 0;
    victima.escudo = 0;
    victima.viendoVitales = false;
    if (cuerpo) {
      this.cuerpos.push({
        id: victima.id,
        x: victima.x,
        y: victima.y,
        sala: salaEn(victima.x, victima.y),
        veneno: asesino && asesino.subrol === 'venenosa' ? TIEMPOS.veneno : 0
      });
    }
    this.enviar(victima.id, { t: 'muerte' });
    if (!silencioso) this.anunciar({ t: 'aviso', tipo: 'golpe', x: victima.x, y: victima.y, alien: !asesino });
    if (victima.subrol === 'alertador' && !silencioso) this.anunciar({ t: 'aviso', tipo: 'grito', x: victima.x, y: victima.y, id: victima.id });
    this.comprobarVictoria();
  }

  intentarReportar(j) {
    if (this.fase !== 'juego' || !j.vivo || j.infectado) return;
    const cuerpo = this.cuerpos.find((c) => dist(c, j) <= DISTANCIA.reportar + 10);
    if (cuerpo) this.iniciarReunion('cuerpo', j.id, cuerpo);
  }

  // ---------- Detective ----------

  investigar(d, o, indice) {
    if (this.fase !== 'juego' || d.subrol !== 'detective' || !d.vivo || !o || o.id === d.id || !o.vivo) return;
    if (dist(d, o) > DISTANCIA.investigar + 10) return;
    const caso = d.casos[indice];
    if (!caso || caso.preguntas.length >= 3 || caso.preguntas.some((p) => p.id === o.id)) return;
    const sala = caso.posiciones[o.id] || 'ningún lado';
    caso.preguntas.push({ id: o.id, sala });
    this.enviarCasos(d);
    const victima = this.jugadores.get(caso.victima);
    this.enviar(d.id, { t: 'pista', texto: `${o.nombre} estaba en: ${sala} (muerte de ${victima ? victima.nombre : '?'})` });
  }

  enviarCasos(d) {
    this.enviar(d.id, { t: 'casos', casos: d.casos.map((c) => ({ victima: c.victima, sala: c.sala, preguntas: c.preguntas })) });
  }

  // ---------- Tareas y luces ----------

  completarTarea(j, id) {
    if (this.fase !== 'juego' || j.rol !== 'inocente') return;
    const tarea = TAREAS.find((t) => t.id === id);
    if (!tarea || !j.tareas.includes(id) || j.hechas.has(id)) return;
    if (dist(j, tarea) > DISTANCIA.usar + 14) return;
    j.hechas.add(id);
    this.enviar(j.id, { t: 'tareaHecha', tarea: id });
    this.comprobarVictoria();
  }

  encenderLuces() {
    this.luces = { apagadas: false, tiempo: 0 };
    this.anunciar({ t: 'aviso', tipo: 'luces' });
  }

  progreso() {
    let total = 0;
    let hechas = 0;
    for (const j of this.lista) {
      if (j.rol !== 'inocente' || j.desconectado) continue;
      total += j.tareas.length;
      hechas += j.hechas.size;
    }
    return total ? hechas / total : 0;
  }

  // ---------- Reuniones ----------

  iniciarReunion(motivo, quien, cuerpo) {
    // Los infectados por el alien mueren al empezar la reunión (sin cuerpo)
    const misteriosos = [];
    for (const j of this.lista) {
      if (j.infectado > 0 && j.vivo) {
        this.morir(j, null, { cuerpo: false, silencioso: true });
        misteriosos.push(j.id);
      }
    }
    if (this.fase === 'fin') return;
    this.fase = 'reunion';
    for (const j of this.lista) {
      j.disfraz = null;
      j.invisible = 0;
      j.viendoVitales = false;
      j.enPasadizo = -1;
    }
    const victimas = [...this.cuerpos.map((c) => c.id), ...misteriosos];
    this.cuerpos = [];
    if (this.luces.apagadas) this.luces = { apagadas: false, tiempo: 0 };
    this.reunion = {
      motivo,
      quien,
      victima: cuerpo ? cuerpo.id : null,
      sala: cuerpo ? cuerpo.sala : null,
      tiempo: TIEMPOS.reunion,
      votos: new Map()
    };
    const vivos = this.lista.filter((j) => j.vivo && !j.desconectado);
    vivos.forEach((j, i) => {
      const asiento = ASIENTOS[i % ASIENTOS.length];
      this.teletransportar(j, asiento.x, asiento.y);
      j.dir = DIR.abajo;
    });
    this.anunciar({
      t: 'reunion',
      motivo,
      quien,
      victima: this.reunion.victima,
      sala: this.reunion.sala,
      victimas,
      misteriosos,
      duracion: TIEMPOS.reunion,
      vivos: vivos.map((j) => j.id)
    });
    this.bots.alReunion(this.reunion);
  }

  chat(j, texto) {
    if (this.fase !== 'reunion') return;
    const limpio = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!limpio) return;
    const msg = { t: 'chat', de: j.id, texto: limpio, muerto: !j.vivo };
    for (const o of this.lista) {
      if (j.vivo || !o.vivo) this.enviar(o.id, msg);
    }
    if (j.vivo) this.bots.alChat(j, limpio);
  }

  votar(j, objetivo) {
    if (this.fase !== 'reunion' || !j.vivo || this.reunion.votos.has(j.id)) return;
    if (TIEMPOS.reunion - this.reunion.tiempo < TIEMPOS.esperaVoto) return;
    const valido = objetivo === 'saltar' || (this.jugadores.get(objetivo) && this.jugadores.get(objetivo).vivo);
    if (!valido) return;
    this.reunion.votos.set(j.id, objetivo);
    this.anunciar({ t: 'voto', quien: j.id });
    const vivos = this.lista.filter((o) => o.vivo && !o.desconectado);
    if (vivos.every((o) => this.reunion.votos.has(o.id))) this.terminarVotacion();
  }

  // Juez: con sus tareas terminadas, expulsa a quien elija; si no era asesino, sale él.
  veredicto(j, objetivo) {
    if (this.fase !== 'reunion' || j.subrol !== 'juez' || !j.vivo || j.juezUsado) return;
    if (j.hechas.size < j.tareas.length || this.reunion.votos.has(j.id)) return;
    if (TIEMPOS.reunion - this.reunion.tiempo < TIEMPOS.esperaVoto) return;
    const o = this.jugadores.get(objetivo);
    if (!o || !o.vivo || o.id === j.id) return;
    j.juezUsado = true;
    const acerto = o.rol === 'asesino';
    this.terminarVotacion({ expulsado: acerto ? o : j, veredicto: { juez: j.id, objetivo: o.id, acerto } });
  }

  terminarVotacion(forzado = null) {
    let expulsado = null;
    let empate = false;
    if (forzado) {
      expulsado = forzado.expulsado;
    } else {
      const conteo = new Map();
      for (const [votante, objetivo] of this.reunion.votos) {
        const v = this.jugadores.get(votante);
        if (!v || !v.vivo || v.desconectado) continue;
        conteo.set(objetivo, (conteo.get(objetivo) || 0) + 1);
      }
      let max = 0;
      let elegido = null;
      for (const [objetivo, n] of conteo) {
        if (n > max) {
          max = n;
          elegido = objetivo;
          empate = false;
        } else if (n === max) empate = true;
      }
      if (elegido && elegido !== 'saltar' && !empate) expulsado = this.jugadores.get(elegido);
    }
    if (expulsado) expulsado.vivo = false;
    this.fase = 'resultado';
    this.reunion.tiempo = (expulsado ? TIEMPOS.expulsion : TIEMPOS.resultado) + (forzado ? 2 : 0);
    this.anunciar({
      t: 'resultado',
      votos: [...this.reunion.votos],
      expulsado: expulsado ? expulsado.id : null,
      eraAsesino: expulsado ? expulsado.rol === 'asesino' : false,
      empate,
      veredicto: forzado ? forzado.veredicto : null,
      asesinosRestantes: this.lista.filter((o) => o.rol === 'asesino' && o.vivo && !o.desconectado).length
    });
  }

  reanudar() {
    if (this.comprobarVictoria()) return;
    this.fase = 'juego';
    this.reunion = null;
    this.esperaCampana = TIEMPOS.esperaCampana;
    // La cámara escondida se vuelve visible después de la votación
    if (this.camara) this.camara.visible = true;
    for (const j of this.lista) {
      if (j.rol === 'asesino') j.cdMatar = Math.max(j.cdMatar, TIEMPOS.enfriamientoMatar * 0.6);
    }
    this.anunciar({ t: 'reanudar' });
    this.bots.alReanudar();
  }

  // ---------- Fin de la partida ----------

  comprobarVictoria() {
    if (this.fase === 'fin') return true;
    const activos = this.lista.filter((j) => j.vivo && !j.desconectado);
    const asesinos = activos.filter((j) => j.rol === 'asesino').length;
    const inocentes = activos.length - asesinos;
    let ganador = null;
    let motivo = '';
    if (asesinos === 0) {
      ganador = 'inocentes';
      motivo = 'Descubrieron a todos los asesinos';
    } else if (this.progreso() >= 1) {
      ganador = 'inocentes';
      motivo = 'Completaron todas las tareas de la casa';
    } else if (asesinos >= inocentes && this.fase !== 'reunion') {
      ganador = 'asesino';
      motivo = 'Ya no quedan suficientes inocentes';
    }
    if (!ganador) return false;
    this.fase = 'fin';
    this.anunciar({
      t: 'fin',
      ganador,
      motivo,
      roles: this.lista.map((j) => [j.id, j.rol, j.subrol])
    });
    if (this.alTerminar) this.alTerminar(ganador);
    return true;
  }

  quitarJugador(id) {
    const j = this.jugadores.get(id);
    if (!j || j.desconectado) return;
    j.desconectado = true;
    j.vivo = false;
    j.enPasadizo = -1;
    this.anunciar({ t: 'aviso', tipo: 'salio', id });
    if (this.fase === 'reunion') {
      this.reunion.votos.delete(id);
      const vivos = this.lista.filter((o) => o.vivo && !o.desconectado);
      if (vivos.length && vivos.every((o) => this.reunion.votos.has(o.id))) this.terminarVotacion();
    }
    if (this.fase === 'juego' || this.fase === 'reunion') this.comprobarVictoria();
  }

  // ---------- Bucle ----------

  anunciar(msg) {
    for (const j of this.lista) if (!j.desconectado) this.enviar(j.id, msg);
  }

  actualizar(dt) {
    this.ahora += dt;
    if (this.fase === 'juego') {
      for (const j of this.lista) {
        if (j.desconectado) continue;
        if (j.escudo > 0) j.escudo = Math.max(0, j.escudo - dt);
        if (j.cdEscudo > 0) j.cdEscudo = Math.max(0, j.cdEscudo - dt);
        if (j.viendoVitales) {
          j.bateria = Math.max(0, j.bateria - dt);
          if (j.bateria <= 0) {
            j.viendoVitales = false;
            this.enviar(j.id, { t: 'vitalesFin' });
          }
        }
        if (j.infectado > 0 && j.vivo) {
          j.infectado -= dt;
          if (j.infectado <= 0) {
            this.morir(j, null);
            if (this.fase !== 'juego') return;
          }
        }
        if (j.rol !== 'asesino' || !j.vivo) continue;
        j.cdMatar = Math.max(0, j.cdMatar - dt);
        j.cdSabotaje = Math.max(0, j.cdSabotaje - dt);
        if (j.disfraz) {
          j.disfraz.tiempo -= dt;
          if (j.disfraz.tiempo <= 0) this.quitarDisfraz(j);
        } else j.cdDisfraz = Math.max(0, j.cdDisfraz - dt);
        if (j.invisible > 0) {
          j.invisible -= dt;
          if (j.invisible <= 0) {
            j.invisible = 0;
            this.anunciar({ t: 'aviso', tipo: 'esfumar', x: j.x, y: j.y });
          }
        } else j.cdInvisible = Math.max(0, j.cdInvisible - dt);
      }
      // Veneno: los cuerpos se desintegran
      for (const c of this.cuerpos) if (c.veneno > 0) c.veneno -= dt;
      this.cuerpos = this.cuerpos.filter((c) => !(c.veneno < 0));
      this.esperaCampana = Math.max(0, this.esperaCampana - dt);
      if (this.luces.apagadas) {
        this.luces.tiempo -= dt;
        if (this.luces.tiempo <= 0) this.encenderLuces();
      }
      this.bots.actualizar(dt);
    } else if (this.fase === 'reunion') {
      this.reunion.tiempo -= dt;
      this.bots.actualizarReunion(dt);
      if (this.fase === 'reunion' && this.reunion.tiempo <= 0) this.terminarVotacion();
    } else if (this.fase === 'resultado') {
      this.reunion.tiempo -= dt;
      if (this.reunion.tiempo <= 0) this.reanudar();
    }

    this.relojSnapshot += dt * 1000;
    if (this.relojSnapshot >= RED.intervaloSnapshotMs) {
      this.relojSnapshot = 0;
      this.enviarSnapshots();
    }
  }

  // Información de la habilidad del rol especial (solo para su dueño)
  habilidad(j) {
    switch (j.subrol) {
      case 'medico':
        return {
          bat: Math.ceil(j.bateria),
          vit: j.viendoVitales ? this.lista.map((o) => [o.id, o.desconectado ? 'desc' : o.vivo ? 'vivo' : 'muerto']) : null
        };
      case 'fantasma':
        return { cd: Math.ceil(j.cdInvisible), act: Math.ceil(j.invisible) };
      case 'angel':
        return { cd: Math.ceil(j.cdEscudo) };
      case 'camarografo':
        return { puesta: j.camaraPuesta };
      case 'juez':
        return { listo: !j.juezUsado && j.hechas.size >= j.tareas.length };
      default:
        return null;
    }
  }

  enviarSnapshots() {
    const progreso = Math.round(this.progreso() * 1000) / 1000;
    const cuerpos = this.cuerpos.map((c) => [c.id, Math.round(c.x), Math.round(c.y), c.veneno > 0 ? Math.round((c.veneno / TIEMPOS.veneno) * 100) / 100 : 0]);
    const camara = this.camara && this.camara.visible ? [Math.round(this.camara.x), Math.round(this.camara.y)] : 0;
    const activos = this.lista.filter((j) => !j.desconectado);
    for (const r of this.lista) {
      if (r.bot || r.desconectado) continue;
      const filas = [];
      for (const j of activos) {
        if (!j.vivo && r.vivo) continue;
        // Invisible: solo lo ven él mismo, su cómplice y los fantasmas
        const puedeVerInvisible = j.id === r.id || !r.vivo || (r.rol === 'asesino' && j.rol === 'asesino');
        if (this.oculto(j) && !puedeVerInvisible) continue;
        let banderas = 0;
        if (this.oculto(j)) banderas |= BANDERA.invisible;
        if (j.escudo > 0 && !r.vivo) banderas |= BANDERA.escudo;
        filas.push([j.id, Math.round(j.x), Math.round(j.y), j.dir, j.mov ? 1 : 0, j.vivo ? 1 : 0, j.disfraz ? j.disfraz.id : 0, banderas]);
      }
      this.enviar(r.id, {
        t: 's',
        j: filas,
        c: cuerpos,
        cam: camara,
        p: progreso,
        l: this.luces.apagadas ? 1 : 0,
        f: this.fase,
        yo: {
          vivo: r.vivo,
          cdM: Math.ceil(r.cdMatar),
          cdS: Math.ceil(r.cdSabotaje),
          cdD: Math.ceil(r.cdDisfraz),
          dis: r.disfraz ? Math.ceil(r.disfraz.tiempo) : 0,
          camp: r.campanas,
          espC: Math.ceil(this.esperaCampana),
          rt: this.reunion ? Math.ceil(this.reunion.tiempo) : 0,
          inf: r.infectado > 0 ? Math.ceil(r.infectado) : 0,
          foto: r.foto ? 1 : 0,
          pz: r.enPasadizo,
          h: this.habilidad(r)
        }
      });
    }
  }
}
