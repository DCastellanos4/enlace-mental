/**
 * sfx.js — Efectos de sonido generados sin archivos de audio
 *
 * En lugar de cargar ficheros .mp3 o .ogg (que añadirían peso al bundle
 * y complicarían los permisos de copyright), generamos los sonidos
 * dinámicamente usando la Web Audio API del navegador.
 *
 * La Web Audio API opera con un grafo de nodos de procesamiento de audio:
 * aqui usamos un oscilador (generador de onda) conectado a un GainNode
 * (control de volumen) que hace un ramp exponencial hasta 0 para evitar
 * el clásico 'clic' de corte abrupto en el audio digital.
 *
 * Curiosidad técnica: los navegadores modernos requieren que el AudioContext
 * se cree tras una interacción del usuario (politica de autoplay). Por eso
 * existe la función initAudio(), que se llama en el primer click del usuario.
 */

// Instancia única del contexto de audio, compartida por todos los sonidos.
// Se inicializa de forma perezosa (lazy) para cumplir la política de autoplay.
let audioCtx = null;

export const initAudio = () => {
  if (!audioCtx) {
    // webkitAudioContext es el prefijo antiguo necesario para compatibilidad con Safari.
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

// Función interna que abstrae la creación de un tono. Recibe frecuencia (Hz),
// tipo de onda, duración (segundos) y volumen. No se exporta porque es un
// detalle de implementación; el resto del código usa las funciones semánticas.
const playTone = (freq, type, duration, vol=0.1) => {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

// Sonido de confirmación al enviar una palabra: tono corto y alto para dar
// feedback inmediato al usuario de que su acción fue registrada.
export const playPop = () => {
  initAudio();
  playTone(600, 'sine', 0.1, 0.05);
};

// Tick del temporizador: onda triangular más corta para que no resulte invasivo
// pero avise sutilmente de que el tiempo corre.
export const playTick = () => {
  initAudio();
  playTone(800, 'triangle', 0.05, 0.02);
};

// Melodía de victoria: tres tonos ascendentes que forman los grados I, III y V
// de una escala (La-Do#-Mi, acorde mayor). Es una progresión clásica de "éxito"
// reconocible por cualquier jugador habitual de videojuegos.
export const playWin = () => {
  initAudio();
  playTone(440, 'sine', 0.2, 0.1);
  setTimeout(() => playTone(554, 'sine', 0.2, 0.1), 100);
  setTimeout(() => playTone(659, 'sine', 0.4, 0.1), 200);
};
