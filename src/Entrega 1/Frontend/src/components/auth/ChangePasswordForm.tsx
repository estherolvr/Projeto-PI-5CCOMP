import { useState } from 'react'
import { api } from '@/lib/api'

export default function ChangePasswordForm() {
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState('')
  const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [message,setMessage]=useState('')
  async function submit(event:React.FormEvent){event.preventDefault();setError('');setMessage('')
    if(password.length<8)return setError('A senha deve ter pelo menos 8 caracteres.')
    if(password!==confirm)return setError('As senhas não coincidem.')
    setSaving(true);try{const result=await api.auth.changePassword(password);setMessage(result.message);setPassword('');setConfirm('')}
    catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível alterar a senha.')}finally{setSaving(false)}
  }
  return <form onSubmit={submit} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-6 space-y-4">
    <div><h2 className="font-semibold dark:text-white">Segurança da conta</h2><p className="text-xs text-gray-500 mt-1">Altere a senha usada para entrar no sistema.</p></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="text-sm dark:text-slate-200">Nova senha<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="block mt-2 w-full border rounded-lg p-3 dark:bg-slate-900 dark:border-slate-700"/></label>
      <label className="text-sm dark:text-slate-200">Confirmar senha<input type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} className="block mt-2 w-full border rounded-lg p-3 dark:bg-slate-900 dark:border-slate-700"/></label>
    </div>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
    <button disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50">{saving?'Alterando…':'Alterar senha'}</button>
  </form>
}
