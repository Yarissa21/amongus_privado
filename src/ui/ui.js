import { COLORES, TIEMPOS, MIN_JUGADORES, MAX_JUGADORES, ROLES } from '../config.js';
import { TAREAS } from '../mundo/mapa.js';
import { retrato } from '../graficos/personajes.js';
import { conArticulo } from '../logica/bots.js';
import { sonar, alternarSonido, sonidoActivo } from './sonido.js';
import Minijuegos from './minijuegos.js';
import Mapa from './mapa.js';
import { alternarMusica, musicaActiva } from './musica.js';

const $ = (id) => document.getElementById(id);
const PANTALLAS = ['menu', 'ayuda', 'sala', 'hud', 'cartel', 'reunion', 'fin'];
const retratos = new Map();

export function imagenRetrato(color) {
  if (!retratos.has(color)) retratos.set(color, retrato(color, 4));
  return retratos.get(color);
}

function img(color) {
  const i = document.createElement('img');
  i.src = imagenRetrato(color);
  i.alt = '';
  return i;
}

function escapar(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const leer = (k, def) => {
  try {
    return localStorage.getItem(k) ?? def;
  } catch {
    return def;
  }
};
const guardar = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
};

export default class UI {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.estadoAcciones = {};
    this.temporizadores = [];
    this.minijuegos = new Minijuegos();
    this.mapa = new Mapa(ctrl);
    // Tocar el cartel lo cierra (y deja moverse de inmediato)
    $('cartel').onclick = () => {
      $('cartel').hidden = true;
      clearTimeout(this.tCartel);
      const escena = this.ctrl.escena;
      if (escena && escena.enJuego) escena.bloqueadoHasta = 0;
    };
    this.prepararMenu();
    this.prepararSala();
    this.prepararHud();
    this.prepararReunion();
    this.prepararFin();
  }

  mostrar(...visibles) {
    for (const id of PANTALLAS) $(id).hidden = !visibles.includes(id);
  }

  esperar(f, ms) {
    const t = setTimeout(f, ms);
    this.temporizadores.push(t);
    return t;
  }

  cancelarTemporizadores() {
    this.temporizadores.forEach(clearTimeout);
    this.temporizadores = [];
  }

  // ---------- Menú ----------

  prepararMenu() {
    const nombre = $('menu-nombre');
    nombre.value = leer('mm-nombre', '');
    const bots = $('menu-bots');
    for (let n = MIN_JUGADORES - 1; n < MAX_JUGADORES; n++) bots.add(new Option(String(n), String(n)));
    bots.value = leer('mm-bots', '5');
    const tomarNombre = () => {
      const v = nombre.value.trim();
      if (!v) {
        this.estadoMenu('Escribe tu nombre primero');
        nombre.focus();
        return null;
      }
      guardar('mm-nombre', v);
      return v;
    };
    $('menu-solo').onclick = () => {
      const n = tomarNombre();
      if (!n) return;
      guardar('mm-bots', bots.value);
      sonar('click');
      this.ctrl.jugarSolo(n, +bots.value);
    };
    $('menu-crear').onclick = async () => {
      const n = tomarNombre();
      if (!n) return;
      sonar('click');
      this.estadoMenu('Creando sala...', true);
      try {
        await this.ctrl.crearSala(n);
        this.estadoMenu('');
      } catch (e) {
        this.estadoMenu(e.message);
      }
    };
    const unirse = async () => {
      const n = tomarNombre();
      if (!n) return;
      const codigo = $('menu-codigo').value.trim().toUpperCase();
      if (codigo.length !== 4) {
        this.estadoMenu('El código tiene 4 letras');
        return;
      }
      sonar('click');
      this.estadoMenu('Conectando...', true);
      try {
        await this.ctrl.unirse(codigo, n);
        this.estadoMenu('');
      } catch (e) {
        this.estadoMenu(e.message);
      }
    };
    $('menu-unirse').onclick = unirse;
    $('menu-codigo').onkeydown = (e) => {
      if (e.key === 'Enter') unirse();
    };
    $('menu-ayuda').onclick = () => this.mostrar('ayuda');
    $('ayuda-cerrar').onclick = () => this.mostrar('menu');
    const params = new URLSearchParams(location.search);
    if (params.get('sala')) $('menu-codigo').value = params.get('sala').toUpperCase().slice(0, 4);
  }

  estadoMenu(texto, neutral = false) {
    const e = $('menu-estado');
    e.textContent = texto;
    e.style.color = neutral ? '#686878' : '';
  }

  mostrarMenu(aviso = '') {
    this.minijuegos.cerrar(false);
    this.mapa.cerrar();
    this.cancelarTemporizadores();
    this.mostrar('menu');
    this.estadoMenu(aviso);
  }

  // ---------- Sala de espera ----------

  prepararSala() {
    $('sala-mas-bot').onclick = () => this.ctrl.agregarBot();
    $('sala-menos-bot').onclick = () => this.ctrl.quitarBot();
    $('sala-iniciar').onclick = () => this.ctrl.iniciarPartida();
    $('sala-salir').onclick = () => this.ctrl.salir();
  }

  mostrarSala(red) {
    this.mostrar('sala');
    $('sala-codigo').textContent = red.codigo;
    $('sala-titulo').textContent = red.local ? 'Partida con bots' : 'Sala de espera';
    $('sala-codigo-fila').hidden = !!red.local;
    $('sala-ayuda').hidden = !!red.local;
    $('sala-anfitrion').hidden = !red.esAnfitrion;
    $('sala-espera').hidden = red.esAnfitrion;
    const lista = $('sala-jugadores');
    lista.innerHTML = '';
    for (const j of red.jugadores) {
      const li = document.createElement('li');
      li.appendChild(img(j.color));
      const span = document.createElement('span');
      span.textContent = j.nombre;
      li.appendChild(span);
      if (j.bot) li.insertAdjacentHTML('beforeend', '<span class="etiqueta">BOT</span>');
      if (j.id === red.miId) li.insertAdjacentHTML('beforeend', '<span class="etiqueta" style="background:#4878d0">TÚ</span>');
      lista.appendChild(li);
    }
    const colores = $('sala-colores');
    colores.innerHTML = '';
    const mio = red.jugadores.find((j) => j.id === red.miId);
    COLORES.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'color';
      b.style.background = c.ropa;
      b.title = c.nombre;
      const usado = red.jugadores.some((j) => j.color === i && j.id !== red.miId);
      if (usado) b.classList.add('usado');
      if (mio && mio.color === i) b.classList.add('mio');
      b.onclick = () => {
        if (!usado) red.elegirColor(i);
      };
      colores.appendChild(b);
    });
    this.dibujarAjustes(red);
    const n = red.jugadores.length;
    $('sala-iniciar').disabled = n < MIN_JUGADORES;
    $('sala-mas-bot').disabled = n >= MAX_JUGADORES;
    $('sala-menos-bot').disabled = !red.jugadores.some((j) => j.bot);
    $('sala-estado').textContent = n < MIN_JUGADORES ? `Se necesitan al menos ${MIN_JUGADORES} jugadores (agrega bots)` : '';
    $('sala-estado').style.color = '#686878';
  }

  // Ajustes de la partida: solo el anfitrión puede cambiarlos, el resto los ve.
  dibujarAjustes(red) {
    const cont = $('sala-ajustes');
    cont.innerHTML = '';
    const editable = red.esAnfitrion;
    const fila = (etiqueta, valor, menos, mas, ayuda = '') => {
      const d = document.createElement('div');
      d.className = 'ajuste';
      if (ayuda) d.title = ayuda;
      const nombre = document.createElement('span');
      nombre.className = 'ajuste-nombre';
      nombre.innerHTML = etiqueta;
      d.appendChild(nombre);
      const paso = document.createElement('div');
      paso.className = 'paso';
      const bMenos = document.createElement('button');
      bMenos.textContent = '−';
      bMenos.disabled = !editable;
      bMenos.onclick = menos;
      const b = document.createElement('b');
      b.textContent = valor;
      const bMas = document.createElement('button');
      bMas.textContent = '+';
      bMas.disabled = !editable;
      bMas.onclick = mas;
      paso.append(bMenos, b, bMas);
      d.appendChild(paso);
      cont.appendChild(d);
    };
    const c = red.config;
    fila('Asesinos', String(c.asesinos), () => this.ctrl.alternarAsesinos(), () => this.ctrl.alternarAsesinos(), 'Con 2 asesinos se necesitan al menos 7 jugadores');
    fila('Velocidad', `${c.velocidad}x`, () => this.ctrl.cambiarVelocidad(-1), () => this.ctrl.cambiarVelocidad(1), 'Velocidad de caminado de todos');
    const titulo = document.createElement('div');
    titulo.className = 'ajuste-titulo';
    titulo.textContent = 'Roles especiales (probabilidad)';
    cont.appendChild(titulo);
    for (const [id, r] of Object.entries(ROLES)) {
      const equipo = r.equipo === 'asesino' ? '<i class="etiqueta etiqueta-roja">Asesino</i>' : '<i class="etiqueta etiqueta-verde">Inocente</i>';
      fila(`${escapar(r.nombre)} ${equipo}`, `${c.roles?.[id] ?? r.probabilidad}%`, () => this.ctrl.cambiarProbabilidad(id, -10), () => this.ctrl.cambiarProbabilidad(id, 10), r.descripcion);
    }
  }

  // ---------- HUD ----------

  prepararHud() {
    document.querySelectorAll('.accion').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.ctrl.accion(b.dataset.accion);
      });
    });
    // Panel de tareas plegable (en pantallas bajas empieza plegado)
    let plegado = leer('mm-tareas-plegadas', window.innerHeight < 500 ? '1' : '0') === '1';
    const aplicarPlegado = () => {
      $('caja-tareas').classList.toggle('plegada', plegado);
      $('hud-plegar-icono').textContent = plegado ? '▸' : '▾';
    };
    aplicarPlegado();
    $('hud-plegar').onclick = () => {
      plegado = !plegado;
      guardar('mm-tareas-plegadas', plegado ? '1' : '0');
      aplicarPlegado();
    };
    $('hud-libreta').onclick = () => {
      const escena = this.ctrl.escena;
      if (escena && escena.enJuego) this.abrirLibreta(escena.casos);
    };
    document.querySelectorAll('[data-pasadizo]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.ctrl.accion(b.dataset.pasadizo);
      });
    });
    const sonido = $('hud-sonido');
    sonido.classList.toggle('apagado', !sonidoActivo());
    sonido.onclick = () => sonido.classList.toggle('apagado', !alternarSonido());
    const musica = $('hud-musica');
    musica.classList.toggle('apagado', !musicaActiva());
    musica.onclick = () => musica.classList.toggle('apagado', !alternarMusica());

    const zona = $('joystick');
    const base = zona.querySelector('.joystick-base');
    const palanca = zona.querySelector('.joystick-palanca');
    let origen = null;
    const soltar = () => {
      origen = null;
      palanca.style.transform = '';
      this.ctrl.joystick(0, 0);
    };
    zona.addEventListener('pointerdown', (e) => {
      origen = { x: e.clientX, y: e.clientY, id: e.pointerId };
      const r = zona.getBoundingClientRect();
      base.style.left = `${e.clientX - r.left - 55}px`;
      base.style.top = `${e.clientY - r.top - 55}px`;
      base.style.bottom = 'auto';
      zona.setPointerCapture(e.pointerId);
    });
    zona.addEventListener('pointermove', (e) => {
      if (!origen || e.pointerId !== origen.id) return;
      let dx = e.clientX - origen.x;
      let dy = e.clientY - origen.y;
      const d = Math.hypot(dx, dy);
      const max = 40;
      if (d > max) {
        dx = (dx / d) * max;
        dy = (dy / d) * max;
      }
      palanca.style.transform = `translate(${dx}px, ${dy}px)`;
      // Pasada la mitad del recorrido se camina a velocidad completa
      const fuerza = Math.min(1, d / max);
      const k = d < 6 ? 0 : fuerza > 0.5 ? 1 / fuerza : 1;
      this.ctrl.joystick((dx / max) * k, (dy / max) * k);
    });
    zona.addEventListener('pointerup', soltar);
    zona.addEventListener('pointercancel', soltar);
    this.esTactil = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  mostrarHud() {
    this.estadoAcciones = {};
    this.firmaTareas = '';
    $('joystick').hidden = !this.esTactil;
    $('hud-aviso').hidden = true;
  }

  actualizarAcciones(estado) {
    for (const [nombre, e] of Object.entries(estado)) {
      const firma = JSON.stringify(e);
      if (this.estadoAcciones[nombre] === firma) continue;
      this.estadoAcciones[nombre] = firma;
      const b = document.querySelector(`.accion[data-accion="${nombre}"]`);
      if (e.visible === false) {
        b.hidden = true;
        continue;
      }
      b.hidden = false;
      b.disabled = !e.activo;
      if (e.texto) b.querySelector('.nombre').textContent = e.texto;
      b.querySelector('.cd').textContent = e.cd === undefined || e.cd === '' ? '' : String(e.cd);
    }
  }

  actualizarTareas(yo, estado) {
    const firma = `${yo.rol}|${yo.subrol}|${yo.vivo}|${[...yo.hechas].join(',')}|${estado.progreso}|${JSON.stringify(yo.casos || [])}`;
    if (firma === this.firmaTareas) return;
    this.firmaTareas = firma;
    const especial = yo.subrol && ROLES[yo.subrol];
    const rolHud = $('hud-rol-especial');
    rolHud.hidden = !especial;
    if (especial) {
      rolHud.className = `rol-especial ${yo.rol === 'asesino' ? 'rol-asesino' : 'rol-inocente'}`;
      $('hud-rol-nombre').textContent = especial.nombre;
      $('hud-rol-uso').textContent = especial.uso;
      rolHud.title = especial.descripcion;
    }
    const titulo = $('hud-rol');
    titulo.className = 'tareas-titulo';
    if (yo.rol === 'asesino') {
      titulo.textContent = yo.vivo ? 'Asesino · Tareas falsas' : 'Asesino (fantasma)';
      titulo.classList.add('asesino');
    } else titulo.textContent = yo.vivo ? 'Tus tareas' : 'Fantasma · Tareas';
    const ul = $('hud-tareas');
    ul.innerHTML = '';
    for (const id of yo.tareas) {
      const t = TAREAS.find((x) => x.id === id);
      const li = document.createElement('li');
      li.innerHTML = `${escapar(t.nombre)} <span class="sala">· ${escapar(t.sala)}</span>`;
      if (yo.hechas.has(id)) li.className = 'hecha';
      ul.appendChild(li);
    }
    // Libreta del detective: botón con el número de casos
    const libreta = $('hud-libreta');
    libreta.hidden = yo.subrol !== 'detective';
    libreta.textContent = `📓 Libreta (L) · ${(yo.casos || []).length}/3`;
    if (this.minijuegos.abierto && this.minijuegos.id === 'libreta') this.abrirLibreta(yo.casos);
    $('hud-progreso').style.width = `${Math.round(estado.progreso * 100)}%`;
  }

  mostrarLugar(sala) {
    const l = $('hud-lugar');
    l.textContent = sala;
    l.classList.add('visible');
    clearTimeout(this.tLugar);
    this.tLugar = setTimeout(() => l.classList.remove('visible'), 1800);
  }

  aviso(texto, ms = 3000) {
    const a = $('hud-aviso');
    a.textContent = texto;
    a.hidden = false;
    clearTimeout(this.tAviso);
    if (ms) this.tAviso = setTimeout(() => (a.hidden = true), ms);
  }

  ocultarAviso() {
    clearTimeout(this.tAviso);
    $('hud-aviso').hidden = true;
  }

  // ---------- Carteles ----------

  cartel({ sub = '', titulo = '', clase = '', colores = [], texto = '', rol = null }, ms) {
    const caja = $('cartel-rol');
    caja.hidden = !rol;
    if (rol) {
      $('cartel-rol-desc').textContent = rol.descripcion;
      $('cartel-rol-uso').textContent = rol.uso;
      $('cartel-rol-uso').hidden = !rol.uso;
    }
    $('cartel-sub').textContent = sub;
    const t = $('cartel-titulo');
    t.textContent = titulo;
    t.className = `cartel-titulo ${clase}`;
    const r = $('cartel-retratos');
    r.innerHTML = '';
    colores.forEach((c) => r.appendChild(img(c)));
    $('cartel-texto').textContent = texto;
    $('cartel').hidden = false;
    const c = $('cartel').querySelector('.cartel');
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = '';
    clearTimeout(this.tCartel);
    if (ms) this.tCartel = setTimeout(() => ($('cartel').hidden = true), ms);
  }

  // Presentación del rol al empezar: equipo, rol especial (en grande), qué hace y cómo se usa.
  mostrarRol(datos, jugadores) {
    const yo = jugadores.get(datos.miId);
    const especial = datos.subrol && ROLES[datos.subrol];
    const asesino = datos.rol === 'asesino';
    let mision;
    if (asesino) {
      const compas = datos.companeros.map((id) => jugadores.get(id));
      mision = compas.length
        ? `Tu cómplice: ${compas.map((c) => c.nombre + (datos.subrolesCompaneros && ROLES[datos.subrolesCompaneros[c.id]] ? ` (${ROLES[datos.subrolesCompaneros[c.id]].nombre})` : '')).join(', ')}. Elimina a los inocentes sin que te descubran.`
        : 'Elimina a los inocentes sin que te descubran. Usa los pasadizos secretos y apaga las luces.';
    } else {
      const n = [...jugadores.values()].length;
      mision = `Hay ${datos.numAsesinos > 1 ? `${datos.numAsesinos} asesinos` : 'un asesino'} entre los ${n} de la casa. Haz tus tareas y descúbrelo.`;
    }
    const compas = asesino ? datos.companeros.map((id) => jugadores.get(id).color) : [];
    this.cartel(
      {
        sub: asesino ? 'Eres ASESINO' : 'Eres INOCENTE',
        titulo: especial ? especial.nombre.toUpperCase() : asesino ? 'ASESINO' : 'INOCENTE',
        clase: asesino ? 'rojo' : 'verde',
        colores: [yo.color, ...compas],
        texto: mision,
        rol: especial ? { descripcion: especial.descripcion, uso: especial.uso } : { descripcion: 'Sin rol especial esta partida.', uso: '' }
      },
      TIEMPOS.revelarRol * 1000
    );
  }

  // ---------- Reunión ----------

  prepararReunion() {
    $('reunion-form').onsubmit = (e) => {
      e.preventDefault();
      const entrada = $('reunion-entrada');
      const texto = entrada.value.trim();
      if (!texto) return;
      this.ctrl.enviar({ t: 'chat', texto });
      entrada.value = '';
    };
    $('reunion-votar').onclick = () => {
      if (!this.reunion || !this.reunion.elegido || this.reunion.votado) return;
      this.votar(this.reunion.elegido);
    };
    $('reunion-saltar').onclick = () => {
      if (!this.reunion || this.reunion.votado) return;
      this.votar('saltar');
    };
    $('reunion-veredicto').onclick = () => {
      const r = this.reunion;
      if (!r || !r.elegido || r.votado || !r.abierta) return;
      r.votado = true;
      r.juez = false;
      this.ctrl.enviar({ t: 'veredicto', objetivo: r.elegido });
      sonar('expulsar');
      this.refrescarBotonesVoto();
    };
    $('reunion-foto').onclick = () => {
      $('reunion-foto').hidden = true;
      this.ctrl.enviar({ t: 'mostrarFoto' });
    };
  }

  votar(objetivo) {
    this.reunion.votado = true;
    this.ctrl.enviar({ t: 'votar', objetivo });
    sonar('voto');
    this.refrescarBotonesVoto();
  }

  abrirReunion(msg, jugadores, miId, companeros, extras = {}) {
    sonar('reunion');
    const nombre = (id) => (jugadores.get(id) ? jugadores.get(id).nombre : '?');
    const vivos = new Set(msg.vivos);
    this.reunion = { vivos, jugadores, miId, elegido: null, votado: false, votaron: new Set(), inicio: Date.now(), duracion: msg.duracion, companeros, juez: !!extras.juez && vivos.has(miId) };
    this.mapa.cerrar();
    $('reunion-foto').hidden = !(extras.foto && vivos.has(miId));
    this.mostrar('hud', 'reunion');
    $('reunion-dialogo').hidden = true;
    if (msg.motivo === 'cuerpo') {
      $('reunion-titulo').textContent = '¡Cuerpo encontrado!';
      $('reunion-motivo').textContent = `${nombre(msg.quien)} encontró a ${nombre(msg.victima)} en ${conArticulo(msg.sala)}.`;
    } else {
      $('reunion-titulo').textContent = '¡Reunión de emergencia!';
      $('reunion-motivo').textContent = `${nombre(msg.quien)} tocó la campana del comedor.`;
    }
    const misteriosos = msg.misteriosos || [];
    const otros = (msg.victimas || []).filter((id) => id !== msg.victima && !misteriosos.includes(id));
    if (misteriosos.length) $('reunion-motivo').textContent += ` ${misteriosos.map(nombre).join(', ')} murió misteriosamente.`;
    if (otros.length) $('reunion-motivo').textContent += ` También murió: ${otros.map(nombre).join(', ')}.`;
    $('reunion-chat').innerHTML = '';
    this.mensajeSistema(vivos.has(miId) ? 'Discutan quién es el asesino. La votación se abre en unos segundos.' : 'Eres un fantasma: solo los fantasmas leen tus mensajes.');
    this.dibujarTarjetas();
    this.refrescarBotonesVoto();
    clearInterval(this.tReloj);
    this.tReloj = setInterval(() => this.tickReunion(), 200);
    this.tickReunion();
    $('reunion-entrada').disabled = false;
    $('reunion-entrada').placeholder = vivos.has(miId) ? 'Escribe aquí...' : 'Chat de fantasmas...';
  }

  tickReunion() {
    if (!this.reunion) return;
    const voz = this.ctrl.voz;
    document.querySelectorAll('#reunion-jugadores .tarjeta').forEach((t) => t.classList.toggle('hablando', voz.hablando(t.dataset.id)));
    const pasado = (Date.now() - this.reunion.inicio) / 1000;
    const resta = Math.max(0, Math.ceil(this.reunion.duracion - pasado));
    $('reunion-tiempo').textContent = String(resta);
    const abierta = pasado >= TIEMPOS.esperaVoto;
    if (abierta !== this.reunion.abierta) {
      this.reunion.abierta = abierta;
      this.refrescarBotonesVoto();
    }
  }

  dibujarTarjetas() {
    const r = this.reunion;
    const cont = $('reunion-jugadores');
    cont.innerHTML = '';
    for (const j of r.jugadores.values()) {
      const vivo = r.vivos.has(j.id);
      const b = document.createElement('button');
      b.className = 'tarjeta';
      b.dataset.id = j.id;
      if (!vivo) b.classList.add('muerta');
      if (r.elegido === j.id) b.classList.add('elegida');
      b.appendChild(img(j.color));
      const info = document.createElement('div');
      info.className = 'info';
      const nom = document.createElement('span');
      nom.className = 'nom';
      nom.textContent = j.nombre + (r.salieron && r.salieron.has(j.id) ? ' (se fue)' : vivo ? '' : ' ✝');
      if (j.id === r.miId) nom.classList.add('yo');
      if (r.companeros && r.companeros.has(j.id)) nom.classList.add('compa');
      info.appendChild(nom);
      const marcas = document.createElement('div');
      marcas.className = 'marcas';
      info.appendChild(marcas);
      b.appendChild(info);
      if (r.votaron.has(j.id)) b.insertAdjacentHTML('beforeend', '<span class="voto-listo">VOTÓ</span>');
      b.onclick = () => {
        if (!vivo || r.votado || !r.vivos.has(r.miId) || !r.abierta) return;
        r.elegido = j.id;
        sonar('click');
        cont.querySelectorAll('.tarjeta').forEach((t) => t.classList.toggle('elegida', t.dataset.id === j.id));
        this.refrescarBotonesVoto();
      };
      cont.appendChild(b);
    }
  }

  refrescarBotonesVoto() {
    const r = this.reunion;
    const puede = r && r.vivos.has(r.miId) && !r.votado && r.abierta;
    $('reunion-votar').disabled = !puede || !r.elegido;
    $('reunion-saltar').disabled = !puede;
    $('reunion-votar').textContent = r && r.votado ? 'Votaste' : r && !r.abierta ? 'Discusión...' : 'Votar';
    const veredicto = $('reunion-veredicto');
    veredicto.hidden = !(r && r.juez);
    veredicto.disabled = !puede || !r.elegido;
  }

  mensajeSistema(texto) {
    const p = document.createElement('p');
    p.className = 'sistema';
    p.textContent = texto;
    $('reunion-chat').appendChild(p);
  }

  mensajeChat(msg) {
    if (!this.reunion) return;
    const j = this.reunion.jugadores.get(msg.de);
    const p = document.createElement('p');
    if (msg.muerto) p.className = 'fantasma';
    const b = document.createElement('b');
    b.textContent = `${j ? j.nombre : '?'}:`;
    b.style.color = j ? COLORES[j.color].ropa : '';
    b.style.textShadow = '1px 1px 0 #383840';
    p.appendChild(b);
    if (msg.foto) {
      p.appendChild(document.createTextNode('mostró la foto de la cámara:'));
      p.appendChild(this.dibujarFoto(msg.foto, this.reunion.jugadores));
    } else p.appendChild(document.createTextNode(msg.texto));
    const lista = $('reunion-chat');
    lista.appendChild(p);
    lista.scrollTop = lista.scrollHeight;
    sonar('click');
  }

  marcarVoto(quien) {
    if (!this.reunion) return;
    this.reunion.votaron.add(quien);
    const t = document.querySelector(`.tarjeta[data-id="${CSS.escape(quien)}"]`);
    if (t && !t.querySelector('.voto-listo')) t.insertAdjacentHTML('beforeend', '<span class="voto-listo">VOTÓ</span>');
    sonar('voto');
  }

  mostrarResultado(msg) {
    if (!this.reunion) return;
    const r = this.reunion;
    r.votado = true;
    r.abierta = false;
    clearInterval(this.tReloj);
    $('reunion-tiempo').textContent = '0';
    this.refrescarBotonesVoto();
    $('reunion-votar').textContent = 'Resultados';
    $('reunion-entrada').disabled = true;
    let saltos = 0;
    for (const [votante, objetivo] of msg.votos) {
      const v = r.jugadores.get(votante);
      if (objetivo === 'saltar') {
        saltos++;
        continue;
      }
      const t = document.querySelector(`.tarjeta[data-id="${CSS.escape(objetivo)}"] .marcas`);
      if (t && v) {
        const i = document.createElement('i');
        i.style.background = COLORES[v.color].ropa;
        i.title = v.nombre;
        t.appendChild(i);
      }
    }
    this.mensajeSistema(`Votos para saltar: ${saltos}.`);
    let lineas;
    if (msg.veredicto) {
      const v = msg.veredicto;
      const juez = r.jugadores.get(v.juez).nombre;
      const obj = r.jugadores.get(v.objetivo).nombre;
      const quedan = msg.asesinosRestantes;
      lineas = [
        `⚖ El juez ${juez} dictó veredicto contra ${obj}...`,
        v.acerto ? `¡${obj} ERA el asesino y fue expulsado!` : `${obj} NO era el asesino. ${juez} es expulsado.`,
        quedan > 0 ? (quedan === 1 ? 'Todavía queda 1 asesino.' : `Todavía quedan ${quedan} asesinos.`) : ''
      ].filter(Boolean);
      sonar('expulsar');
    } else if (msg.expulsado) {
      const n = r.jugadores.get(msg.expulsado).nombre;
      const quedan = msg.asesinosRestantes;
      lineas = [
        `${n} fue expulsado de la mansión...`,
        msg.eraAsesino ? `¡${n} ERA el asesino!` : `${n} NO era el asesino.`,
        quedan > 0 ? (quedan === 1 ? 'Todavía queda 1 asesino.' : `Todavía quedan ${quedan} asesinos.`) : ''
      ].filter(Boolean);
      sonar('expulsar');
    } else {
      lineas = [msg.empate ? 'Hubo un empate.' : 'Se saltó la votación.', 'Nadie fue expulsado.'];
    }
    this.dialogo(lineas);
  }

  // Texto que se escribe letra por letra, como en los juegos de Pokémon.
  dialogo(lineas) {
    const caja = $('reunion-dialogo');
    caja.hidden = false;
    caja.textContent = '';
    clearInterval(this.tDialogo);
    const completo = lineas.join(' ');
    let i = 0;
    this.tDialogo = setInterval(() => {
      i++;
      caja.textContent = completo.slice(0, i);
      if (i >= completo.length) clearInterval(this.tDialogo);
    }, 32);
  }

  cerrarReunion() {
    clearInterval(this.tReloj);
    clearInterval(this.tDialogo);
    this.reunion = null;
    document.activeElement && document.activeElement.blur();
    this.mostrar('hud');
  }

  // ---------- Roles especiales ----------

  // Foto de la cámara: quién atacaba a quién (o una sombra si el asesino era invisible)
  dibujarFoto(foto, jugadores) {
    const caja = document.createElement('div');
    caja.className = 'foto';
    const titulo = document.createElement('div');
    titulo.className = 'foto-titulo';
    titulo.textContent = `📷 ${foto.sala || ''}`;
    caja.appendChild(titulo);
    if (foto.vacia) {
      const v = document.createElement('div');
      v.className = 'foto-vacia';
      v.textContent = 'La foto salió vacía';
      caja.appendChild(v);
      return caja;
    }
    const escena = document.createElement('div');
    escena.className = 'foto-escena';
    const asesino = foto.asesino ? jugadores.get(foto.asesino) : null;
    const victima = jugadores.get(foto.victima);
    if (asesino) escena.appendChild(img(asesino.color));
    else {
      const sombra = img(0);
      sombra.className = 'foto-sombra';
      escena.appendChild(sombra);
    }
    const cuchillo = document.createElement('span');
    cuchillo.textContent = '🔪';
    escena.appendChild(cuchillo);
    const vi = img(victima ? victima.color : 0);
    vi.className = 'foto-victima';
    escena.appendChild(vi);
    caja.appendChild(escena);
    const pie = document.createElement('div');
    pie.className = 'foto-pie';
    pie.textContent = `${asesino ? asesino.nombre : 'Una sombra'} atacando a ${victima ? victima.nombre : '?'}`;
    caja.appendChild(pie);
    return caja;
  }

  mostrarFotoPrivada(foto, jugadores) {
    this.minijuegos.abrirPanel('foto', 'Foto de la cámara', 'Solo tú la viste. Puedes mostrarla en la siguiente reunión... o guardar el secreto.', (area) => {
      area.appendChild(this.dibujarFoto(foto, jugadores));
    });
  }

  // Libreta del detective: cada asesinato y a quién se interrogó
  abrirLibreta(casos = []) {
    const jug = this.ctrl.jugadoresPartida;
    const nombre = (id) => (jug.get(id) || {}).nombre || '?';
    const color = (id) => (jug.get(id) || {}).color || 0;
    this.minijuegos.abrirPanel('libreta', '📓 Libreta del detective', 'Se anotan los asesinatos ocurridos mientras estás vivo (máx. 3). Pregunta con V junto a alguien.', (area) => {
      if (!casos.length) {
        const v = document.createElement('p');
        v.className = 'libreta-vacia';
        v.textContent = 'Todavía no hay asesinatos anotados.';
        area.appendChild(v);
        return;
      }
      casos.forEach((c, i) => {
        const caso = document.createElement('div');
        caso.className = 'libreta-caso';
        const cab = document.createElement('div');
        cab.className = 'libreta-cabecera';
        const iv = img(color(c.victima));
        iv.className = 'muerto';
        cab.appendChild(iv);
        const t = document.createElement('div');
        t.innerHTML = `<b>Caso ${i + 1}: muerte de ${escapar(nombre(c.victima))}</b><span>Ocurrió en: ${escapar(c.sala || '?')} · Preguntas: ${c.preguntas.length}/3</span>`;
        cab.appendChild(t);
        caso.appendChild(cab);
        const lista = document.createElement('div');
        lista.className = 'libreta-pistas';
        if (!c.preguntas.length) lista.innerHTML = '<span class="libreta-nada">Aún no interrogaste a nadie por este caso.</span>';
        for (const p of c.preguntas) {
          const fila = document.createElement('div');
          fila.className = 'libreta-pista';
          fila.appendChild(img(color(p.id)));
          const txt = document.createElement('span');
          txt.innerHTML = `<b>${escapar(nombre(p.id))}</b> estaba en <b>${escapar(p.sala)}</b>`;
          fila.appendChild(txt);
          lista.appendChild(fila);
        }
        caso.appendChild(lista);
        area.appendChild(caso);
      });
    });
  }

  mostrarPasadizo(lugar) {
    if (lugar === this.pasadizoActual) return;
    this.pasadizoActual = lugar;
    $('hud-pasadizo').hidden = !lugar;
    if (lugar) $('hud-pasadizo-lugar').textContent = lugar;
  }

  // ---------- Pantalla completa ----------

  prepararPantallaCompleta(soportado, alternar) {
    for (const id of ['menu-pantalla', 'hud-pantalla']) {
      $(id).hidden = !soportado;
      $(id).onclick = alternar;
    }
  }

  marcarPantallaCompleta(activa) {
    $('hud-pantalla').classList.toggle('activo', activa);
    $('menu-pantalla').textContent = activa ? '⛶ Salir de pantalla completa' : '⛶ Pantalla completa';
  }

  // ---------- Chat de voz ----------

  actualizarVoz(voz, error) {
    const disponible = voz.disponible;
    $('hud-mic').hidden = !disponible;
    $('sala-voz').hidden = !disponible;
    $('hud-mic').classList.toggle('activo', voz.micActivo);
    $('hud-mic').classList.toggle('apagado', !voz.micActivo);
    $('sala-mic').textContent = voz.micActivo ? '🎤 Micrófono encendido (tocar para apagar)' : '🎤 Activar micrófono';
    $('sala-mic').classList.toggle('boton-principal', voz.micActivo);
    if (error) this.aviso(error, 4000);
    if (!this.vozPreparada) {
      this.vozPreparada = true;
      const alternar = () => voz.alternarMic();
      $('hud-mic').onclick = alternar;
      $('sala-mic').onclick = alternar;
    }
  }

  // Señal de conexión: ms, 'anfitrion' o null (sin red)
  mostrarPing(valor) {
    const hud = $('hud-ping');
    const sala = $('sala-ping');
    if (valor === null || valor === undefined) {
      hud.hidden = true;
      sala.hidden = true;
      return;
    }
    let texto;
    let clase;
    if (valor === 'anfitrion') {
      texto = '● Anfitrión';
      clase = 'ping-bueno';
    } else {
      texto = `● ${valor} ms`;
      clase = valor < 120 ? 'ping-bueno' : valor < 300 ? 'ping-medio' : 'ping-malo';
    }
    hud.hidden = false;
    hud.textContent = texto;
    hud.className = `ping ${clase}`;
    sala.hidden = false;
    sala.textContent = valor === 'anfitrion' ? 'Tú eres el anfitrión (si sales, la sala se cierra para todos)' : `Señal con el anfitrión: ${valor} ms`;
  }

  // Alguien se fue durante una reunión
  marcarSalida(id) {
    if (!this.reunion) return;
    const j = this.reunion.jugadores.get(id);
    this.reunion.vivos.delete(id);
    this.reunion.salieron = this.reunion.salieron || new Set();
    this.reunion.salieron.add(id);
    if (this.reunion.elegido === id) this.reunion.elegido = null;
    this.mensajeSistema(`${j ? j.nombre : 'Alguien'} salió de la partida.`);
    this.dibujarTarjetas();
    this.refrescarBotonesVoto();
  }

  // Tableta de signos vitales del médico
  abrirVitales(jugadores, alCerrar) {
    this.vitalesJugadores = jugadores;
    this.minijuegos.abrirPanel('vitales', 'Signos vitales', 'La batería se gasta mientras la tableta está abierta.', (area) => {
      const bat = document.createElement('div');
      bat.className = 'mj-progreso vitales-bateria';
      bat.innerHTML = '<div class="mj-relleno" id="vitales-bateria"></div>';
      area.appendChild(bat);
      const lista = document.createElement('div');
      lista.className = 'vitales-lista';
      lista.id = 'vitales-lista';
      area.appendChild(lista);
    }, alCerrar);
  }

  actualizarVitales(h) {
    const lista = $('vitales-lista');
    if (!lista || !h) return;
    $('vitales-bateria').style.width = `${Math.round((h.bat / TIEMPOS.bateriaMedico) * 100)}%`;
    if (!h.vit) return;
    const firma = JSON.stringify(h.vit);
    if (firma === this.firmaVitales && lista.childElementCount) return;
    this.firmaVitales = firma;
    lista.innerHTML = '';
    for (const [id, estado] of h.vit) {
      const j = this.vitalesJugadores.get(id);
      if (!j) continue;
      const d = document.createElement('div');
      d.className = `tarjeta vital vital-${estado}`;
      d.appendChild(img(j.color));
      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `<span class="nom">${escapar(j.nombre)}</span><span class="pulso">${estado === 'vivo' ? '♥ Vivo' : estado === 'muerto' ? '✝ Muerto' : '— Desconectado'}</span>`;
      d.appendChild(info);
      lista.appendChild(d);
    }
  }

  // ---------- Fin ----------

  prepararFin() {
    $('fin-otra').onclick = () => this.ctrl.otraPartida();
    $('fin-menu').onclick = () => this.ctrl.salir();
  }

  mostrarFin(msg, jugadores, miId, modo) {
    this.minijuegos.cerrar(false);
    this.mapa.cerrar();
    clearInterval(this.tReloj);
    clearInterval(this.tDialogo);
    this.reunion = null;
    this.mostrar('fin');
    const roles = new Map(msg.roles);
    const subroles = new Map(msg.roles.map(([id, , sub]) => [id, sub]));
    const gane = (roles.get(miId) === 'asesino') === (msg.ganador === 'asesino');
    sonar(gane ? 'victoria' : 'derrota');
    const t = $('fin-titulo');
    t.textContent = msg.ganador === 'asesino' ? '¡Gana el asesino!' : '¡Ganan los inocentes!';
    t.style.color = msg.ganador === 'asesino' ? 'var(--rojo)' : 'var(--verde)';
    $('fin-motivo').textContent = `${msg.motivo}. ${gane ? '¡Victoria!' : 'Derrota...'}`;
    const cont = $('fin-roles');
    cont.innerHTML = '';
    for (const j of jugadores.values()) {
      const d = document.createElement('div');
      d.className = 'tarjeta';
      d.appendChild(img(j.color));
      const info = document.createElement('div');
      info.className = 'info';
      const rol = roles.get(j.id);
      info.innerHTML = `<span class="nom ${j.id === miId ? 'yo' : ''}">${escapar(j.nombre)}</span><span class="${rol === 'asesino' ? 'rojo' : 'verde'}">${rol === 'asesino' ? 'Asesino' : 'Inocente'}${subroles.get(j.id) && ROLES[subroles.get(j.id)] ? ` · ${escapar(ROLES[subroles.get(j.id)].nombre)}` : ''}</span>`;
      d.appendChild(info);
      cont.appendChild(d);
    }
    const otra = $('fin-otra');
    otra.hidden = modo === 'cliente';
    otra.textContent = 'Volver a la sala';
    $('fin-menu').textContent = modo === 'cliente' ? 'Salir' : 'Menú';
    if (modo === 'cliente') $('fin-motivo').textContent += ' Esperando al anfitrión...';
  }
}
