import { sonar, nota } from './sonido.js';

// Minijuegos de las tareas. Todo usa eventos de puntero, así funciona igual con mouse y con el dedo.

const $ = (id) => document.getElementById(id);
const azar = (a, b) => a + Math.random() * (b - a);
const barajar = (l) => [...l].sort(() => Math.random() - 0.5);

function el(padre, clase, texto = '', estilos = {}) {
  const d = document.createElement('div');
  d.className = clase;
  if (texto) d.textContent = texto;
  Object.assign(d.style, estilos);
  if (padre) padre.appendChild(d);
  return d;
}

// Posición del puntero en porcentaje del área
function relativo(area, e) {
  const r = area.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
}

function sacudir(nodo) {
  nodo.classList.remove('mj-error');
  void nodo.offsetWidth;
  nodo.classList.add('mj-error');
  sonar('voto');
}

// ---------- Motores genéricos ----------

// Pasar el puntero (arrastrando) sobre zonas hasta "gastarlas": frotar manchas, regar plantas...
function zonas(area, fin, { fondo, herramienta, objetivos, radio = 13, dano = 0.06, dibujar }) {
  area.style.background = fondo;
  const cursor = el(area, 'mj-herramienta', herramienta);
  const lista = objetivos.map((o) => {
    const nodo = el(area, `mj-zona ${o.clase || ''}`, o.texto || '', { left: `${o.x}%`, top: `${o.y}%`, ...(o.estilos || {}) });
    const z = { ...o, nodo, vida: 1 };
    dibujar(z);
    return z;
  });
  let activo = false;
  const mover = (e) => {
    const p = relativo(area, e);
    cursor.style.left = `${p.x}%`;
    cursor.style.top = `${p.y}%`;
    if (!activo) return;
    for (const z of lista) {
      if (z.vida <= 0) continue;
      const dx = p.x - z.x;
      const dy = (p.y - z.y) * 0.6;
      if (Math.hypot(dx, dy) < radio) {
        z.vida = Math.max(0, z.vida - dano);
        dibujar(z);
        if (z.vida <= 0) sonar('click');
      }
    }
    if (lista.every((z) => z.vida <= 0)) fin();
  };
  area.onpointerdown = (e) => {
    activo = true;
    area.setPointerCapture(e.pointerId);
    mover(e);
  };
  area.onpointermove = mover;
  area.onpointerup = area.onpointercancel = () => (activo = false);
}

function manchas(n, emoji, clase) {
  return Array.from({ length: n }, () => ({ x: azar(15, 85), y: azar(18, 82), texto: emoji, clase }));
}

function frotar(fondo, herramienta, n, emoji, clase) {
  return (area, fin) =>
    zonas(area, fin, {
      fondo,
      herramienta,
      objetivos: manchas(n, emoji, clase),
      dibujar: (z) => {
        z.nodo.style.opacity = z.vida;
        z.nodo.style.transform = `translate(-50%, -50%) scale(${0.6 + z.vida * 0.4})`;
      }
    });
}

