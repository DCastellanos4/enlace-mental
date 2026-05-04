/**
 * database.js — Configuración y arranque de la base de datos SQLite
 *
 * Elegimos SQLite porque encaja perfectamente con la naturaleza del proyecto:
 * es una base de datos embebida (no necesita un proceso separado), el archivo
 * se genera automáticamente y funciona sin configuración adicional. Para un
 * TFG con usuarios concurrentes limitados, SQLite es más que suficiente y
 * simplifica enormemente el despliegue con Docker.
 *
 * Si en el futuro hubiera que escalar a miles de usuarios, bastería con
 * cambiar este módulo por un cliente de PostgreSQL o MySQL sin tocar
 * el resto del código, gracias a que aislamos el acceso a datos aquí.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolvemos la ruta absoluta al archivo de la BD para que funcione
// independientemente del directorio de trabajo desde donde se lance Node.
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error abriendo la base de datos SQLite', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite.');

    // db.serialize() garantiza que las sentencias CREATE TABLE se ejecuten
    // en orden y de forma secuencial, evitando condiciones de carrera al
    // arrancar el servidor por primera vez.
    db.serialize(() => {

      // Tabla de usuarios: almacena tanto cuentas registradas como invitados.
      // El campo is_guest nos permite distinguirlos sin necesitar una tabla aparte.
      // Las contraseñas se guardan hasheadas con bcrypt (ver authController).
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT,
        is_guest INTEGER DEFAULT 0
      )`);

      // Tabla de amigos: implementa una relación muchos-a-muchos entre usuarios.
      // La clave primaria compuesta (user_id, friend_id) impide duplicados de forma
      // nativa a nivel de base de datos, sin necesidad de lógica extra en el código.
      db.run(`CREATE TABLE IF NOT EXISTS friends (
        user_id INTEGER,
        friend_id INTEGER,
        PRIMARY KEY (user_id, friend_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(friend_id) REFERENCES users(id)
      )`);
    });
  }
});

// Exportamos la instancia de la BD para que los controladores puedan
// reutilizarla sin abrir múltiples conexiones al mismo archivo.
module.exports = db;
