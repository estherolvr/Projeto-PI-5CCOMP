import { Link } from 'react-router-dom'
import { ArrowUpRight, BadgeCheck, BookOpen, CalendarDays, Clock3, GraduationCap, Hash, Mail, Phone, TicketCheck, UserRound } from 'lucide-react'
import { api } from '../../lib/api'
import { useApiQuery } from '../../lib/use-api-query'
import { DataState } from '../common/DataState'
import Modal from '../ui/Modal'

export default function StudentAcademicProfile({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const query = useApiQuery(() => api.students.get(studentId), [studentId])
  const student = query.data
  const period = student && ({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' } as Record<string, string>)[student.period] || student?.period
  return <Modal open onClose={onClose} title="Perfil acadêmico" description="Dados acadêmicos e histórico de atendimento do aluno." size="lg" footer={
    <button onClick={onClose} className="academic-profile-close">Concluir consulta</button>
  }>
    <section className="asa-academic-profile" role="dialog" aria-modal="true" aria-label="Perfil acadêmico do aluno">
      <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
        {student && <div className="academic-profile-content">
          <header className="academic-profile-hero"><span className="academic-profile-avatar"><UserRound/></span><div><span className="academic-profile-eyebrow">ALUNO FECAP</span><h3>{student.name}</h3><p><Hash size={13}/> Registro acadêmico {student.ra}</p></div><span className={`academic-profile-status ${student.status === 'regular' ? 'is-regular' : ''}`}><BadgeCheck size={14}/>{student.status}</span></header>
          <dl className="academic-profile-grid">
            {[
              [GraduationCap, 'Curso', student.course],
              [BookOpen, 'Semestre', `${student.semester}º semestre`],
              [Clock3, 'Turno', period],
              [Mail, 'E-mail institucional', student.email],
              [Phone, 'Telefone', student.phone || 'Não informado'],
              [CalendarDays, 'Cadastro', new Date(student.createdAt).toLocaleDateString('pt-BR')],
            ].map(([Icon, label, value]: any) => <div key={label}><dt><span><Icon size={15}/></span>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <section className="academic-ticket-history">
            <header><div><span>ATENDIMENTOS</span><h3>Histórico de chamados</h3><p>Solicitações registradas por este aluno.</p></div><strong><TicketCheck size={15}/>{student.tickets?.length || 0}</strong></header>
            {student.tickets?.length ? <ul>{student.tickets.map((ticket: any) => <li key={ticket.id}>
              <Link onClick={onClose} to={`/asa/chamados/${ticket.id}`}><span><small>CHAMADO #{ticket.number}</small><strong>{ticket.title}</strong><em>{ticket.status.replaceAll('_', ' ')} · {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</em></span><ArrowUpRight size={16}/></Link>
            </li>)}</ul> : <div className="academic-ticket-empty"><TicketCheck/><p>Este aluno ainda não possui chamados registrados.</p></div>}
          </section>
        </div>}
      </DataState>
    </section>
  </Modal>
}
