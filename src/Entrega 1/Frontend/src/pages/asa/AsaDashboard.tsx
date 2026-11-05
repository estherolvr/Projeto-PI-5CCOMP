import { Headphones, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'
import StatusBadge from '@/components/ui/StatusBadge'

export default function AsaDashboard() {
  const user = useAppStore(s => s.currentUser)
  const query = useApiQuery(() => api.tickets.list())
  const tickets = query.data ?? []
  const cards = [
    ['Abertos', tickets.filter(t => t.status === 'aberto').length],
    ['Em atendimento', tickets.filter(t => t.status === 'em_atendimento').length],
    ['Aguardando aluno', tickets.filter(t => t.status === 'aguardando_aluno').length],
    ['Atribuídos a mim', tickets.filter(t => t.assignedTo === user?.id && !['resolvido','fechado'].includes(t.status)).length],
  ]
  return <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <div className="workspace-hero flex flex-wrap justify-between gap-4"><div><div className="workspace-eyebrow"><Headphones size={15}/> ÁREA DO SUCESSO ALVARISTA</div><h1 className="text-2xl font-bold dark:text-white">Olá, {user?.name}</h1><p className="text-gray-500">Situação atual dos chamados registrados.</p></div><button onClick={() => void query.refresh()} className="workspace-refresh"><RefreshCw size={15}/>Atualizar</button></div>
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <div className="workspace-metrics grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label,value]) => <div key={label} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><p className="text-sm text-gray-500">{label}</p><strong className="text-3xl dark:text-white">{value}</strong></div>)}</div>
      <section className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-5"><h2 className="font-semibold dark:text-white mb-4">Chamados recentes</h2><DataState loading={false} error={null} onRetry={query.refresh} empty={!tickets.length}>{tickets.slice(0,10).map(ticket => <Link key={ticket.id} to={'/asa/chamados/'+ticket.id} className="flex items-center justify-between gap-4 py-3 border-t dark:border-slate-700"><span className="text-sm dark:text-slate-200">#{ticket.number} · {ticket.title}</span><StatusBadge status={ticket.status}/></Link>)}</DataState></section>
      <div className="workspace-shortcuts flex flex-wrap gap-5 text-brand-600"><Link to="/asa/chamados">Fila de atendimento</Link><Link to="/asa/agendamentos">Agendamentos</Link><Link to="/asa/metricas">Métricas do banco</Link></div>
    </DataState>
  </div>
}
