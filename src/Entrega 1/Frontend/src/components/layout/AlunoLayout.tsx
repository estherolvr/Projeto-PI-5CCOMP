import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, MessageSquare, FileText, User, Bell, LogOut, Sun, Moon,
  Menu, X, FileCheck, CalendarDays, HelpCircle, Sparkles
} from 'lucide-react'
import { useAppStore } from '../../store/app-store'
import Avatar from '../ui/Avatar'
import FecapLogo from '../ui/FecapLogo'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { icon: Home, label: 'Início', to: '/aluno' },
  { icon: Sparkles, label: 'Assistente IA', to: '/aluno/chat' },
  { icon: FileText, label: 'Meus Chamados', to: '/aluno/chamados' },
  { icon: FileCheck, label: 'Documentos Digitais', to: '/aluno/documentos' },
  { icon: CalendarDays, label: 'Agendamento ASA', to: '/aluno/agendamento' },
  { icon: User, label: 'Meu Perfil', to: '/aluno/perfil' },
]



export default function AlunoLayout() {
  const { theme, toggleTheme, currentUser, logout } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          {/* Barra accent ASA */}
          <div className="h-0.5 w-full asa-accent-bar rounded-full mb-3 opacity-80" />
          <div className="flex items-center gap-2.5">
            <FecapLogo size={32} />
            <div>
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">Álvaro AI</span>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight">Portal do Aluno</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/aluno'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-slate-700 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <button
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-white dark:bg-slate-800 flex flex-col md:hidden shadow-xl"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-lg">Álvaro AI</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                {navItems.map(({ icon: Icon, label, to }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/aluno'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                      )
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FecapLogo size={28} />
            <span className="font-bold text-gray-900 dark:text-white">Álvaro AI</span>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            title="Sair"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
          <div />
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-100 dark:border-slate-700">
              <Avatar name={currentUser?.name || 'Aluno'} size="sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {currentUser?.name || 'Aluno'}
              </span>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
              title="Encerrar Sessão"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
