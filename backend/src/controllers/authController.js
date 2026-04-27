const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'enlace_mental_super_secret_tfg';

// Registro de usuario normal
exports.register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password, is_guest) VALUES (?, ?, 0)`, [username, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario ya existe' });
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
      
      const token = jwt.sign({ id: this.lastID, username, is_guest: 0 }, JWT_SECRET);
      res.json({ token, user: { id: this.lastID, username, isGuest: false } });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error encriptando la contraseña' });
  }
};

// Login de usuario
exports.login = (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ? AND is_guest = 0`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Error del servidor' });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, username: user.username, is_guest: 0 }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, isGuest: false } });
  });
};

// Login/Registro como Invitado
exports.guestLogin = (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Falta el nombre' });

  // Crear un usuario invitado temporal (o sobrescribir uno antiguo si coincide el nombre para el MVP)
  const guestName = `${username}_Invitado`;
  
  db.run(`INSERT OR IGNORE INTO users (username, password, is_guest) VALUES (?, ?, 1)`, [guestName, ''], function(err) {
    db.get(`SELECT * FROM users WHERE username = ?`, [guestName], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Error creando invitado' });
        const token = jwt.sign({ id: user.id, username: user.username, is_guest: 1 }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, isGuest: true } });
    });
  });
};
