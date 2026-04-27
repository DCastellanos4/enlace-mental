module.exports = function setupSockets(io) {
  const rooms = {}; 

  const removePlayerFromRoom = (socketId, roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        console.log(`👤 ${player.username} abandonó la sala ${roomCode}`);

        if (room.players.length === 0) {
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
    // Para la vista del cliente, en fase de escritura, ocultamos la palabra actual a los demas.
    return room.players.map(p => ({
      ...p,
      currentWord: (room.phase === 'writing' || room.phase === 'countdown') ? null : p.currentWord,
      isReady: !!p.currentWord, // True si ya escribió su palabra
      previousWords: p.previousWords || []
    }));
  };

  const checkRoundCompletion = (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    // Si todos tienen palabra, empieza la cuenta atrás
    const allReady = room.players.every(p => p.currentWord && p.currentWord.trim() !== '');
    
    if (allReady && room.phase === 'writing') {
      room.phase = 'countdown';
      io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase });
      
      // Cuenta atrás de 3 segundos
      let count = 3;
      const interval = setInterval(() => {
        io.to(roomCode).emit('countdownTimer', count);
        count--;
        
        if (count < 0) {
          clearInterval(interval);
          revealWordsAndCheckWin(roomCode);
        }
      }, 1000);
    } else {
      io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase });
    }
  };

  const revealWordsAndCheckWin = (roomCode) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.phase = 'reveal';
    // Todos ven las palabras
    io.to(roomCode).emit('gameStateUpdated', { players: room.players, phase: room.phase });

    const firstWord = room.players[0].currentWord;
    const normalize = (word) => word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const allMatch = room.players.every(p => normalize(p.currentWord) === normalize(firstWord));

    if (allMatch) {
      room.status = 'finished';
      setTimeout(() => {
        io.to(roomCode).emit('gameWon', { winningWord: firstWord, players: room.players });
      }, 2000); // Dar 2 segundos de tiempo para ver que todos acertaron antes de la pantalla de victoria
    } else {
      // Si fallan, guardar historial y pasar a nueva ronda
      room.players.forEach(p => {
        p.previousWords.push(p.currentWord);
        p.currentWord = ''; // Limpiar para nueva ronda
      });
      
      setTimeout(() => {
        room.phase = 'writing';
        io.to(roomCode).emit('gameStateUpdated', { players: getClientPlayers(room), phase: room.phase });
      }, 4000); // Mostrar palabras durante 4s antes de ocultar
    }
  };

  io.on('connection', (socket) => {
    socket.on('createRoom', ({ username }, callback) => {
      const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      
      rooms[roomCode] = {
        status: 'waiting', 
        phase: 'lobby',
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

    // Nuevo Evento: Expulsar Jugador (Kick)
    socket.on('kickPlayer', ({ roomCode, targetSocketId }, callback) => {
      const room = rooms[roomCode];
      if (!room) return;
      const host = room.players.find(p => p.id === socket.id);
      if (!host || !host.isHost) return;

      removePlayerFromRoom(targetSocketId, roomCode);
      io.to(targetSocketId).emit('kicked');
      // Forzar al socket desconectado de la sala de socket.io (server-side leave)
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if(targetSocket) {
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
      room.phase = 'writing'; // Ronda inicial libre (sin palabras dadas)
      room.players.forEach(p => {
        p.currentWord = '';
        p.previousWords = [];
      });

      io.to(roomCode).emit('gameStarted', getClientPlayers(room));
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

       room.status = 'waiting';
       room.phase = 'lobby';
       room.players.forEach(p => {
         p.currentWord = '';
         p.previousWords = [];
       });
       io.to(roomCode).emit('gameReset');
       io.to(roomCode).emit('roomUpdated', room.players);
       if (callback) callback({ success: true });
    });

    socket.on('disconnect', () => {
      if (socket.data.roomCode) {
        removePlayerFromRoom(socket.id, socket.data.roomCode);
      }
    });
  });
};
