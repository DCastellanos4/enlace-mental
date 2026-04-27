# 🧠 Enlace Mental

![Node](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?logo=socketdotio&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

¿Alguna vez habéis pensado exactamente lo mismo que otra persona? Pues de eso va **Enlace Mental**.

Es un juego multijugador en el que tú y tus amigos escribís una palabra al mismo tiempo, sin hablar, sin pistas, solo pura telepatía. Si coincidís, habéis ganado. Si no... pues otra ronda, que algo habréis aprendido del otro.

> Proyecto desarrollado como TFG del ciclo de DAW.

---

## ¿Cómo funciona?

1. Alguien crea una sala y comparte el código con sus amigos
2. El líder le da a **¡EMPEZAR!**
3. Tenéis 30 segundos para escribir una palabra (la que sea, sin trampa)
4. Se revelan todas a la vez
5. ¿Coincidís? → 🎉 Confetti y victoria
6. ¿No? → Se ve lo que ha puesto cada uno y se intenta otra vez

Lo divertido es ver cómo poco a poco os vais acercando. El juego incluso te avisa cuando estáis *casi* pensando lo mismo (gracias al algoritmo de Levenshtein, que suena muy serio pero básicamente cuenta cuántas letras de diferencia hay entre dos palabras).

---

## Stack

No me he complicado la vida más de lo necesario:

- **Frontend** → React 19 con Vite. Tailwind CSS v4 para los estilos y Framer Motion para que todo rebote y se mueva bonito.
- **Backend** → Node.js con Express y Socket.io. Toda la partida va por WebSockets, nada de polling.
- **BBDD** → SQLite. Simple, sin configurar servidores de base de datos. Se crea sola al arrancar.
- **Auth** → JWT + bcrypt. Login, registro y modo invitado para los vagos.

---

## Arrancarlo

### Con Docker (lo fácil)

```bash
git clone https://github.com/tu-usuario/enlace-mental.git
cd enlace-mental
docker compose up --build
```

Y listo. Frontend en `http://localhost:8080`, backend en `http://localhost:3001`.

### A mano (lo clásico)

Necesitas dos terminales:

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
npm install
npm run dev
```

```bash
# Terminal 2 — Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend en `http://localhost:5173`, backend en `http://localhost:3001`.

---

## Estructura del proyecto

```
enlace-mental/
├── backend/
│   ├── src/
│   │   ├── db/           # SQLite
│   │   ├── routes/       # Auth (login, registro, invitado)
│   │   ├── sockets/      # Toda la lógica del juego en tiempo real
│   │   └── server.js
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── assets/       # Logo
│   │   ├── components/   # Logo animado y demás
│   │   ├── utils/        # Sonidos generados con Web Audio API
│   │   └── App.jsx       # Aquí está casi todo
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## Cosas que molan

- ⏱️ **Timer de 30 segundos** con barra que cambia de verde a rojo cuando queda poco
- 🔥 **Detección de "casi lo tenéis"** cuando las palabras se parecen mucho
- 🌙 **Modo oscuro** que se guarda en localStorage
- 🎵 **Soniditos** generados por código (sin archivos de audio, pura Web Audio API)
- 🎉 **Confetti** cuando ganáis
- 📋 **Botón de copiar** el código de sala
- 📱 Funciona decentemente en **móvil**
- 🧠 El historial de rondas anteriores se queda visible para que podáis converger

---

## Variables de entorno

### Backend
```
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Frontend
```
VITE_BACKEND_URL=http://localhost:3001
```

Hay archivos `.env.example` en ambas carpetas.

---

TFG DAW · 2025
