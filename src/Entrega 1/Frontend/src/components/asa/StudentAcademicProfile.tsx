import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useApiQuery } from '../../lib/use-api-query'
import { DataState } from '../common/DataState'
import Modal from '../ui/Modal'

export default function StudentAcademicProfile({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const query = useApiQuery(() => api.students.get(studentId), [studentId])
  const student = query.data
  return <Modal open onClose={onClose} title="Perfil acadêmico" size="lg" footer={
    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-sm">Fechar</button>
  }>
    <section role="dialog" aria-modal="true" aria-label="Perfil acadêmico do aluno">
      <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
        {student && <div className="space-y-6">
          <div><h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3><p className="text-sm text-gray-500 dark:text-slate-400">RA: {student.ra}</p></div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['Curso', student.course],
              ['Semestre', `${student.semester}º semestre`],
              ['Turno', ({manha: 'Manhã', tarde: 'Tarde', noite: 'Noite'} as Record<string, string>)[student.period] || student.period],
              ['Situação acadêmica', student.status],
              ['E-mail', student.email],
              ['Telefone', student.phone || 'Não informado'],
              ['Cadastrado em', new Date(student.createdAt).toLocaleDateString('pt-BR')],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500 dark:text-slate-400">{label}</dt><dd className="mt-1 text-gray-900 dark:text-slate-100 break-words">{value}</dd></div>)}
          </dl>
          <section className="border-t border-gray-100 dark:border-slate-700 pt-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-slate-100 mb-3">Histórico de chamados ({student.tickets?.length || 0})</h3>
            {student.tickets?.length ? <ul className="space-y-2">{student.tickets.map((ticket: any) => <li key={ticket.id} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/50">
              <Link onClick={onClose} to={`/asa/chamados/${ticket.id}`} className="text-sm font-medium text-brand-600 hover:underline">#{ticket.number} · {ticket.title}</Link>
              <p className="text-xs mt-1 text-gray-500 dark:text-slate-400">{ticket.status.replaceAll('_', ' ')} · {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</p>
            </li>)}</ul> : <p className="text-sm text-gray-500 dark:text-slate-400">Este aluno ainda não possui chamados registrados.</p>}
          </section>
        </div>}
      </DataState>
    </section>
  </Modal>
}
