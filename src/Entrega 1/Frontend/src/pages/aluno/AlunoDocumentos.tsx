import { Download, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'

export default function AlunoDocumentos() {
  const user = useAppStore(state => state.currentUser)
  const query = useApiQuery(() => user?.id ? api.students.documents(user.id) : Promise.reject(new Error('Faça login para consultar seus documentos.')), [user?.id])
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState<string | null>(null)
  async function download(document: any) { setBusy(document.id); setError(null); try { if (document.url.startsWith('https://')) { window.open(document.url, '_blank', 'noopener,noreferrer'); return } const response = await fetch(document.url, { headers: { Authorization: `Bearer ${localStorage.getItem('asaia_auth_token') || ''}` } }); if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Não foi possível baixar o arquivo.') } const blob = await response.blob(), url = URL.createObjectURL(blob), anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name; window.document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Falha no download.') } finally { setBusy(null) } }
  return <div className="student-standard-page student-documents space-y-6">
    <header className="student-standard-header"><div><div className="section-kicker"><FileText size={15}/> ARQUIVOS ACADÊMICOS</div><h1>Meus documentos</h1><p>Arquivos vinculados aos seus chamados e agendamentos.</p></div></header>
    <section className="student-document-help"><p>Para obter declarações acadêmicas e documentos oficiais, solicite atendimento à equipe ASA.</p><Link to="/aluno/chamados/novo">Solicitar documento ao ASA</Link></section>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <DataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!query.data?.length}><div className="student-document-list">{query.data?.map(document => <article key={document.id}><span><FileText/></span><div><h2>{document.name}</h2><p>{document.source} · {document.type || 'Tipo não informado'} · {new Date(document.createdAt).toLocaleDateString('pt-BR')}</p></div><button onClick={() => void download(document)} disabled={busy === document.id}><Download size={15}/>{busy === document.id ? 'Baixando…' : 'Baixar arquivo'}</button></article>)}</div></DataState>
  </div>
}
