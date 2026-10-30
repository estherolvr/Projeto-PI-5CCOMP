import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

export default function AdminSeguranca() {
  const query = useAdminQuery(async () => {
    const [users, logs] = await Promise.all([api.admin.getUsers(), api.admin.getAuditLogs({ limit: 100 })])
    return { users, logs }
  })
  const securityEvents = query.data?.logs.filter(log => /USUARIO|login|auth|permission/i.test(log.action)) || []
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Segurança e Controle de Acesso</h1>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ['Contas da equipe', query.data?.users.length],
          ['Contas ativas', query.data?.users.filter(u => u.status === 'ativo').length],
          ['Administradores', query.data?.users.filter(u => u.role === 'admin').length],
        ].map(([label, value]) => <div key={label} className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl"><p className="text-sm text-gray-500 dark:text-slate-400">{label}</p><p className="text-3xl font-bold dark:text-slate-100">{value}</p></div>)}
      </div>
      <section className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl space-y-4">
        <h2 className="font-semibold dark:text-slate-100">Eventos de acesso e alterações de usuários</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Eventos encontrados nos últimos 100 registros de auditoria.</p>
        {securityEvents.length === 0 && <p className="text-sm text-gray-500">Nenhum evento de acesso ou alteração de usuário registrado neste recorte.</p>}
        {securityEvents.map(log => <div key={log.id} className="border-b dark:border-slate-700 py-3 text-sm dark:text-slate-300"><p>{log.userName} · {log.action}</p><time className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</time></div>)}
        <Link to="/admin/usuarios" className="inline-block text-brand-600 underline">Gerenciar contas e status</Link>
      </section>
      <p className="text-sm text-gray-500 dark:text-slate-400">O sistema ainda não mede sessões ativas, adesão a 2FA ou pontuação de segurança.</p>
    </AdminDataState>
  </div>
}
