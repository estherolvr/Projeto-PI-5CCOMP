import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Shield, Ban, CheckCircle, RefreshCw, X, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  department?: string
  lastAccess: string
  createdAt: string
  _count?: {
    assignedTickets: number
  }
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [role, setRole] = useState<'asa' | 'admin'>('asa')
  const [department, setDepartment] = useState('Central de Atendimento ao Aluno')
  const [formError, setFormError] = useState<string | null>(null)

  const { data, loading, error, refresh: loadUsers } = useAdminQuery(() => api.admin.getUsers())
  useEffect(() => { if (data) setUsers(data) }, [data])

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRole = roleFilter === 'todos' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = {
    total: users.length,
    ativos: users.filter((u) => u.status === 'ativo').length,
    admins: users.filter((u) => u.role === 'admin').length,
    asa: users.filter((u) => u.role === 'asa').length,
  }

  const handleCreateUser = async (e: React.FormEvent) => {
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
        role,
        department: department.trim(),
      })
      setIsModalOpen(false)
      setName('')
      setEmail('')
      setPassword('123456')
      await loadUsers()
    } catch (err: any) {
      setFormError(err.message || 'Erro ao registrar usuário.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (user: SystemUser, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const nextStatus = user.status === 'ativo' ? 'inativo' : 'ativo'
    setActionLoadingId(user.id)
    try {
      await api.admin.updateUserStatus(user.id, nextStatus)
      await loadUsers()
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
      )
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, status: nextStatus })
      }
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Usuários do Sistema</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Gerenciamento real de acessos, administradores e atendentes da plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-brand-600')} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* KPI Cards (Real Data) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Usuários', value: stats.total, color: 'text-gray-900 dark:text-slate-100' },
          { label: 'Usuários Ativos', value: stats.ativos, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Administradores', value: stats.admins, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Equipe ASA', value: stats.asa, color: 'text-brand-600 dark:text-brand-400' },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm"
          >
            <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-gray-700 dark:text-slate-300 outline-none"
            >
              <option value="todos">Todos os perfis</option>
              <option value="admin">Administrador</option>
              <option value="asa">Equipe ASA</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando usuários do sistema...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <UserIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Nenhum usuário encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Verifique os filtros ou cadastre um novo membro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
                  <th className="px-6 py-3 font-medium">Departamento</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Último Acesso</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase">
                          {user.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider',
                          user.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-slate-300">
                      {user.department || 'Central ASA'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium capitalize inline-flex items-center gap-1',
                          user.status === 'ativo'
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40'
                            : 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-slate-700'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', user.status === 'ativo' ? 'bg-emerald-500' : 'bg-gray-400')}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-slate-400">
                      {user.lastAccess ? new Date(user.lastAccess).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca acessou'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => handleToggleStatus(user, e)}
                        disabled={actionLoadingId === user.id}
                        className={cn(
                          'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                          user.status === 'ativo'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        )}
                      >
                        {actionLoadingId === user.id ? 'Alterando...' : user.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
              Criar Usuário Interno
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              Defina as permissões e setor de atuação do novo colaborador.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: carlos.eduardo@fecap.br"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Perfil de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="asa">Equipe ASA (Atendente)</option>
                    <option value="admin">Administrador (Total)</option>
                  </select>
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
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Departamento / Setor
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Secretaria Geral / Atendimento Presencial"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
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
                  {submitting ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Detalhes do Usuário */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg uppercase">
                {selectedUser.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{selectedUser.name}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm py-4 border-y border-gray-100 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Perfil:</span>
                <span className="font-semibold uppercase text-xs">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Departamento:</span>
                <span className="font-medium">{selectedUser.department || 'Central ASA'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium capitalize">{selectedUser.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cadastrado em:</span>
                <span className="font-medium">
                  {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Último Acesso:</span>
                <span className="font-medium">
                  {selectedUser.lastAccess ? new Date(selectedUser.lastAccess).toLocaleString('pt-BR') : 'Sem registro'}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => handleToggleStatus(selectedUser)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  selectedUser.status === 'ativo'
                    ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800'
                )}
              >
                {selectedUser.status === 'ativo' ? 'Desativar Acesso' : 'Ativar Acesso'}
              </button>

              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
