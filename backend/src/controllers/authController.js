/**
 * authController.js — Lógica de autenticación de usuarios
 *
 * Este controlador gestiona tres casos de uso diferenciados:
 *   1. Registro de cuenta nueva con contraseña.
 *   2. Login de cuenta existente.
 *   3. Acceso rápido como invitado (sin contraseña).
 *
 * Decisiones de seguridad tomadas:
 * - Las contraseñas NUNCA se almacenan en texto plano. Usamos bcrypt con
 *   un factor de coste de 10 salts, que es el estándar recomendado para
 *   aplicaciones web modernas (equilibrio entre seguridad y rendimiento).
 * - La sesión del usuario se gestiona mediante JWT (JSON Web Tokens), lo que
 *   permite que el backend sea stateless: no hay que mantener sesiones en
 *   memoria ni en base de datos. El token viaja en cada petición y contiene
 *   el id y el username del usuario de forma firmada.
 */

const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// En producción esto debería venir de una variable de entorno, pero para
// el MVP del TFG lo dejamos aquí para simplificar la demostración.
const JWT_SECRET = 'enlace_mental_super_secret_tfg';

// ---------------------------------------------------------------------------
// Registro de usuario nuevo
// ---------------------------------------------------------------------------
exports.register = async (req, res) => {
  const { username, password } = req.body;

  // Validación básica en el servidor: aunque el frontend ya valida, nunca
  // hay que fiarse solo del cliente. Esta es la barrera definitiva.
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

  try {
    // Hasheamos la contraseña antes de persistirla. El número 10 indica
    // las rondas de procesamiento (salt rounds). A mayor número, más seguro
    // pero más lento; 10 es el valor de referencia recomendado por OWASP.
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO users (username, password, is_guest) VALUES (?, ?, 0)`, [username, hashedPassword], function(err) {
      if (err) {
        // Si el error es de unicidad, el usuario ya existe. Devolvemos un
        // mensaje claro sin filtrar detalles internos de la BD.
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario ya existe' });
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      // Una vez creado el usuario, generamos su JWT para que no tenga que
      // hacer login por separado: se registra y ya está dentro.
      const token = jwt.sign({ id: this.lastID, username, is_guest: 0 }, JWT_SECRET);
      res.json({ token, user: { id: this.lastID, username, isGuest: false } });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error encriptando la contraseña' });
  }
};

// ---------------------------------------------------------------------------
// Login de usuario existente
// ---------------------------------------------------------------------------
exports.login = (req, res) => {
  const { username, password } = req.body;

  // Buscamos solo usuarios no-invitados para evitar colisiones de nombres
  // entre cuentas reales y cuentas temporales de invitado.
  db.get(`SELECT * FROM users WHERE username = ? AND is_guest = 0`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });

    // Devolvemos el mismo mensaje tanto si el usuario no existe como si la
    // contraseña es incorrecta. Esto evita el "user enumeration attack",
    // donde un atacante podría deducir qué usuarios existen en el sistema.
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    // bcrypt.compare hace la comparación de forma segura en tiempo constante,
    // previniendo ataques de temporización.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, username: user.username, is_guest: 0 }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, isGuest: false } });
  });
};

// ---------------------------------------------------------------------------
// Acceso rápido como invitado
// ---------------------------------------------------------------------------
exports.guestLogin = (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Falta el nombre' });

  // Añadimos el sufijo "_Invitado" para evitar que un invitado pueda suplantar
  // a un usuario registrado usando su mismo nombre de usuario.
  const guestName = `${username}_Invitado`;

  // INSERT OR IGNORE: si ya existe un invitado con ese nombre (por una sesión
  // anterior), simplemente lo recuperamos. Para el MVP esto es suficiente;
  // en producción se generaría un ID único por sesión.
  db.run(`INSERT OR IGNORE INTO users (username, password, is_guest) VALUES (?, ?, 1)`, [guestName, ''], function(err) {
    db.get(`SELECT * FROM users WHERE username = ?`, [guestName], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Error creando invitado' });
        const token = jwt.sign({ id: user.id, username: user.username, is_guest: 1 }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, isGuest: true } });
    });
  });
};
