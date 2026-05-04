/**
 * Logo.jsx — Componente del logotipo animado de Enlace Mental
 *
 * El logo no es una imagen estática: usa Framer Motion para animar su
 * aparición con un efecto de muelle y para girar los fondos luminosos
 * en bucle. Esto da vida a la pantalla de bienvenida y refuerza la
 * identidad visual del proyecto.
 *
 * Los blobs de color difuminado (blur) son un recurso estético moderno
 * que aporta profundidad sin sobrecargar la página. Se implementan como
 * divs con clases de Tailwind (bg-brand-primary/20 + blur).
 */

import React from 'react';
import { motion } from 'framer-motion';
import logoApp from '../assets/logoApp.png';

export const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-10 mt-4 relative">
    {/* Fondo decorativo dinámico */}
    <motion.div 
      animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }} 
      transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
      className="absolute w-48 h-48 bg-brand-primary/20 rounded-full blur-[40px] -z-10"
    ></motion.div>
    
    <motion.div 
      animate={{ rotate: [360, 0], scale: [1, 1.3, 1] }} 
      transition={{ repeat: Infinity, duration: 25, ease: "linear", delay: 2 }}
      className="absolute w-44 h-44 bg-brand-secondary/20 rounded-full blur-[40px] -z-10 translate-x-12"
    ></motion.div>

    <motion.div 
      initial={{ scale: 0, y: -50, rotate: -15 }} 
      animate={{ scale: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 15 }}
      whileHover={{ scale: 1.05, rotate: 5 }}
      className="relative z-10 w-48 h-48 drop-shadow-[8px_8px_0px_rgba(15,23,42,1)] rounded-[2rem] overflow-hidden border-4 border-brand-dark bg-white"
    >
       <img src={logoApp} alt="Logo de Enlace Mental" className="w-full h-full object-cover" />
    </motion.div>
  </div>
);
