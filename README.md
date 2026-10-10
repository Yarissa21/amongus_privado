# Misterio en la Mansión

Juego de deducción social en el navegador (estilo Among Us) con gráficos pixel art al estilo Pokémon HeartGold/SoulSilver. Hecho con **Phaser 3**, **Vite** y **PeerJS**. Todos los gráficos y sonidos se generan por código.

## Cómo jugar

De 4 a 15 personas están en una mansión de 16 cuartos (biblioteca, dormitorio, baño, cuarto de juegos, sala de música, cocina, sala, comedor, estudio, billar, lavandería, vestíbulo, invernadero, garaje, bodega) y un gran jardín con estanque, fuente y cementerio. Hay 37 tareas.

Cada jugador elige su color (16 colores) y si su personaje es hombre o mujer. Quien es expulsado en una votación es arrojado al pozo del jardín en una pequeña escena animada. Uno (o dos, desde 7 jugadores) es el **asesino** y el resto son **inocentes**.

- **Inocentes:** hagan las tareas de la casa (las burbujas `!` marcan dónde) y descubran al asesino. Cada tarea es un minijuego (frotar manchas, repetir la melodía del piano, cortar leña a tiempo, girar la llave del reloj...), jugable con mouse o con el dedo.
- **Asesino:** elimina a los inocentes sin que te vean. Puedes apagar las luces, usar los pasadizos secretos (estante de la biblioteca, armario del dormitorio, chimenea de la sala y alacena de la cocina) y **disfrazarte** de otro jugador durante 20 s: los testigos verán a esa persona cometer el crimen.
- **Visión:** las paredes tapan la vista; solo se ve a través de las puertas. En un apagón la visión se reduce y una flecha señala la caja de fusibles del pasillo.
- **Reuniones:** reporta un cuerpo o toca la campana del comedor. Todos discuten en el chat y votan a quién expulsar.
- Ganan los inocentes si terminan todas las tareas o expulsan a los asesinos. Gana el asesino si quedan tantos asesinos como inocentes.
- Los muertos son fantasmas: atraviesan paredes, ven todo y los inocentes pueden seguir haciendo tareas.

| Acción | Teclado | Táctil |
|---|---|---|
| Mover | WASD / flechas | Joystick (mitad izquierda) |
| Usar / tarea | E o Espacio | Botón **E** |
| Reportar cuerpo | R | Botón **R** |
| Matar (asesino) | Q | Botón **Q** |
| Apagar luces (asesino) | F | Botón **F** |
| Disfraz (asesino) | C | Botón **C** |
| Habilidad del rol especial | V | Botón **V** |
| Mapa | M | Botón ▦ |
| Libreta del detective | L | Botón 📓 en la tarjeta del rol |
| Pasadizo (asesino): entrar / cambiar salida / salir | E / A · D / E | Botones del panel |

## Sala y ajustes

Tanto en línea como con bots se pasa por una sala de espera donde el anfitrión elige:

- **Asesinos:** 1, 2 o 3 (2 desde 7 jugadores, 3 desde 12).
- **Velocidad:** de 0.5x a 2x para todos los personajes.
- **Roles especiales:** cuántos jugadores tendrán cada rol (por ejemplo 3 médicos y 2 camarógrafos; hasta 10 por rol de inocente y 3 por rol de asesino). Si hay más cupos que jugadores se reparten al azar; cada jugador tiene como mucho uno. Al empezar se muestra en grande tu rol, qué hace y con qué tecla se usa, y queda un recordatorio en el HUD.

| Rol | Equipo | Qué hace |
|---|---|---|
| Alertador | Inocente | Si lo matan grita: todos ven una marca roja (y una flecha) en el lugar. |
| Médico | Inocente | Tableta de signos vitales (V). La batería dura 25 s en total. |
| Juez | Inocente | Con sus tareas terminadas puede dictar un veredicto en la votación: sale quien elija; si no era asesino, sale él. |
| Detective | Inocente | Tras un asesinato, junto a alguien (V) sabe en qué cuarto estaba en ese momento. 3 casos, 3 sospechosos por caso; todo queda en su libreta. |
| Camarógrafo | Inocente | Esconde una cámara por ronda (V) que fotografía el asesinato cercano. Aparece tras la votación; quien la recoja ve la foto y decide si mostrarla en la siguiente reunión. |
| Ángel | Inocente | Al morir, da un escudo de 20 s (V) a un vivo. Si el asesino lo ataca, falla; solo el asesino y los fantasmas lo ven romperse. |
| Cambiaformas | Asesino | Se disfraza de otro jugador 20 s (C). |
| Venenosa | Asesino | Los cuerpos de sus víctimas se ponen verdes y desaparecen a los 20 s. |
| Fantasma | Asesino | Invisible 10 s (V); puede matar así. Solo lo ven su cómplice y los muertos. |
| Alien | Asesino | La víctima camina 8 s más y luego muere donde esté (no puede reportar ni tocar la campana). |
| Daltónico | Asesino | Durante 15 s (V) todos cambian de color al azar y no se ven los nombres. |

