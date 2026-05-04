/**
 * ============================================================================
 * EXPLICACIÓN ARQUITECTURA WEBSOCKETS (SOCKET.IO)
 * ============================================================================
 * A diferencia del protocolo HTTP (REST API) que funciona bajo el modelo 
 * estricto de Petición-Respuesta (donde el cliente tiene que preguntar 
 * constantemente "¿hay cambios?"), los WebSockets mantienen una conexión 
 * TCP bidireccional y persistente abierta.
 * 
 * Beneficios técnicos aplicados en Enlace Mental:
 * 
 * 1. Comunicación en Tiempo Real puro: El servidor puede empujar (emitir)
 *    datos hacia los clientes de manera espontánea (ej. 'gameStateUpdated')
 *    sin que el cliente lo haya solicitado previamente. Esto reduce la latencia 
 *    prácticamente a cero.
 * 
 * 2. Gestión de Estados en Memoria (RAM): Este archivo maneja el objeto `rooms{}`
 *    directamente en la memoria volatil de Node.js. Al no estar realizando 
 *    operaciones CRUD en una base de datos (como SQLite o MongoDB) repeditamente 
 *    para cada letra o estado que cambia, evitamos cuellos de botella de disco o 
 *    red. La Base de Datos sólo interviene al registrar/loguear, pero el juego 
 *    ocurre en vivo.
 * 
 * 3. Patrón 'Rooms' (Salas) Multicast: Socket.io gestiona colecciones nativas
 *    llamadas 'Rooms'. Cuando emitimos `io.to(roomCode).emit()`, internamente el 
 *    servidor hace un broadcast optimizado exclusivamente a los sockets 
 *    (jugadores) vinculados a esa clave de habitación concreta, aislando 
 *    partidas de manera segura y escalable.
 * ============================================================================
 */

// Distancia de Levenshtein: algoritmo de programación dinámica que
// calcula el número mínimo de ediciones (insertar/borrar/sustituir) para
// transformar una cadena en otra. Nos sirve para detectar "casi aciertos".
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// 30 segundos es el tiempo que demostraron ser suficiente en las pruebas con usuarios:
// demasiado poco genera estrés, demasiado aburre. Se puede ajustar fácilmente desde aquí.
const WRITE_TIME = 30;

