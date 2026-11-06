import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, BookOpen, FileText, GraduationCap, Mail, Moon, Phone, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'

const initials = (name?: string) => (name || 'Aluno').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

export default function AlunoProfile() {
  const query = useApiQuery(api.auth.me)
  const [phone, setPhone] = useState(''), [saving, setSaving] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState<string | null>(null)
  const setUser = useAppStore(state => state.setCurrentUser), theme = useAppStore(state => state.theme), toggle = useAppStore(state => state.toggleTheme)
  useEffect(() => { if (query.data?.user) { setPhone(query.data.user.phone ?? ''); setUser(query.data.user) } }, [query.data, setUser])
  async function save(event: React.FormEvent) { event.preventDefault(); if (!query.data?.user) return; setSaving(true); setError(null); setNotice(''); try { await api.students.updateContact(query.data.user.id, phone.trim() || null); await query.refresh(); setNotice('Telefone salvo no seu cadastro.') } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o contato.') } finally { setSaving(false) } }
  const user = query.data?.user
  return <div className="student-standard-page student-profile space-y-6">
    <header className="student-standard-header"><div><div className="section-kicker"><UserRound size={15}/> CONTA ACADÊMICA</div><h1>Meu perfil</h1><p>Consulte seus dados acadêmicos e gerencie as informações da sua conta.</p></div><span className="student-header-badge"><ShieldCheck size={15}/> Acesso protegido</span></header>
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh}>
      <section className="student-profile-card"><div className="student-profile-cover"><span>PORTAL ACADÊMICO FECAP</span></div><div className="student-profile-identity"><div className="student-profile-avatar">{initials(user?.name)}<i><BadgeCheck size={14}/></i></div><div><h2>{user?.name || 'Aluno'}</h2><p>{user?.course || 'Curso não informado'}</p></div><span>ALUNO</span></div><dl className="student-profile-details"><div><dt><Mail/> E-mail</dt><dd>{user?.email || 'Não informado'}</dd></div><div><dt><GraduationCap/> Registro acadêmico</dt><dd>{user?.ra || 'Não informado'}</dd></div><div><dt><BookOpen/> Etapa atual</dt><dd>{user?.semester ? `${user.semester}º semestre · ${user.period || 'Período não informado'}` : 'Não informado'}</dd></div><div><dt><ShieldCheck/> Situação</dt><dd>{user?.status || 'Não informado'}</dd></div></dl></section>
      <section className="student-profile-contact"><header><span><Phone/></span><div><h2>Contato</h2><p>Mantenha seu telefone atualizado para facilitar o atendimento.</p></div></header><form onSubmit={save}><label>Telefone<input value={phone} onChange={event => setPhone(event.target.value)} type="tel" maxLength={30} placeholder="Informe seu telefone"/></label>{error && <p role="alert" className="text-red-600">{error}</p>}{notice && <p role="status" className="text-green-700">{notice}</p>}<button disabled={saving}>{saving ? 'Salvando…' : 'Salvar contato'}</button></form></section>
    </DataState>
    <div className="student-profile-security"><ChangePasswordForm/></div>
    <nav className="student-profile-links"><button onClick={toggle}>{theme === 'dark' ? <Sun/> : <Moon/>} Tema {theme === 'dark' ? 'escuro' : 'claro'}</button><Link to="/aluno/documentos"><FileText/> Meus documentos</Link><Link to="/aluno/chamados/novo"><ShieldCheck/> Solicitar correção de cadastro</Link></nav>
  </div>
}
