import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAppStore } from './store/app-store'

// Layouts
import AlunoLayout from './components/layout/AlunoLayout'
import AsaLayout from './components/layout/AsaLayout'
import AdminLayout from './components/layout/AdminLayout'

// Auth & Public Portal
const FecapPortalPage = lazy(() => import('./pages/public/FecapPortalPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const FirstAccessPage = lazy(() => import('./pages/auth/FirstAccessPage'))
const VerifyDocumentPage = lazy(() => import('./pages/public/VerifyDocumentPage'))

// Aluno pages
const AlunoDashboard = lazy(() => import('./pages/aluno/AlunoDashboard'))
const AlunoChat = lazy(() => import('./pages/aluno/AlunoChat'))
const AlunoChamados = lazy(() => import('./pages/aluno/AlunoChamados'))
const NovoChamado = lazy(() => import('./pages/aluno/NovoChamado'))
const DetalheChamadoAluno = lazy(() => import('./pages/aluno/DetalheChamadoAluno'))
const AlunoProfile = lazy(() => import('./pages/aluno/AlunoProfile'))
const AlunoDocumentos = lazy(() => import('./pages/aluno/AlunoDocumentos'))
const AlunoAgendamento = lazy(() => import('./pages/aluno/AlunoAgendamento'))

// ASA pages
const AsaDashboard = lazy(() => import('./pages/asa/AsaDashboard'))
const AsaFila = lazy(() => import('./pages/asa/AsaFila'))
const AsaAgendamentos = lazy(() => import('./pages/asa/AsaAgendamentos'))
const AsaDetalheChamado = lazy(() => import('./pages/asa/AsaDetalheChamado'))
const AsaConversas = lazy(() => import('./pages/asa/AsaConversas'))
const AsaAlunos = lazy(() => import('./pages/asa/AsaAlunos'))
const AsaAgenteIA = lazy(() => import('./pages/asa/AsaAgenteIA'))
const AsaBaseConhecimento = lazy(() => import('./pages/asa/AsaBaseConhecimento'))
const AsaSLA = lazy(() => import('./pages/asa/AsaSLA'))
const AsaMetricas = lazy(() => import('./pages/asa/AsaMetricas'))
const AsaRelatorios = lazy(() => import('./pages/asa/AsaRelatorios'))
const AsaNotificacoes = lazy(() => import('./pages/asa/AsaNotificacoes'))
const AsaAuditoria = lazy(() => import('./pages/asa/AsaAuditoria'))
const AsaPerfil = lazy(() => import('./pages/asa/AsaPerfil'))

// Admin pages
const AdminAgendamentos = lazy(() => import('./pages/admin/AdminAgendamentos'))
const AdminCommandCenter = lazy(() => import('./pages/admin/AdminCommandCenter'))
const AdminChamados = lazy(() => import('./pages/admin/AdminChamados'))
const AdminFila = lazy(() => import('./pages/admin/AdminFila'))
const AdminSLA = lazy(() => import('./pages/admin/AdminSLA'))
const AdminCategorias = lazy(() => import('./pages/admin/AdminCategorias'))
const AdminAgenteIA = lazy(() => import('./pages/admin/AdminAgenteIA'))
const AdminPrompts = lazy(() => import('./pages/admin/AdminPrompts'))
const AdminBaseConhecimento = lazy(() => import('./pages/admin/AdminBaseConhecimento'))
const AdminRAG = lazy(() => import('./pages/admin/AdminRAG'))
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'))
const AdminUsuarios = lazy(() => import('./pages/admin/AdminUsuarios'))
const AdminAlunos = lazy(() => import('./pages/admin/AdminAlunos'))
const AdminEquipeASA = lazy(() => import('./pages/admin/AdminEquipeASA'))
const AdminIntegracoes = lazy(() => import('./pages/admin/AdminIntegracoes'))
const AdminMetricas = lazy(() => import('./pages/admin/AdminMetricas'))
const AdminRelatorios = lazy(() => import('./pages/admin/AdminRelatorios'))
const AdminAuditoria = lazy(() => import('./pages/admin/AdminAuditoria'))
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'))
const AdminSeguranca = lazy(() => import('./pages/admin/AdminSeguranca'))
const AdminConfiguracoes = lazy(() => import('./pages/admin/AdminConfiguracoes'))
const AdminSaude = lazy(() => import('./pages/admin/AdminSaude'))

import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import { AUTH_SESSION_CHANGED_EVENT, AUTH_TOKEN_KEY } from './lib/auth-session'

function AuthSessionSync() {
  const navigate = useNavigate()
  const location = useLocation()
  const setCurrentUser = useAppStore(state => state.setCurrentUser)

  useEffect(() => {
    const handleSessionChange = () => {
      setCurrentUser(null)
      if (location.pathname !== '/login' && location.pathname !== '/') {
        navigate('/login', { replace: true })
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_TOKEN_KEY) handleSessionChange()
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [location.pathname, navigate, setCurrentUser])

  return null
}

function App() {
  const { theme } = useAppStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthSessionSync />
        <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-gray-500">Carregando…</div>}><Routes>
          {/* Public Institutional Portal & Auth */}
          <Route path="/" element={<FecapPortalPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
          <Route path="/validar-documento" element={<VerifyDocumentPage />} />

          {/* Aluno - Protegido por JWT e Sessão */}
          <Route element={<ProtectedRoute allowedRoles={['aluno']} />}>
            <Route path="/aluno" element={<AlunoLayout />}>
              <Route index element={<AlunoDashboard />} />
              <Route path="chat" element={<AlunoChat />} />
              <Route path="chat/:id" element={<AlunoChat />} />
              <Route path="chamados" element={<AlunoChamados />} />
              <Route path="chamados/novo" element={<NovoChamado />} />
              <Route path="chamados/:id" element={<DetalheChamadoAluno />} />
              <Route path="documentos" element={<AlunoDocumentos />} />
              <Route path="agendamento" element={<AlunoAgendamento />} />
              <Route path="perfil" element={<AlunoProfile />} />
            </Route>
          </Route>

          {/* ASA - Protegido por JWT e Sessão */}
          <Route element={<ProtectedRoute allowedRoles={['asa']} />}>
            <Route path="/asa" element={<AsaLayout />}>
              <Route index element={<AsaDashboard />} />
              <Route path="agendamentos" element={<AsaAgendamentos />} />
              <Route path="chamados" element={<AsaFila />} />
              <Route path="chamados/:id" element={<AsaDetalheChamado />} />
              <Route path="conversas" element={<AsaConversas />} />
              <Route path="alunos" element={<AsaAlunos />} />
              <Route path="agente-ia" element={<AsaAgenteIA />} />
              <Route path="base-conhecimento" element={<AsaBaseConhecimento />} />
              <Route path="sla" element={<AsaSLA />} />
              <Route path="metricas" element={<AsaMetricas />} />
              <Route path="relatorios" element={<AsaRelatorios />} />
              <Route path="notificacoes" element={<AsaNotificacoes />} />
              <Route path="auditoria" element={<AsaAuditoria />} />
              <Route path="perfil" element={<AsaPerfil />} />
            </Route>
          </Route>

          {/* Admin - Protegido por JWT e Sessão */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminCommandCenter />} />
              <Route path="chamados" element={<AdminChamados />} />
              <Route path="fila" element={<AdminFila />} />
              <Route path="agendamentos" element={<AdminAgendamentos />} />
              <Route path="sla" element={<AdminSLA />} />
              <Route path="categorias" element={<AdminCategorias />} />
              <Route path="automacoes" element={<Navigate to="/admin" replace />} />
              <Route path="regras" element={<Navigate to="/admin" replace />} />
              <Route path="agente-ia" element={<AdminAgenteIA />} />
              <Route path="prompts" element={<AdminPrompts />} />
              <Route path="base-conhecimento" element={<AdminBaseConhecimento />} />
              <Route path="rag" element={<AdminRAG />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="alunos" element={<AdminAlunos />} />
              <Route path="asa" element={<AdminEquipeASA />} />
              <Route path="permissoes" element={<Navigate to="/admin/usuarios" replace />} />
              <Route path="integracoes" element={<AdminIntegracoes />} />
              <Route path="metricas" element={<AdminMetricas />} />
              <Route path="relatorios" element={<AdminRelatorios />} />
              <Route path="auditoria" element={<AdminAuditoria />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="seguranca" element={<AdminSeguranca />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
              <Route path="saude" element={<AdminSaude />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes></Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
