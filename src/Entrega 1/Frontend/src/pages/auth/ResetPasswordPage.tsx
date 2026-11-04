import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import FecapLogo from '@/components/ui/FecapLogo'

export default function ResetPasswordPage() {
  const token = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access_token') || '', [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
  return <main className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-5">
    <section className="w-full max-w-md bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-6"><FecapLogo size={38}/><strong className="text-xl dark:text-white">Álvaro AI</strong></div>
      <h1 className="text-2xl font-bold dark:text-white">Definir nova senha</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Escolha uma senha com pelo menos 8 caracteres.</p>
      {message ? <div className="space-y-4"><p role="status" className="p-3 bg-emerald-50 text-emerald-800 rounded-lg">{message}</p><Link className="block text-center bg-brand-600 text-white rounded-lg py-2.5" to="/login">Entrar</Link></div> :
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm dark:text-slate-200">Nova senha<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border rounded-lg p-3 dark:bg-slate-900 dark:border-slate-700"/></label>
        <label className="block text-sm dark:text-slate-200">Confirmar senha<input type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full border rounded-lg p-3 dark:bg-slate-900 dark:border-slate-700"/></label>
        {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={saving||!token} className="w-full bg-brand-600 text-white rounded-lg py-2.5 disabled:opacity-50">{saving?'Salvando…':'Redefinir senha'}</button>
      </form>}
    </section>
  </main>
}
