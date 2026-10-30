import React from 'react';
import { motion } from 'framer-motion';

export default function AsaRelatorios() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Relatórios</h1>
      <p className="text-gray-500 dark:text-slate-400">Esta página está em construção.</p>
    </motion.div>
  );
}