**Sala de cámaras:** junto a la bodega hay una consola (E) con una cámara por cuarto; se pasa de una a otra con ◀ ▶ (A / D) para ver en vivo qué ocurre. En un apagón las cámaras se quedan sin señal.

**Mapa (M):** muestra la casa, tu posición y tus tareas. Los asesinos ven a su cómplice y pueden apagar las luces desde ahí (enfriamiento compartido entre asesinos).

Para agregar un rol nuevo se suma en `ROLES` dentro de `src/config.js` (equipo, nombre, descripción y probabilidad por defecto) y se programa su habilidad en `partida.js` y `escena.js`. La sala lo muestra solo.

## Sonido

Música de suspenso generada en tiempo real: zumbido grave, viento, notas de caja de música con eco, crujidos de puertas y un latido que se acelera con los apagones, los cuerpos a la vista y cuando quedan pocos vivos. En el HUD, ♫ apaga la música y ♪ los efectos.

## Modos

- **Jugar con bots:** partida local contra bots que hacen tareas, cazan, reportan, hablan en el chat y votan según lo que vieron.
- **Crear sala en línea:** genera un código de 4 letras. Tus amigos entran con **Unirse** o con el enlace `?sala=CODIGO`. El anfitrión puede rellenar con bots y elegir 1 o 2 asesinos.

El anfitrión ejecuta la simulación (no hay servidor propio). La conexión es P2P con el servidor público de PeerJS.

- El HUD muestra la señal (ping) con el anfitrión.
- Si alguien deja de responder 8 s (aunque cierre la pestaña de golpe), sale de la partida y todos reciben un aviso.
- Si el anfitrión sale o cierra la pestaña, la sala se cierra y todos vuelven al menú.

### Chat de voz por proximidad

En las salas en línea, el botón 🎤 activa el micrófono (el navegador pide permiso). Reglas:

- **Vivos:** se oyen por cercanía (más bajo a través de paredes). También los oyen los fantasmas cercanos.
- **Fantasmas:** solo los oyen otros fantasmas, en toda la casa.
- **Reunión:** solo hablan los vivos y los oyen todos.
- **Sala de espera y final:** todos se oyen con todos.
- Un asesino dentro de un pasadizo o invisible no se oye.

Si dos jugadores no logran conectarse directo (pasa con algunas redes móviles), el anfitrión les retransmite el audio automáticamente. En la sala de espera, junto a cada jugador se ve el estado de la voz (🔊 directa o a través del anfitrión). Para redes muy restrictivas se puede agregar un servidor TURN en `RED.ice` (`src/config.js`).

El micrófono solo funciona en páginas seguras (**https** o `localhost`). Si lo subes a Netlify o GitHub Pages funciona; con `vite --host` por IP en la red local, no.

### Pantalla completa

En el teléfono, el primer toque pone el juego en pantalla completa y horizontal (los navegadores no permiten hacerlo sin un toque). También hay un botón ⛶ en el menú y en el HUD. En iPhone, Safari no permite la pantalla completa en páginas: hay que usar "Agregar a pantalla de inicio" y abrir el juego desde ese ícono.

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

## Estructura

- `src/mundo/` mapa, muebles, tareas, colisiones y caminos
- `src/graficos/` generación del pixel art (suelo, muebles, personajes, fuente)
- `src/logica/` simulación autoritativa (`partida.js`) e IA de bots (`bots.js`)
- `src/red/` sala en línea con PeerJS
- `src/escena.js` escena de Phaser (render, visión, movimiento, interacciones)
- `src/ui/` interfaz HTML (menú, sala, HUD, reunión y votación), minijuegos de las tareas (`minijuegos.js`) y sonidos
- `src/config.js` tiempos, distancias, visión y colores (ajustes de balance)
