import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, BookOpen, Clock, Settings, Bell, Moon, LogOut, Info,
  Award, QrCode, ShieldCheck, CheckCircle2, GraduationCap, FileText,
  Calendar, Phone, MapPin, Edit3, Lock, ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/app-store'
import { mockStudents } from '../../lib/mock-data'
import { getInitials } from '../../lib/utils'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'

export default function AlunoProfile() {
  const navigate = useNavigate()
  const { show } = useToast()
  const currentUser = useAppStore(state => state.currentUser)
  const logout = useAppStore(state => state.logout)

  const student = currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    ra: currentUser.ra || '24001523',
    course: currentUser.course || 'Administração',
    semester: currentUser.semester || 3,
    period: currentUser.period || 'noite',
    status: currentUser.status || 'regular',
    phone: currentUser.phone || '(11) 98765-4321',
  } : mockStudents[0]

  const theme = useAppStore(state => state.theme)
  const toggleTheme = useAppStore(state => state.toggleTheme)

  const [activeTab, setActiveTab] = useState<'academico' | 'documentos' | 'config'>('academico')
  const [showIdCard, setShowIdCard] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [phone, setPhone] = useState(student.phone || '(11) 98765-4321')
  const [address, setAddress] = useState('Av. Paulista, 1000 - Bela Vista, São Paulo/SP')

  const disciplinas = [
    { code: 'ADM-401', name: 'Gestão Estratégica e Competitividade', prof: 'Dr. Roberto Souza', cred: 4, nota: '8.5', freq: '94%' },
    { code: 'ADM-402', name: 'Finanças Corporativas e Controladoria', prof: 'Me. Camila Rocha', cred: 4, nota: '9.0', freq: '90%' },
    { code: 'ADM-403', name: 'Marketing Digital e Comportamento do Consumidor', prof: 'Dra. Patricia Lima', cred: 4, nota: '8.8', freq: '96%' },
    { code: 'ADM-404', name: 'Gestão de Operações e Supply Chain', prof: 'Dr. Antonio Fagundes', cred: 4, nota: '8.2', freq: '88%' },
    { code: 'ADM-405', name: 'Direito Empresarial e Tributário', prof: 'Me. Lucas Amaral', cred: 2, nota: '9.2', freq: '100%' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSaveContact = () => {
    setEditModal(false)
    show('Dados de contato atualizados com sucesso!', 'success')
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ── Top Header Profile Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-card p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white font-black text-3xl flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-700 flex-shrink-0">
              {getInitials(student.name)}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {student.name}
                </h1>
                <Badge variant="success" dot>Matrícula Ativa</Badge>
              </div>

              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">
                RA: {student.ra} · {student.course} ({student.semester}º Semestre · {student.period})
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1.5"><Mail size={14} /> {student.email}</span>
                <span className="flex items-center gap-1.5"><Phone size={14} /> {phone}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> Campus Liberdade</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIdCard(true)}
              icon={<QrCode size={16} />}
            >
              Carteirinha Digital
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditModal(true)}
              icon={<Edit3 size={16} />}
            >
              Editar Contato
            </Button>
          </div>
        </div>

        {/* Quick academic stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-slate-700/80 text-center">
          <div className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl">
            <span className="text-2xs text-gray-400 font-medium uppercase">Coeficiente de Rendimento</span>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">8.7 <span className="text-xs text-emerald-600 font-normal">/ 10</span></p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl">
            <span className="text-2xs text-gray-400 font-medium uppercase">Frequência Semestral</span>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">92%</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl">
            <span className="text-2xs text-gray-400 font-medium uppercase">Horas Complementares</span>
            <p className="text-xl font-bold text-brand-700 dark:text-brand-400 mt-0.5">85h <span className="text-xs text-gray-400 font-normal">/ 120h</span></p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl">
            <span className="text-2xs text-gray-400 font-medium uppercase">Disciplinas em Curso</span>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">5 matérias</p>
          </div>
        </div>
      </motion.div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-3">
        <button
          onClick={() => setActiveTab('academico')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'academico'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          Grade Curricular & Desempenho
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'config'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          Configurações & Conta
        </button>
      </div>

      {/* ── Tab Content: Grade Curricular ── */}
      {activeTab === 'academico' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Disciplinas Matriculadas — 2026/2</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Acompanhamento de aproveitamento e frequência atual</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/aluno/documentos')}
                icon={<FileText size={14} />}
              >
                Emitir Histórico
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 text-2xs uppercase tracking-wider text-gray-400">
                    <th className="pb-3 font-semibold">Código & Disciplina</th>
                    <th className="pb-3 font-semibold">Docente</th>
                    <th className="pb-3 font-semibold text-center">Créditos</th>
                    <th className="pb-3 font-semibold text-center">Média Parcial</th>
                    <th className="pb-3 font-semibold text-center">Frequência</th>
                    <th className="pb-3 font-semibold text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                  {disciplinas.map((d) => (
                    <tr key={d.code} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 pr-3">
                        <span className="font-mono text-2xs text-brand-700 dark:text-brand-400 font-bold block">{d.code}</span>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{d.name}</span>
                      </td>
                      <td className="py-3.5 text-xs text-gray-600 dark:text-slate-300">{d.prof}</td>
                      <td className="py-3.5 text-xs text-center font-medium text-gray-700 dark:text-slate-300">{d.cred}</td>
                      <td className="py-3.5 text-xs text-center font-bold text-gray-900 dark:text-white">{d.nota}</td>
                      <td className="py-3.5 text-xs text-center font-semibold text-emerald-600">{d.freq}</td>
                      <td className="py-3.5 text-right">
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Em Curso
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: Configurações & Conta ── */}
      {activeTab === 'config' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Preferences */}
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-card space-y-5">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Settings size={18} className="text-brand-600" />
              Preferências do Portal
            </h3>

            <div className="space-y-4 divide-y divide-gray-100 dark:divide-slate-700">
              <div className="flex items-center justify-between pt-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500">
                    <Moon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Modo Escuro</p>
                    <p className="text-2xs text-gray-400">Alternar tema visual</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200"
                >
                  {theme === 'dark' ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Notificações Push</p>
                    <p className="text-2xs text-gray-400">Avisos de SLA e respostas</p>
                  </div>
                </div>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700">Ativo</span>
              </div>
            </div>
          </div>

          {/* About & Logout */}
          <div className="bg-gradient-to-br from-slate-900 to-brand-950 border border-brand-900/40 rounded-2xl p-6 text-white shadow-card space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xl tracking-tight">Álvaro AI</span>
                <span className="text-2xs px-2 py-0.5 rounded-full bg-white/10 text-teal-300 font-mono font-semibold">
                  v1.2.0 · Fase 1
                </span>
              </div>
              <p className="text-xs text-green-100/70 leading-relaxed">
                Plataforma Inteligente de Atendimento Acadêmico da FECAP. Projetada para proporcionar uma experiência fluida, ágil e integrada para todos os estudantes alvaristas.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Sair da Conta (Logout)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Editar Dados de Contato"
        description="Mantenha seus dados atualizados para notificações da secretaria"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveContact}>Salvar Alterações</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">Telefone Celular</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">Endereço Residencial</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
        </div>
      </Modal>

      {/* ID Card Modal */}
      <Modal
        open={showIdCard}
        onClose={() => setShowIdCard(false)}
        title="Carteirinha de Estudante Digital"
        description="Identificação oficial do estudante FECAP"
        size="md"
        footer={<Button variant="primary" onClick={() => setShowIdCard(false)} className="w-full">Fechar</Button>}
      >
        <div className="flex justify-center p-2">
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white p-6 shadow-2xl relative overflow-hidden border border-brand-700/40 space-y-6">
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <img src="/fecap-white.png" alt="FECAP" className="w-8 h-8 object-contain" />
                <div>
                  <span className="font-bold text-sm text-white">FECAP · ASA</span>
                  <p className="text-[10px] text-green-300">Identidade Estudantil</p>
                </div>
              </div>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-brand-500/30 text-green-300 border border-green-400/30">
                2026
              </span>
            </div>

            <div className="relative z-10 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-xl font-bold text-white shadow-inner flex-shrink-0">
                ER
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white leading-tight">Esther Rodrigues</h3>
                <p className="text-xs text-green-200">Administração de Empresas</p>
                <p className="text-2xs text-gray-300">RA: <strong>24001523</strong> · 4º Semestre</p>
              </div>
            </div>

            <div className="relative z-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-2xs text-gray-400 uppercase font-semibold">Código de Validação</span>
                <p className="text-xs font-mono font-bold text-brand-700 dark:text-brand-400">FECAP-RA-24001523-2026</p>
                <p className="text-3xs text-gray-400">Válido até 31/12/2026</p>
              </div>
              <div className="w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700">
                <QrCode size={36} />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
