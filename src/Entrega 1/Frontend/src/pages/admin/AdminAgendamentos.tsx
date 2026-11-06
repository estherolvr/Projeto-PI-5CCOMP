import { useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import Modal from '@/components/ui/Modal'

function AppointmentDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useAdminQuery(() => api.appointments.get(id), [id])
  const appointment = query.data
  return <Modal open onClose={onClose} title="Detalhes do agendamento" size="lg" footer={
    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-sm">Fechar</button>
  }>
    <section role="dialog" aria-modal="true" aria-label="Detalhes do agendamento">
      <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>
        {appointment && <div className="space-y-5 text-sm text-gray-900 dark:text-slate-100">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['Protocolo', appointment.protocol],
              ['Aluno', `${appointment.studentName} · RA: ${appointment.studentRa}`],
              ['Assunto', appointment.subject],
              ['Data e hora', `${appointment.date.split('-').reverse().join('/')} ${appointment.time}`],
              ['Status', appointment.status.replaceAll('_', ' ')],
              ['Atendente', appointment.attendant?.name || appointment.attendantName || 'Não atribuído'],
              ['Local', appointment.location || 'Não informado'],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
          </dl>
          <section className="border-t border-gray-100 dark:border-slate-700 pt-4"><h3 className="font-semibold mb-2">Descrição do agendamento</h3><p className="whitespace-pre-wrap break-words" data-testid="appointment-description">{appointment.notes?.trim() ? appointment.notes : 'Nenhuma descrição informada.'}</p></section>
          {appointment.resolutionNotes && <section className="border-t border-gray-100 dark:border-slate-700 pt-4"><h3 className="font-semibold mb-2">Registro do atendimento</h3><p className="whitespace-pre-wrap break-words">{appointment.resolutionNotes}</p></section>}
        </div>}
      </AdminDataState>
    </section>
  </Modal>
}

export default function AdminAgendamentos() {
  const [search, setSearch] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const query = useAdminQuery(() => api.appointments.list())
  const appointments = (query.data || []).filter(a => `${a.studentName} ${a.studentRa} ${a.protocol} ${a.subject}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="space-y-6">
    <header><div><div className="section-kicker"><CalendarDays size={15}/> OPERAÇÃO DE ATENDIMENTO</div><h1 className="text-2xl font-bold dark:text-slate-100">Agendamentos ASA</h1><p className="text-sm text-gray-500 dark:text-slate-400">Atendimentos presenciais registrados pelos alunos e pela equipe ASA.</p></div><button onClick={query.refresh} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-300"><RefreshCw size={16}/> Atualizar</button></header>
    <input aria-label="Buscar agendamento" placeholder="Buscar aluno, RA, protocolo ou assunto" value={search} onChange={e => setSearch(e.target.value)} className="p-3 w-full border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!appointments.length}>
      <div className="overflow-x-auto bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl"><table className="w-full text-left text-sm dark:text-slate-300"><thead><tr>{['Protocolo', 'Aluno', 'Assunto', 'Data e hora', 'Status', 'Atendente', 'Detalhes'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{appointments.map(a => <tr key={a.id} className="border-t dark:border-slate-700"><td className="p-4">{a.protocol}</td><td className="p-4">{a.studentName}<small className="block text-gray-500">RA: {a.studentRa}</small></td><td className="p-4">{a.subject}</td><td className="p-4 whitespace-nowrap">{a.date.split('-').reverse().join('/')} {a.time}</td><td className="p-4">{a.status.replaceAll('_', ' ')}</td><td className="p-4">{a.attendant?.name || a.attendantName || 'Não atribuído'}</td><td className="p-4"><button onClick={() => setSelectedAppointmentId(a.id)} aria-label={`Ver detalhes do agendamento ${a.protocol}`} className="text-brand-600 hover:underline whitespace-nowrap">Ver detalhes</button></td></tr>)}</tbody></table></div>
    </AdminDataState>
    {selectedAppointmentId && <AppointmentDetails key={selectedAppointmentId} id={selectedAppointmentId} onClose={() => setSelectedAppointmentId(null)} />}
  </div>
}
