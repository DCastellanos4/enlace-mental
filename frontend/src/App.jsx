import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Users, UserPlus, ArrowLeft, Play, Send, RefreshCw, Trophy, LogIn, CheckCircle2, UserX, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { initAudio, playPop, playTick, playWin } from './utils/sfx';
import { Logo } from './components/Logo';

const socket = io('http://localhost:3001');

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
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [authTab, setAuthTab] = useState('login'); 
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  
  const [gameState, setGameState] = useState('auth'); 
  const [myWordInput, setMyWordInput] = useState('');
  const [winningWord, setWinningWord] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    socket.on('roomUpdated', (updatedPlayers) => setPlayers(updatedPlayers));

    socket.on('gameStarted', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      setGameState('writing');
      setMyWordInput('');
    });

    socket.on('gameStateUpdated', ({ players, phase }) => {
      setPlayers(players);
      setGameState(phase);
    });

    socket.on('countdownTimer', (count) => {
      setCountdown(count);
      if(count > 0) playTick();
    });

    socket.on('gameWon', ({ winningWord, players }) => {
      setPlayers(players);
      setWinningWord(winningWord);
      setGameState('finished');
      playWin();
      confetti({ 
        particleCount: 200, 
        spread: 100, 
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#FBBF24', '#10B981']
      });
    });

    socket.on('gameReset', () => {
      setGameState('waiting');
      setWinningWord('');
    });

    socket.on('kicked', () => {
      setCurrentRoom(null);
      setPlayers([]);
      setGameState('lobby');
      setError('Has sido expulsado de la sala.');
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('gameStarted');
      socket.off('gameStateUpdated');
      socket.off('countdownTimer');
      socket.off('gameWon');
      socket.off('gameReset');
      socket.off('kicked');
    };
  }, []);

  const handleAuth = async (e, type) => {
    e.preventDefault();
    initAudio();
    if (!authUsername.trim()) return setError('Introduce un apodo genial');
    if (type !== 'guest' && !authPassword.trim()) return setError('Falta la contraseña');
    
    try {
      const res = await fetch(`http://localhost:3001/api/auth/${type}`, {
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

  const amIHost = players.find(p => p.id === socket.id)?.isHost || false;

  const btnClass = "font-black py-4 rounded-2xl border-4 border-brand-dark shadow-brutal hover:shadow-brutal-sm hover:translate-y-[2px] transition-all flex justify-center items-center gap-2 active:shadow-none active:translate-y-[6px]";
  const inputClass = "w-full px-5 py-4 bg-white border-4 border-brand-dark rounded-2xl shadow-brutal-sm focus:outline-none focus:translate-y-[2px] focus:shadow-brutal-hover transition-all font-bold text-brand-dark placeholder-gray-400";

  // --- VISTA 0: Auth ---
  if (gameState === 'auth') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <PageTransition className="w-full max-w-md">
          <Logo />
          
          <div className="bg-white p-8 rounded-3xl border-4 border-brand-dark shadow-brutal">
            <div className="flex gap-2 mb-6">
              <button onClick={() => {setAuthTab('login'); setError('')}} className={`flex-1 py-3 rounded-xl border-4 border-brand-dark font-black transition-all ${authTab==='login' ? 'bg-brand-primary text-white shadow-brutal-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-none border-b-4'}`}>Login</button>
              <button onClick={() => {setAuthTab('register'); setError('')}} className={`flex-1 py-3 rounded-xl border-4 border-brand-dark font-black transition-all ${authTab==='register' ? 'bg-brand-secondary text-white shadow-brutal-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-none'}`}>Nuevo</button>
              <button onClick={() => {setAuthTab('guest'); setError('')}} className={`flex-1 py-3 rounded-xl border-4 border-brand-dark font-black transition-all ${authTab==='guest' ? 'bg-brand-accent text-brand-dark shadow-brutal-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-none'}`}>Invitado</button>
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

              <button 
                type="submit"
                onClick={(e) => handleAuth(e, authTab)}
                className={`w-full text-xl ${btnClass} mt-4
                  ${authTab === 'guest' ? 'bg-brand-accent text-brand-dark' : authTab === 'login' ? 'bg-brand-primary text-white' : 'bg-brand-secondary text-white'}`}
              >
                {authTab === 'login' ? <LogIn size={24} /> : authTab === 'register' ? <UserPlus size={24} /> : <UserCircle size={24} />}
                {authTab === 'login' ? 'Iniciar Sesión' : authTab === 'register' ? 'Crear Cuenta' : 'Entrar Rápido'}
              </button>
            </form>
          </div>
        </PageTransition>
      </div>
    );
  }

  // --- VISTA 1: Lobby Principal ---
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <PageTransition className="w-full max-w-md">
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-brand-dark transform -rotate-2 bg-white border-4 border-brand-dark px-3 py-1 rounded-xl shadow-brutal-sm">
              E<span className="text-brand-primary">.</span>M
            </h1>
            <div className="bg-white border-4 border-brand-dark px-4 py-2 rounded-2xl font-bold text-brand-dark shadow-brutal-sm flex items-center gap-3">
               <span className="w-3 h-3 rounded-full bg-brand-success border-2 border-brand-dark"></span>
               {currentUser.username} {currentUser.isGuest && <span className="text-sm text-brand-secondary bg-gray-100 px-2 rounded-lg border-2 border-brand-dark">Inv</span>}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border-4 border-brand-dark shadow-brutal space-y-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-accent/20 rounded-full blur-xl"></div>
            
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
      <div className="min-h-screen p-4 sm:p-8 flex flex-col">
        <PageTransition className="max-w-5xl w-full mx-auto flex-1 flex flex-col">
          
          <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-3xl border-4 border-brand-dark shadow-brutal">
            <button onClick={handleLeaveRoom} className={`bg-white text-brand-dark px-4 py-2 ${btnClass} text-sm`}>
              <ArrowLeft size={20} strokeWidth={3} /> Salir
            </button>
            <div className="text-center transform rotate-1">
              <p className="text-sm font-black uppercase mb-1 bg-brand-secondary text-white px-3 rounded-xl border-2 border-brand-dark inline-block shadow-brutal-sm">Pasa este código</p>
              <div className="text-5xl font-mono font-black tracking-widest text-brand-dark">
                {currentRoom}
              </div>
            </div>
            <div className="w-[110px] hidden sm:block"></div>
          </header>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-end mb-6 px-2">
              <h3 className="text-3xl font-black text-brand-dark">Jugadores <span className="text-gray-400">({players.length}/8)</span></h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-auto">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5, rotate: -5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5 }}
                    key={p.id} 
                    className={`bg-white border-4 border-brand-dark p-6 rounded-3xl shadow-brutal flex flex-col items-center relative group ${p.id === socket.id ? 'bg-brand-accent/20' : ''}`}
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
                    <div className="w-24 h-24 bg-white border-4 border-brand-dark rounded-full flex items-center justify-center text-4xl font-black mb-4 shadow-brutal-sm text-brand-primary">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-black text-xl text-brand-dark truncate w-full text-center">{p.username}</p>
                    {p.id === socket.id && <p className="text-sm font-bold text-brand-secondary mt-1">Eres tú</p>}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {[...Array(8 - players.length)].map((_, i) => (
                <div key={`e-${i}`} className="bg-transparent border-4 border-brand-dark border-dashed p-6 rounded-3xl flex flex-col items-center justify-center opacity-40">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mb-4 bg-gray-200 border-4 border-gray-400 text-gray-400">?</div>
                  <p className="font-black text-gray-400">Libre</p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center pb-8">
              {amIHost ? (
                <button 
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className={`px-12 py-6 text-3xl ${btnClass} ${players.length >= 2 ? 'bg-brand-success text-white hover:bg-emerald-400' : 'bg-gray-200 text-gray-400 border-gray-400 shadow-none hover:translate-y-0 cursor-not-allowed'}`}
                >
                  <Play fill="currentColor" size={32} />
                  {players.length >= 2 ? '¡EMPEZAR!' : 'Falta gente...'}
                </button>
              ) : (
                <div className="bg-white border-4 border-brand-dark shadow-brutal px-8 py-5 rounded-3xl flex items-center gap-4 text-brand-dark font-black text-xl">
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

    return (
      <div className="min-h-screen p-4 flex flex-col relative overflow-hidden">
        <AnimatePresence>
          {gameState === 'countdown' && (
            <motion.div 
              initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 2, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
            >
              <span className="text-[50vw] font-black text-brand-secondary drop-shadow-[15px_15px_0px_rgba(15,23,42,1)]" style={{WebkitTextStroke: '10px #0F172A'}}>{countdown > 0 ? countdown : '¡YA!'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-5xl w-full mx-auto flex flex-col h-full relative z-10 flex-1">
          <header className="flex justify-between items-center bg-white border-4 border-brand-dark shadow-brutal p-4 rounded-3xl mb-8">
             <div className="px-4 py-2 bg-brand-accent rounded-xl border-4 border-brand-dark font-mono font-black text-brand-dark">
               SALA: {currentRoom}
             </div>
             <div className="font-black text-2xl uppercase tracking-wider text-brand-dark hidden sm:block transform -rotate-1 bg-gray-100 px-6 py-2 rounded-xl border-4 border-brand-dark shadow-brutal-sm">
               {isWriting ? '🤔 Escribe tu palabra' : isReveal ? '✨ ¡Revelación!' : '⏳ Preparados...'}
             </div>
             <button onClick={handleLeaveRoom} className={`bg-red-500 text-white px-4 py-2 text-sm ${btnClass}`}>
               Huir
             </button>
          </header>

          <div className="flex-1 overflow-y-auto mb-8 pr-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {players.map(p => {
                const showWord = isReveal;
                return (
                  <motion.div layout key={p.id} className={`p-6 rounded-3xl border-4 border-brand-dark shadow-brutal flex items-center gap-6 bg-white ${p.id === socket.id ? 'ring-4 ring-brand-primary ring-offset-4 ring-offset-brand-bg' : ''}`}>
                    <div className="relative">
                      <div className="w-20 h-20 bg-white border-4 border-brand-dark shadow-brutal-sm rounded-2xl flex items-center justify-center text-4xl font-black text-brand-dark">
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      {p.isReady && !isReveal && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-3 -right-3 bg-brand-success text-white border-4 border-brand-dark rounded-full p-2 shadow-brutal-sm">
                          <CheckCircle2 size={24} strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-lg font-black text-brand-dark mb-2">{p.username} {p.id === socket.id && <span className="text-brand-primary">(Tú)</span>}</p>
                      <div className="bg-gray-100 border-4 border-brand-dark shadow-brutal-sm min-h-[70px] rounded-2xl flex items-center px-5 py-3">
                        {showWord ? (
                           <motion.span initial={{ opacity: 0, scale: 0.5, rotate: 5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} className="text-3xl font-black text-brand-primary uppercase w-full text-center">
                             {p.currentWord}
                           </motion.span>
                        ) : p.isReady ? (
                           <span className="text-brand-success font-black text-xl flex items-center gap-2">¡LISTO! <CheckCircle2 strokeWidth={3}/></span>
                        ) : (
                           <div className="flex w-full justify-center"><div className="dot-flashing"></div></div>
                        )}
                      </div>
                      
                      {p.previousWords && p.previousWords.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {p.previousWords.map((pw, i) => (
                            <span key={i} className="text-xs font-bold bg-gray-200 text-gray-500 border-2 border-gray-400 px-2 py-1 rounded-lg line-through">{pw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className={`p-6 bg-white border-4 border-brand-dark shadow-brutal rounded-3xl transition-opacity ${!isWriting ? 'opacity-50 pointer-events-none' : ''}`}>
            <form onSubmit={handleSubmitWord} className="flex gap-4">
              <input 
                type="text" 
                value={myWordInput}
                onChange={(e) => setMyWordInput(e.target.value)}
                disabled={amIReady || !isWriting}
                placeholder={amIReady ? "Esperando al resto..." : "Escribe tu idea secreta..."}
                className={inputClass + " text-2xl py-6"}
                autoFocus autoComplete="off"
              />
              <button 
                type="submit"
                disabled={!myWordInput.trim() || amIReady || !isWriting}
                className={`px-10 ${btnClass} ${!myWordInput.trim() || amIReady || !isWriting ? 'bg-gray-200 text-gray-400 border-gray-400 shadow-none' : 'bg-brand-secondary text-white'}`}
              >
                <Send size={36} strokeWidth={3} />
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <PageTransition className="w-full max-w-3xl text-center">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5, duration: 1 }}
            className="inline-flex justify-center mb-8 bg-brand-accent border-4 border-brand-dark p-8 rounded-full shadow-brutal"
          >
            <Trophy size={100} className="text-brand-dark" strokeWidth={2.5} />
          </motion.div>
          
          <h1 className="text-7xl font-black text-brand-dark mb-8 transform -rotate-2" style={{WebkitTextStroke: '2px white'}}>¡ENLACE MENTAL!</h1>
          
          <motion.div 
             initial={{ y: 50, scale: 0.8 }} animate={{ y: 0, scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
             className="bg-brand-success text-white border-4 border-brand-dark text-8xl font-black px-16 py-10 rounded-[3rem] shadow-brutal mb-16 uppercase tracking-widest inline-block transform rotate-1"
          >
            {winningWord}
          </motion.div>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button 
              onClick={handleLeaveRoom}
              className={`px-10 py-6 bg-white text-brand-dark text-xl ${btnClass}`}
            >
              Volver al Lobby
            </button>
            {amIHost && (
              <button 
                onClick={handleResetGame}
                className={`px-10 py-6 bg-brand-primary text-white text-2xl ${btnClass}`}
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
