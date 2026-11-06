import { BadgeCheck, CircleX, FileCheck2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'

export default function VerifyDocumentPage(){
 const [params]=useSearchParams(),token=params.get('token')||''
 const query=useApiQuery(()=>token?api.documents.verify(token):Promise.reject(new Error('Código de validação não informado.')),[token])
 const document=query.data?.document
 return <main className="document-verification-page"><section><div className="verification-brand"><FileCheck2/><div><strong>iÁlvaro</strong><span>Validação de documentos acadêmicos</span></div></div>{query.loading?<p>Validando documento…</p>:query.error?<div className="verification-result invalid"><CircleX/><h1>Documento não validado</h1><p>{query.error}</p></div>:<div className="verification-result valid"><BadgeCheck/><h1>Documento autêntico</h1><p>A assinatura digital e os dados do documento foram verificados.</p><dl><div><dt>Documento</dt><dd>{document.type}</dd></div><div><dt>Aluno(a)</dt><dd>{document.name}</dd></div><div><dt>RA</dt><dd>{document.ra}</dd></div><div><dt>Curso</dt><dd>{document.course}</dd></div><div><dt>Protocolo</dt><dd>{document.protocol}</dd></div><div><dt>Emissão</dt><dd>{new Date(document.issuedAt).toLocaleString('pt-BR')}</dd></div></dl></div>}<Link to="/">Voltar ao portal iÁlvaro</Link></section></main>
}
