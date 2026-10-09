import Phaser from 'phaser';
import { ALTO, ANCHO_MAX, TILE, VELOCIDAD, VELOCIDAD_FANTASMA, VISION, DISTANCIA, TIEMPOS, RED, NUM_ASPECTOS } from './config.js';
import { ANCHO_MAPA, ALTO_MAPA, MUEBLES, TAREAS, PASADIZOS, FUSIBLES, MESA, POZO, salaEn } from './mundo/mapa.js';
import { TIPOS_MUEBLE, mover, hayLinea, bloqueaVista } from './mundo/colision.js';
import { dibujarSuelo } from './graficos/suelo.js';
import { dibujarMuebles } from './graficos/muebles.js';
import { hojaPersonaje, hojaCuerpo, ANCHO_PJ, ALTO_PJ, DIRS } from './graficos/personajes.js';
import { crearFuente, textoFuente } from './graficos/fuente.js';
import { lienzo, px, contornear } from './graficos/pixel.js';
import { sonar } from './ui/sonido.js';
import { fijarTension } from './ui/musica.js';
import { imagenRetrato } from './ui/ui.js';

const MAPA_W = ANCHO_MAPA * TILE;
const MAPA_H = ALTO_MAPA * TILE;
const NOMBRE_DIR = ['abajo', 'arriba', 'lado', 'lado'];
const RAYOS = 180;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function distanciaAMesa(p) {
  const cx = Math.max(MESA.x, Math.min(p.x, MESA.x + MESA.w));
  const cy = Math.max(MESA.y, Math.min(p.y, MESA.y + MESA.h));
  return Math.hypot(p.x - cx, p.y - cy);
}

export default class EscenaMundo extends Phaser.Scene {
  constructor() {
    super('mundo');
    this.enJuego = false;
  }

  // { enviar(msg, rapido), ui } puesto por main.js
  get enlace() {
    return this.registry.get('enlace');
  }

