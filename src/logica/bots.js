import { TILE, VELOCIDAD, VELOCIDAD_FANTASMA, VISION, DISTANCIA, TIEMPOS } from '../config.js';
import { TAREAS, PASADIZOS, FUSIBLES, salaEn, SALAS } from '../mundo/mapa.js';
import { buscarCamino, casillaCercana, hayLinea } from '../mundo/colision.js';

const DIR = { abajo: 0, arriba: 1, izquierda: 2, derecha: 3 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];
const normalizar = (t) =>
  String(t)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const NOMBRES_BOT = ['Ana', 'Luis', 'Sofi', 'Pablo', 'Vale', 'Diego', 'Majo', 'Hugo', 'Lupe', 'Toño', 'Rita', 'Beto'];

const SALAS_INTERIORES = SALAS.filter((s) => s.nombre !== 'Pasillo');
const ARTICULO = { Biblioteca: 'la', Dormitorio: 'el', Baño: 'el', Pasillo: 'el', Cocina: 'la', Sala: 'la', Comedor: 'el', Jardín: 'el' };
export const conArticulo = (sala) => `${ARTICULO[sala] || 'la'} ${String(sala).toLowerCase()}`;

export default class Bots {
  constructor(partida) {
    this.partida = partida;
    this.estado = new Map();
  }

  get bots() {
    return this.partida.lista.filter((j) => j.bot && !j.desconectado);
  }

  iniciar() {
    for (const j of this.bots) {
      this.estado.set(j.id, {
        ruta: [],
        meta: null,
        espera: Math.random() * 1.5,
        alEsperar: null,
        pensar: Math.random() * 0.3,
        vistos: new Map(),
        testigo: null,
        cazando: null,
        repath: 0,
        tareasFalsas: [...j.tareas],
        agenda: []
      });
    }
  }

  vision(j) {
    if (!j.vivo) return 999;
    if (j.rol === 'asesino') return VISION.asesino;
    return this.partida.luces.apagadas ? VISION.apagon + 10 : VISION.inocente;
  }

  puedeVer(j, otro) {
    // Un fantasma invisible solo lo ve su cómplice
    if (otro.invisible > 0 && j.vivo && !(j.rol === 'asesino' && otro.rol === 'asesino')) return false;
    return dist(j, otro) <= this.vision(j) && hayLinea(j.x, j.y, otro.x, otro.y);
  }

  irA(j, e, x, y, meta) {
    const desde = casillaCercana(j.x, j.y);
    const hasta = casillaCercana(x, y);
    e.ruta = buscarCamino(desde, hasta).map((c) => ({ x: c.tx * TILE + TILE / 2, y: c.ty * TILE + TILE / 2 + 4 }));
    if (e.ruta.length) e.ruta[e.ruta.length - 1] = { x, y };
    e.meta = meta;
  }

  // ---------- Juego ----------

  actualizar(dt) {
    for (const j of this.bots) {
      const e = this.estado.get(j.id);
      if (!e) continue;
      // Ángel muerto: de vez en cuando protege a un inocente vivo
      if (!j.vivo && j.subrol === 'angel' && j.cdEscudo <= 0 && Math.random() < dt * 0.15) {
        const vivos = this.partida.lista.filter((o) => o.vivo && !o.desconectado && o.rol === 'inocente');
        if (vivos.length) this.partida.recibir(j.id, { t: 'escudo', objetivo: elegir(vivos).id });
      }
      e.pensar -= dt;
      if (e.pensar <= 0) {
        e.pensar = 0.3;
        if (j.vivo) this.percibir(j, e);
      }
      if (e.espera > 0) {
        e.espera -= dt;
        j.mov = false;
        if (e.espera <= 0 && e.alEsperar) {
          const f = e.alEsperar;
          e.alEsperar = null;
          f();
        }
        continue;
      }
      if (e.cazando) this.perseguir(j, e, dt);
      if (!e.ruta.length) this.elegirMeta(j, e);
      this.avanzar(j, e, dt);
    }
  }

