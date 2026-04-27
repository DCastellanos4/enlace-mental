# Enlace Mental 🧠✨

![Node](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?logo=socketdotio&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-green.svg)

**Enlace Mental** es un juego cooperativo multijugador en tiempo real donde los jugadores deben converger en la misma palabra a través de asociaciones mentales. Desarrollado como **Trabajo de Fin de Grado (TFG)** del ciclo de **Desarrollo de Aplicaciones Web (DAW)**.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion |
| **Backend** | Node.js, Express 5, Socket.io |
| **Base de Datos** | SQLite3 (persistencia de usuarios y estadísticas) |
| **Auth** | JWT + bcrypt |
| **Despliegue** | Docker + Docker Compose |

---

## 🛠️ Instalación

### Opción A: Docker (recomendado)

```bash
git clone https://github.com/tu-usuario/enlace-mental.git
cd enlace-mental
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`

### Opción B: Manual

```bash
# Terminal 1 - Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

---

## 📁 Estructura

```text
enlace-mental/
├── backend/
│   ├── src/
│   │   ├── db/           # SQLite: conexión y esquema
│   │   ├── routes/       # Endpoints REST (auth)
│   │   ├── sockets/      # Lógica WebSocket del juego
│   │   └── server.js     # Entry point
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── assets/       # Logo e imágenes
│   │   ├── components/   # Componentes React
│   │   ├── utils/        # Sonidos (Web Audio API)
│   │   └── App.jsx       # Componente principal
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🎮 Mecánica del Juego

1. Un jugador **crea una sala** y comparte el código.
2. Los demás se unen con el código.
3. El líder pulsa **¡EMPEZAR!**
4. Cada jugador escribe una palabra en **30 segundos**.
5. Se revelan todas las palabras simultáneamente.
6. Si coinciden → **¡Enlace Mental!** 🎉
7. Si no coinciden → nueva ronda con el historial visible para converger.

---

## ✨ Características

- 🔌 **Tiempo Real** — WebSockets bidireccionales con Socket.io.
- ⏱️ **Timer de 30s** — Barra visual con cambio de color (verde → amarillo → rojo).
- 🔥 **Detección de "casi acierto"** — Algoritmo de Levenshtein para medir similitud.
- 🌙 **Modo Oscuro** — Toggle persistente con paleta "Warm Night".
- 🎵 **Efectos de Sonido** — Generados por código con Web Audio API.
- 🎉 **Confetti** — Explosión triple de partículas en la victoria.
- 📋 **Copiar Código** — Clipboard API con feedback visual.
- 📱 **Responsive** — Adaptado a móvil y escritorio.
- 🔐 **Auth completo** — Login, registro y modo invitado con JWT.
- 📊 **Estadísticas** — Partidas jugadas, victorias y récord por usuario.

---

## 🧪 Scripts

| Comando | Backend | Frontend |
|---------|---------|----------|
| `npm run dev` | Servidor con nodemon | Vite con HMR |
| `npm start` | Producción | — |
| `npm run build` | — | Bundle optimizado |
| `npm run lint` | — | ESLint |

---

## 📝 Variables de Entorno

### Backend (`.env`)
```
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`.env`)
```
VITE_BACKEND_URL=http://localhost:3001
```

---

Desarrollado como **TFG DAW** · 2025
