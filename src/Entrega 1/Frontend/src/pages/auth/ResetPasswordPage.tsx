import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import FecapLogo from '@/components/ui/FecapLogo'

export default function ResetPasswordPage() {
  const token = useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    return hash.get('access_token') || query.get('access_token') || ''
  }, [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(token ? '' : 'Este link de recuperação é inválido ou expirou.')
  const [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setSaving(true)
    try { const result = await api.auth.resetPassword(token, password); setMessage(result.message) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível redefinir a senha.') }
    finally { setSaving(false) }
  }
  return <main className="first-access-page">
    <section className="first-access-card">
      <aside>
        <FecapLogo variant="white" size={54}/>
        <div><span>RECUPERAÇÃO DE ACESSO</span><h1>Crie uma nova senha com segurança.</h1><p>Use o link enviado ao seu e-mail para recuperar o acesso à sua conta institucional no iÁlvaro.</p></div>
        <ul><li><Check/> Processo protegido pelo serviço de autenticação</li><li><Check/> O link é pessoal e possui validade limitada</li><li><Check/> Seu perfil e suas permissões são preservados</li></ul>
      </aside>
      <div className="first-access-form-panel">
        <header><span><ShieldCheck/></span><div><small>REDEFINIÇÃO DE SENHA</small><h2>Defina sua nova senha</h2><p>Escolha uma senha pessoal com pelo menos 8 caracteres.</p></div></header>
        {message ? <div className="password-reset-success">
          <span><CheckCircle2/></span>
          <div><small>SENHA ATUALIZADA</small><h3>{message}</h3><p>Agora você já pode entrar no iÁlvaro usando a nova senha.</p></div>
          <Link className="first-access-submit" to="/login">Ir para o login</Link>
        </div> : <form onSubmit={submit}>
          {error && <p role="alert" className="first-access-error">{error}</p>}
          <label>Nova senha<div><KeyRound/><input autoFocus type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" disabled={!token}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} disabled={!token}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>
          <label>Confirmar nova senha<div><KeyRound/><input type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Digite novamente" disabled={!token}/><span aria-hidden="true"/></div></label>
          <div className="first-access-rule"><ShieldCheck/><span><strong>Requisito de segurança</strong>Use pelo menos 8 caracteres e não compartilhe sua senha com outras pessoas.</span></div>
          <button disabled={saving || !token} className="first-access-submit">{saving ? <><Loader2 className="animate-spin"/> Salvando…</> : 'Redefinir senha'}</button>
        </form>}
        <Link to="/login" className="first-access-exit"><ArrowLeft/> Voltar para o login</Link>
      </div>
    </section>
  </main>
}
