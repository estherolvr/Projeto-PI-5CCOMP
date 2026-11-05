import { BadgeCheck, Building2, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'

function initials(name?: string) {
  return (name || 'ASA').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export default function AsaPerfil() {
  const query = useApiQuery(api.auth.me)
  const user = query.data?.user
  const department = user?.department || 'Atendimento'
  return <div className="asa-profile">
    <header className="asa-profile-heading">
      <div><div className="section-kicker"><UserRound size={15}/> CONTA INSTITUCIONAL</div><h1>Minha conta</h1><p>Consulte seus dados profissionais e gerencie a segurança do acesso.</p></div>
      <span><ShieldCheck size={17}/> Acesso protegido</span>
    </header>
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <section className="asa-profile-card">
        <div className="asa-profile-cover"><span>ÁREA DO SUCESSO ALVARISTA</span></div>
        <div className="asa-profile-identity">
          <div className="asa-profile-avatar">{initials(user?.name)}<i><BadgeCheck size={15}/></i></div>
          <div><h2>{user?.name || 'Profissional ASA'}</h2><p>Equipe de atendimento institucional</p></div>
          <span className="asa-profile-role">ASA</span>
        </div>
        <dl className="asa-profile-details">
          <div><dt><Mail size={16}/> E-mail institucional</dt><dd>{user?.email || 'Não informado'}</dd></div>
          <div><dt><Building2 size={16}/> Área de atuação</dt><dd>{department}</dd></div>
          <div><dt><ShieldCheck size={16}/> Nível de acesso</dt><dd>Atendimento ASA</dd></div>
        </dl>
      </section>
    </DataState>
    <div className="asa-profile-security"><ChangePasswordForm/></div>
  </div>
}
