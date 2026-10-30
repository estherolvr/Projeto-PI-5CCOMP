import { useState } from 'react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'

export default function AdminAgendamentos() {
  const [search, setSearch] = useState('')
  const query = useAdminQuery(() => api.appointments.list())
  const appointments = (query.data || []).filter(a => `${a.studentName} ${a.studentRa} ${a.protocol} ${a.subject}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold dark:text-slate-100">Agendamentos ASA</h1><button onClick={query.refresh} className="text-brand-600 text-sm underline">Atualizar</button></div>
    <p className="text-sm text-gray-500 dark:text-slate-400">Atendimentos presenciais registrados pelos alunos e pela equipe ASA.</p>
    <input aria-label="Buscar agendamento" placeholder="Buscar aluno, RA, protocolo ou assunto" value={search} onChange={e => setSearch(e.target.value)} className="p-3 w-full border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!appointments.length}>
      <div className="overflow-x-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl"><table className="w-full text-left text-sm dark:text-slate-300"><thead><tr>{['Protocolo', 'Aluno', 'Assunto', 'Data e hora', 'Status', 'Atendente'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{appointments.map(a => <tr key={a.id} className="border-t dark:border-slate-700"><td className="p-4">{a.protocol}</td><td className="p-4">{a.studentName}<small className="block text-gray-500">RA: {a.studentRa}</small></td><td className="p-4">{a.subject}</td><td className="p-4 whitespace-nowrap">{a.date.split('-').reverse().join('/')} {a.time}</td><td className="p-4">{a.status.replaceAll('_', ' ')}</td><td className="p-4">{a.attendant?.name || a.attendantName || 'Não atribuído'}</td></tr>)}</tbody></table></div>
    </AdminDataState>
  </div>
}