module.exports = function setupSockets(io) {
  // rooms actúa como nuestra "base de datos en RAM" para las partidas activas.
  // Cada clave es el código de sala (ej. 'XK9TZ') y el valor contiene todo el
  // estado de esa partida: jugadores, fase actual, ronda y timers.
  // Al ser volátil, si el servidor se reinicia las partidas en curso se pierden,
  // lo cual es aceptable para este tipo de juego de sesión corta.
  const rooms = {};

  // Función auxiliar reutilizada tanto cuando el jugador se va voluntariamente
  // como cuando se desconecta de forma abrupta (cierre de pestaña, etc.).
  // Si era el host, automáticamente ascendemos al siguiente jugador para que
  // la partida pueda continuar sin necesidad de intervención manual.
  const removePlayerFromRoom = (socketId, roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        console.log(`👤 ${player.username} abandonó la sala ${roomCode}`);

        if (room.players.length === 0) {
          // Si no queda nadie, liberamos la sala y cancelamos cualquier timer
          // pendiente para evitar fugas de memoria (setInterval sin clearInterval).
          if (room.writeTimer) clearInterval(room.writeTimer);
          delete rooms[roomCode];
        } else {
          if (player.isHost) {
            room.players[0].isHost = true;
          }
          io.to(roomCode).emit('roomUpdated', room.players);
        }
      }
    }
  };

  const getClientPlayers = (room) => {
    // Sanitizamos el payload que se envía a los clientes.
    // Es crucial vaciar "currentWord" durante la fase de escritura para evitar trampas via inspección de red.
    return room.players.map(p => ({
      ...p,
      currentWord: (room.phase === 'writing' || room.phase === 'countdown') ? null : p.currentWord,
      isReady: !!p.currentWord,
      previousWords: p.previousWords || []
    }));
  };

  // Gestiona el temporizador de escritura. Emite un tick por segundo al cliente
  // para que pueda mostrar la cuenta atrás en tiempo real. Si el tiempo se agota
  // antes de que todos hayan enviado su palabra, los rezagados reciben '...'
  // como palabra por defecto para que la ronda pueda continuar igualmente.
  const startWriteTimer = (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.writeTimeLeft = WRITE_TIME;
    io.to(roomCode).emit('writeTimer', room.writeTimeLeft);

    room.writeTimer = setInterval(() => {
      room.writeTimeLeft--;
      io.to(roomCode).emit('writeTimer', room.writeTimeLeft);

      if (room.writeTimeLeft <= 0) {
        clearInterval(room.writeTimer);
        room.writeTimer = null;

        // Jugadores que no escribieron reciben "..." como fallback
        room.players.forEach(p => {
          if (!p.currentWord || p.currentWord.trim() === '') {
            p.currentWord = '...';
          }
        });

        // Forzar transición a cuenta atrás
        room.phase = 'countdown';
        io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase, round: room.round });

        let count = 3;
        io.to(roomCode).emit('countdownTimer', count);
        count--;

        const interval = setInterval(() => {
          io.to(roomCode).emit('countdownTimer', count);
          count--;

          if (count < 0) {
            clearInterval(interval);
            revealWordsAndCheckWin(roomCode);
          }
        }, 1000);
      }
    }, 1000);
  };

  // Se llama cada vez que un jugador envía su palabra. Comprueba si ya han
  // respondido todos: si es así, adelantamos la fase de cuenta atrás sin esperar
  // a que expire el timer. Esto premia la agilidad del grupo y hace el juego
  // más dinámico cuando todos están coordinados.
  const checkRoundCompletion = (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    const allReady = room.players.every(p => p.currentWord && p.currentWord.trim() !== '');

    if (allReady && room.phase === 'writing') {
      // Limpiar el timer de escritura ya que todos terminaron antes
      if (room.writeTimer) {
        clearInterval(room.writeTimer);
        room.writeTimer = null;
      }

      room.phase = 'countdown';
      io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase, round: room.round });

      let count = 3;
      io.to(roomCode).emit('countdownTimer', count);
      count--;

      const interval = setInterval(() => {
        io.to(roomCode).emit('countdownTimer', count);
        count--;

        if (count < 0) {
          clearInterval(interval);
          revealWordsAndCheckWin(roomCode);
        }
      }, 1000);
    } else {
      io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase, round: room.round });
    }
  };

  // Fase de revelación: compara todas las palabras y determina si la ronda
  // es un acierto completo, un "casi acierto" o hay que jugar otra ronda.
  // Esta es la función más crítica del juego desde el punto de vista lógico.
  const revealWordsAndCheckWin = (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.phase = 'reveal';

    const firstWord = room.players[0].currentWord;

    // Normalización: minúsculas + sin tildes + sin espacios extra
    const normalize = (word) => word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const allMatch = room.players.every(p => normalize(p.currentWord) === normalize(firstWord));

    // Detección de "casi acierto" con Levenshtein
    let closeMatch = false;
    if (!allMatch) {
      const words = room.players.map(p => normalize(p.currentWord));
      let totalDist = 0;
      let comparisons = 0;
      for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j < words.length; j++) {
          totalDist += levenshtein(words[i], words[j]);
          comparisons++;
        }
      }
      const avgDist = comparisons > 0 ? totalDist / comparisons : 999;
      closeMatch = avgDist <= 2 && avgDist > 0;
    }

    // Enviamos revelación con flag de "casi acierto"
    io.to(roomCode).emit('gameStateUpdated', {
      players: room.players,
      phase: room.phase,
      round: room.round,
      closeMatch
    });

    if (allMatch) {
      room.status = 'finished';
      setTimeout(() => {
        io.to(roomCode).emit('gameWon', { winningWord: firstWord, players: room.players, rounds: room.round });
      }, 2000);
    } else {
      room.players.forEach(p => {
        p.previousWords.push(p.currentWord);
        p.currentWord = '';
      });

      setTimeout(() => {
        room.round++;
        room.phase = 'writing';
        io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase, round: room.round });
        startWriteTimer(roomCode);
      }, 4000);
    }
  };

  // A partir de aquí registramos todos los manejadores de eventos de Socket.IO.
  // Cada 'socket.on(...)' responde a una acción iniciada por el cliente.
  // El patrón de callback en los eventos (ej. createRoom, joinRoom) permite que
  // el cliente reciba confirmación de éxito o error de forma síncrona.
  io.on('connection', (socket) => {
    socket.on('createRoom', ({ username }, callback) => {
      // Generamos un código alfanumérico de 5 caracteres para la sala.
      // Con base 36 y 5 dígitos tenemos 36^5 = ~60 millones de combinaciones,
      // más que suficiente para partidas simultáneas en un entorno académico.
      const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

      rooms[roomCode] = {
        status: 'waiting',
        phase: 'lobby',
        round: 1,
        players: [{ id: socket.id, username, isHost: true, currentWord: '', previousWords: [] }],
      };

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      callback({ success: true, roomCode });
    });

    socket.on('joinRoom', ({ roomCode, username }, callback) => {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, message: 'La sala no existe' });
      if (room.players.length >= 8) return callback({ success: false, message: 'La sala está llena' });
      if (room.status !== 'waiting') return callback({ success: false, message: 'La partida ya ha comenzado' });

      room.players.push({ id: socket.id, username, isHost: false, currentWord: '', previousWords: [] });
      socket.join(roomCode);
      socket.data.roomCode = roomCode;

      io.to(roomCode).emit('roomUpdated', room.players);
      callback({ success: true });
    });

    socket.on('leaveRoom', ({ roomCode }, callback) => {
      socket.leave(roomCode);
      removePlayerFromRoom(socket.id, roomCode);
      socket.data.roomCode = null;
      if (callback) callback({ success: true });
    });

    socket.on('kickPlayer', ({ roomCode, targetSocketId }, callback) => {
      const room = rooms[roomCode];
      if (!room) return;

      const host = room.players.find(p => p.id === socket.id);
      if (!host || !host.isHost) return;

      removePlayerFromRoom(targetSocketId, roomCode);
      io.to(targetSocketId).emit('kicked');

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(roomCode);
        targetSocket.data.roomCode = null;
      }

      if (callback) callback({ success: true });
    });

    socket.on('startGame', ({ roomCode }, callback) => {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false });

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) return callback({ success: false });

      room.status = 'playing';
      room.phase = 'writing';
      room.round = 1;
      room.players.forEach(p => {
        p.currentWord = '';
        p.previousWords = [];
      });

      io.to(roomCode).emit('gameStarted', { players: getClientPlayers(room), round: room.round });
      startWriteTimer(roomCode);
      callback({ success: true });
    });

    socket.on('submitWord', ({ roomCode, word }, callback) => {
      const room = rooms[roomCode];
      if (!room || room.status !== 'playing' || room.phase !== 'writing') return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.currentWord = word;
        checkRoundCompletion(roomCode);
        if (callback) callback({ success: true });
      }
    });

    socket.on('resetGame', ({ roomCode }, callback) => {
      const room = rooms[roomCode];
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) return;

      if (room.writeTimer) {
        clearInterval(room.writeTimer);
        room.writeTimer = null;
      }

      room.status = 'waiting';
      room.phase = 'lobby';
      room.round = 1;
      room.players.forEach(p => {
        p.currentWord = '';
        p.previousWords = [];
      });
      io.to(roomCode).emit('gameReset');
      io.to(roomCode).emit('roomUpdated', room.players);
      if (callback) callback({ success: true });
    });

    // El evento 'disconnect' se dispara automáticamente cuando el socket
    // pierde la conexión (cierre de pestaña, pérdida de red, etc.).
    // Es fundamental manejarlo para limpiar el estado del servidor y notificar
    // al resto de jugadores de la sala que alguien se ha ido.
    socket.on('disconnect', () => {
      if (socket.data.roomCode) {
        removePlayerFromRoom(socket.id, socket.data.roomCode);
      }
    });
  });
};
