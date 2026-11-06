import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react'
import FecapLogo from '@/components/ui/FecapLogo'
import { api } from '@/lib/api'
import { clearAuthToken, getAuthToken } from '@/lib/auth-session'
import { useAppStore, type CurrentUser } from '@/store/app-store'

const roleHome = { aluno: '/aluno', asa: '/asa', admin: '/admin' } as const

export default function FirstAccessPage() {
  const navigate = useNavigate()
  const setCurrentUser = useAppStore(state => state.setCurrentUser)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!getAuthToken()) { navigate('/login', { replace: true }); return }
    api.auth.me().then(({ user: profile }) => {
      if (!active) return
      if (!profile?.mustChangePassword) {
        navigate(roleHome[profile?.role as keyof typeof roleHome] || '/login', { replace: true })
        return
      }
      setUser(profile)
      setCurrentUser(profile)
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível validar sua sessão.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [navigate, setCurrentUser])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setSaving(true)
    try {
      const result = await api.auth.completeFirstAccess(password)
      setCurrentUser(result.user)
      navigate(roleHome[result.user.role as keyof typeof roleHome], { replace: true })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível definir a nova senha.')
    } finally { setSaving(false) }
  }

  function leave() {
    clearAuthToken()
    setCurrentUser(null)
    navigate('/login', { replace: true })
  }

  if (loading) return <main className="first-access-page"><div className="first-access-loading"><Loader2 className="animate-spin"/><span>Validando primeiro acesso…</span></div></main>

  return <main className="first-access-page">
    <section className="first-access-card">
      <aside>
        <FecapLogo variant="white" size={54}/>
        <div><span>PRIMEIRO ACESSO</span><h1>Proteja sua conta institucional.</h1><p>A senha fornecida pela administração é provisória. Defina agora uma senha pessoal para acessar o iÁlvaro.</p></div>
        <ul><li><Check/> Mantém seu perfil e suas permissões</li><li><Check/> Concluído somente uma vez</li><li><Check/> Senha armazenada pelo serviço de autenticação</li></ul>
      </aside>
      <div className="first-access-form-panel">
        <header><span><ShieldCheck/></span><div><small>CONTA VERIFICADA</small><h2>Defina sua nova senha</h2><p>{user?.name} · {user?.email}</p></div></header>
        <form onSubmit={submit}>
          {error && <p role="alert" className="first-access-error">{error}</p>}
          <label>Nova senha<div><KeyRound/><input autoFocus type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres"/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>
          <label>Confirmar nova senha<div><KeyRound/><input type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Digite novamente"/></div></label>
          <div className="first-access-rule"><ShieldCheck/><span><strong>Requisito de segurança</strong>Use pelo menos 8 caracteres. Não compartilhe sua senha com outras pessoas.</span></div>
          <button className="first-access-submit" disabled={saving}>{saving ? <><Loader2 className="animate-spin"/> Salvando…</> : 'Salvar nova senha e continuar'}</button>
        </form>
        <button type="button" onClick={leave} className="first-access-exit"><LogOut/> Sair e usar outra conta</button>
      </div>
    </section>
  </main>
}
