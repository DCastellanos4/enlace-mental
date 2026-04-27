import React from 'react';
import { motion } from 'framer-motion';

export const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-8 relative">
    {/* Fondo decorativo divertido */}
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      className="absolute w-40 h-40 bg-brand-accent/30 rounded-full blur-2xl -z-10"
    ></motion.div>

    <motion.div 
      initial={{ scale: 0, rotate: -20 }} 
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
      className="relative mb-3 w-28 h-28 bg-white border-4 border-brand-dark rounded-3xl shadow-brutal flex items-center justify-center overflow-hidden"
    >
      <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
        {/* Arco superior vibrante */}
        <path d="M 20 40 Q 50 5 80 40" fill="none" stroke="#EC4899" strokeWidth="6" strokeLinecap="round" />
        
        {/* Perfiles enfrentados */}
        <path d="M 15 50 Q 25 35 45 35 Q 45 45 35 55 Q 25 65 30 85" fill="none" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 85 50 Q 75 35 55 35 Q 55 45 65 55 Q 75 65 70 85" fill="none" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Cerebro central / Nodos */}
        <path d="M 45 35 C 35 45 40 60 50 60 C 60 60 65 45 55 35" fill="#8B5CF6" stroke="#0F172A" strokeWidth="4" />
        
        {/* Base bombilla */}
        <path d="M 43 65 L 57 65 L 54 75 L 46 75 Z" fill="#FBBF24" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
        <line x1="44" y1="70" x2="56" y2="70" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="80" r="4" fill="#0F172A" />

        {/* Punto luz (Idea) */}
        <circle cx="50" cy="45" r="5" fill="#FFFBF0" stroke="#0F172A" strokeWidth="3" />
      </svg>
    </motion.div>

    <div className="text-center font-sans mt-2 transform -rotate-2">
      <h1 className="text-4xl font-black text-brand-dark tracking-tight bg-white border-4 border-brand-dark px-4 py-1 rounded-xl shadow-brutal inline-block">
        ENLACE<span className="text-brand-primary">MENTAL</span>
      </h1>
    </div>
  </div>
);