  create() {
    this.crearTexturas();
    this.add.image(0, 0, 'suelo').setOrigin(0).setDepth(-10000);
    this.animados = [];
    for (const m of MUEBLES) {
      const def = TIPOS_MUEBLE[m.tipo];
      const img = this.add.image(m.tx * TILE, m.ty * TILE, `m_${m.tipo}_0`).setOrigin(0);
      img.setDepth(m.ty * TILE + def.h);
      if (m.tipo === 'chimenea' || m.tipo === 'estufa' || m.tipo === 'fuente') this.animados.push({ img, tipo: m.tipo });
    }
    let cuadro = 0;
    this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        cuadro = 1 - cuadro;
        for (const a of this.animados) a.img.setTexture(`m_${a.tipo}_${cuadro}`);
      }
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAPA_W, MAPA_H);
    cam.setRoundPixels(true);
    cam.setBackgroundColor('#1a1420');

    // Tamaño máximo del ancho adaptable (ver main.js), así no hay que redimensionarla.
    this.oscuridad = this.add.renderTexture(0, 0, ANCHO_MAX, ALTO).setOrigin(0).setScrollFactor(0).setDepth(9000);
    this.scale.on(Phaser.Scale.Events.RESIZE, (tam) => this.cameras.main.setSize(tam.width, tam.height));
    this.formaVision = this.make.graphics({ add: false });
    this.flecha = this.add.image(0, 0, 'flecha').setScrollFactor(0).setDepth(9500).setVisible(false);

    this.teclas = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,Q,R,F,C,V,M,L', false);
    this.camaraImg = this.add.image(0, 0, 'camara').setOrigin(0.5, 1).setVisible(false);
    this.miCamaraImg = this.add.image(0, 0, 'camara').setOrigin(0.5, 1).setVisible(false).setAlpha(0.5);
    this.gritos = [];
    this.joystick = { x: 0, y: 0 };
    this.fondo = { t: 0 };
    this.vistas = new Map();
    this.cuerpos = new Map();
    this.burbujas = new Map();
    this.prepararFondo();
  }

  // ---------- Texturas generadas ----------

  crearTexturas() {
    crearFuente(this);
    this.textures.addCanvas('suelo', dibujarSuelo());
    const muebles = dibujarMuebles();
    for (const [tipo, cuadros] of Object.entries(muebles)) cuadros.forEach((c, k) => this.textures.addCanvas(`m_${tipo}_${k}`, c));

    // Un juego de sprites por aspecto (color + género)
    for (let i = 0; i < NUM_ASPECTOS; i++) {
      const tex = this.textures.addCanvas(`pj_${i}`, hojaPersonaje(i));
      for (let f = 0; f < 9; f++) tex.add(f, 0, f * ANCHO_PJ, 0, ANCHO_PJ, ALTO_PJ);
      DIRS.forEach((dir, d) => {
        this.anims.create({
          key: `andar_${i}_${dir}`,
          frames: [1, 0, 2, 0].map((p) => ({ key: `pj_${i}`, frame: d * 3 + p })),
          frameRate: 8,
          repeat: -1
        });
      });
      this.textures.addCanvas(`cuerpo_${i}`, hojaCuerpo(i));
    }

    // Burbuja "!" como en los juegos de Pokémon
    const b = lienzo(13, 14);
    px(b.ctx, '#ffffff', 1, 1, 11, 9);
    px(b.ctx, '#ffffff', 4, 10, 3, 2);
    px(b.ctx, '#ffffff', 5, 12, 1, 1);
    px(b.ctx, '#e04040', 6, 2, 1, 5);
    px(b.ctx, '#e04040', 6, 8, 1, 1);
    contornear(b.ctx, 0, 0, 13, 14);
    this.textures.addCanvas('burbuja', b.canvas);
    const b2 = lienzo(13, 14);
    px(b2.ctx, '#ffffff', 1, 1, 11, 9);
    px(b2.ctx, '#ffffff', 4, 10, 3, 2);
    px(b2.ctx, '#ffffff', 5, 12, 1, 1);
    px(b2.ctx, '#8858c8', 3, 3, 7, 5);
    px(b2.ctx, '#ffffff', 5, 4, 3, 3);
    contornear(b2.ctx, 0, 0, 13, 14);
    this.textures.addCanvas('burbujaPasadizo', b2.canvas);

    // Flecha (apunta a la derecha; se rota hacia el objetivo)
    const fl = lienzo(19, 17);
    px(fl.ctx, '#f8d040', 1, 6, 9, 5);
    px(fl.ctx, '#fff4a0', 1, 6, 9, 1);
    for (let i = 0; i < 8; i++) px(fl.ctx, i < 2 ? '#fff4a0' : '#f8d040', 9 + i, 1 + i, 1, 15 - i * 2);
    contornear(fl.ctx, 0, 0, 19, 17);
    this.textures.addCanvas('flecha', fl.canvas);

    const humo = lienzo(10, 10);
    humo.ctx.fillStyle = '#e8e0f0';
    humo.ctx.beginPath();
    humo.ctx.arc(5, 5, 4, 0, Math.PI * 2);
    humo.ctx.fill();
    this.textures.addCanvas('humo', humo.canvas);

    // Cámara del camarógrafo
    const cam = lienzo(14, 12);
    px(cam.ctx, '#3a3a44', 1, 3, 12, 8);
    px(cam.ctx, '#58586a', 2, 4, 10, 2);
    px(cam.ctx, '#2a2a30', 4, 1, 5, 2);
    px(cam.ctx, '#88c0e8', 5, 5, 4, 4);
    px(cam.ctx, '#d0e8f8', 5, 5, 2, 2);
    px(cam.ctx, '#f04848', 11, 4, 1, 1);
    contornear(cam.ctx, 0, 0, 14, 12);
    this.textures.addCanvas('camara', cam.canvas);

    // Burbuja del escudo del ángel
    const esc = lienzo(24, 28);
    esc.ctx.strokeStyle = 'rgba(120,200,255,0.9)';
    esc.ctx.fillStyle = 'rgba(120,200,255,0.18)';
    esc.ctx.lineWidth = 1;
    esc.ctx.beginPath();
    esc.ctx.ellipse(12, 14, 11, 13, 0, 0, Math.PI * 2);
    esc.ctx.fill();
    esc.ctx.stroke();
    px(esc.ctx, '#ffffff', 6, 5, 2, 2);
    this.textures.addCanvas('escudo', esc.canvas);

    // Marca del grito del alertador
    const gr = lienzo(17, 17);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      px(gr.ctx, '#f8d040', Math.round(8 + Math.cos(a) * 7), Math.round(8 + Math.sin(a) * 7), 2, 2);
    }
    gr.ctx.fillStyle = '#e03030';
    gr.ctx.beginPath();
    gr.ctx.arc(8.5, 8.5, 5.5, 0, Math.PI * 2);
    gr.ctx.fill();
    px(gr.ctx, '#ffffff', 8, 5, 1, 4);
    px(gr.ctx, '#ffffff', 8, 10, 1, 1);
    contornear(gr.ctx, 0, 0, 17, 17);
    this.textures.addCanvas('grito', gr.canvas);

    // Ondas de voz sobre quien habla
    const voz = lienzo(11, 7);
    px(voz.ctx, '#ffffff', 1, 2, 2, 3);
    px(voz.ctx, '#ffffff', 3, 1, 1, 5);
    px(voz.ctx, '#78e890', 5, 2, 1, 3);
    px(voz.ctx, '#78e890', 7, 1, 1, 5);
    px(voz.ctx, '#78e890', 9, 0, 1, 7);
    contornear(voz.ctx, 0, 0, 11, 7);
    this.textures.addCanvas('voz', voz.canvas);

    const esq = lienzo(3, 3);
    px(esq.ctx, '#a8e0ff', 0, 0, 3, 3);
    px(esq.ctx, '#ffffff', 0, 0, 1, 1);
    this.textures.addCanvas('esquirla', esq.canvas);
  }

  // ---------- Modo fondo (menú) ----------

  prepararFondo() {
    this.enJuego = false;
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.oscuridad.clear();
    this.flecha.setVisible(false);
  }

  // ---------- Partida ----------

  empezar(datos) {
    this.limpiar();
    this.enJuego = true;
    this.jugadoresInfo = new Map(datos.jugadores.map((j) => [j.id, j]));
    this.yo = {
      id: datos.miId,
      x: datos.x,
      y: datos.y,
      dir: 0,
      mov: false,
      vivo: true,
      rol: datos.rol,
      subrol: datos.subrol || null,
      tareas: datos.tareas,
      hechas: new Set(),
      companeros: new Set(datos.companeros),
      tp: datos.tp || 0
    };
    this.estado = { fase: 'juego', luces: false, progreso: 0, yo: { cdM: TIEMPOS.primerMatar, cdS: 0, cdD: TIEMPOS.primerDisfraz, dis: 0, camp: 1, espC: TIEMPOS.esperaCampana } };
    this.bloqueadoHasta = this.time.now + TIEMPOS.revelarRol * 1000;
    this.enReunion = false;
    this.velocidad = datos.velocidad || 1;
    this.cuerposVistos = new Set();
    this.casos = [];
    this.yo.casos = this.casos;
    this.camaraPos = null;
    this.miCamara = null;
    this.ultimoInf = 0;
    this.relojPos = 0;
    this.ultimaSala = null;
    for (const j of datos.jugadores) this.crearVista(j);
    const v = this.vistas.get(this.yo.id);
    v.x = this.yo.x;
    v.y = this.yo.y;
    this.cameras.main.startFollow(v.spr, true, 1, 1, 0, -10);
    this.crearBurbujas();
    this.actualizarVista(v, this.yo, 0);
  }

  limpiar() {
    this.terminarCinematica();
    for (const v of this.vistas.values()) {
      v.spr.destroy();
      v.sombra.destroy();
      v.nombre.destroy();
      v.escudoImg.destroy();
      v.vozImg.destroy();
    }
    this.vistas.clear();
    for (const c of this.cuerpos.values()) c.destroy();
    this.cuerpos.clear();
    for (const b of this.burbujas.values()) b.destroy();
    this.burbujas.clear();
    for (const g of this.gritos || []) {
      g.marca.destroy();
      g.flecha.destroy();
    }
    this.gritos = [];
    if (this.camaraImg) {
      this.camaraImg.setVisible(false);
      this.miCamaraImg.setVisible(false);
    }
  }

  detener() {
    this.limpiar();
    this.prepararFondo();
  }

  crearVista(j) {
    const sombra = this.add.ellipse(0, 0, 12, 5, 0x000000, 0.22);
    const spr = this.add.sprite(0, 0, `pj_${j.aspecto}`, 0).setOrigin(0.5, 1);
    let texto = textoFuente(j.nombre);
    const nombre = this.add.bitmapText(0, 0, 'fuente', texto).setOrigin(0.5, 1).setDepth(7000);
    if (this.yo && this.yo.companeros.has(j.id)) nombre.setTint(0xff7070);
    if (this.yo && j.id === this.yo.id && this.yo.rol === 'asesino') nombre.setTint(0xff7070);
    const escudoImg = this.add.image(0, 0, 'escudo').setOrigin(0.5, 1).setVisible(false);
    const vozImg = this.add.image(0, 0, 'voz').setOrigin(0.5, 1).setDepth(7001).setVisible(false);
    this.vistas.set(j.id, { id: j.id, color: j.color, aspecto: j.aspecto, spr, sombra, nombre, escudoImg, vozImg, x: 0, y: 0, objetivo: null, dir: 0, mov: false, vivo: true, apariencia: j.id, lookId: j.id, invisible: false, escudo: false });
  }

  crearBurbujas() {
    for (const id of this.yo.tareas) {
      const t = TAREAS.find((x) => x.id === id);
      this.burbujas.set(id, this.add.image(t.x, t.y - 20, 'burbuja').setOrigin(0.5, 1).setDepth(6000));
    }
    if (this.yo.rol === 'asesino') {
      PASADIZOS.forEach((p, i) => this.burbujas.set(`pasadizo${i}`, this.add.image(p.x, p.y - 20, 'burbujaPasadizo').setOrigin(0.5, 1).setDepth(6000).setAlpha(0.8)));
    }
  }

  // ---------- Mensajes del servidor ----------

  alMensaje(msg) {
    if (!this.enJuego) return;
    switch (msg.t) {
      case 's':
        this.aplicarSnapshot(msg);
        break;
      case 'tp':
        if (msg.n >= this.yo.tp) {
          this.yo.tp = msg.n;
          this.yo.x = msg.x;
          this.yo.y = msg.y;
        }
        break;
      case 'muerte':
        this.yo.vivo = false;
        this.cameras.main.flash(300, 200, 30, 30);
        this.cameras.main.shake(250, 0.01);
        break;
      case 'tareaHecha':
        this.yo.hechas.add(msg.tarea);
        sonar('tarea');
        break;
      case 'casos':
        this.casos = msg.casos;
        this.yo.casos = msg.casos;
        break;
      case 'infectado':
        this.cameras.main.flash(400, 60, 200, 60);
        this.cameras.main.shake(300, 0.008);
        sonar('alien');
        break;
      case 'aviso':
        if (msg.tipo === 'golpe' && this.yo && dist(msg, this.yo) < 140) {
          sonar(msg.alien ? 'alien' : 'matar');
          this.cameras.main.shake(160, 0.006);
        }
        if (msg.tipo === 'disfraz' || msg.tipo === 'esfumar' || msg.tipo === 'pasadizo') this.humo(msg.x, msg.y);
        if (msg.tipo === 'salio') {
          const v = this.vistas.get(msg.id);
          if (v) v.presente = false;
        }
        if (msg.tipo === 'grito' && msg.id !== this.yo.id) this.agregarGrito(msg.x, msg.y);
        if (msg.tipo === 'escudoRoto') this.esquirlas(msg.x, msg.y);
        if (msg.tipo === 'camaraPuesta') this.miCamara = { x: msg.x, y: msg.y };
        break;
      case 'reunion':
        this.enReunion = true;
        break;
      case 'reanudar':
        this.enReunion = false;
        break;
    }
  }

  aplicarSnapshot(s) {
    this.estado.fase = s.f;
    this.estado.luces = !!s.l;
    this.estado.progreso = s.p;
    this.estado.yo = s.yo;
    if (s.yo.vivo === false && this.yo.vivo) {
      this.yo.vivo = false;
    }
    const presentes = new Set();
    for (const [id, x, y, dir, mov, vivo, apariencia, banderas] of s.j) {
      presentes.add(id);
      const v = this.vistas.get(id);
      if (!v) continue;
      v.vivo = !!vivo;
      v.apariencia = apariencia || id;
      v.invisible = !!(banderas & 1);
      v.escudo = !!(banderas & 2);
      if (id === this.yo.id) continue;
      if (!v.objetivo || dist(v, { x, y }) > 48) {
        v.x = x;
        v.y = y;
      }
      v.objetivo = { x, y };
      v.dir = dir;
      v.mov = !!mov;
    }
    for (const v of this.vistas.values()) v.presente = presentes.has(v.id) || v.id === this.yo.id;

    const ids = new Set();
    for (const [id, x, y, veneno] of s.c) {
      ids.add(id);
      if (!this.cuerpos.has(id)) {
        const info = this.jugadoresInfo.get(id);
        const img = this.add.image(x, y + 2, `cuerpo_${info ? info.aspecto : 0}`).setOrigin(0.5, 1).setDepth(y - 6);
        this.cuerpos.set(id, img);
      }
      // Veneno: el cuerpo se pone verde y se desvanece
      const img = this.cuerpos.get(id);
      if (veneno > 0) {
        img.setTint(0x90ff70);
        img.alfaBase = 0.25 + veneno * 0.75;
      }
    }
    this.camaraPos = s.cam ? { x: s.cam[0], y: s.cam[1] } : null;
    if (this.camaraPos) this.miCamara = null;
    for (const [id, img] of this.cuerpos) {
      if (!ids.has(id)) {
        img.destroy();
        this.cuerpos.delete(id);
      }
    }
  }

  // ---------- Acciones ----------

  puedeMover() {
    const panel = this.enlace.ui.minijuegos.abierto;
    return this.enJuego && !panel && !this.enReunion && this.estado.fase === 'juego' && this.time.now >= this.bloqueadoHasta;
  }

  candidatoUsar() {
    const yo = this.yo;
    let mejor = null;
    const considerar = (opcion, d) => {
      if (!mejor || d < mejor.d) mejor = { ...opcion, d };
    };
    for (const id of yo.tareas) {
      if (yo.hechas.has(id)) continue;
      if (yo.rol === 'asesino' && !yo.vivo) continue;
      const t = TAREAS.find((x) => x.id === id);
      const d = dist(yo, t);
      if (d <= DISTANCIA.usar) considerar({ tipo: 'tarea', id, nombre: t.nombre, x: t.x, y: t.y }, d);
    }
    if (yo.vivo && yo.rol === 'asesino' && !this.enPasadizo()) {
      PASADIZOS.forEach((p, i) => {
        const d = dist(yo, p);
        if (d <= DISTANCIA.usar) considerar({ tipo: 'pasadizo', i, nombre: 'Pasadizo' }, d);
      });
    }
    if (this.estado.luces && yo.vivo) {
      const d = dist(yo, FUSIBLES);
      if (d <= DISTANCIA.usar + 6) considerar({ tipo: 'fusibles', nombre: 'Fusibles' }, d);
    }
    if (yo.vivo && this.camaraPos && dist(yo, this.camaraPos) <= DISTANCIA.usar + 8) {
      considerar({ tipo: 'camara', nombre: 'Cámara' }, dist(yo, this.camaraPos));
    }
    if (yo.vivo && distanciaAMesa(yo) <= DISTANCIA.campana) {
      considerar({ tipo: 'campana', nombre: 'Campana', espera: this.estado.yo.espC, quedan: this.estado.yo.camp }, distanciaAMesa(yo) + 4);
    }
    return mejor;
  }

  enPasadizo() {
    return this.estado.yo.pz >= 0;
  }

  victimaCercana() {
    if (this.yo.rol !== 'asesino' || !this.yo.vivo || this.enPasadizo()) return null;
    let mejor = null;
    for (const v of this.vistas.values()) {
      if (v.id === this.yo.id || !v.vivo || !v.presente || this.yo.companeros.has(v.id)) continue;
      const d = dist(v, this.yo);
      if (d <= DISTANCIA.matar && (!mejor || d < mejor.d) && hayLinea(this.yo.x, this.yo.y, v.x, v.y)) mejor = { id: v.id, d };
    }
    return mejor;
  }

  cuerpoCercano() {
    if (!this.yo.vivo) return null;
    for (const [id, img] of this.cuerpos) {
      if (dist({ x: img.x, y: img.y - 2 }, this.yo) <= DISTANCIA.reportar) return id;
    }
    return null;
  }

  accion(nombre) {
    if (!this.puedeMover()) return;
    const yo = this.yo;
    // Dentro de un pasadizo solo se puede cambiar de salida o salir
    if (this.enPasadizo()) {
      if (nombre === 'pzAnterior' || nombre === 'pzSiguiente') {
        sonar('pasadizo');
        this.enlace.enviar({ t: 'pasadizo', accion: 'mover', dir: nombre === 'pzAnterior' ? -1 : 1 });
      } else if (nombre === 'pzSalir' || nombre === 'usar') this.enlace.enviar({ t: 'pasadizo', accion: 'salir' });
      return;
    }
    if (nombre === 'usar') {
      const c = this.candidatoUsar();
      if (!c) return;
      const mj = this.enlace.ui.minijuegos;
      if (c.tipo === 'tarea') {
        mj.abrir(c.id, c.nombre, (exito) => {
          if (!exito || !this.enJuego) return;
          if (yo.rol === 'inocente') this.enlace.enviar({ t: 'tarea', tarea: c.id });
          else {
            yo.hechas.add(c.id);
            sonar('tarea');
          }
        });
      } else if (c.tipo === 'fusibles') {
        mj.abrir('fusibles', 'Caja de fusibles', (exito) => {
          if (exito && this.estado.luces) this.enlace.enviar({ t: 'arreglar' });
        });
      } else if (c.tipo === 'camara') {
        this.enlace.enviar({ t: 'recoger' });
      } else if (c.tipo === 'pasadizo') {
        sonar('pasadizo');
        this.enlace.enviar({ t: 'pasadizo', accion: 'entrar', i: c.i });
        this.estado.yo.pz = c.i;
      } else if (c.tipo === 'campana' && c.quedan > 0 && c.espera <= 0) this.enlace.enviar({ t: 'campana' });
    } else if (nombre === 'matar') {
      const v = this.victimaCercana();
      if (v && this.estado.yo.cdM <= 0) this.enlace.enviar({ t: 'matar', victima: v.id });
    } else if (nombre === 'reportar') {
      if (this.cuerpoCercano()) this.enlace.enviar({ t: 'reportar' });
    } else if (nombre === 'sabotaje') {
      if (yo.rol === 'asesino' && yo.vivo && this.estado.yo.cdS <= 0 && !this.estado.luces) this.enlace.enviar({ t: 'sabotaje' });
    } else if (nombre === 'habilidad') {
      this.usarHabilidad();
    } else if (nombre === 'disfraz') {
      if (yo.subrol !== 'cambiaformas' || !yo.vivo || this.estado.yo.cdD > 0 || this.estado.yo.dis > 0) return;
      const opciones = [...this.jugadoresInfo.values()]
        .filter((j) => j.id !== yo.id)
        .map((j) => ({ id: j.id, nombre: j.nombre, imagen: imagenRetrato(j.aspecto) }));
      this.enlace.ui.minijuegos.abrirSelector('Cambiaformas', `Elige a quién imitar durante ${TIEMPOS.disfraz} segundos.`, opciones, (id) => {
        this.enlace.enviar({ t: 'disfraz', objetivo: id });
      });
    }
  }

  // ---------- Bucle ----------

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (!this.enJuego) {
      this.fondo.t += dt * 0.04;
      const cam = this.cameras.main;
      cam.scrollX = (Math.sin(this.fondo.t) * 0.5 + 0.5) * (MAPA_W - cam.width);
      cam.scrollY = (Math.cos(this.fondo.t * 0.7) * 0.5 + 0.5) * (MAPA_H - cam.height);
      return;
    }
    this.moverLocal(dt);
    this.enviarPosicion(dt);
    this.actualizarOtros(dt);
    this.dibujarOscuridad();
    this.actualizarFlecha();
    this.actualizarHud(time);
  }

  moverLocal(dt) {
    const yo = this.yo;
    const t = this.teclas;
    let dx = 0;
    let dy = 0;
    const escribiendo = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (!escribiendo && Phaser.Input.Keyboard.JustDown(t.M) && !this.enReunion) this.enlace.ui.mapa.alternar();
    if (this.puedeMover() && this.enPasadizo()) {
      if (!escribiendo) {
        if (Phaser.Input.Keyboard.JustDown(t.A) || Phaser.Input.Keyboard.JustDown(t.LEFT)) this.accion('pzAnterior');
        if (Phaser.Input.Keyboard.JustDown(t.D) || Phaser.Input.Keyboard.JustDown(t.RIGHT)) this.accion('pzSiguiente');
        if (Phaser.Input.Keyboard.JustDown(t.E) || Phaser.Input.Keyboard.JustDown(t.SPACE)) this.accion('pzSalir');
      }
    } else if (this.puedeMover()) {
      if (!escribiendo) {
        if (t.A.isDown || t.LEFT.isDown) dx -= 1;
        if (t.D.isDown || t.RIGHT.isDown) dx += 1;
        if (t.W.isDown || t.UP.isDown) dy -= 1;
        if (t.S.isDown || t.DOWN.isDown) dy += 1;
        if (Phaser.Input.Keyboard.JustDown(t.E) || Phaser.Input.Keyboard.JustDown(t.SPACE)) this.accion('usar');
        if (Phaser.Input.Keyboard.JustDown(t.Q)) this.accion('matar');
        if (Phaser.Input.Keyboard.JustDown(t.R)) this.accion('reportar');
        if (Phaser.Input.Keyboard.JustDown(t.F)) this.accion('sabotaje');
        if (Phaser.Input.Keyboard.JustDown(t.C)) this.accion('disfraz');
        if (Phaser.Input.Keyboard.JustDown(t.V)) this.accion('habilidad');
        if (Phaser.Input.Keyboard.JustDown(t.L) && this.yo.subrol === 'detective') this.enlace.ui.abrirLibreta(this.casos);
      }
      if (!dx && !dy && (this.joystick.x || this.joystick.y)) {
        dx = this.joystick.x;
        dy = this.joystick.y;
      }
    }
    const largo = Math.hypot(dx, dy);
    yo.mov = largo > 0.1;
    if (yo.mov) {
      const vel = (yo.vivo ? VELOCIDAD : VELOCIDAD_FANTASMA) * this.velocidad * dt * Math.min(1, largo);
      const mx = (dx / largo) * vel;
      const my = (dy / largo) * vel;
      if (yo.vivo) {
        const p = mover(yo.x, yo.y, mx, my);
        yo.x = p.x;
        yo.y = p.y;
      } else {
        yo.x = Phaser.Math.Clamp(yo.x + mx, 8, MAPA_W - 8);
        yo.y = Phaser.Math.Clamp(yo.y + my, 20, MAPA_H - 4);
      }
      if (Math.abs(dx) > Math.abs(dy) + 0.01) yo.dir = dx > 0 ? 3 : 2;
      else yo.dir = dy > 0 ? 0 : 1;
    }
    const v = this.vistas.get(yo.id);
    v.x = yo.x;
    v.y = yo.y;
    v.dir = yo.dir;
    v.mov = yo.mov;
    v.vivo = yo.vivo;
    v.invisible = !!(this.estado.yo.h && this.estado.yo.h.act > 0) || this.enPasadizo();
    this.actualizarVista(v, yo, dt);
  }

  enviarPosicion(dt) {
    this.relojPos += dt * 1000;
    if (this.relojPos < RED.intervaloPosicionMs) return;
    this.relojPos = 0;
    const yo = this.yo;
    const firma = `${Math.round(yo.x)},${Math.round(yo.y)},${yo.dir},${yo.mov}`;
    this.latido = (this.latido || 0) + 1;
    if (firma === this.ultimaFirma && this.latido < 10) return;
    this.latido = 0;
    this.ultimaFirma = firma;
    this.enlace.enviar({ t: 'p', x: Math.round(yo.x * 10) / 10, y: Math.round(yo.y * 10) / 10, d: yo.dir, m: yo.mov ? 1 : 0, n: yo.tp }, true);
  }

  radioVision() {
    if (!this.yo.vivo) return Infinity;
    if (this.yo.rol === 'asesino') return VISION.asesino;
    return this.estado.luces ? VISION.apagon : VISION.inocente;
  }

  actualizarOtros(dt) {
    const radio = this.radioVision();
    const k = Math.min(1, dt * 14);
    for (const v of this.vistas.values()) {
      if (v.id === this.yo.id) continue;
      if (v.objetivo) {
        v.x += (v.objetivo.x - v.x) * k;
        v.y += (v.objetivo.y - v.y) * k;
      }
      let visible = v.presente;
      if (visible && this.yo.vivo) visible = v.vivo && dist(v, this.yo) <= radio * 0.9 && hayLinea(this.yo.x, this.yo.y, v.x, v.y);
      v.spr.setVisible(visible);
      v.sombra.setVisible(visible && v.vivo);
      v.nombre.setVisible(visible);
      if (visible) this.actualizarVista(v, v, dt);
    }
    const seVe = (p) => !this.yo.vivo || (dist(p, this.yo) <= radio * 0.9 && hayLinea(this.yo.x, this.yo.y, p.x, p.y));
    for (const img of this.cuerpos.values()) {
      img.setVisible(seVe({ x: img.x, y: img.y - 2 }));
      if (img.alfaBase) img.setAlpha(img.alfaBase);
    }
    if (this.camaraPos) {
      this.camaraImg.setPosition(this.camaraPos.x, this.camaraPos.y).setDepth(this.camaraPos.y - 4);
      this.camaraImg.setVisible(seVe(this.camaraPos));
    } else this.camaraImg.setVisible(false);
    if (this.miCamara) this.miCamaraImg.setPosition(this.miCamara.x, this.miCamara.y).setDepth(this.miCamara.y - 4).setVisible(true);
    else this.miCamaraImg.setVisible(false);
    this.actualizarGritos();
    const ahora = this.time.now / 1000;
    for (const [id, b] of this.burbujas) {
      const hecha = this.yo.hechas.has(id) || (id.startsWith('pasadizo') && !this.yo.vivo) || (this.yo.rol === 'asesino' && !this.yo.vivo);
      b.setVisible(!hecha);
      b.setY((id.startsWith('pasadizo') ? PASADIZOS[+id.slice(8)].y : TAREAS.find((t) => t.id === id).y) - 20 + Math.round(Math.sin(ahora * 4) * 1.5));
    }
  }

  actualizarVista(v, datos, dt) {
    // Cambiaformas: se dibuja con el color y el nombre de quien imita
    const look = v.apariencia || v.id;
    if (v.lookId !== look) {
      const info = this.jugadoresInfo.get(look) || this.jugadoresInfo.get(v.id);
      v.lookId = look;
      v.color = info.color;
      v.aspecto = info.aspecto;
      v.spr.setTexture(`pj_${info.aspecto}`, 0);
      v.nombre.setText(textoFuente(info.nombre));
    }
    const x = Math.round(v.x);
    const y = Math.round(v.y);
    v.spr.setPosition(x, y + 2);
    v.spr.setDepth(y);
    v.sombra.setPosition(x, y);
    v.sombra.setDepth(y - 20);
    v.nombre.setPosition(x, y - 21);
    const fantasma = !v.vivo;
    v.spr.setAlpha(fantasma ? 0.45 : v.invisible ? 0.3 : 1);
    v.nombre.setAlpha(fantasma ? 0.6 : v.invisible ? 0.4 : 1);
    v.escudoImg.setVisible(v.escudo && v.spr.visible);
    const voz = this.enlace.voz;
    const habla = !!voz && v.spr.visible && voz.hablando(v.id);
    v.vozImg.setVisible(habla);
    if (habla) v.vozImg.setPosition(x, y - 21 - v.nombre.height - 1);
    if (v.escudo) v.escudoImg.setPosition(x, y + 4).setDepth(y + 1);
    if (fantasma) v.spr.setY(y + 2 + Math.sin(this.time.now / 300 + v.color) * 1.5);
    const dir = NOMBRE_DIR[v.dir] || 'abajo';
    v.spr.setFlipX(v.dir === 2);
    const clave = `andar_${v.aspecto}_${dir}`;
    if (v.mov) {
      if (!v.spr.anims.isPlaying || v.spr.anims.currentAnim.key !== clave) v.spr.play(clave);
    } else {
      v.spr.stop();
      v.spr.setFrame(DIRS.indexOf(dir) * 3);
    }
  }

  // ---------- Habilidades de roles especiales (tecla V) ----------

  personaCercana(rango) {
    let mejor = null;
    for (const v of this.vistas.values()) {
      if (v.id === this.yo.id || !v.vivo || !v.presente || !v.spr.visible) continue;
      const d = dist(v, this.yo);
      if (d <= rango && (!mejor || d < mejor.d) && hayLinea(this.yo.x, this.yo.y, v.x, v.y)) mejor = { id: v.id, d };
    }
    return mejor;
  }

  casosDisponibles(objetivo) {
    return this.casos.map((c, i) => ({ ...c, i })).filter((c) => c.preguntas.length < 3 && !(objetivo && c.preguntas.some((p) => p.id === objetivo)));
  }

  usarHabilidad() {
    const yo = this.yo;
    const h = this.estado.yo.h || {};
    const ui = this.enlace.ui;
    const nombre = (id) => (this.jugadoresInfo.get(id) || {}).nombre || '?';
    switch (yo.subrol) {
      case 'medico':
        if (!yo.vivo || !(h.bat > 0)) return;
        this.enlace.enviar({ t: 'vitales', abierto: true });
        ui.abrirVitales(this.jugadoresInfo, () => this.enlace.enviar({ t: 'vitales', abierto: false }));
        break;
      case 'detective': {
        if (!yo.vivo) return;
        const o = this.personaCercana(DISTANCIA.investigar);
        if (!o) return ui.aviso('Acércate a alguien para investigarlo', 2000);
        const casos = this.casosDisponibles(o.id);
        if (!this.casos.length) return ui.aviso('Aún no hay asesinatos que investigar', 2500);
        if (!casos.length) return ui.aviso(`Ya no puedes preguntar a ${nombre(o.id)} por ningún caso`, 2500);
        if (casos.length === 1) return this.enlace.enviar({ t: 'investigar', objetivo: o.id, caso: casos[0].i });
        ui.minijuegos.abrirSelector(
          `Investigar a ${nombre(o.id)}`,
          '¿Sobre qué asesinato quieres preguntar?',
          casos.map((c) => ({ id: c.i, nombre: `Muerte de ${nombre(c.victima)} (${c.preguntas.length}/3)`, imagen: imagenRetrato((this.jugadoresInfo.get(c.victima) || {}).aspecto || 0) })),
          (i) => this.enlace.enviar({ t: 'investigar', objetivo: o.id, caso: i })
        );
        break;
      }
      case 'camarografo':
        if (yo.vivo && !h.puesta) this.enlace.enviar({ t: 'camara' });
        break;
      case 'angel': {
        if (yo.vivo || h.cd > 0) return;
        const vivos = [...this.vistas.values()].filter((v) => v.vivo && v.presente && v.id !== yo.id);
        ui.minijuegos.abrirSelector(
          'Escudo del ángel',
          `Protege a un vivo durante ${TIEMPOS.escudo} segundos.`,
          vivos.map((v) => ({ id: v.id, nombre: nombre(v.id), imagen: imagenRetrato((this.jugadoresInfo.get(v.id) || {}).aspecto || 0) })),
          (id) => this.enlace.enviar({ t: 'escudo', objetivo: id })
        );
        break;
      }
      case 'fantasma':
        if (yo.vivo && h.cd <= 0 && !h.act) this.enlace.enviar({ t: 'invisible' });
        break;
    }
  }

  estadoHabilidad() {
    const yo = this.yo;
    const h = this.estado.yo.h || {};
    const oculto = { visible: false };
    switch (yo.subrol) {
      case 'medico':
        return yo.vivo ? { visible: true, activo: h.bat > 0, texto: `Vitales ${h.bat || 0}s`, cd: h.bat > 0 ? '' : '✕' } : oculto;
      case 'detective':
        return yo.vivo ? { visible: true, activo: !!this.personaCercana(DISTANCIA.investigar) && this.casosDisponibles().length > 0, texto: 'Investigar', cd: '' } : oculto;
      case 'camarografo':
        return yo.vivo && !h.puesta ? { visible: true, activo: true, texto: 'Cámara', cd: '' } : oculto;
      case 'angel':
        return !yo.vivo ? { visible: true, activo: h.cd <= 0, texto: 'Escudo', cd: h.cd > 0 ? h.cd : '' } : oculto;
      case 'fantasma':
        return yo.vivo ? { visible: true, activo: h.cd <= 0 && !h.act, texto: h.act > 0 ? 'Invisible' : 'Esfumarse', cd: h.act > 0 ? h.act : h.cd > 0 ? h.cd : '' } : oculto;
      default:
        return oculto;
    }
  }

  // ---------- Expulsión: el expulsado es arrojado al pozo del jardín ----------

  animarExpulsion(id) {
    this.terminarCinematica();
    const info = this.jugadoresInfo.get(id);
    if (!info) return;
    this.cinematica = true;
    const cam = this.cameras.main;
    cam.stopFollow();
    // Corte al jardín con un fundido desde negro
    cam.centerOn(POZO.x, POZO.y - 12);
    cam.fadeIn(500, 0, 0, 0);
    const suelo = POZO.y + 18;
    const spr = this.add.sprite(POZO.x - 70, suelo + 2, `pj_${info.aspecto}`, 6).setOrigin(0.5, 1).setDepth(suelo + 2);
    const nombre = this.add.bitmapText(spr.x, spr.y - 23, 'fuente', textoFuente(info.nombre)).setOrigin(0.5, 1).setDepth(7000);
    const sombra = this.add.ellipse(spr.x, suelo, 12, 5, 0x000000, 0.22).setDepth(suelo - 20);
    this.actores = [spr, nombre, sombra];
    const seguir = () => {
      nombre.setPosition(Math.round(spr.x), Math.round(spr.y - 23));
      sombra.setPosition(Math.round(spr.x), suelo);
    };
    const tl = (ms, f) => this.actores && this.time.delayedCall(ms, () => this.cinematica && f());
    // 1) Camina hasta el borde del pozo
    tl(900, () => {
      spr.play(`andar_${info.aspecto}_lado`);
      this.tweens.add({ targets: spr, x: POZO.x - 24, duration: 1500, onUpdate: seguir, onComplete: () => spr.stop().setFrame(6) });
    });
    // 2) Duda un momento mirando al público y salta al brocal
    tl(2600, () => spr.setFrame(0));
    tl(3100, () => {
      spr.setFrame(6);
      sombra.setVisible(false);
      sonar('caida');
      this.tweens.add({ targets: spr, x: POZO.x, duration: 450, onUpdate: seguir });
      this.tweens.add({
        targets: spr,
        y: POZO.y - 16,
        duration: 225,
        yoyo: true,
        ease: 'Sine.easeOut',
        onUpdate: seguir,
        onComplete: () => {
          // 3) Cae dentro: el brocal del pozo lo tapa mientras se hunde
          spr.setDepth(POZO.y + 10);
          nombre.setVisible(false);
          this.tweens.add({ targets: spr, y: POZO.y + 24, angle: 25, alpha: 0, duration: 650, ease: 'Quad.easeIn' });
        }
      });
    });
    // 4) Chapuzón
    tl(4300, () => {
      sonar('chapuzon');
      cam.shake(200, 0.006);
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI * (0.15 + 0.7 * (i / 11));
        const gota = this.add.image(POZO.x, POZO.y - 2, 'esquirla').setTint(0x6ab0f0).setDepth(POZO.y + 30);
        this.actores.push(gota);
        this.tweens.add({
          targets: gota,
          x: POZO.x + Math.cos(a) * (16 + Math.random() * 10),
          y: POZO.y - 2 + Math.sin(a) * (18 + Math.random() * 10),
          alpha: 0,
          duration: 700,
          ease: 'Quad.easeOut'
        });
      }
    });
  }

  terminarCinematica() {
    if (this.actores) this.actores.forEach((o) => o.destroy());
    this.actores = null;
    if (!this.cinematica) return;
    this.cinematica = false;
    const v = this.yo && this.vistas.get(this.yo.id);
    if (v && this.enJuego) this.cameras.main.startFollow(v.spr, true, 1, 1, 0, -10);
  }

  // Grito del alertador: marca en el lugar y flecha en el borde de la pantalla
  agregarGrito(x, y) {
    sonar('grito');
    const marca = this.add.image(x, y - 14, 'grito').setDepth(9600);
    const flecha = this.add.image(0, 0, 'flecha').setScrollFactor(0).setDepth(9600).setTint(0xff5050).setVisible(false);
    this.gritos.push({ x, y, marca, flecha, hasta: this.time.now + TIEMPOS.grito * 1000 });
  }

  actualizarGritos() {
    const cam = this.cameras.main;
    const ahora = this.time.now;
    this.gritos = this.gritos.filter((g) => {
      if (ahora > g.hasta) {
        g.marca.destroy();
        g.flecha.destroy();
        return false;
      }
      const pulso = 1 + Math.sin(ahora / 90) * 0.15;
      g.marca.setScale(pulso);
      const sx = g.x - cam.scrollX;
      const sy = g.y - 14 - cam.scrollY;
      const m = 12;
      const dentro = sx > m && sx < cam.width - m && sy > m && sy < cam.height - m;
      g.flecha.setVisible(!dentro);
      if (!dentro) {
        const cx = cam.width / 2;
        const cy = cam.height / 2;
        const ang = Math.atan2(sy - cy, sx - cx);
        const t = Math.min((cx - m) / Math.max(1e-6, Math.abs(Math.cos(ang))), (cy - m) / Math.max(1e-6, Math.abs(Math.sin(ang))));
        g.flecha.setPosition(Math.round(cx + Math.cos(ang) * t), Math.round(cy + Math.sin(ang) * t)).setRotation(ang);
      }
      return true;
    });
  }

  esquirlas(x, y) {
    sonar('escudo');
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const img = this.add.image(x, y - 10, 'esquirla').setDepth(7600);
      this.tweens.add({ targets: img, x: x + Math.cos(a) * 18, y: y - 10 + Math.sin(a) * 14, alpha: 0, duration: 600, onComplete: () => img.destroy() });
    }
  }

  // Datos para el mapa de la casa
  datosMapa() {
    if (!this.enJuego) return null;
    const pendientes = this.yo.tareas.filter((id) => !this.yo.hechas.has(id)).map((id) => TAREAS.find((t) => t.id === id));
    const companeros = [...this.yo.companeros].map((id) => this.vistas.get(id)).filter((v) => v && v.presente && v.vivo);
    return {
      yo: { x: this.yo.x, y: this.yo.y, color: this.vistas.get(this.yo.id).color },
      tareas: this.yo.rol === 'asesino' && !this.yo.vivo ? [] : pendientes,
      companeros: companeros.map((v) => ({ x: v.x, y: v.y, color: v.color })),
      fusibles: this.estado.luces ? FUSIBLES : null,
      gritos: this.gritos.map((g) => ({ x: g.x, y: g.y })),
      asesino: this.yo.rol === 'asesino' && this.yo.vivo,
      cdSabotaje: this.estado.yo.cdS,
      luces: this.estado.luces
    };
  }

  // Rayos desde los ojos del jugador: entran como mucho 20 px en el muro y se cortan al salir de él
  // (así se ve la cara del muro, pero no lo que hay detrás).
  rayos(ox, oy, radio) {
    const res = new Array(RAYOS);
    const paso = 3;
    for (let i = 0; i < RAYOS; i++) {
      const a = (i / RAYOS) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      let d = 0;
      let entrada = -1;
      while (d < radio) {
        d += paso;
        const tx = Math.floor((ox + dx * d) / TILE);
        const ty = Math.floor((oy + dy * d) / TILE);
        if (bloqueaVista(tx, ty)) {
          if (entrada < 0) entrada = d;
          else if (d - entrada > 20) break;
        } else if (entrada >= 0) {
          d -= paso;
          break;
        }
      }
      res[i] = Math.min(d, radio);
    }
    return res;
  }

  dibujarOscuridad() {
    const rt = this.oscuridad;
    rt.clear();
    if (!this.yo.vivo || this.cinematica) return;
    const radio = this.radioVision();
    const cam = this.cameras.main;
    const ox = this.yo.x;
    const oy = this.yo.y - 4;
    const distancias = this.rayos(ox, oy, radio);
    const apagon = this.estado.luces && this.yo.rol !== 'asesino';
    rt.fill(0x0a0612, apagon ? 0.95 : 0.86);
    const g = this.formaVision;
    g.clear();
    const sx = Math.round(cam.scrollX);
    const sy = Math.round(cam.scrollY);
    // Tres capas para un borde suave escalonado (estilo pixel)
    for (const [f, alfa] of [[1, 0.45], [0.88, 0.6], [0.76, 1]]) {
      g.fillStyle(0xffffff, alfa);
      g.beginPath();
      distancias.forEach((d, i) => {
        const a = (i / RAYOS) * Math.PI * 2;
        const r = Math.min(d, radio * f);
        const x = ox + Math.cos(a) * r - sx;
        const y = oy + Math.sin(a) * r - sy;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.closePath();
      g.fillPath();
    }
    rt.erase(g);
  }

  // Durante el apagón, una flecha guía a la caja de fusibles
  actualizarFlecha() {
    const f = this.flecha;
    if (!this.estado.luces || !this.yo.vivo || this.enReunion || this.cinematica) {
      f.setVisible(false);
      return;
    }
    const cam = this.cameras.main;
    const sx = FUSIBLES.tx * TILE + 8 - cam.scrollX;
    const sy = FUSIBLES.ty * TILE + 8 - cam.scrollY;
    const w = cam.width;
    const h = cam.height;
    const m = 12;
    const vaiven = Math.sin(this.time.now / 140) * 2;
    f.setVisible(true);
    if (sx > m && sx < w - m && sy > m + 14 && sy < h - m) {
      f.setPosition(Math.round(sx), Math.round(sy - 16 + vaiven));
      f.setRotation(Math.PI / 2);
    } else {
      const cx = w / 2;
      const cy = h / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const t = Math.min((w / 2 - m) / Math.max(1e-6, Math.abs(Math.cos(ang))), (h / 2 - m) / Math.max(1e-6, Math.abs(Math.sin(ang))));
      f.setPosition(Math.round(cx + Math.cos(ang) * (t + vaiven)), Math.round(cy + Math.sin(ang) * (t + vaiven)));
      f.setRotation(ang);
    }
  }

  // Nube de humo al disfrazarse (solo si se ve)
  humo(x, y) {
    if (!this.yo) return;
    if (this.yo.vivo && (dist({ x, y }, this.yo) > this.radioVision() || !hayLinea(this.yo.x, this.yo.y, x, y))) return;
    sonar('pasadizo');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const img = this.add.image(x, y - 10, 'humo').setDepth(7500).setAlpha(0.9);
      this.tweens.add({ targets: img, x: x + Math.cos(a) * 14, y: y - 10 + Math.sin(a) * 10, alpha: 0, scale: 1.8, duration: 500, onComplete: () => img.destroy() });
    }
  }

  // La música se vuelve más tensa con apagones, cuerpos a la vista y pocos sobrevivientes
  actualizarTension() {
    let t = 0.15;
    if (!this.yo.vivo) t = 0.1;
    else {
      if (this.estado.luces) t += 0.35;
      let cuerpoVisible = false;
      for (const [id, img] of this.cuerpos) {
        if (!img.visible) continue;
        cuerpoVisible = true;
        if (!this.cuerposVistos.has(id)) {
          this.cuerposVistos.add(id);
          sonar('cuerpo');
        }
      }
      if (cuerpoVisible) t += 0.4;
      const vivos = [...this.vistas.values()].filter((v) => v.vivo && v.presente).length;
      if (vivos <= 4) t += 0.2;
      if (this.estado.yo.inf > 0) t += 0.6;
    }
    fijarTension(t);
  }

  actualizarHud(time) {
    const ui = this.enlace.ui;
    if (!this.relojTension || time - this.relojTension > 400) {
      this.relojTension = time;
      this.actualizarTension();
    }
    if (!this.relojHud || time - this.relojHud > 100) {
      this.relojHud = time;
      document.getElementById('hud-mic').classList.toggle('hablando', !!this.enlace.voz && this.enlace.voz.yoHablando());
      const inf = this.estado.yo.inf || 0;
      if (inf !== this.ultimoInf) {
        if (inf > 0) ui.aviso(`¡Un alien crece en tu pecho! Te quedan ${inf} s`, 0);
        else if (this.ultimoInf > 0) ui.ocultarAviso();
        this.ultimoInf = inf;
      }
      if (ui.minijuegos.id === 'vitales' && ui.minijuegos.abierto) ui.actualizarVitales(this.estado.yo.h);
      const pz = this.enPasadizo() && !this.enReunion ? PASADIZOS[this.estado.yo.pz] : null;
      ui.mostrarPasadizo(pz ? pz.nombre : null);
      const sala = salaEn(this.yo.x, this.yo.y);
      if (sala !== this.ultimaSala) {
        this.ultimaSala = sala;
        ui.mostrarLugar(sala);
      }
      const usar = this.candidatoUsar();
      const yo = this.estado.yo;
      ui.actualizarAcciones({
        usar: usar
          ? {
              activo: usar.tipo !== 'campana' || (usar.quedan > 0 && usar.espera <= 0),
              texto: usar.tipo === 'tarea' ? 'Tarea' : usar.tipo === 'campana' ? 'Campana' : usar.tipo === 'pasadizo' ? 'Pasadizo' : usar.tipo === 'camara' ? 'Recoger' : 'Arreglar',
              cd: usar.tipo === 'campana' && usar.espera > 0 ? usar.espera : usar.tipo === 'campana' && usar.quedan <= 0 ? '✕' : ''
            }
          : { activo: false, texto: 'Usar', cd: '' },
        reportar: { activo: !!this.cuerpoCercano() && this.puedeMover(), visible: this.yo.vivo },
        matar: { visible: this.yo.rol === 'asesino' && this.yo.vivo, activo: !!this.victimaCercana() && yo.cdM <= 0, cd: yo.cdM > 0 ? yo.cdM : '' },
        sabotaje: { visible: this.yo.rol === 'asesino' && this.yo.vivo, activo: yo.cdS <= 0 && !this.estado.luces, cd: yo.cdS > 0 ? yo.cdS : '' },
        habilidad: this.estadoHabilidad(),
        disfraz: {
          visible: this.yo.subrol === 'cambiaformas' && this.yo.vivo,
          activo: yo.cdD <= 0 && !yo.dis,
          texto: yo.dis > 0 ? 'Disfrazado' : 'Disfraz',
          cd: yo.dis > 0 ? yo.dis : yo.cdD > 0 ? yo.cdD : ''
        }
      });
      ui.actualizarTareas(this.yo, this.estado);
    }
  }
}
