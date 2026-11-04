import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'

export default function AsaPerfil(){
 const query=useApiQuery(api.auth.me); const user=query.data?.user
 return <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6"><h1 className="text-2xl font-bold dark:text-white">Minha conta</h1>
  <DataState loading={query.loading} error={query.error} onRetry={query.refresh}><section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-6 space-y-2"><h2 className="font-semibold dark:text-white">Perfil institucional</h2><p className="text-sm dark:text-slate-300">{user?.name} · {user?.email}</p><p className="text-sm text-gray-500">Perfil: ASA · {user?.department||'Atendimento'}</p></section></DataState>
  <ChangePasswordForm/>
 </div>
}
