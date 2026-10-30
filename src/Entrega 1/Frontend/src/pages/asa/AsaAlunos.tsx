import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Mail, BookOpen, Clock, Users } from 'lucide-react';
import { api } from '../../lib/api';

export default function AsaAlunos() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const list = await api.students.list({ search });
      setStudents(list);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Base de Alunos</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Total de alunos cadastrados: <strong className="text-gray-900 dark:text-white">{students.length}</strong>
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, RA ou curso..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(student => (
          <div key={student.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-1">{student.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">RA: {student.ra}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                student.status === 'regular' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {student.status}
              </span>
            </div>
            
            <div className="space-y-2 mt-auto text-xs">
              <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="truncate">{student.course} · <strong>{student.semester}º Sem</strong> ({student.period})</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{student.email}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs text-gray-500">
              <span>Chamados: <strong>{student._count?.tickets || 0}</strong></span>
              <span className="text-brand-600 font-medium cursor-pointer hover:underline">Perfil acadêmico</span>
            </div>
          </div>
        ))}
      </div>

      {students.length === 0 && !isLoading && (
        <div className="p-12 text-center text-gray-500 dark:text-slate-400">
          Nenhum aluno encontrado para "{search}".
        </div>
      )}
    </motion.div>
  );
}
