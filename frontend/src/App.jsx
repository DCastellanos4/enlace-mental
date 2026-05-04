/**
 * App.jsx — Componente raíz de la aplicación Enlace Mental
 *
 * Toda la UI de la aplicación vive en este único componente (SPA: Single Page
 * Application). En lugar de tener varias páginas con sus propias rutas, usamos
 * un estado interno (gameState) para decidir qué "pantalla" renderizar.
 *
 * Esto tiene una ventaja clara en este tipo de juego: el socket se mantiene
 * activo durante toda la sesión del usuario sin necesidad de reconectarse al
 * cambiar de vista, lo que elimina latencia y posibles pérdidas de mensajes.
 *
 * Estados posibles de gameState:
 *   'auth'     → Pantalla de login/registro
 *   'lobby'    → Menú principal para crear o unirse a una sala
 *   'waiting'  → Sala de espera antes de empezar la partida
 *   'writing'  → Fase activa de escritura de la palabra
 *   'countdown'→ Cuenta atrás de 3 segundos antes de revelar
 *   'reveal'   → Revelación de las palabras de todos los jugadores
 *   'finished' → Pantalla de victoria
 */

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Users, UserPlus, ArrowLeft, Play, Send, RefreshCw, Trophy, LogIn, CheckCircle2, UserX, UserCircle, Sun, Moon, Clipboard, Clock, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { initAudio, playPop, playTick, playWin } from './utils/sfx';
import { Logo } from './components/Logo';
import logoApp from './assets/logoApp.png';

// La URL del backend se lee desde las variables de entorno de Vite.
// En local apunta a localhost, en producción se configura en el .env del contenedor.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Creamos la conexión Socket.IO a nivel de módulo (fuera del componente)
// para que sea un único socket compartido durante toda la vida de la app,
// en lugar de crear uno nuevo con cada renderización del componente.
const socket = io(BACKEND_URL);