  avanzar(j, e, dt) {
    if (!e.ruta.length) {
      j.mov = false;
      return;
    }
    const vel = (j.vivo ? VELOCIDAD : VELOCIDAD_FANTASMA) * this.partida.velocidad * dt;
    let restante = vel;
    while (restante > 0 && e.ruta.length) {
      const p = e.ruta[0];
      const dx = p.x - j.x;
      const dy = p.y - j.y;
      const d = Math.hypot(dx, dy);
      if (d <= restante) {
        j.x = p.x;
        j.y = p.y;
        restante -= d;
        e.ruta.shift();
      } else {
        j.x += (dx / d) * restante;
        j.y += (dy / d) * restante;
        restante = 0;
      }
      if (Math.abs(dx) > Math.abs(dy)) j.dir = dx > 0 ? DIR.derecha : DIR.izquierda;
      else if (d > 0.01) j.dir = dy > 0 ? DIR.abajo : DIR.arriba;
    }
    j.mov = true;
    if (!e.ruta.length) this.llegar(j, e);
  }

  llegar(j, e) {
    const meta = e.meta;
    e.meta = null;
    j.mov = false;
    if (!meta) return;
    const p = this.partida;
    switch (meta.tipo) {
      case 'tarea':
        j.dir = DIR.arriba;
        e.espera = TIEMPOS.tarea + 0.5 + Math.random() * 2.5;
        e.alEsperar = () => {
          if (j.subrol === 'camarografo' && !j.camaraPuesta && p.ahora > 20 && Math.random() < 0.5) p.recibir(j.id, { t: 'camara' });
          if (j.rol === 'inocente') p.recibir(j.id, { t: 'tarea', tarea: meta.id });
          else e.tareasFalsas = e.tareasFalsas.filter((id) => id !== meta.id);
        };
        break;
      case 'reportar':
        p.recibir(j.id, { t: 'reportar' });
        break;
      case 'camara':
        p.recibir(j.id, { t: 'recoger' });
        break;
      case 'fusibles':
        e.espera = TIEMPOS.arreglarLuces + 0.2;
        e.alEsperar = () => p.recibir(j.id, { t: 'arreglar' });
        break;
      case 'pasadizo':
        p.recibir(j.id, { t: 'pasadizo', i: meta.i });
        e.espera = 0.6;
        break;
      default:
        e.espera = 0.5 + Math.random() * 2.5;
    }
  }

  elegirMeta(j, e) {
    if (j.rol === 'inocente') {
      const pendientes = j.tareas.filter((id) => !j.hechas.has(id)).map((id) => TAREAS.find((t) => t.id === id));
      if (pendientes.length && Math.random() < 0.8) {
        pendientes.sort((a, b) => dist(j, a) - dist(j, b));
        const t = Math.random() < 0.7 ? pendientes[0] : elegir(pendientes);
        this.irA(j, e, t.x, t.y, { tipo: 'tarea', id: t.id });
        return;
      }
    } else if (j.vivo && e.tareasFalsas.length && Math.random() < 0.7) {
      const id = elegir(e.tareasFalsas);
      const t = TAREAS.find((x) => x.id === id);
      this.irA(j, e, t.x, t.y, { tipo: 'tarea', id: t.id });
      return;
    }
    // Pasear por una sala al azar
    const sala = elegir(SALAS_INTERIORES);
    const t = elegir(TAREAS.filter((x) => x.sala === sala.nombre)) || elegir(TAREAS);
    this.irA(j, e, t.x + (Math.random() - 0.5) * 16, t.y, { tipo: 'pasear' });
  }