// Arrastrar una pieza por un riel hasta el final
function riel(area, fin, { fondo, pieza, vertical, inicio, texto }) {
  area.style.background = fondo;
  const pista = el(area, `mj-riel ${vertical ? 'vertical' : ''}`);
  el(pista, 'mj-meta', texto);
  const asa = el(pista, 'mj-asa', pieza);
  let arrastrando = false;
  let progreso = 0;
  const poner = (v) => {
    progreso = Math.max(0, Math.min(1, v));
    if (vertical) asa.style.top = `${(1 - progreso) * 100}%`;
    else asa.style.left = `${progreso * 100}%`;
    if (inicio) inicio(progreso);
  };
  poner(0);
  asa.onpointerdown = (e) => {
    arrastrando = true;
    asa.setPointerCapture(e.pointerId);
  };
  asa.onpointermove = (e) => {
    if (!arrastrando) return;
    const r = pista.getBoundingClientRect();
    poner(vertical ? 1 - (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width);
    if (progreso >= 0.97) {
      arrastrando = false;
      fin();
    }
  };
  asa.onpointerup = asa.onpointercancel = () => {
    if (!arrastrando) return;
    arrastrando = false;
    if (progreso < 0.97) poner(0);
  };
}

// Arrastrar un objeto y soltarlo sobre un destino
function soltar(area, fin, { fondo, objeto, destino, textoDestino }) {
  area.style.background = fondo;
  const meta = el(area, 'mj-destino', destino, { left: '78%', top: '50%' });
  if (textoDestino) el(meta, 'mj-etiqueta', textoDestino);
  const cosa = el(area, 'mj-arrastrable', objeto, { left: '18%', top: '55%' });
  let activo = false;
  cosa.onpointerdown = (e) => {
    activo = true;
    cosa.setPointerCapture(e.pointerId);
    cosa.classList.add('levantado');
  };
  cosa.onpointermove = (e) => {
    if (!activo) return;
    const p = relativo(area, e);
    cosa.style.left = `${p.x}%`;
    cosa.style.top = `${p.y}%`;
  };
  cosa.onpointerup = cosa.onpointercancel = (e) => {
    if (!activo) return;
    activo = false;
    cosa.classList.remove('levantado');
    const p = relativo(area, e);
    if (Math.abs(p.x - 78) < 16 && Math.abs(p.y - 50) < 26) {
      cosa.style.left = '74%';
      cosa.style.top = '50%';
      fin();
    } else {
      cosa.style.left = '18%';
      cosa.style.top = '55%';
    }
  };
}

// Tocar objetos en un orden concreto
function enOrden(area, fin, { fondo, items, guia }) {
  area.style.background = fondo;
  if (guia) el(area, 'mj-guia', guia);
  const fila = el(area, 'mj-fila');
  let siguiente = 0;
  const nodos = [];
  for (const it of barajar(items)) {
    const b = el(fila, 'mj-ficha', it.texto, it.estilos || {});
    b.onpointerdown = (e) => {
      e.preventDefault();
      if (b.classList.contains('hecho')) return;
      if (it.orden === siguiente) {
        siguiente++;
        b.classList.add('hecho');
        sonar('click');
        if (siguiente === items.length) fin();
      } else {
        sacudir(fila);
        siguiente = 0;
        nodos.forEach((n) => n.classList.remove('hecho'));
      }
    };
    nodos.push(b);
  }
}

// Tocar cada objeto una o varias veces
function tocarTodos(area, fin, { fondo, items, toques = 1, alTocar }) {
  area.style.background = fondo;
  const fila = el(area, 'mj-fila mj-envolver');
  let restantes = items.length;
  items.forEach((it, i) => {
    const b = el(fila, 'mj-ficha', it.texto, it.estilos || {});
    let n = 0;
    b.onpointerdown = (e) => {
      e.preventDefault();
      if (b.classList.contains('hecho')) return;
      n++;
      sonar('click');
      const listo = alTocar ? alTocar(b, it, n, i) : n >= toques;
      if (listo === 'fin') return fin();
      if (listo) {
        b.classList.add('hecho');
        restantes--;
        if (restantes === 0) fin();
      }
    };
  });
}

// ---------- Minijuegos concretos ----------

const MINIJUEGOS = {
  libros: {
    instruccion: 'Toca los libros del más bajo al más alto.',
    crear: (a, fin) => {
      const colores = ['#d84848', '#4878d0', '#48a858', '#e8c040', '#9858c0'];
      enOrden(a, fin, {
        fondo: 'linear-gradient(#7a4a28, #5a3820)',
        items: colores.map((c, i) => ({ orden: i, texto: '', estilos: { background: c, width: '34px', height: `${50 + i * 18}px`, borderRadius: '3px', alignSelf: 'flex-end' } }))
      });
    }
  },
  diario: {
    instruccion: 'Lee las páginas del diario.',
    crear: (a, fin) => {
      a.style.background = '#e8dcc0';
      const paginas = barajar([
        '"Esta casa cruje de noche... alguien camina por los pasillos."',
        '"Encontré un pasadizo detrás de la chimenea. ¿A dónde llevará?"',
        '"El reloj del pasillo se detuvo a las 3:33."',
        '"Alguien apagó las luces otra vez. Escuché un grito."',
        '"No confíes en nadie que se vea igual que siempre."'
      ]).slice(0, 3);
      const hoja = el(a, 'mj-hoja');
      const texto = el(hoja, 'mj-texto', paginas[0]);
      const pie = el(hoja, 'mj-pie', `Página 1 de ${paginas.length}`);
      const b = el(a, 'mj-boton', 'Pasar página ▶');
      let i = 0;
      b.onpointerdown = (e) => {
        e.preventDefault();
        i++;
        sonar('click');
        if (i >= paginas.length) return fin();
        texto.textContent = paginas[i];
        pie.textContent = `Página ${i + 1} de ${paginas.length}`;
        if (i === paginas.length - 1) b.textContent = 'Cerrar diario ✓';
      };
    }
  },
  cama: {
    instruccion: 'Arrastra la cobija hacia arriba.',
    crear: (a, fin) => {
      const cobija = el(a, 'mj-cobija');
      riel(a, fin, { fondo: '#f4f0e8', pieza: '🛏️', vertical: true, texto: '▲', inicio: (p) => (cobija.style.height = `${15 + p * 75}%`) });
    }
  },
  ropa: {
    instruccion: 'Toca cada prenda dos veces para doblarla.',
    crear: (a, fin) =>
      tocarTodos(a, fin, {
        fondo: '#c8a070',
        items: ['👕', '👖', '🧦', '👗'].map((t) => ({ texto: t })),
        alTocar: (b, it, n) => {
          b.style.transform = n === 1 ? 'scale(0.7) rotate(-8deg)' : 'scale(0.5)';
          return n >= 2;
        }
      })
  },
  baul: {
    instruccion: 'Saca cosas del baúl hasta encontrar la llave.',
    crear: (a, fin) => {
      const cosas = barajar(['🧸', '📜', '🕯️', '🎩', '🧦', '🪀', '📷', '🧶']);
      const conLlave = Math.floor(azar(3, cosas.length));
      tocarTodos(a, fin, {
        fondo: 'linear-gradient(#9a6030, #6a3a18)',
        items: cosas.map((t) => ({ texto: t })),
        alTocar: (b, it, n, i) => {
          if (i === conLlave) {
            b.textContent = '🔑';
            b.classList.add('mj-brillo');
            setTimeout(fin, 500);
            return false;
          }
          return true;
        }
      });
    }
  },
  tina: { instruccion: 'Frota las manchas de la tina.', crear: frotar('linear-gradient(#f0f4f8, #a8d8f0)', '🧽', 6, '', 'mj-mugre') },
  espejo: { instruccion: 'Limpia las huellas del espejo.', crear: frotar('linear-gradient(135deg, #c8e8f8, #e8f8ff 40%, #a8d0e8)', '🧻', 5, '', 'mj-huella') },
  platos: { instruccion: 'Frota los restos de comida del plato.', crear: frotar('radial-gradient(circle, #ffffff 38%, #dfe6ee 40%, #ffffff 55%, #98b8d0 57%)', '🧽', 6, '', 'mj-comida') },
  plata: { instruccion: 'Pule las partes oscuras de la tetera.', crear: frotar('radial-gradient(circle at 40% 40%, #ffffff, #c8d0dc 50%, #8a94a4)', '🧤', 6, '', 'mj-oxido') },
  reloj: {
    instruccion: 'Gira la llave 3 vueltas completas (arrastra en círculo).',
    crear: (a, fin) => {
      a.style.background = '#8f5a2e';
      const esfera = el(a, 'mj-esfera');
      const llave = el(esfera, 'mj-llave', '🗝️');
      const barra = el(a, 'mj-progreso');
      const relleno = el(barra, 'mj-relleno');
      let anterior = null;
      let total = 0;
      const angulo = (e) => {
        const r = esfera.getBoundingClientRect();
        return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      };
      a.onpointerdown = (e) => {
        anterior = angulo(e);
        a.setPointerCapture(e.pointerId);
      };
      a.onpointermove = (e) => {
        if (anterior === null) return;
        const ang = angulo(e);
        let d = ang - anterior;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        anterior = ang;
        total += Math.abs(d);
        llave.style.transform = `rotate(${(total * 180) / Math.PI}deg)`;
        relleno.style.width = `${Math.min(100, (total / (Math.PI * 6)) * 100)}%`;
        if (total >= Math.PI * 6) {
          anterior = null;
          fin();
        }
      };
      a.onpointerup = a.onpointercancel = () => (anterior = null);
    }
  },
  sopa: {
    instruccion: 'Echa los ingredientes en el orden de la receta.',
    crear: (a, fin) => {
      const receta = barajar(['🥕', '🧅', '🍅', '🥔', '🧂']).slice(0, 4);
      enOrden(a, fin, { fondo: 'linear-gradient(#f4e6c8, #dcc498)', guia: `Receta: ${receta.join(' → ')}   🍲`, items: receta.map((t, i) => ({ orden: i, texto: t })) });
    }
  },
  hielo: {
    instruccion: 'Saca todos los cubos de hielo.',
    crear: (a, fin) => tocarTodos(a, fin, { fondo: 'linear-gradient(#e8f4fa, #b8d8ec)', items: Array.from({ length: 8 }, () => ({ texto: '🧊' })) })
  },
  basura: {
    instruccion: 'Lleva la bolsa al bote de basura.',
    crear: (a, fin) => soltar(a, fin, { fondo: 'linear-gradient(#f4e6c8, #c8ae80)', objeto: '🛍️', destino: '🗑️' })
  },
  fuego: {
    instruccion: '¡Toca el fuelle rápido para avivar el fuego!',
    crear: (a, fin) => {
      a.style.background = 'radial-gradient(circle at 50% 70%, #5a3020, #2a1810)';
      const fuego = el(a, 'mj-fuego', '🔥');
      const barra = el(a, 'mj-progreso');
      const relleno = el(barra, 'mj-relleno mj-relleno-fuego');
      const b = el(a, 'mj-boton', '💨 Fuelle');
      let nivel = 0;
      let listo = false;
      b.onpointerdown = (e) => {
        e.preventDefault();
        nivel = Math.min(1, nivel + 0.1);
        sonar('click');
      };
      const t = setInterval(() => {
        nivel = Math.max(0, nivel - 0.012);
        fuego.style.transform = `translate(-50%, -50%) scale(${0.5 + nivel * 1.3})`;
        relleno.style.width = `${nivel * 100}%`;
        if (nivel >= 1 && !listo) {
          listo = true;
          fin();
        }
      }, 50);
      return () => clearInterval(t);
    }
  },
  tele: {
    instruccion: 'Mueve la perilla hasta que la imagen se vea clara.',
    crear: (a, fin) => {
      a.style.background = '#383840';
      const pantalla = el(a, 'mj-tele');
      const imagen = el(pantalla, 'mj-tele-imagen', '📺 🌅');
      const ruido = el(pantalla, 'mj-ruido');
      const meta = azar(15, 85);
      const control = document.createElement('input');
      control.type = 'range';
      control.min = '0';
      control.max = '100';
      control.value = String(meta > 50 ? 5 : 95);
      control.className = 'mj-perilla';
      a.appendChild(control);
      let dentro = 0;
      const t = setInterval(() => {
        const d = Math.abs(+control.value - meta);
        ruido.style.opacity = Math.min(1, d / 30);
        imagen.style.filter = `blur(${Math.min(6, d / 6)}px)`;
        dentro = d < 4 ? dentro + 1 : 0;
        if (dentro >= 12) {
          clearInterval(t);
          fin();
        }
      }, 50);
      return () => clearInterval(t);
    }
  },
  piano: {
    instruccion: 'Escucha la melodía y repítela.',
    crear: (a, fin) => {
      a.style.background = '#28242c';
      const notas = [262, 294, 330, 349, 392];
      const teclado = el(a, 'mj-teclado');
      const aviso = el(a, 'mj-guia', 'Escucha...');
      const teclas = notas.map((f, i) => {
        const t = el(teclado, 'mj-tecla');
        t.onpointerdown = (e) => {
          e.preventDefault();
          tocar(i);
        };
        return t;
      });
      const secuencia = Array.from({ length: 4 }, () => Math.floor(Math.random() * notas.length));
      let pos = 0;
      let escuchando = false;
      const timers = [];
      const iluminar = (i) => {
        teclas[i].classList.add('activa');
        nota(notas[i]);
        timers.push(setTimeout(() => teclas[i].classList.remove('activa'), 260));
      };
      const reproducir = () => {
        escuchando = false;
        pos = 0;
        aviso.textContent = 'Escucha...';
        secuencia.forEach((n, k) => timers.push(setTimeout(() => iluminar(n), 600 + k * 500)));
        timers.push(
          setTimeout(() => {
            escuchando = true;
            aviso.textContent = '¡Tu turno!';
          }, 600 + secuencia.length * 500)
        );
      };
      function tocar(i) {
        iluminar(i);
        if (!escuchando) return;
        if (i === secuencia[pos]) {
          pos++;
          if (pos === secuencia.length) {
            escuchando = false;
            aviso.textContent = '¡Afinado!';
            timers.push(setTimeout(fin, 400));
          }
        } else {
          sacudir(teclado);
          aviso.textContent = 'Uy, otra vez...';
          timers.push(setTimeout(reproducir, 700));
          escuchando = false;
        }
      }
      reproducir();
      return () => timers.forEach(clearTimeout);
    }
  },
  agua: {
    instruccion: 'Mantén presionado para subir el balde.',
    crear: (a, fin) => {
      a.style.background = 'linear-gradient(#78787f, #284860)';
      const pozo = el(a, 'mj-pozo');
      const balde = el(pozo, 'mj-balde', '🪣');
      const b = el(a, 'mj-boton', '⟲ Mantener');
      let subiendo = false;
      let nivel = 0;
      b.onpointerdown = (e) => {
        e.preventDefault();
        subiendo = true;
        b.setPointerCapture(e.pointerId);
      };
      b.onpointerup = b.onpointercancel = () => (subiendo = false);
      let listo = false;
      const t = setInterval(() => {
        nivel = Math.max(0, Math.min(1, nivel + (subiendo ? 0.02 : -0.03)));
        balde.style.top = `${85 - nivel * 75}%`;
        if (nivel >= 1 && !listo) {
          listo = true;
          fin();
        }
      }, 50);
      return () => clearInterval(t);
    }
  },
  flores: {
    instruccion: 'Arrastra la regadera sobre cada maceta.',
    crear: (a, fin) =>
      zonas(a, fin, {
        fondo: 'linear-gradient(#a8e0f8 55%, #90d070 55%)',
        herramienta: '🚿',
        radio: 10,
        dano: 0.025,
        objetivos: [18, 39, 61, 82].map((x) => ({ x, y: 68, texto: '🌱', clase: 'mj-maceta' })),
        dibujar: (z) => {
          z.nodo.textContent = z.vida <= 0 ? '🌷' : '🌱';
          z.nodo.style.setProperty('--agua', `${(1 - z.vida) * 100}%`);
        }
      })
  },
  lena: {
    instruccion: 'Toca "Cortar" cuando la marca esté en la zona verde (3 veces).',
    crear: (a, fin) => {
      a.style.background = 'linear-gradient(#90d070, #6a9a50)';
      const tronco = el(a, 'mj-fuego', '🪵');
      const barra = el(a, 'mj-timing');
      const zona = el(barra, 'mj-zona-verde');
      const marca = el(barra, 'mj-marca');
      const golpes = el(a, 'mj-guia', 'Cortes: 0 / 3');
      const b = el(a, 'mj-boton', '🪓 Cortar');
      let x = 0;
      let vel = 1.6;
      let aciertos = 0;
      let ancho = 22;
      let centro = azar(25, 75);
      const ubicar = () => {
        zona.style.left = `${centro - ancho / 2}%`;
        zona.style.width = `${ancho}%`;
      };
      ubicar();
      b.onpointerdown = (e) => {
        e.preventDefault();
        if (Math.abs(x - centro) <= ancho / 2) {
          aciertos++;
          sonar('click');
          tronco.style.transform = `translate(-50%, -50%) scale(${1 - aciertos * 0.2}) rotate(${aciertos * 25}deg)`;
          golpes.textContent = `Cortes: ${aciertos} / 3`;
          if (aciertos >= 3) return fin();
          ancho -= 4;
          vel += 0.5;
          centro = azar(20, 80);
          ubicar();
        } else sacudir(barra);
      };
      const t = setInterval(() => {
        x += vel;
        if (x >= 100 || x <= 0) vel = -vel;
        marca.style.left = `${x}%`;
      }, 16);
      return () => clearInterval(t);
    }
  },
  perro: {
    instruccion: 'Lleva el plato de comida al perro.',
    crear: (a, fin) => soltar(a, fin, { fondo: 'linear-gradient(#90d070, #70b458)', objeto: '🥣', destino: '🐶' })
  },
  juguetes: {
    instruccion: 'Toca cada juguete para guardarlo en la caja.',
    crear: (a, fin) => tocarTodos(a, fin, { fondo: 'linear-gradient(#f8e070, #f0c040)', items: barajar(['🧸', '🪀', '🚂', '🎲', '🪁', '⚽', '🧩']).slice(0, 6).map((texto) => ({ texto })) })
  },
  pizarra: { instruccion: 'Borra todo lo escrito en la pizarra.', crear: frotar('linear-gradient(#2e5a40, #24483a)', '🧽', 6, '', 'mj-tiza') },
  cartas: {
    instruccion: 'Ordena las cartas: tócalas del 1 al 5.',
    crear: (a, fin) =>
      enOrden(a, fin, {
        fondo: 'linear-gradient(#6a4a3a, #4a3020)',
        items: [1, 2, 3, 4, 5].map((n) => ({ orden: n - 1, texto: `✉${n}`, estilos: { fontSize: '24px', background: '#fff8e8', width: '62px' } }))
      })
  },
  caja: {
    instruccion: 'Escribe el código anotado en el papel.',
    crear: (a, fin) => {
      a.style.background = 'linear-gradient(#505868, #3a404c)';
      const codigo = String(Math.floor(azar(1000, 9999)));
      const fila = el(a, 'mj-fila');
      el(fila, 'mj-nota', `📝 ${codigo}`);
      const pantalla = el(fila, 'mj-pantalla', '----');
      const teclado = el(a, 'mj-numeros');
      let escrito = '';
      const mostrar = () => (pantalla.textContent = escrito.padEnd(4, '-'));
      for (const t of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']) {
        const b = el(teclado, 'mj-num', t);
        b.onpointerdown = (e) => {
          e.preventDefault();
          sonar('click');
          if (t === '⌫') escrito = escrito.slice(0, -1);
          else if (t === '✓') {
            if (escrito === codigo) return fin();
            sacudir(pantalla);
            escrito = '';
          } else if (escrito.length < 4) {
            escrito += t;
            if (escrito === codigo) {
              mostrar();
              return fin();
            }
          }
          mostrar();
        };
      }
    }
  },
  lavadora: {
    instruccion: 'Mete la ropa sucia en la lavadora.',
    crear: (a, fin) => soltar(a, fin, { fondo: 'linear-gradient(#f2f4f6, #c0d4e0)', objeto: '👕', destino: '🫧', textoDestino: 'Lavadora' })
  },
  tender: {
    instruccion: 'Toca cada prenda para colgarla con una pinza.',
    crear: (a, fin) =>
      tocarTodos(a, fin, {
        fondo: 'linear-gradient(#a8e0f8, #e8f4fa)',
        items: ['👕', '👖', '🧦', '🧣', '👗'].map((texto) => ({ texto })),
        alTocar: (b) => {
          b.style.transform = 'translateY(-40px)';
          b.style.background = '#f8e070';
          return true;
        }
      })
  },
  armadura: { instruccion: 'Pule el óxido de la armadura.', crear: frotar('radial-gradient(circle at 40% 30%, #f0f4f8, #a8b0bc 60%, #707888)', '🧤', 6, '', 'mj-oxido') },
  plantas: {
    instruccion: 'Lleva el brote a la maceta grande.',
    crear: (a, fin) => soltar(a, fin, { fondo: 'linear-gradient(#c8f0d0, #dc8a5e)', objeto: '🌱', destino: '🪴' })
  },
  auto: {
    instruccion: 'Aprieta las tuercas: toca cada una 3 veces.',
    crear: (a, fin) =>
      tocarTodos(a, fin, {
        fondo: 'radial-gradient(circle, #505058 30%, #2a2a30 32%, #2a2a30 55%, #a4a4ac 57%)',
        items: Array.from({ length: 4 }, () => ({ texto: '🔩' })),
        alTocar: (b, it, n) => {
          b.style.transform = `rotate(${n * 120}deg)`;
          return n >= 3;
        }
      })
  },
  peces: {
    instruccion: 'Toca a cada pez para darle de comer.',
    crear: (a, fin) => {
      tocarTodos(a, fin, {
        fondo: 'linear-gradient(#78b8f0, #2a6aa8)',
        items: Array.from({ length: 6 }, () => ({ texto: '🐟', estilos: { background: 'transparent', border: 'none' } })),
        alTocar: (b) => {
          b.textContent = '🐠';
          return true;
        }
      });
      // Los peces nadan un poco para que sea más vivo
      const peces = [...a.querySelectorAll('.mj-ficha')];
      const t = setInterval(() => {
        const ahora = Date.now() / 400;
        peces.forEach((p, i) => (p.style.translate = `${Math.sin(ahora + i) * 10}px ${Math.cos(ahora * 0.7 + i) * 6}px`));
      }, 50);
      return () => clearInterval(t);
    }
  },
  fusibles: {
    instruccion: 'Sube todos los interruptores para devolver la luz.',
    crear: (a, fin) => {
      a.style.background = 'linear-gradient(#7a7a88, #50505c)';
      const fila = el(a, 'mj-fila');
      const estados = Array.from({ length: 6 }, () => Math.random() < 0.4);
      estados[Math.floor(Math.random() * 3)] = false;
      estados[3 + Math.floor(Math.random() * 3)] = false;
      estados.forEach((on, i) => {
        const s = el(fila, `mj-interruptor ${on ? 'on' : ''}`);
        el(s, 'mj-palanca');
        el(s, 'mj-led');
        s.onpointerdown = (e) => {
          e.preventDefault();
          estados[i] = !estados[i];
          s.classList.toggle('on', estados[i]);
          sonar('click');
          if (estados.every(Boolean)) setTimeout(fin, 250);
        };
      });
    }
  }
};

export default class Minijuegos {
  constructor() {
    this.abierto = false;
    $('mj-cerrar').onclick = () => this.cerrar(false);
    document.addEventListener('keydown', (e) => {
      if (this.abierto && e.key === 'Escape') this.cerrar(false);
    });
  }

  abrir(id, titulo, alTerminar) {
    const def = MINIJUEGOS[id];
    if (!def) return false;
    this.cerrar(false);
    this.abierto = true;
    this.id = id;
    this.alTerminar = alTerminar;
    $('mj-titulo').textContent = titulo;
    $('mj-instruccion').textContent = def.instruccion;
    const area = $('mj-area');
    area.replaceWith(area.cloneNode(false));
    const nueva = $('mj-area');
    nueva.className = 'mj-area';
    nueva.removeAttribute('style');
    let terminado = false;
    this.limpieza = def.crear(nueva, () => {
      if (terminado || !this.abierto) return;
      terminado = true;
      nueva.classList.add('mj-listo');
      setTimeout(() => this.cerrar(true), 450);
    });
    $('minijuego').hidden = false;
    return true;
  }

  // Panel informativo (tableta del médico, foto de la cámara...)
  abrirPanel(id, titulo, instruccion, construir, alCerrar) {
    this.cerrar(false);
    this.abierto = true;
    this.id = id;
    this.alTerminar = () => alCerrar && alCerrar();
    $('mj-titulo').textContent = titulo;
    $('mj-instruccion').textContent = instruccion;
    const area = $('mj-area');
    area.replaceWith(area.cloneNode(false));
    const nueva = $('mj-area');
    nueva.className = 'mj-area mj-panel';
    nueva.removeAttribute('style');
    construir(nueva);
    $('minijuego').hidden = false;
    return nueva;
  }

  // Lista de opciones con retratos (para el disfraz)
  abrirSelector(titulo, instruccion, opciones, alElegir) {
    this.cerrar(false);
    this.abierto = true;
    this.id = 'selector';
    this.alTerminar = null;
    $('mj-titulo').textContent = titulo;
    $('mj-instruccion').textContent = instruccion;
    const area = $('mj-area');
    area.replaceWith(area.cloneNode(false));
    const nueva = $('mj-area');
    nueva.className = 'mj-area mj-selector';
    nueva.removeAttribute('style');
    for (const o of opciones) {
      const b = document.createElement('button');
      b.className = 'tarjeta';
      const i = document.createElement('img');
      i.src = o.imagen;
      b.appendChild(i);
      const s = document.createElement('span');
      s.className = 'nom';
      s.textContent = o.nombre;
      b.appendChild(s);
      b.onclick = () => {
        this.cerrar(false);
        alElegir(o.id);
      };
      nueva.appendChild(b);
    }
    $('minijuego').hidden = false;
  }

  cerrar(exito) {
    if (!this.abierto) return;
    this.abierto = false;
    if (this.limpieza) this.limpieza();
    this.limpieza = null;
    $('minijuego').hidden = true;
    const f = this.alTerminar;
    this.alTerminar = null;
    if (f) f(exito);
  }
}
