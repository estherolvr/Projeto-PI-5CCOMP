import './workspace.css'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, MessageSquare, FileText, User, Bell, LogOut, Sun, Moon,
  Menu, X, FileCheck, CalendarDays, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAppStore } from '../../store/app-store'
import Avatar from '../ui/Avatar'
import FecapLogo from '../ui/FecapLogo'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import UserNotifications from '../common/UserNotifications'

const navItems = [
  { icon: Home, label: 'Início', to: '/aluno' },
  { icon: Sparkles, label: 'Assistente IA', to: '/aluno/chat' },
  { icon: FileText, label: 'Meus Chamados', to: '/aluno/chamados' },
  { icon: FileCheck, label: 'Documentos Digitais', to: '/aluno/documentos' },
  { icon: CalendarDays, label: 'Agendamento ASA', to: '/aluno/agendamento' },
  { icon: User, label: 'Meu Perfil', to: '/aluno/perfil' },
]



export default function AlunoLayout() {
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar, currentUser, logout } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const sidebarContent = (collapsed = false) => (
    <>
      <div className={cn('workspace-sidebar-brand border-b flex-shrink-0', collapsed ? 'px-3 py-4' : 'px-5 py-4')}>
        {!collapsed && <div className="h-0.5 w-full asa-accent-bar rounded-full mb-3 opacity-80" />}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2.5')}>
          <FecapLogo variant="white" size={collapsed ? 30 : 32} />
          {!collapsed && <div><span className="font-bold tracking-tight">Álvaro AI</span><p className="text-[11px] leading-tight">Portal do Aluno</p></div>}
        </div>
      </div>
      <nav className={cn('workspace-sidebar-nav flex-1 overflow-y-auto py-4 scrollbar-thin', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink key={to} to={to} end={to === '/aluno'} title={collapsed ? label : undefined}
            className={({ isActive }) => cn('workspace-nav-item flex items-center rounded-xl text-sm font-medium transition-all duration-200', collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5', isActive && 'is-active')}>
            <Icon className="w-4 h-4 flex-shrink-0" />{!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      {!collapsed && <div className="workspace-sidebar-footer px-3 py-3 border-t space-y-1 flex-shrink-0">
        <button onClick={toggleTheme} className="workspace-nav-action"><span>{theme === 'dark' ? <Sun /> : <Moon />}</span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</button>
        <button onClick={() => { logout(); navigate('/login', { replace: true }) }} className="workspace-nav-action"><span><LogOut /></span>Sair</button>
      </div>}
    </>
  )

  return (
    <div className="workspace-shell student-workspace-shell flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn('workspace-sidebar hidden md:flex flex-col flex-shrink-0 transition-all duration-200', sidebarCollapsed ? 'w-[68px]' : 'w-[260px]')}>
        {sidebarContent(sidebarCollapsed)}
        <button onClick={toggleSidebar} className="workspace-sidebar-toggle" aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
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
              className="workspace-sidebar fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col md:hidden shadow-xl"
            >
              <button onClick={() => setMobileOpen(false)} aria-label="Fechar menu" className="absolute right-3 top-4 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-1 min-h-0 flex-col" onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) setMobileOpen(false)
              }}>{sidebarContent(false)}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="workspace-topbar md:hidden flex items-center justify-between px-4 py-3">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FecapLogo size={28} />
            <span className="font-bold text-gray-900 dark:text-white">Álvaro AI</span>
          </div>
          <div className="flex items-center gap-1"><UserNotifications /><button
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            title="Sair"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button></div>
        </header>

        {/* Desktop header */}
        <header className="workspace-topbar hidden md:flex items-center justify-between px-7 py-3.5">
          <div />
          <div className="flex items-center gap-3">
            <UserNotifications />
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
