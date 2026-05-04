/**
 * authRoutes.js — Definición de las rutas de autenticación
 *
 * Separamos las rutas en su propio archivo siguiendo el patrón MVC:
 * el Router solo mapea URLs a controladores, sin contener lógica de negocio.
 * Esto hace que añadir nuevas rutas (ej. /forgot-password) en el futuro
 * sea tan sencillo como añadir una línea aquí.
 *
 * Rutas disponibles:
 *   POST /api/auth/register  → Crea una cuenta nueva
 *   POST /api/auth/login     → Inicia sesión con cuenta existente
 *   POST /api/auth/guest     → Acceso rápido sin contraseña
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/guest', authController.guestLogin);

module.exports = router;
