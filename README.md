# Enlace Mental 🧠✨

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-development-orange.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

**Enlace Mental** es un juego cooperativo en tiempo real basado en la convergencia de conceptos. Dos jugadores deben intentar llegar a la misma palabra a través de asociaciones lógicas sincronizadas mediante WebSockets.

Este proyecto ha sido desarrollado como **Trabajo de Fin de Grado (TFG)** para el ciclo de Desarrollo de Aplicaciones Web (DAW).

---

## 🚀 Tecnologías Principales

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Zustand.
- **Backend:** Node.js, Express, Socket.io.
- **Base de Datos:** SQLite3 (Persistencia de usuarios y estadísticas).
- **Autenticación:** JWT + Bcrypt para el manejo de sesiones seguras.

---

## 🛠️ Instalación y Configuración

Sigue estos pasos para levantar el proyecto localmente:

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/enlace-mental.git
cd enlace-mental
```

### 2. Configurar el Backend
```bash
cd backend
npm install
# El servidor usa SQLite, la base de datos se crea automáticamente
npm run dev
```
*El servidor correrá en `http://localhost:3001` (o el puerto configurado).*

### 3. Configurar el Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*La aplicación estará disponible en `http://localhost:5173`.*

---

## 📁 Estructura del Proyecto

```text
├── backend/          # API REST y lógica de WebSockets
│   ├── src/
│   │   ├── db/       # Configuración de SQLite
│   │   ├── sockets/  # Manejadores de eventos en tiempo real
│   │   └── server.js # Punto de entrada del servidor
├── frontend/         # SPA con React y Vite
│   ├── src/
│   │   ├── components/
│   │   ├── store/    # Estado global con Zustand
│   │   └── App.jsx
└── README.md
```

---

## 🕹️ Scripts Disponibles

### Backend
- `npm run dev`: Inicia el servidor con nodemon (auto-reload).
- `npm start`: Inicia el servidor en producción.

### Frontend
- `npm run dev`: Entorno de desarrollo con HMR.
- `npm run build`: Genera el bundle optimizado para producción.
- `npm run lint`: Ejecuta el linter para mantener la calidad del código.

---

## 🎖️ Características Clave
- 🧩 **Partidas en Tiempo Real:** Comunicación bidireccional inmediata con `Socket.io`.
- 🔐 **Sistema de Usuarios:** Registro, login y guardado de estadísticas personales.
- 🎨 **UI/UX Premium:** Interfaz moderna con animaciones fluidas usando `Framer Motion`.
- 📱 **Responsive Design:** Adaptado a cualquier dispositivo mediante `Tailwind CSS`.

---

Desarrollado como parte del **TFG DAW**.
