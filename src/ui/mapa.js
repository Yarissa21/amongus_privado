import { TILE, COLORES } from '../config.js';
import { ANCHO_MAPA, ALTO_MAPA, SALAS } from '../mundo/mapa.js';

const $ = (id) => document.getElementById(id);
const ESCALA = 6; // px del mapa por casilla

// Mapa de la mansión: muestra dónde estás y tus tareas. Los asesinos ven a su cómplice
// y pueden apagar las luces desde aquí (con el enfriamiento compartido).
export default class Mapa {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.abierto = false;
    this.base = null;
    $('mapa-cerrar').onclick = () => this.cerrar();
    $('mapa-sabotaje').onclick = () => this.ctrl.accion('sabotaje');
    $('hud-mapa').onclick = () => this.alternar();
  }

  alternar() {
    if (this.abierto) this.cerrar();
    else this.abrir();
  }

  prepararBase() {
    const escena = this.ctrl.escena;
    if (this.base || !escena || !escena.textures.exists('suelo')) return;
    const base = $('mapa-base');
    const marcas = $('mapa-marcas');
    base.width = marcas.width = ANCHO_MAPA * ESCALA;
    base.height = marcas.height = ALTO_MAPA * ESCALA;
    const ctx = base.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(escena.textures.get('suelo').getSourceImage(), 0, 0, base.width, base.height);
    ctx.fillStyle = 'rgba(20, 14, 30, 0.35)';
    ctx.fillRect(0, 0, base.width, base.height);
    ctx.font = '13px VT323, monospace';
    ctx.textAlign = 'center';
    for (const s of SALAS) {
      if (s.nombre === 'Pasillo') continue;
      const x = (s.x + s.w / 2) * ESCALA;
      const y = (s.y + s.h / 2) * ESCALA;
      ctx.fillStyle = '#1a1420';
      ctx.fillText(s.nombre, x + 1, y + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.nombre, x, y);
    }
    this.base = true;
  }

  abrir() {
    if (!this.ctrl.escena || !this.ctrl.escena.enJuego) return;
    this.prepararBase();
    this.abierto = true;
    $('mapa').hidden = false;
    $('hud-mapa').classList.add('activo');
    this.dibujar();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.dibujar(), 150);
  }

  cerrar() {
    this.abierto = false;
    clearInterval(this.timer);
    $('mapa').hidden = true;
    $('hud-mapa').classList.remove('activo');
  }

  dibujar() {
    const d = this.ctrl.escena && this.ctrl.escena.datosMapa();
    if (!d) return this.cerrar();
    const c = $('mapa-marcas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const k = ESCALA / TILE;
    const t = Date.now() / 1000;

    // Tareas pendientes
    for (const tarea of d.tareas) {
      const x = tarea.x * k;
      const y = tarea.y * k;
      ctx.fillStyle = '#f8d040';
      ctx.strokeStyle = '#2a2232';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a2232';
      ctx.fillRect(x - 0.5, y - 3, 1.5, 3.5);
      ctx.fillRect(x - 0.5, y + 1.5, 1.5, 1.5);
    }
    // Caja de fusibles durante el apagón
    if (d.fusibles && Math.sin(t * 8) > -0.3) {
      ctx.fillStyle = '#f8d040';
      ctx.font = '16px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', d.fusibles.x * k, d.fusibles.y * k - 4);
    }
    // Gritos del alertador
    for (const g of d.gritos) {
      ctx.strokeStyle = '#ff4040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x * k, g.y * k, 6 + (t * 12) % 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cómplices (solo asesinos)
    for (const o of d.companeros) {
      ctx.fillStyle = COLORES[o.color].ropa;
      ctx.strokeStyle = '#ff4040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x * k, o.y * k, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Tú
    const r = 5 + Math.sin(t * 6) * 1.2;
    ctx.fillStyle = COLORES[d.yo.color].ropa;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(d.yo.x * k, d.yo.y * k, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const boton = $('mapa-sabotaje');
    boton.hidden = !d.asesino;
    if (d.asesino) {
      boton.disabled = d.cdSabotaje > 0 || d.luces;
      boton.textContent = d.luces ? '💡 Luces apagadas' : d.cdSabotaje > 0 ? `💡 Apagar luces (${d.cdSabotaje}s)` : '💡 Apagar luces';
    }
  }
}