  percibir(j, e) {
    const p = this.partida;
    const ahora = p.ahora;
    e.salaActual = salaEn(j.x, j.y);
    for (const o of p.lista) {
      if (o.id === j.id || !o.vivo || o.desconectado) continue;
      // Se recuerda la apariencia: un asesino disfrazado engaña a los testigos
      if (this.puedeVer(j, o)) e.vistos.set(p.apariencia(o), { sala: salaEn(o.x, o.y), t: ahora });
    }

    // Cuerpos a la vista
    if (!e.meta || e.meta.tipo !== 'reportar') {
      const cuerpo = p.cuerpos.find((c) => this.puedeVer(j, c));
      if (cuerpo) {
        const reporta = j.rol === 'inocente' || (Math.random() < 0.08 && !e.cazando);
        if (reporta) {
          e.cazando = null;
          e.espera = 0;
          e.alEsperar = null;
          this.irA(j, e, cuerpo.x, cuerpo.y + 6, { tipo: 'reportar' });
          return;
        }
      }
    }

    // Cámara visible: cualquiera la recoge (el asesino para esconder la foto)
    const cam = p.camara;
    if (cam && cam.visible && (!e.meta || e.meta.tipo !== 'camara') && !e.cazando && this.puedeVer(j, cam) && Math.random() < 0.4) {
      e.espera = 0;
      e.alEsperar = null;
      this.irA(j, e, cam.x, cam.y, { tipo: 'camara' });
      return;
    }

    if (j.rol === 'inocente') {
      if (p.luces.apagadas && !e.meta?.tipo?.startsWith('fus') && Math.random() < 0.08) {
        e.espera = 0;
        e.alEsperar = null;
        this.irA(j, e, FUSIBLES.x, FUSIBLES.y, { tipo: 'fusibles' });
      }
      return;
    }

    // ---- Asesino ----
    if (!j.vivo) return;
    if (j.cdSabotaje <= 0 && !p.luces.apagadas && Math.random() < 0.03) p.recibir(j.id, { t: 'sabotaje' });
    if (j.cdMatar > 0 || e.cazando) return;
    const victimas = p.lista.filter((o) => o.vivo && !o.infectado && !o.desconectado && o.rol === 'inocente' && dist(j, o) < 130 && this.puedeVer(j, o));
    for (const v of victimas) {
      const testigos = p.lista.filter(
        (o) =>
          o.vivo &&
          !o.desconectado &&
          o.id !== v.id &&
          o.rol === 'inocente' &&
          (dist(o, v) < VISION.inocente + 10 || dist(o, j) < VISION.inocente + 10)
      );
      if (!testigos.length && Math.random() < 0.2) {
        if (j.subrol === 'cambiaformas' && j.cdDisfraz <= 0 && !j.disfraz && Math.random() < 0.6) {
          const otros = p.lista.filter((o) => o.vivo && !o.desconectado && o.id !== v.id && o.id !== j.id && o.rol === 'inocente');
          if (otros.length) p.recibir(j.id, { t: 'disfraz', objetivo: elegir(otros).id });
        }
        if (j.subrol === 'fantasma' && j.cdInvisible <= 0 && !j.invisible) p.recibir(j.id, { t: 'invisible' });
        e.cazando = v.id;
        e.repath = 0;
        e.espera = 0;
        e.alEsperar = null;
        return;
      }
    }
  }

  perseguir(j, e, dt) {
    const p = this.partida;
    const v = p.jugadores.get(e.cazando);
    if (!v || !v.vivo || j.cdMatar > 0) {
      e.cazando = null;
      return;
    }
    if (dist(j, v) <= DISTANCIA.matar - 4) {
      p.recibir(j.id, { t: 'matar', victima: v.id });
      e.cazando = null;
      this.huir(j, e);
      return;
    }
    e.repath -= dt;
    if (e.repath <= 0) {
      e.repath = 0.4;
      const testigo = p.lista.some((o) => o.vivo && o.rol === 'inocente' && o.id !== v.id && this.puedeVer(o, j));
      if (testigo && Math.random() < 0.5) {
        e.cazando = null;
        e.ruta = [];
        return;
      }
      this.irA(j, e, v.x, v.y, { tipo: 'cazar' });
    }
  }

  huir(j, e) {
    const cerca = PASADIZOS.findIndex((pz) => dist(pz, j) < 70);
    if (cerca >= 0 && Math.random() < 0.6) {
      this.irA(j, e, PASADIZOS[cerca].x, PASADIZOS[cerca].y, { tipo: 'pasadizo', i: cerca });
      return;
    }
    const lejos = TAREAS.filter((t) => dist(t, j) > 160);
    const t = elegir(lejos.length ? lejos : TAREAS);
    this.irA(j, e, t.x, t.y, { tipo: 'pasear' });
  }

