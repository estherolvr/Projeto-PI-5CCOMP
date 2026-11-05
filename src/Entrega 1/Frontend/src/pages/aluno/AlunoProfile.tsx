import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
export default function AlunoProfile(){
 const q=useApiQuery(api.auth.me)
 const [phone,setPhone]=useState('');const [saving,setSaving]=useState(false);const [notice,setNotice]=useState('');const [error,setError]=useState<string|null>(null)
 const setUser=useAppStore(s=>s.setCurrentUser);const theme=useAppStore(s=>s.theme);const toggle=useAppStore(s=>s.toggleTheme)
 useEffect(()=>{if(q.data?.user){setPhone(q.data.user.phone??'');setUser(q.data.user)}},[q.data,setUser])
 async function save(e:React.FormEvent){e.preventDefault();if(!q.data?.user)return;setSaving(true);setError(null);setNotice('');try{await api.students.updateContact(q.data.user.id,phone.trim()||null);await q.refresh();setNotice('Telefone salvo no seu cadastro.')}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar o contato.')}finally{setSaving(false)}}
 const u=q.data?.user
 return <div className="student-form max-w-4xl mx-auto p-4 md:p-8 space-y-6"><h1 className="text-2xl font-bold dark:text-white">Meu perfil</h1><DataState loading={q.loading} error={q.error} onRetry={q.refresh}><section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-6"><h2 className="font-semibold dark:text-white mb-5">Cadastro acadêmico</h2><dl className="grid sm:grid-cols-2 gap-5">{[['Nome',u?.name],['E-mail',u?.email],['RA',u?.ra],['Curso',u?.course],['Semestre',u?.semester],['Período',u?.period],['Situação',u?.status]].map(([label,value])=><div key={String(label)}><dt className="text-sm text-gray-500">{label}</dt><dd className="font-medium dark:text-slate-200 break-words">{value??'Não informado'}</dd></div>)}</dl></section><form onSubmit={save} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-6 space-y-4"><h2 className="font-semibold dark:text-white">Contato</h2><label className="block text-sm dark:text-slate-200">Telefone<input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" maxLength={30} className="block mt-2 w-full border rounded-lg p-3 dark:bg-slate-900 dark:border-slate-700"/></label>{error&&<p role="alert" className="text-red-600">{error}</p>}{notice&&<p role="status" className="text-green-700">{notice}</p>}<button disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50">{saving?'Salvando…':'Salvar contato'}</button></form></DataState><ChangePasswordForm/><section className="flex flex-wrap gap-5"><button onClick={toggle} className="text-brand-600 underline">Tema: {theme==='dark'?'escuro':'claro'}</button><Link to="/aluno/documentos" className="text-brand-600 underline">Meus documentos</Link><Link to="/aluno/chamados/novo" className="text-brand-600 underline">Solicitar correção de cadastro</Link></section></div>
}