// Componente de animación de entrada/salida para las transiciones entre pantallas.
// Usamos Framer Motion con un efecto de muelle (spring) para que los cambios de
// vista no sean abruptos y den sensación de fluidez y pulido en la UI.
const PageTransition = ({ children, className }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30, scale: 0.95 }} 
    animate={{ opacity: 1, y: 0, scale: 1 }} 
    exit={{ opacity: 0, y: -30, scale: 0.95 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className={className}
  >
    {children}
  </motion.div>
);

function App() {
  // --- Estado de autenticación ---
  const [token, setToken] = useState(null);          // JWT recibido del backend
  const [currentUser, setCurrentUser] = useState(null); // Datos del usuario activo

  // --- Estado del formulario de auth ---
  const [authTab, setAuthTab] = useState('login'); 
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // --- Estado de la sala y la partida ---
  const [roomCode, setRoomCode] = useState('');       // Código que el usuario introduce para unirse
  const [currentRoom, setCurrentRoom] = useState(null); // Código de la sala en la que estamos
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  
  // Controla qué pantalla se muestra (ver lista de estados en el JSDoc del archivo)
  const [gameState, setGameState] = useState('auth'); 
  const [myWordInput, setMyWordInput] = useState('');
  const [winningWord, setWinningWord] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [loading, setLoading] = useState(true);
  const [writeTimeLeft, setWriteTimeLeft] = useState(30);
  const [currentRound, setCurrentRound] = useState(1);
  const [closeMatch, setCloseMatch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalRounds, setTotalRounds] = useState(1);
  
  // Tema oscuro/claro: persistimos la preferencia en localStorage para que
  // el usuario no tenga que volver a elegirlo cada vez que abre la app.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('em_theme') === 'dark';
  });

  // Aplicamos o quitamos la clase 'dark' en el elemento raíz del HTML.
  // Tailwind CSS usa esta clase para activar todos los estilos dark:* definidos
  // en los componentes. Es el enfoque estándar recomendado por la documentación.
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('em_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('em_theme', 'light');
    }
  }, [isDarkMode]);

  // Hook principal de ciclo de vida: se ejecuta una sola vez al montar el componente.
  // Aquí centralizamos dos responsabilidades clave:
  //   1. Recuperar la sesión guardada para no obligar al usuario a hacer login tras F5.
  //   2. Registrar todos los listeners de Socket.IO para reaccionar a los eventos del servidor.
  useEffect(() => {
    // 1. Persistencia de sesión: si hay token guardado, lo restauramos y saltamos al lobby.
    //    El token JWT contiene la info del usuario, así que no hace falta una petición extra.
    const savedToken = localStorage.getItem('em_token');
    const savedUser = localStorage.getItem('em_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
      setGameState('lobby'); // Saltamos el auth si ya tenemos token
    }
    setLoading(false);
    
    // 2. Listeners de Socket.IO: cada uno actualiza el estado de React
    //    cuando llega un evento del servidor, provocando un re-render automático.
    socket.on('roomUpdated', (updatedPlayers) => setPlayers(updatedPlayers));

    socket.on('gameStarted', (data) => {
      const updatedPlayers = data.players || data;
      setPlayers(updatedPlayers);
      setGameState('writing');
      setMyWordInput('');
      setCurrentRound(data.round || 1);
      setCloseMatch(false);
    });

    socket.on('gameStateUpdated', ({ players, phase, round, closeMatch: cm }) => {
      setPlayers(players);
      setGameState(phase);
      if (round) setCurrentRound(round);
      if (cm !== undefined) setCloseMatch(cm);
    });

    socket.on('writeTimer', (timeLeft) => {
      setWriteTimeLeft(timeLeft);
    });

    socket.on('countdownTimer', (count) => {
      setCountdown(count);
      if(count > 0) playTick();
    });

    socket.on('gameWon', ({ winningWord, players, rounds }) => {
      setPlayers(players);
      setWinningWord(winningWord);
      setTotalRounds(rounds || 1);
      setGameState('finished');
      playWin();
    // Lanzamos confetti varias veces para asegurar que el efecto sea espectacular.
      // Canvas Confetti es una librería ligera que usa un canvas 2D superpuesto.
      const fire = () => confetti({
        particleCount: 150, 
        spread: 100, 
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#FBBF24', '#10B981']
      });
      fire();
      setTimeout(fire, 300);
      setTimeout(fire, 700);
    });

    socket.on('gameReset', () => {
      setGameState('waiting');
      setWinningWord('');
      setCurrentRound(1);
      setCloseMatch(false);
    });

    socket.on('kicked', () => {
      setCurrentRoom(null);
      setPlayers([]);
      setGameState('lobby');
      setError('Has sido expulsado de la sala.');
    });

    // IMPORTANTE: Cleanup function de useEffect — se ejecuta cuando el componente
    // se desmonta. Eliminamos todos los listeners para evitar fugas de memoria
    // y que un mismo evento se procese más de una vez si el componente se vuelve a montar.
    return () => {
      socket.off('roomUpdated');
      socket.off('gameStarted');
      socket.off('gameStateUpdated');
      socket.off('writeTimer');
      socket.off('countdownTimer');
      socket.off('gameWon');
      socket.off('gameReset');
      socket.off('kicked');
    };
  }, []);

  // handleAuth gestiona los tres flujos de entrada: login, registro e invitado.
  // En lugar de tener tres funciones separadas, el parámetro 'type' selecciona
  // el endpoint correspondiente, reduciendo la duplicación de código.
  const handleAuth = async (e, type) => {
    e.preventDefault();
    initAudio(); // Los navegadores bloquean el audio hasta que hay una interacción del usuario; lo iniciamos aquí.
    if (!authUsername.trim()) return setError('Introduce un apodo genial');
    if (type !== 'guest' && !authPassword.trim()) return setError('Falta la contraseña');
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: authUsername.trim(), 
          ...(type !== 'guest' && { password: authPassword })
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setToken(data.token);
      setCurrentUser(data.user);
      
      // Persistimos el token y el usuario en localStorage para sobrevivir a recargas de página.
      // Solo guardamos datos no sensibles: nunca guardamos la contraseña en el cliente.
      localStorage.setItem('em_token', data.token);
      localStorage.setItem('em_user', JSON.stringify(data.user));

      setGameState('lobby');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    initAudio();
    socket.emit('createRoom', { username: currentUser.username }, (response) => {
      if (response.success) {
        setCurrentRoom(response.roomCode);
        setPlayers([{ id: socket.id, username: currentUser.username, isHost: true, currentWord: '' }]);
        setGameState('waiting');
        setError('');
      }
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    initAudio();
    if (!roomCode.trim()) return setError('¿Y el código?');

    socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), username: currentUser.username }, (response) => {
      if (response.success) {
        setCurrentRoom(roomCode.toUpperCase());
        setGameState('waiting');
        setError('');
      } else {
        setError(response.message);
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('em_token');
    localStorage.removeItem('em_user');
    setToken(null);
    setCurrentUser(null);
    setGameState('auth');
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom', { roomCode: currentRoom }, () => {
      setCurrentRoom(null);
      setPlayers([]);
      setGameState('lobby');
      setRoomCode('');
    });
  };

  const handleKickPlayer = (targetId) => {
    socket.emit('kickPlayer', { roomCode: currentRoom, targetSocketId: targetId });
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      setError('¡Necesitas al menos un amigo para jugar!');
      setTimeout(() => setError(''), 3000);
      return;
    }
    socket.emit('startGame', { roomCode: currentRoom }, (res) => {
      if (!res.success) setError(res.message);
    });
  };

  const handleSubmitWord = (e) => {
    e.preventDefault();
    if (!myWordInput.trim()) return;
    
    playPop();
    socket.emit('submitWord', { roomCode: currentRoom, word: myWordInput.trim() }, () => {});
  };

  const handleResetGame = () => {
    socket.emit('resetGame', { roomCode: currentRoom });
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom).then(() => {
      setCopied(true);
      playPop();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Determinamos si el usuario actual es el host buscando su socket.id en la lista
  // de jugadores. Esto decide si se muestra el botón de 'EMPEZAR' o el mensaje de espera.
  const amIHost = players.find(p => p.id === socket.id)?.isHost || false;

  const btnClass = "font-black py-4 rounded-2xl border-4 border-brand-dark shadow-brutal hover:shadow-brutal-sm hover:translate-y-[2px] transition-all flex justify-center items-center gap-2 active:shadow-none active:translate-y-[6px]";
  const inputClass = "w-full px-5 py-4 bg-white border-4 border-brand-dark rounded-2xl shadow-brutal-sm focus:outline-none focus:translate-y-[2px] focus:shadow-brutal-hover transition-all font-bold text-brand-dark placeholder-gray-400";

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const rawBgColorClass = "bg-brand-bg";

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${rawBgColorClass}`}>
        <RefreshCw className="animate-spin text-brand-primary mb-4" size={48} />
        <p className="font-black text-brand-dark animate-pulse">Sincronizando mente...</p>
      </div>
    );
  }

  const ThemeToggle = () => (
    <motion.button 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1, rotate: 15 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleDarkMode}
      className="fixed top-4 right-4 z-50 p-3 bg-white border-4 border-brand-dark rounded-full shadow-brutal-sm text-brand-dark"
    >
      {isDarkMode ? <Sun size={24} strokeWidth={3} /> : <Moon size={24} strokeWidth={3} />}
    </motion.button>
  );

  // --- VISTA 0: Auth ---
  if (gameState === 'auth') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${rawBgColorClass}`}>
        <ThemeToggle />
        <PageTransition className="w-full max-w-md">
          <Logo />
          
          <div className="bg-white p-8 rounded-3xl border-4 border-brand-dark shadow-brutal">
            <div className="flex bg-gray-100/50 p-1.5 rounded-2xl border-4 border-brand-dark mb-8 relative gap-1">
              {[
                { id: 'login', label: 'Login', color: 'text-brand-primary' },
                { id: 'register', label: 'Nuevo', color: 'text-brand-secondary' },
                { id: 'guest', label: 'Invitado', color: 'text-brand-accent' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => {setAuthTab(tab.id); setError('')}} 
                  className={`flex-1 py-2.5 rounded-xl font-black transition-colors relative`}
                >
                  {authTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white border-2 border-brand-dark shadow-brutal-sm rounded-lg"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors duration-300 ${authTab === tab.id ? tab.color : 'text-brand-dark/40'}`}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {error && <p className="text-white bg-red-500 border-4 border-brand-dark font-bold text-center mb-6 p-3 rounded-xl shadow-brutal-sm transform -rotate-1">{error}</p>}
            
            <form onSubmit={(e) => handleAuth(e, authTab)} className="space-y-5">
              <div>
                <input 
                  type="text" 
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className={inputClass}
                  placeholder={authTab === 'guest' ? 'Tu apodo divertido...' : 'Nombre de usuario'}
                  maxLength={15}
                />
              </div>
              
              {authTab !== 'guest' && (
                <div>
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Contraseña súper secreta"
                  />
                </div>
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                onClick={(e) => handleAuth(e, authTab)}
                className={`w-full text-xl ${btnClass} mt-4
                  ${authTab === 'guest' ? 'bg-brand-accent text-brand-dark' : authTab === 'login' ? 'bg-brand-primary text-white' : 'bg-brand-secondary text-white'}`}
              >
                {authTab === 'login' ? <LogIn size={24} /> : authTab === 'register' ? <UserPlus size={24} /> : <UserCircle size={24} />}
                {authTab === 'login' ? 'Iniciar Sesión' : authTab === 'register' ? 'Crear Cuenta' : 'Entrar Rápido'}
              </motion.button>
            </form>
          </div>
        </PageTransition>
      </div>
    );
  }

  // --- VISTA 1: Lobby Principal ---
  if (gameState === 'lobby') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${rawBgColorClass}`}>
        <ThemeToggle />
        <PageTransition className="w-full max-w-md">
          <Logo />
          <div className="flex justify-between items-center mb-8 mt-2">
            <h1 className="text-3xl font-black text-brand-dark transform -rotate-2 bg-white border-4 border-brand-dark px-3 py-1 rounded-xl shadow-brutal-sm cursor-default">
              E<span className="text-brand-primary">.</span>M
            </h1>
            <div className="bg-white border-4 border-brand-dark px-4 py-2 rounded-2xl font-bold text-brand-dark shadow-brutal-sm flex items-center gap-3">
               <span className="w-3 h-3 rounded-full bg-brand-success border-2 border-brand-dark"></span>
               {currentUser.username} {currentUser.isGuest && <span className="text-sm text-brand-secondary bg-gray-100 px-2 rounded-lg border-2 border-brand-dark ml-2">Guest</span>}
               <button onClick={handleLogout} className="ml-2 p-1 hover:bg-red-100 rounded-lg text-red-500 transition-colors" title="Cerrar sesión">
                 <UserX size={18} />
               </button>
            </div>
          </div>

          {currentUser.stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white border-4 border-brand-dark p-3 rounded-2xl shadow-brutal-sm text-center">
                <p className="text-[10px] uppercase font-black text-gray-400">Partidas</p>
                <p className="text-xl font-black text-brand-dark">{currentUser.stats.gamesPlayed || 0}</p>
              </div>
              <div className="bg-white border-4 border-brand-dark p-3 rounded-2xl shadow-brutal-sm text-center">
                <p className="text-[10px] uppercase font-black text-gray-400">Victorias</p>
                <p className="text-xl font-black text-brand-primary">{currentUser.stats.gamesWon || 0}</p>
              </div>
              <div className="bg-white border-4 border-brand-dark p-3 rounded-2xl shadow-brutal-sm text-center">
                <p className="text-[10px] uppercase font-black text-gray-400">Récord</p>
                <p className="text-xl font-black text-brand-secondary">{currentUser.stats.fastestConvergence || '--'}s</p>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2rem] border-4 border-brand-dark shadow-brutal space-y-8 relative overflow-hidden">
            
            {error && <p className="text-white bg-red-500 border-4 border-brand-dark font-bold text-center p-3 rounded-xl shadow-brutal-sm transform rotate-1">{error}</p>}
            
            <button 
              onClick={handleCreateRoom}
              className={`w-full bg-brand-primary text-white text-2xl ${btnClass}`}
            >
              <Users size={28} /> Crear Sala
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t-4 border-brand-dark border-dotted"></div>
              <span className="flex-shrink-0 mx-4 font-black uppercase text-brand-dark bg-brand-bg px-4 py-1 rounded-xl border-4 border-brand-dark">Unirse a amigos</span>
              <div className="flex-grow border-t-4 border-brand-dark border-dotted"></div>
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-3">
              <input 
                type="text" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className={`${inputClass} uppercase text-center text-3xl tracking-widest min-w-0 flex-1`}
                placeholder="CÓDIGO"
                maxLength={5}
              />
              <button 
                type="submit"
                onClick={handleJoinRoom}
                className={`bg-brand-accent text-brand-dark px-6 shrink-0 ${btnClass}`}
              >
                <Play fill="currentColor" size={28} />
              </button>
            </form>
          </div>
        </PageTransition>
      </div>
    );
  }

  // --- VISTA 2: Sala de Espera ---
  if (gameState === 'waiting') {
    return (
      <div className={`min-h-screen p-4 sm:p-8 flex flex-col relative ${rawBgColorClass}`}>
        <ThemeToggle />
        <PageTransition className="max-w-5xl w-full mx-auto flex-1 flex flex-col">
          
          <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-3xl border-4 border-brand-dark shadow-brutal">
            <button onClick={handleLeaveRoom} className={`bg-white text-brand-dark px-4 py-2 ${btnClass} text-sm`}>
              <ArrowLeft size={20} strokeWidth={3} /> Salir
            </button>
            <div className="text-center transform rotate-1">
              <p className="text-sm font-black uppercase mb-1 bg-brand-secondary text-white px-3 rounded-xl border-2 border-brand-dark inline-block shadow-brutal-sm">Pasa este código</p>
              <div className="flex items-center gap-2 justify-center">
                <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-brand-dark">
                  {currentRoom}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCopyCode}
                  className="p-2 bg-gray-100 border-2 border-brand-dark rounded-xl hover:bg-brand-accent/30 transition-colors"
                  title="Copiar código"
                >
                  {copied ? <CheckCircle2 size={20} className="text-brand-success" strokeWidth={3} /> : <Clipboard size={20} className="text-brand-dark" strokeWidth={3} />}
                </motion.button>
              </div>
              {copied && <span className="text-xs font-bold text-brand-success">¡Copiado!</span>}
            </div>
            <div className="w-[110px] hidden sm:block"></div>
          </header>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-end mb-6 px-2">
              <h3 className="text-2xl sm:text-3xl font-black text-brand-dark">Jugadores <span className="text-gray-400">({players.length}/8)</span></h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 mb-auto">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5, rotate: -5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5 }}
                    key={p.id} 
                    className={`bg-white border-4 border-brand-dark p-4 sm:p-6 rounded-3xl shadow-brutal flex flex-col items-center relative group ${p.id === socket.id ? 'bg-brand-accent/20' : ''}`}
                  >
                    {p.isHost && (
                      <div className="absolute -top-4 bg-brand-accent text-brand-dark border-4 border-brand-dark text-xs font-black uppercase px-4 py-1 rounded-full shadow-brutal-sm transform -rotate-6">
                        Líder
                      </div>
                    )}
                    {amIHost && !p.isHost && (
                      <button onClick={() => handleKickPlayer(p.id)} className="absolute top-2 right-2 text-white bg-red-500 border-4 border-brand-dark p-1 rounded-xl shadow-brutal-hover opacity-0 group-hover:opacity-100 hover:translate-y-[2px] hover:shadow-none transition-all" title="Expulsar">
                        <UserX size={20} strokeWidth={3} />
                      </button>
                    )}
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white border-4 border-brand-dark rounded-full flex items-center justify-center text-2xl sm:text-4xl font-black mb-2 sm:mb-4 shadow-brutal-sm text-brand-primary">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-black text-lg sm:text-xl text-brand-dark truncate w-full text-center">{p.username}</p>
                    {p.id === socket.id && <p className="text-sm font-bold text-brand-secondary mt-1">Eres tú</p>}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {[...Array(Math.max(0, 8 - players.length))].map((_, i) => (
                <div key={`e-${i}`} className="bg-transparent border-4 border-brand-dark border-dashed p-4 sm:p-6 rounded-3xl flex flex-col items-center justify-center opacity-40">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl sm:text-4xl font-black mb-2 sm:mb-4 bg-gray-200 border-4 border-gray-400 text-gray-400">?</div>
                  <p className="font-black text-gray-400">Libre</p>
                </div>
              ))}
            </div>

            <div className="mt-8 sm:mt-12 flex justify-center pb-8">
              {amIHost ? (
                <button 
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className={`px-8 sm:px-12 py-4 sm:py-6 text-2xl sm:text-3xl ${btnClass} ${players.length >= 2 ? 'bg-brand-success text-white hover:bg-emerald-400' : 'bg-gray-200 text-gray-400 border-gray-400 shadow-none hover:translate-y-0 cursor-not-allowed'}`}
                >
                  <Play fill="currentColor" size={32} />
                  {players.length >= 2 ? '¡EMPEZAR!' : 'Falta gente...'}
                </button>
              ) : (
                <div className="bg-white border-4 border-brand-dark shadow-brutal px-6 sm:px-8 py-4 sm:py-5 rounded-3xl flex items-center gap-4 text-brand-dark font-black text-lg sm:text-xl">
                  <RefreshCw className="animate-spin text-brand-primary" size={28} /> Esperando al líder...
                </div>
              )}
            </div>
          </div>
        </PageTransition>
      </div>
    );
  }

  // --- VISTA 3: Jugando ---
  if (['writing', 'countdown', 'reveal'].includes(gameState)) {
    const isReveal = gameState === 'reveal';
    const isWriting = gameState === 'writing';
    const amIReady = players.find(p => p.id === socket.id)?.isReady;

    // Calcular el porcentaje restante para la barra del timer
    const timerPercent = (writeTimeLeft / 30) * 100;
    const timerColor = writeTimeLeft > 10 ? 'bg-brand-success' : writeTimeLeft > 5 ? 'bg-brand-accent' : 'bg-red-500';

    return (
      <div className={`min-h-screen p-4 flex flex-col relative overflow-hidden ${rawBgColorClass}`}>
        <ThemeToggle />
        <AnimatePresence>
          {gameState === 'countdown' && (
            <motion.div 
              key={countdown}
              initial={{ scale: 0.2, rotate: -30, opacity: 0 }} 
              animate={{ scale: [0.5, 1.5, 1], rotate: [-20, 15, -5, 0], opacity: 1 }} 
              exit={{ scale: 3, opacity: 0, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <span className="text-[40vw] sm:text-[50vw] font-black text-brand-secondary drop-shadow-[15px_15px_0px_rgba(15,23,42,1)]" style={{WebkitTextStroke: '10px #0F172A'}}>{countdown > 0 ? countdown : '¡YA!'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-5xl w-full mx-auto flex flex-col h-full relative z-10 flex-1">
          {/* Header con ronda, timer y código de sala */}
          <header className="flex flex-col sm:flex-row justify-between items-center bg-white border-4 border-brand-dark shadow-brutal p-4 rounded-3xl mb-4 gap-3">
             <div className="flex items-center gap-3">
               <div className="px-4 py-2 bg-brand-accent rounded-xl border-4 border-brand-dark font-mono font-black text-brand-dark text-sm">
                 SALA: {currentRoom}
               </div>
               <motion.button 
                 whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                 onClick={handleCopyCode}
                 className="p-2 bg-gray-100 border-2 border-brand-dark rounded-lg"
                 title="Copiar código"
               >
                 {copied ? <CheckCircle2 size={16} className="text-brand-success" /> : <Clipboard size={16} className="text-brand-dark" />}
               </motion.button>
             </div>
             
             {/* Indicador de Ronda */}
             <div className="font-black text-lg sm:text-2xl uppercase tracking-wider text-brand-dark bg-gray-100 px-4 sm:px-6 py-2 rounded-xl border-4 border-brand-dark shadow-brutal-sm flex items-center gap-2">
               <Clock size={20} strokeWidth={3} />
               Ronda {currentRound}
             </div>

             <div className="flex items-center gap-3">
               <div className="font-black text-xl sm:text-2xl text-brand-dark hidden sm:block">
                 {isWriting ? '🤔 Escribe' : isReveal ? '✨ Revelación' : '⏳ Preparados'}
               </div>
               <button onClick={handleLeaveRoom} className={`bg-red-500 text-white px-4 py-2 text-sm ${btnClass}`}>
                 Huir
               </button>
             </div>
          </header>

          {/* Barra de tiempo visual - solo visible durante la escritura */}
          {isWriting && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="bg-white border-4 border-brand-dark rounded-2xl p-3 shadow-brutal-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm text-brand-dark flex items-center gap-1">
                    <Clock size={14} strokeWidth={3} /> Tiempo
                  </span>
                  <span className={`font-mono font-black text-2xl ${writeTimeLeft <= 5 ? 'text-red-500 animate-pulse' : writeTimeLeft <= 10 ? 'text-brand-accent' : 'text-brand-dark'}`}>
                    {writeTimeLeft}s
                  </span>
                </div>
                <div className="w-full h-5 bg-gray-200 rounded-full border-4 border-brand-dark overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${timerColor}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.5, ease: "linear" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Aviso de "casi acierto" */}
          <AnimatePresence>
            {isReveal && closeMatch && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 bg-brand-accent border-4 border-brand-dark rounded-2xl p-4 shadow-brutal-sm flex items-center justify-center gap-3"
              >
                <Flame size={28} className="text-red-500" strokeWidth={3} />
                <span className="font-black text-xl text-brand-dark">🔥 ¡Estuvisteis MUY cerca! ¡Seguid así!</span>
                <Flame size={28} className="text-red-500" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto mb-4 pr-2 sm:pr-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {players.map((p, index) => {
                const showWord = isReveal;
                return (
                  <motion.div 
                    layout 
                    key={p.id} 
                    initial={{ opacity: 0, y: 70, scale: 0.7, rotate: Math.random() * 10 - 5 }} 
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} 
                    transition={{ type: "spring", stiffness: 250, damping: 20, delay: index * 0.1 }}
                    className={`p-4 sm:p-6 rounded-3xl border-4 border-brand-dark shadow-brutal flex items-center gap-4 sm:gap-6 bg-white ${p.id === socket.id ? 'ring-4 ring-brand-primary ring-offset-4 ring-offset-brand-bg' : ''}`}
                  >
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border-4 border-brand-dark shadow-brutal-sm rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-black text-brand-dark">
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      {p.isReady && !isReveal && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-3 -right-3 bg-brand-success text-white border-4 border-brand-dark rounded-full p-1 sm:p-2 shadow-brutal-sm">
                          <CheckCircle2 size={18} strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-base sm:text-lg font-black text-brand-dark mb-2">{p.username} {p.id === socket.id && <span className="text-brand-primary">(Tú)</span>}</p>
                      <div className="bg-gray-100 border-4 border-brand-dark shadow-brutal-sm min-h-[50px] sm:min-h-[70px] rounded-2xl flex items-center px-3 sm:px-5 py-2 sm:py-3">
                        {showWord ? (
                           <motion.div 
                             initial={{ scale: 0, rotate: -25, y: 30 }} 
                             animate={{ scale: [0.5, 1.2, 1], rotate: [-15, 10, -5, 0], y: 0 }} 
                             transition={{ type: "spring", stiffness: 350, damping: 10, delay: index * 0.2 + 0.3 }}
                             className="text-2xl sm:text-4xl font-black text-brand-primary uppercase w-full text-center origin-center"
                             style={{ WebkitTextStroke: '1px #0F172A' }}
                           >
                             {p.currentWord}
                           </motion.div>
                        ) : p.isReady ? (
                           <motion.span 
                             initial={{ scale: 0, rotate: 90 }} 
                             animate={{ scale: [1.5, 1], rotate: 0 }} 
                             transition={{ type: "spring", stiffness: 400, damping: 10 }}
                             className="text-brand-success font-black text-lg sm:text-xl flex items-center gap-2"
                           >
                             ¡LISTO! <CheckCircle2 strokeWidth={3}/>
                           </motion.span>
                        ) : (
                           <div className="flex w-full justify-center"><div className="dot-flashing"></div></div>
                        )}
                      </div>
                      
                      {/* Historial de rondas previas (lateral, sutil) */}
                      {p.previousWords && p.previousWords.length > 0 && (
                        <div className="mt-2 flex gap-1.5 flex-wrap">
                          {p.previousWords.map((pw, i) => (
                            <span key={i} className="text-[10px] sm:text-xs font-bold bg-gray-200 text-gray-500 border-2 border-gray-300 px-2 py-0.5 rounded-lg" title={`Ronda ${i + 1}`}>
                              R{i + 1}: {pw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className={`p-4 sm:p-6 bg-white border-4 border-brand-dark shadow-brutal rounded-3xl transition-opacity ${!isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <form onSubmit={handleSubmitWord} className="flex gap-3 sm:gap-4">
              <input 
                type="text" 
                value={myWordInput}
                onChange={(e) => setMyWordInput(e.target.value)}
                disabled={amIReady || !isWriting}
                placeholder={amIReady ? "Esperando al resto..." : "Escribe tu idea secreta..."}
                className={inputClass + " text-xl sm:text-2xl py-4 sm:py-6"}
                autoFocus autoComplete="off"
              />
              <button 
                type="submit"
                disabled={!myWordInput.trim() || amIReady || !isWriting}
                className={`px-6 sm:px-10 ${btnClass} ${!myWordInput.trim() || amIReady || !isWriting ? 'bg-gray-200 text-gray-400 border-gray-400 shadow-none' : 'bg-brand-secondary text-white'}`}
              >
                <Send size={28} strokeWidth={3} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA 4: Victoria ---
  if (gameState === 'finished') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative ${rawBgColorClass}`}>
        <ThemeToggle />
        <PageTransition className="w-full max-w-3xl text-center">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5, duration: 1 }}
            className="inline-flex justify-center mb-8 bg-brand-accent border-4 border-brand-dark p-8 rounded-full shadow-brutal"
          >
            <Trophy size={80} className="text-brand-dark sm:w-[100px] sm:h-[100px]" strokeWidth={2.5} />
          </motion.div>
          
          <h1 className="text-5xl sm:text-7xl font-black text-brand-dark mb-4 transform -rotate-2" style={{WebkitTextStroke: '2px white'}}>¡ENLACE MENTAL!</h1>
          
          <p className="text-lg font-black text-brand-dark/60 mb-6">Conseguido en {totalRounds} {totalRounds === 1 ? 'ronda' : 'rondas'}</p>
          
          <motion.div 
             initial={{ y: 50, scale: 0.8 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
             className="bg-brand-success text-white border-4 border-brand-dark text-5xl sm:text-8xl font-black px-10 sm:px-16 py-8 sm:py-10 rounded-[3rem] shadow-brutal mb-12 sm:mb-16 uppercase tracking-widest inline-block transform rotate-1"
          >
            {winningWord}
          </motion.div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <button 
              onClick={handleLeaveRoom}
              className={`px-8 sm:px-10 py-4 sm:py-6 bg-white text-brand-dark text-lg sm:text-xl ${btnClass}`}
            >
              Volver al Lobby
            </button>
            {amIHost && (
              <button 
                onClick={handleResetGame}
                className={`px-8 sm:px-10 py-4 sm:py-6 bg-brand-primary text-white text-xl sm:text-2xl ${btnClass}`}
              >
                <RefreshCw size={28} strokeWidth={3} />
                Otra Partida
              </button>
            )}
          </div>
        </PageTransition>
      </div>
    );
  }

  return null;
}

export default App;
