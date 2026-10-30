import { useState, useEffect } from 'react'
import { Plus, MoreVertical, Clock, Ticket, UserCheck, ShieldAlert, CheckCircle, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'

interface AsaMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department?: string
  status: string
  lastAccess: string
  _count?: {
    assignedTickets: number
  }
}

export default function AdminEquipeASA() {
  const [team, setTeam] = useState<AsaMember[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [department, setDepartment] = useState('Atendimento ao Aluno (ASA)')
  const [formError, setFormError] = useState<string | null>(null)

  const { data, loading, error, refresh: loadTeam } = useAdminQuery(() => api.admin.getUsers('asa'))
  useEffect(() => { if (data) setTeam(data) }, [data])

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await api.admin.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'asa',
        department: department.trim()
      })
      setIsModalOpen(false)
      setName('')
      setEmail('')
      setPassword('123456')
      await loadTeam()
    } catch (err: any) {
      console.error('Erro ao criar membro:', err)
      setFormError(err.message || 'Falha ao registrar novo atendente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (member: AsaMember) => {
    const nextStatus = member.status === 'ativo' ? 'inativo' : 'ativo'
    setTogglingId(member.id)
    try {
      await api.admin.updateUserStatus(member.id, nextStatus)
      await loadTeam()
      setTeam(prev => prev.map(m => m.id === member.id ? { ...m, status: nextStatus } : m))
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Equipe ASA</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Gerenciamento real dos atendentes, ocupação de chamados e status de atividade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTeam}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-brand-600')} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar atendente
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadTeam} className="underline font-semibold ml-4">Tentar novamente</button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 animate-pulse p-6"></div>
          ))}
        </div>
      ) : team.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Nenhum atendente cadastrado</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Cadastre os membros da equipe ASA para gerenciar a fila e distribuição de chamados aos alunos.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Cadastrar primeiro atendente
          </button>
        </div>
      ) : (
        /* Team Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member) => {
            const ticketCount = member._count?.assignedTickets || 0
            const isToggling = togglingId === member.id

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xl uppercase">
                        {member.name.slice(0, 2)}
                      </div>
                    )}
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800',
                        member.status === 'ativo' ? 'bg-emerald-500' : 'bg-gray-400'
                      )}
                    ></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 truncate">{member.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{member.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                      {member.department || 'Central ASA'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-1">
                      <Ticket className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-medium">Chamados</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{ticketCount}</p>
                    <p className="text-[10px] text-gray-400">ativos atribuídos</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-1">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium">Status</span>
                    </div>
                    <p className={cn(
                      'text-sm font-bold uppercase mt-1',
                      member.status === 'ativo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                    )}>
                      {member.status}
                    </p>
                    <button
                      onClick={() => handleToggleStatus(member)}
                      disabled={isToggling}
                      className="text-[11px] text-brand-600 hover:underline mt-0.5"
                    >
                      {isToggling ? 'Salvando...' : member.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Último acesso</span>
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    {member.lastAccess ? new Date(member.lastAccess).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca acessou'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Adicionar Atendente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
              Adicionar Atendente ASA
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              O atendente terá permissão para visualizar a fila, responder chamados e gerenciar agendamentos.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Beatriz Silva"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  E-mail Institucional *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: beatriz.silva@fecap.br"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Departamento / Setor
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Atendimento Presencial Liberdade"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Senha Provisória
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                  {submitting ? 'Cadastrando...' : 'Cadastrar Atendente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
