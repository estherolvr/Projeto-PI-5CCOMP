import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, MessageSquare, Users, Bot, BookOpen,
  Clock, BarChart2, FileBarChart, Bell, Shield, ChevronLeft, ChevronRight,
  Sun, Moon, LogOut, Search, Menu, X, Calendar
} from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../store/app-store'
import Avatar from '../ui/Avatar'
import FecapLogo, { FecapLogoDark } from '../ui/FecapLogo'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface NavSection {
  label?: string
  items: { icon: React.ComponentType<{ className?: string }>; label: string; to: string; badge?: number }[]
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/asa' },
      { icon: FileText, label: 'Chamados', to: '/asa/chamados', badge: 7 },
    ],
  },
  {
    label: 'Atendimento',
    items: [
      { icon: Calendar, label: 'Agendamentos', to: '/asa/agendamentos' },
      { icon: Clock, label: 'Fila', to: '/asa/chamados' },
      { icon: MessageSquare, label: 'Conversas', to: '/asa/conversas' },
    ],
  },
  {
    label: 'Alunos',
    items: [{ icon: Users, label: 'Alunos', to: '/asa/alunos' }],
  },
  {
    label: 'Inteligência',
    items: [
      { icon: Bot, label: 'Agente IA', to: '/asa/agente-ia' },
      { icon: BookOpen, label: 'Base de Conhecimento', to: '/asa/base-conhecimento' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { icon: Clock, label: 'SLA', to: '/asa/sla' },
      { icon: BarChart2, label: 'Métricas', to: '/asa/metricas' },
      { icon: FileBarChart, label: 'Relatórios', to: '/asa/relatorios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Bell, label: 'Notificações', to: '/asa/notificacoes' },
      { icon: Shield, label: 'Auditoria', to: '/asa/auditoria' },
    ],
  },
]

export default function AsaLayout() {
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar, currentUser, logout } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const sidebarContent = (collapsed = false) => (
    <>
      {/* Logo */}
      <div className={cn('border-b border-gray-100 dark:border-slate-700 flex-shrink-0', collapsed ? 'px-3 py-4' : 'px-5 py-4')}>
        {!collapsed && <div className="h-0.5 w-full asa-accent-bar rounded-full mb-3 opacity-80" />}
        <div className="flex items-center gap-2.5">
          {collapsed ? <FecapLogo size={30} /> : <FecapLogo size={32} />}
          {!collapsed && (
            <div>
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">Álvaro AI</span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">ASA · Atendimento</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.label && !collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">
                {section.label}
              </p>
            )}
            {section.label && collapsed && <div className="my-2 border-t border-gray-100 dark:border-slate-700" />}
            <div className="space-y-0.5">
              {section.items.map(({ icon: Icon, label, to, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/asa'}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 group',
                      collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200'
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="text-[10px] font-semibold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-slate-700 space-y-0.5 flex-shrink-0">
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
      )}
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex-shrink-0 transition-all duration-200',
          sidebarCollapsed ? 'w-[60px]' : 'w-[260px]'
        )}
      >
        {sidebarContent(sidebarCollapsed)}
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="border-t border-gray-100 dark:border-slate-700 px-3 py-3 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile sidebar */}
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
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white dark:bg-slate-800 flex flex-col md:hidden shadow-xl"
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">Álvaro AI</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 md:px-6 py-3.5 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-slate-700/50 rounded-lg px-3 py-1.5 w-52">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                placeholder="Buscar..."
                className="bg-transparent text-sm text-gray-600 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 outline-none w-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-slate-700">
              <Avatar name={currentUser?.name || 'Atendente ASA'} size="sm" status="online" />
              <div className="hidden md:block">
                <p className="text-xs font-medium text-gray-900 dark:text-white leading-none">
                  {currentUser?.name || 'Atendente ASA'}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  {currentUser?.department || 'ASA'}
                </p>
              </div>
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
