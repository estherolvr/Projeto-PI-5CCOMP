import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

export default function AdminPermissoes() {
  const query = useAdminQuery(async () => {
    const [users, students] = await Promise.all([api.admin.getUsers(), api.admin.getStudents({ limit: 1 })])
    return { users, students }
  })
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Perfis de Acesso</h1>
    <p className="text-sm text-gray-500 dark:text-slate-400">Perfis utilizados pelos cadastros do sistema.</p>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Administrador', count: query.data?.users.filter(u => u.role === 'admin').length, to: '/admin/usuarios' },
          { label: 'ASA', count: query.data?.users.filter(u => u.role === 'asa').length, to: '/admin/asa' },
          { label: 'Aluno', count: query.data?.students.total, to: '/admin/alunos' },
        ].map(role => <Link key={role.label} to={role.to} className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl"><h2 className="font-semibold dark:text-slate-100">{role.label}</h2><p className="text-3xl font-bold text-brand-600 mt-3">{role.count}</p><p className="text-sm text-gray-500 mt-1">cadastros</p></Link>)}
      </div>
      <p className="text-sm text-gray-500 dark:text-slate-400">As permissões são definidas por perfil no sistema. A edição individual de permissões ainda não está disponível.</p>
    </AdminDataState>
  </div>
}
