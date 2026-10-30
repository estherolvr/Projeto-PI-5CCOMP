import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Calendar, LayoutDashboard, FileText, ListOrdered, Clock, Tag, Zap,
  Bot, FileCode2, BookOpen, Database, ThumbsUp,
  Users, GraduationCap, HeadphonesIcon, Key,
  Mail, BarChart2, FileBarChart,
  Shield, ScrollText, Lock,
  Settings, Activity,
  ChevronLeft, ChevronRight, Bell, Sun, Moon, Search, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../store/app-store'
import Avatar from '../ui/Avatar'
import FecapLogo from '../ui/FecapLogo'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import AdminNotifications from '../admin/AdminNotifications'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  to: string
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [{ icon: LayoutDashboard, label: 'Visão geral', to: '/admin' }],
  },
  {
    label: 'Operação',
    items: [
      { icon: FileText, label: 'Chamados', to: '/admin/chamados' },
      { icon: ListOrdered, label: 'Fila', to: '/admin/fila' },
      { icon: Calendar, label: 'Agendamentos', to: '/admin/agendamentos' },
      { icon: Clock, label: 'SLA', to: '/admin/sla' },
      { icon: Tag, label: 'Categorias', to: '/admin/categorias' },
      { icon: Zap, label: 'Automações', to: '/admin/automacoes' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { icon: Bot, label: 'Agente IA', to: '/admin/agente-ia' },
      { icon: FileCode2, label: 'Prompts', to: '/admin/prompts' },
      { icon: BookOpen, label: 'Base de Conhecimento', to: '/admin/base-conhecimento' },
      { icon: Database, label: 'RAG', to: '/admin/rag' },
      { icon: ThumbsUp, label: 'Feedback IA', to: '/admin/feedback' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { icon: Users, label: 'Usuários', to: '/admin/usuarios' },
      { icon: GraduationCap, label: 'Alunos', to: '/admin/alunos' },
      { icon: HeadphonesIcon, label: 'Equipe ASA', to: '/admin/asa' },
      { icon: Key, label: 'Permissões', to: '/admin/permissoes' },
    ],
  },
  {
    label: 'Integrações',
    items: [{ icon: Mail, label: 'Integrações', to: '/admin/integracoes' }],
  },
  {
    label: 'Analytics',
    items: [
      { icon: BarChart2, label: 'Métricas', to: '/admin/metricas' },
      { icon: FileBarChart, label: 'Relatórios', to: '/admin/relatorios' },
    ],
  },
  {
    label: 'Governança',
    items: [
      { icon: Shield, label: 'Auditoria', to: '/admin/auditoria' },
      { icon: ScrollText, label: 'Logs', to: '/admin/logs' },
      { icon: Lock, label: 'Segurança', to: '/admin/seguranca' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Settings, label: 'Configurações', to: '/admin/configuracoes' },
      { icon: Activity, label: 'Saúde', to: '/admin/saude' },
    ],
  },
]

export default function AdminLayout() {
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar, currentUser, logout } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const [menuSearch, setMenuSearch] = useState('')

  const sidebarContent = (collapsed = false) => (
    <>
      <div className={cn('border-b border-gray-100 dark:border-slate-700 flex-shrink-0', collapsed ? 'px-3 py-4' : 'px-5 py-4')}>
        {!collapsed && <div className="h-0.5 w-full asa-accent-bar rounded-full mb-3 opacity-80" />}
        <div className="flex items-center gap-2.5">
          <FecapLogo size={32} />
          {!collapsed && (
            <div>
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">Álvaro AI</span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">Administração</p>
            </div>
          )}
        </div>
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-3 scrollbar-thin', collapsed ? 'px-2' : 'px-3')}>
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.label && !collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">
                {section.label}
              </p>
            )}
            {section.label && collapsed && si > 0 && <div className="my-2 border-t border-gray-100 dark:border-slate-700" />}
            <div className="space-y-0.5">
              {section.items.filter(item => item.label.toLocaleLowerCase('pt-BR').includes(menuSearch.toLocaleLowerCase('pt-BR'))).map(({ icon: Icon, label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150',
                      collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200'
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

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
          sidebarCollapsed ? 'w-[60px]' : 'w-[268px]'
        )}
      >
        {sidebarContent(sidebarCollapsed)}
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
              initial={{ x: -268 }}
              animate={{ x: 0 }}
              exit={{ x: -268 }}
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
                placeholder="Buscar no menu..."
                value={menuSearch}
                onChange={event => setMenuSearch(event.target.value)}
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
            <AdminNotifications />
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-slate-700">
              <Avatar name={currentUser?.name || 'Administrador'} size="sm" />
              <div className="hidden md:block">
                <p className="text-xs font-medium text-gray-900 dark:text-white leading-none">
                  {currentUser?.name || 'Administrador'}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  {currentUser?.department || 'Administração'}
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
