/**
 * server.js — Punto de entrada del backend de Enlace Mental
 *
 * Aquí arranca todo. Usamos Express para exponer una API REST clásica
 * (registro, login) y además montamos Socket.IO sobre el mismo servidor HTTP,
 * lo que nos permite reutilizar el mismo puerto para ambos protocolos.
 *
 * La decisión de mezclar REST y WebSockets en el mismo proceso no fue al azar:
 * la autenticación (que es stateless y puntual) encaja perfectamente en REST,
 * mientras que la lógica de juego en tiempo real necesita la conexión persistente
 * que ofrecen los WebSockets. Cada tecnología donde mejor encaja.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const setupSockets = require('./sockets/gameSockets');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Permitimos peticiones cross-origin para que el frontend (Vite/Nginx) pueda
// comunicarse con este servidor sin que el navegador las bloquee.
app.use(cors());

// Necesitamos parsear el cuerpo de las peticiones como JSON para que los
// controladores reciban objetos JS en lugar de texto plano.
app.use(express.json());

// Al importar el módulo de base de datos, se ejecuta automáticamente la
// conexión a SQLite y la creación de tablas si aún no existen. Es una
// inicialización implícita intencionada: el servidor no arranca si la BD falla.
require('./db/database');

// Todas las rutas de autenticación quedan agrupadas bajo /api/auth
// para mantener una estructura de API coherente y fácil de extender.
app.use('/api/auth', authRoutes);

// Endpoint de salud para comprobar que el servidor responde. Útil en Docker
// para que el healthcheck del contenedor sepa si el servicio está listo.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Enlace Mental funcionando' });
});

// Creamos el servidor HTTP de Node de forma explícita en lugar de usar
// app.listen() directamente. Esto es imprescindible: Socket.IO necesita
// adjuntarse al servidor HTTP nativo, no a la instancia de Express.
const server = http.createServer(app);

// Instanciamos Socket.IO configurando CORS para que solo el origen conocido
// (el frontend) pueda abrir conexiones WebSocket. En producción esto se
// lee desde la variable de entorno CORS_ORIGIN.
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Delegamos toda la lógica de juego en tiempo real a su propio módulo.
// Separar responsabilidades facilita el mantenimiento y la legibilidad.
setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});
