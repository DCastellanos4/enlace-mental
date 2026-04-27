# Plan de Diseño: Enlace Mental (Fase 2)

## 1. Diseño Visual (UX/UI) y Animaciones
- **Framer Motion:** Se utilizará para transiciones entre pantallas, efectos hover avanzados (scale) y para la dramática "Cuenta atrás de revelación".
- **Accesibilidad:** 
  - Todos los botones interactivos tendrán anillos de focus (`focus:ring`).
  - Paleta de colores con contraste WCAG AA.
  - Soporte de teclado (tabulación y enter).
- **Tipografía:** Se integrará una fuente geométrica moderna (Inter o Poppins) vía Google Fonts para darle ese look de startup/agencia.

## 2. Nueva Lógica de Juego (State Machine)
El juego operará mediante "fases":
1. **Lobby/Auth:** Registro, Login, Modo Invitado.
2. **WaitingRoom:** El Host puede invitar o expulsar (`kick`) a usuarios.
3. **SetupWord:** (NUEVO) Todos escriben una palabra libre. Si todas coinciden a la primera, victoria (muy raro). Si no, esas palabras son el punto de partida.
4. **WritingPhase:** Los jugadores ven las palabras anteriores, pero no la actual. Escriben su palabra en secreto. Al enviarla, los demás ven un indicador de "Listo" (Animación visual + sonido).
5. **CountdownPhase:** Cuando todos están listos, el servidor fuerza una cuenta atrás de 3 segundos (3.. 2.. 1..).
6. **RevealPhase:** Se muestran las palabras de golpe. Se evalúa la coincidencia. Si coinciden -> Victoria (Confeti). Si no -> Vuelta a WritingPhase.

## 3. Persistencia (SQLite + Auth)
- Uso de `sqlite3` de Node.js nativo (sin ORMs pesados para mantener el ZIP limpio y rápido).
- Tablas: `users` (id, username, is_guest, password), `friends` (user_id, friend_id).
- Los invitados no necesitan password y se registran dinámicamente en la tabla de usuarios con un flag temporal.

## 4. Efectos de Sonido (SFX)
- Se incluirán placeholders o llamadas a la API de Web Audio para generar pitidos o efectos (`beep`, `success`) sin necesitar de assets en MP3 gigantes.
