import { Sparkles, Ticket, CalendarDays, FileCheck, ArrowUpRight, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'
import StatusBadge from '@/components/ui/StatusBadge'
export default function AlunoDashboard(){
 const user=useAppStore(s=>s.currentUser)
 const q=useApiQuery(async()=>{const [tickets,conversations,appointments]=await Promise.all([api.tickets.list(),api.chat.getConversations(),api.appointments.my()]);return {tickets,conversations,appointments}})
 const tickets=q.data?.tickets??[]
 return <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6"><header className="workspace-hero"><div className="workspace-eyebrow"><Activity size={15} /> PORTAL DO ALUNO</div><h1 className="text-2xl font-bold dark:text-white">Olá, {user?.name}</h1><p className="text-gray-500">Acompanhe seus atendimentos e converse com a equipe.</p></header><DataState loading={q.loading} error={q.error} onRetry={q.refresh}>
 <div className="workspace-metrics grid sm:grid-cols-3 gap-4">{[['Chamados em andamento',tickets.filter(t=>!['resolvido','fechado'].includes(t.status)).length],['Conversas registradas',q.data?.conversations.length??0],['Agendamentos ativos',(q.data?.appointments??[]).filter(a=>['confirmado','agendado','em_atendimento'].includes(a.status)).length]].map(([label,value])=><section key={label} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><p className="text-gray-500 text-sm">{label}</p><strong className="text-3xl dark:text-white">{value}</strong></section>)}</div>
 <nav className="grid sm:grid-cols-2 gap-4">{[{label:'Conversar com o assistente',to:'/aluno/chat',icon:Sparkles},{label:'Abrir chamado',to:'/aluno/chamados/novo',icon:Ticket},{label:'Agendar atendimento',to:'/aluno/agendamento',icon:CalendarDays},{label:'Consultar documentos',to:'/aluno/documentos',icon:FileCheck}].map(({label,to,icon:Icon})=><Link key={to} to={to} className="workspace-action p-5 bg-brand-600 text-white rounded-xl font-medium"><Icon className="workspace-action-icon" size={24}/><span>{label}</span><ArrowUpRight size={18} className="ml-auto"/></Link>)}</nav>
 <section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><h2 className="font-semibold dark:text-white mb-4">Seus chamados recentes</h2><DataState loading={false} error={null} onRetry={q.refresh} empty={!tickets.length}>{tickets.slice(0,5).map(t=><Link key={t.id} to={'/aluno/chamados/'+t.id} className="flex gap-4 justify-between py-3 border-t dark:border-slate-700"><span className="text-sm dark:text-slate-200">#{t.number} · {t.title}</span><StatusBadge status={t.status}/></Link>)}</DataState></section>
 <section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5"><h2 className="font-semibold dark:text-white mb-4">Conversas recentes</h2><DataState loading={false} error={null} onRetry={q.refresh} empty={!q.data?.conversations.length}>{q.data?.conversations.slice(0,5).map(c=><Link key={c.id} to={'/aluno/chat/'+c.id} className="block py-3 border-t dark:border-slate-700 text-sm dark:text-slate-200">{c.title}<time className="block text-xs text-gray-500">{new Date(c.lastMessageTime).toLocaleString('pt-BR')}</time></Link>)}</DataState></section>
 </DataState></div>
}
