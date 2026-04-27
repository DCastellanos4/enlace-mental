# Propuesta TFG: Enlace Mental

## 1. Stack Tecnológico Propuesto

Para una aplicación de juego en tiempo real con necesidad de ser ágil, escalable y con capacidad PWA, te recomiendo el siguiente **Stack MERN modificado (o PERN)**, que es muy utilizado en la industria y excelente para un TFG de DAW:

### Front-End:
*   **Framework:** **React** (con Vite para mayor velocidad de desarrollo). Es ideal para crear SPAs (Single Page Applications) interactivas y convertirlas fácilmente en PWA (Progressive Web Apps).
*   **Estilos:** **Tailwind CSS**. Te permitirá maquetar rápidamente interfaces responsive y limpias.
*   **Estado Cliente:** **Zustand** o Context API (Zustand es más ligero y fácil para manejar el estado global de la sala y usuario).
*   **PWA:** `vite-plugin-pwa` para generar el manifest y los service workers fácilmente.

### Back-End:
*   **Entorno:** **Node.js** con **Express.js**. Es el estándar para construir APIs rápidas en JavaScript/TypeScript.
*   **Tiempo Real:** **Socket.io**. Es la librería más robusta y fácil de implementar para WebSockets en Node.js. Maneja desconexiones, reconexiones y "salas" (rooms) de forma nativa, lo cual es perfecto para tu caso de uso.
*   **Lenguaje:** **TypeScript** (opcional pero muy recomendado). En un TFG de DAW, mostrar que sabes tipar tu código suma muchos puntos y evita errores en tiempo de ejecución, especialmente con los payloads de WebSockets.

### Base de Datos:
*   **Opción A (NoSQL): MongoDB** con **Mongoose**. Ideal si la estructura de los historiales de partidas puede variar o crecer dinámicamente. Es muy ágil.
*   **Opción B (Relacional): PostgreSQL** con **Prisma ORM**. Si prefieres una estructura más rígida (usuarios con suscripciones premium, relaciones claras entre partida y usuarios).
*   *Recomendación para este MVP:* **MongoDB**. Al ser un juego donde se guardarán arrays de palabras por usuario y tiempos de convergencia, un documento JSON encaja perfectamente.

### Infraestructura / Hosting:
*   **Front-End:** Vercel o Netlify (gratis y con CI/CD automático).
*   **Back-End:** Render o Railway (ofrecen capas gratuitas que soportan WebSockets).
*   **Base de Datos:** MongoDB Atlas (capa gratuita M0).

---

## 2. Arquitectura del Proyecto (Estructura de Carpetas)

Se recomienda un enfoque de monorepo o dos repositorios separados. Aquí tienes la estructura lógica:

```text
enlace-mental/
│
├── backend/                  # API y Servidor de WebSockets
│   ├── src/
│   │   ├── config/           # Configuraciones (DB, variables de entorno)
│   │   ├── controllers/      # Lógica de la API REST (Login, Registro, Admin)
│   │   ├── models/           # Esquemas de la Base de Datos (Mongoose)
│   │   ├── routes/           # Rutas HTTP de Express
│   │   ├── sockets/          # Lógica de WebSockets (manejadores de eventos)
│   │   ├── middleware/       # Autenticación, control de errores
│   │   ├── utils/            # Funciones de ayuda (generar códigos de sala)
│   │   └── server.js         # Punto de entrada de la aplicación
│   ├── .env                  # Variables de entorno secretas
│   └── package.json
│
└── frontend/                 # Aplicación React + Vite
    ├── public/               # Assets estáticos y manifest.json para PWA
    ├── src/
    │   ├── assets/           # Imágenes, iconos
    │   ├── components/       # Componentes UI reutilizables (Botones, Inputs, Modales)
    │   ├── context/          # Contextos de React (AuthContext, SocketContext)
    │   ├── hooks/            # Custom hooks (ej. useSocket)
    │   ├── pages/            # Vistas principales (Lobby, Juego, Login, Admin)
    │   ├── services/         # Llamadas a la API REST (fetch/axios)
    │   ├── utils/            # Funciones auxiliares
    │   ├── App.jsx           # Componente raíz y Rutas (React Router)
    │   └── main.jsx          # Punto de entrada React
    ├── tailwind.config.js    # Configuración de TailwindCSS
    └── package.json
```

---

## 3. Esquema de Base de Datos (MongoDB)

Si optamos por MongoDB, estas serían las colecciones principales:

### Colección: `Users` (Usuarios)
```javascript
{
  _id: ObjectId("..."),
  username: "Player1",
  email: "player1@email.com",
  passwordHash: "hashed_string",
  isPremium: false,          // Modelo Freemium
  role: "user",              // "user" o "admin"
  avatarUrl: "default.png",
  stats: {
    gamesPlayed: 12,
    gamesWon: 5,             // Veces que llegó a la convergencia
    fastestConvergence: 45   // Tiempo en segundos
  },
  createdAt: ISODate("...")
}
```

### Colección: `Games` (Historial de Partidas)
*Nota: Las salas activas se manejan en memoria (RAM) por Socket.io para que sea en tiempo real. Solo se guarda en la base de datos cuando la partida termina.*
```javascript
{
  _id: ObjectId("..."),
  roomCode: "XYZ123",
  players: [
    { userId: ObjectId("..."), username: "Player1" },
    { userId: ObjectId("..."), username: "Player2" }
  ],
  startWord: "Fuego",        // Concepto inicial
  endWord: "Sol",            // Palabra en la que convergieron (si ganaron)
  durationSeconds: 120,      // Cuánto tardaron
  status: "completed",       // "completed", "abandoned"
  wordHistory: [             // (Opcional) Traza de cómo llegaron al resultado
    { player: "Player1", words: ["Calor", "Estrella", "Sol"] },
    { player: "Player2", words: ["Luz", "Día", "Sol"] }
  ],
  createdAt: ISODate("...")
}
```
