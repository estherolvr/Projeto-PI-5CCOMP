import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/app-store'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

export default function AdminConfiguracoes() {
  const { theme, setTheme } = useAppStore()
  const query = useAdminQuery(api.auth.me)
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Configurações</h1>
    <section className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl space-y-4">
      <h2 className="font-semibold dark:text-slate-100">Aparência</h2>
      <label className="flex gap-4 items-center text-sm dark:text-slate-300">Tema neste navegador
        <select value={theme} onChange={e => setTheme(e.target.value as 'light' | 'dark')} className="p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"><option value="light">Claro</option><option value="dark">Escuro</option></select>
      </label>
      <p className="text-xs text-gray-500">A preferência é salva automaticamente neste navegador.</p>
    </section>
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <section className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl space-y-2">
        <h2 className="font-semibold dark:text-slate-100">Conta conectada</h2>
        <p className="text-sm dark:text-slate-300">{query.data?.user.name} · {query.data?.user.email}</p>
        <p className="text-sm text-gray-500">Perfil: {query.data?.user.role} · Status: {query.data?.user.status}</p>
      </section>
    </AdminDataState>
    <section className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl space-y-3">
      <h2 className="font-semibold dark:text-slate-100">Serviços e integrações</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400">Configurações de e-mail e manutenção ainda não podem ser alteradas pelo painel.</p>
      <Link to="/admin/integracoes" className="text-brand-600 underline text-sm">Consultar integrações cadastradas</Link>
    </section>
  </div>
}