  alMatar(asesino, victima) {
    for (const j of this.bots) {
      if (!j.vivo || j.rol !== 'inocente' || j.id === victima.id) continue;
      const e = this.estado.get(j.id);
      const veAsesino = this.puedeVer(j, asesino);
      if (veAsesino || this.puedeVer(j, victima)) {
        const visto = this.partida.apariencia(asesino);
        e.testigo = veAsesino && visto !== victima.id && visto !== j.id ? { asesino: visto, victima: victima.id } : null;
        if (Math.random() < 0.85) {
          e.espera = 0.4;
          e.alEsperar = null;
          this.irA(j, e, victima.x, victima.y + 6, { tipo: 'reportar' });
        }
      }
    }
  }

  // ---------- Reuniones ----------

  alReunion(reunion) {
    const p = this.partida;
    this.acusaciones = new Map();
    for (const j of this.bots) {
      const e = this.estado.get(j.id);
      e.ruta = [];
      e.meta = null;
      e.espera = 0;
      e.alEsperar = null;
      e.cazando = null;
      e.agenda = [];
      if (!j.vivo) continue;
      if (j.foto && j.rol === 'inocente') e.agenda.push({ t: TIEMPOS.reunion - 3, f: () => p.recibir(j.id, { t: 'mostrarFoto' }) });
      const decir = (t, texto) => e.agenda.push({ t: TIEMPOS.reunion - t, f: () => p.recibir(j.id, { t: 'chat', texto }) });
      const nombre = (id) => p.jugadores.get(id)?.nombre || '?';
      const victima = reunion.victima ? nombre(reunion.victima) : null;

      if (j.rol === 'inocente') {
        if (e.testigo && p.jugadores.get(e.testigo.asesino)?.vivo) {
          decir(2 + Math.random() * 3, `¡Vi a ${nombre(e.testigo.asesino)} matar a ${nombre(e.testigo.victima)}!`);
          decir(9 + Math.random() * 5, `Fue ${nombre(e.testigo.asesino)}. ¡Voten por ${nombre(e.testigo.asesino)}!`);
        } else if (reunion.quien === j.id && victima) {
          decir(2 + Math.random() * 2, `Encontré a ${victima} en ${conArticulo(reunion.sala)}.`);
          const sospechoso = this.sospechosoCerca(j, e, reunion.sala);
          if (sospechoso) decir(7 + Math.random() * 4, `Vi a ${nombre(sospechoso)} cerca de ${conArticulo(reunion.sala)} hace poco.`);
          else decir(7 + Math.random() * 4, '¿Quién estaba por ahí?');
        } else if (reunion.quien === j.id) {
          decir(2, 'Toqué la campana. ¿Alguien vio algo raro?');
        } else if (Math.random() < 0.65) {
          const sospechoso = reunion.sala ? this.sospechosoCerca(j, e, reunion.sala) : null;
          if (sospechoso && Math.random() < 0.6) decir(5 + Math.random() * 12, `${nombre(sospechoso)} estaba cerca de ${conArticulo(reunion.sala)}...`);
          else
            decir(
              4 + Math.random() * 14,
              elegir([`Yo estaba en ${conArticulo(e.salaActual || 'Sala')} haciendo tareas.`, 'No vi nada raro.', 'No sé quién fue.', 'Hmm... qué sospechoso.', `Estuve en ${conArticulo(e.salaActual || 'Sala')} todo el rato.`])
            );
        }
      } else {
        if (Math.random() < 0.7) decir(5 + Math.random() * 12, elegir([`Yo estaba en ${this.salaFalsa(reunion.sala)}.`, 'Yo no vi nada.', 'Estaba haciendo mis tareas.', '¿Y si fue alguien del jardín?']));
      }
      e.agenda.push({ t: TIEMPOS.reunion - (14 + Math.random() * 22), f: () => this.decidirVoto(j, e, reunion) });
    }
  }

  salaFalsa(salaCuerpo) {
    const opciones = SALAS_INTERIORES.filter((s) => s.nombre !== salaCuerpo);
    return conArticulo(elegir(opciones).nombre);
  }

