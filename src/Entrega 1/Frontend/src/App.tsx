import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from './store/app-store'

// Layouts
import AlunoLayout from './components/layout/AlunoLayout'
import AsaLayout from './components/layout/AsaLayout'
import AdminLayout from './components/layout/AdminLayout'

// Auth & Public Portal
import FecapPortalPage from './pages/public/FecapPortalPage'
import LoginPage from './pages/auth/LoginPage'

// Aluno pages
import AlunoDashboard from './pages/aluno/AlunoDashboard'
import AlunoChat from './pages/aluno/AlunoChat'
import AlunoChamados from './pages/aluno/AlunoChamados'
import NovoChamado from './pages/aluno/NovoChamado'
import DetalheChamadoAluno from './pages/aluno/DetalheChamadoAluno'
import AlunoProfile from './pages/aluno/AlunoProfile'
import AlunoDocumentos from './pages/aluno/AlunoDocumentos'
import AlunoAgendamento from './pages/aluno/AlunoAgendamento'

// ASA pages
import AsaDashboard from './pages/asa/AsaDashboard'
import AsaFila from './pages/asa/AsaFila'
import AsaAgendamentos from './pages/asa/AsaAgendamentos'
import AsaDetalheChamado from './pages/asa/AsaDetalheChamado'
import AsaConversas from './pages/asa/AsaConversas'
import AsaAlunos from './pages/asa/AsaAlunos'
import AsaAgenteIA from './pages/asa/AsaAgenteIA'
import AsaBaseConhecimento from './pages/asa/AsaBaseConhecimento'
import AsaSLA from './pages/asa/AsaSLA'
import AsaMetricas from './pages/asa/AsaMetricas'
import AsaRelatorios from './pages/asa/AsaRelatorios'
import AsaNotificacoes from './pages/asa/AsaNotificacoes'
import AsaAuditoria from './pages/asa/AsaAuditoria'

// Admin pages
import AdminAgendamentos from './pages/admin/AdminAgendamentos'
import AdminCommandCenter from './pages/admin/AdminCommandCenter'
import AdminChamados from './pages/admin/AdminChamados'
import AdminFila from './pages/admin/AdminFila'
import AdminSLA from './pages/admin/AdminSLA'
import AdminCategorias from './pages/admin/AdminCategorias'
import AdminAutomacoes from './pages/admin/AdminAutomacoes'
import AdminAgenteIA from './pages/admin/AdminAgenteIA'
import AdminPrompts from './pages/admin/AdminPrompts'
import AdminBaseConhecimento from './pages/admin/AdminBaseConhecimento'
import AdminRAG from './pages/admin/AdminRAG'
import AdminFeedback from './pages/admin/AdminFeedback'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminAlunos from './pages/admin/AdminAlunos'
import AdminEquipeASA from './pages/admin/AdminEquipeASA'
import AdminPermissoes from './pages/admin/AdminPermissoes'
import AdminIntegracoes from './pages/admin/AdminIntegracoes'
import AdminMetricas from './pages/admin/AdminMetricas'
import AdminRelatorios from './pages/admin/AdminRelatorios'
import AdminAuditoria from './pages/admin/AdminAuditoria'
import AdminLogs from './pages/admin/AdminLogs'
import AdminSeguranca from './pages/admin/AdminSeguranca'
import AdminConfiguracoes from './pages/admin/AdminConfiguracoes'
import AdminSaude from './pages/admin/AdminSaude'

import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'

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
        <Routes>
          {/* Public Institutional Portal & Auth */}
          <Route path="/" element={<FecapPortalPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Aluno - Protegido por JWT e Sessão */}
          <Route element={<ProtectedRoute allowedRoles={['aluno', 'admin']} />}>
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
          <Route element={<ProtectedRoute allowedRoles={['asa', 'admin']} />}>
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
              <Route path="automacoes" element={<AdminAutomacoes />} />
              <Route path="agente-ia" element={<AdminAgenteIA />} />
              <Route path="prompts" element={<AdminPrompts />} />
              <Route path="base-conhecimento" element={<AdminBaseConhecimento />} />
              <Route path="rag" element={<AdminRAG />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="alunos" element={<AdminAlunos />} />
              <Route path="asa" element={<AdminEquipeASA />} />
              <Route path="permissoes" element={<AdminPermissoes />} />
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
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