  sospechosoCerca(j, e, sala) {
    const ahora = this.partida.ahora;
    let mejor = null;
    for (const [id, v] of e.vistos) {
      const o = this.partida.jugadores.get(id);
      if (!o || !o.vivo || id === j.id) continue;
      if (v.sala === sala && ahora - v.t < 35 && (!mejor || v.t > mejor.t)) mejor = { id, t: v.t };
    }
    return mejor ? mejor.id : null;
  }

  // Foto de la cámara mostrada en la reunión: pesa mucho en el voto
  alFoto(foto) {
    if (!this.acusaciones) this.acusaciones = new Map();
    if (foto && foto.asesino) this.acusaciones.set(foto.asesino, (this.acusaciones.get(foto.asesino) || 0) + 6);
  }

  alChat(autor, texto) {
    if (!this.acusaciones) this.acusaciones = new Map();
    const t = normalizar(texto);
    const acusa = /(vi a|fue|asesin|sospech|mat|culpable|voten|vot)/.test(t);
    const defensa = /(no fui|no soy|inocente)/.test(t);
    for (const o of this.partida.lista) {
      if (o.id === autor.id || !o.vivo) continue;
      const nombre = normalizar(o.nombre);
      if (nombre.length < 2 || !t.includes(nombre)) continue;
      if (acusa && !defensa) this.acusaciones.set(o.id, (this.acusaciones.get(o.id) || 0) + (/vi a .* mat/.test(t) ? 3 : 1));
      // Si alguien acusa a un bot asesino, este se defiende
      if (o.bot && o.rol === 'asesino' && acusa) {
        const e = this.estado.get(o.id);
        if (e && !e.defendido) {
          e.defendido = true;
          const p = this.partida;
          e.agenda.push({
            t: p.reunion.tiempo - (2 + Math.random() * 3),
            f: () => p.recibir(o.id, { t: 'chat', texto: elegir(['¡No fui yo!', `Mentira, ${autor.nombre} es el sospechoso.`, '¡Yo estaba haciendo tareas!']) })
          });
          this.acusaciones.set(autor.id, (this.acusaciones.get(autor.id) || 0) + 0.5);
        }
      }
    }
  }

  decidirVoto(j, e, reunion) {
    const p = this.partida;
    const vivos = p.lista.filter((o) => o.vivo && !o.desconectado && o.id !== j.id);
    const puntos = new Map(vivos.map((o) => [o.id, (this.acusaciones.get(o.id) || 0) * 1.5 + Math.random()]));
    if (j.rol === 'inocente') {
      if (e.testigo && puntos.has(e.testigo.asesino)) puntos.set(e.testigo.asesino, 100);
      if (reunion.sala) {
        const s = this.sospechosoCerca(j, e, reunion.sala);
        if (s && puntos.has(s)) puntos.set(s, puntos.get(s) + 2);
      }
    } else {
      for (const o of vivos) if (o.rol === 'asesino') puntos.delete(o.id);
    }
    let mejor = null;
    for (const [id, n] of puntos) if (!mejor || n > mejor.n) mejor = { id, n };
    const umbral = j.rol === 'asesino' ? 2.5 : 3;
    const objetivo = mejor && mejor.n >= umbral ? mejor.id : Math.random() < 0.12 && mejor ? mejor.id : 'saltar';
    p.recibir(j.id, { t: 'votar', objetivo });
  }

  actualizarReunion() {
    const p = this.partida;
    for (const j of this.bots) {
      const e = this.estado.get(j.id);
      if (!e || !e.agenda.length) continue;
      const listos = e.agenda.filter((a) => p.reunion && p.reunion.tiempo <= a.t);
      e.agenda = e.agenda.filter((a) => !listos.includes(a));
      for (const a of listos) if (p.fase === 'reunion') a.f();
    }
  }

  alReanudar() {
    for (const j of this.bots) {
      const e = this.estado.get(j.id);
      if (!e) continue;
      e.testigo = null;
      e.defendido = false;
      e.agenda = [];
      e.ruta = [];
      e.espera = 0.5 + Math.random();
    }
  }
}
