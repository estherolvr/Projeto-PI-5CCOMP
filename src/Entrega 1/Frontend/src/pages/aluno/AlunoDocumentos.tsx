import { BadgeCheck, Download, FileCheck2, FileText, GraduationCap, Printer, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import QRCode from 'qrcode'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
import { useAppStore } from '@/store/app-store'

const esc=(value:unknown)=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!))
const periodLabel=(value:string)=>({manha:'Matutino',tarde:'Vespertino',noite:'Noturno'}[value]||value)

export default function AlunoDocumentos(){
 const user=useAppStore(state=>state.currentUser)
 const query=useApiQuery(()=>user?.id?api.students.documents(user.id):Promise.reject(new Error('Faça login para consultar seus documentos.')),[user?.id])
 const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState<string|null>(null),[declaration,setDeclaration]=useState<any>(null)
 async function issue(){setBusy('declaration');setError(null);try{setDeclaration(await api.documents.issueEnrollmentDeclaration())}catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível emitir a declaração.')}finally{setBusy(null)}}
 async function printDeclaration(){
  if(!declaration)return
  setError(null)
  try{
   const validationUrl=`${window.location.origin}/validar-documento?token=${encodeURIComponent(declaration.token)}`
   const qr=await QRCode.toDataURL(validationUrl,{width:190,margin:1,color:{dark:'#071c14',light:'#ffffff'}})
   const issued=new Date(declaration.issuedAt)
   const frame=window.document.createElement('iframe')
   frame.title='Impressão da declaração de matrícula'
   frame.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0;pointer-events:none'
   window.document.body.appendChild(frame)
   const printDocument=frame.contentDocument
   const printWindow=frame.contentWindow
   if(!printDocument||!printWindow){frame.remove();throw new Error('Não foi possível preparar o documento para impressão.')}
   printDocument.open()
   printDocument.write(`<!doctype html><html><head><title>Declaração de Matrícula</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#17231d}.page{min-height:260mm;border:1px solid #cfd8d3;padding:28mm 22mm 20mm;position:relative}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #087b55;padding-bottom:18px}.brand b{font-size:27px}.brand span{display:block;color:#087b55;font-weight:700;letter-spacing:.13em;font-size:10px;margin-top:5px}.protocol{text-align:right;font-size:10px;color:#5d6b64}.protocol b{display:block;color:#20332a;margin-top:4px}.title{text-align:center;margin:48px 0 40px}.title h1{font-size:25px;letter-spacing:.08em;margin:0}.title p{color:#087b55;font-size:11px;font-weight:700;letter-spacing:.14em}.text{font-family:Georgia,serif;font-size:15px;line-height:2;text-align:justify}.text strong{color:#071c14}.details{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:36px 0;border:1px solid #d9e2dd}.details div{padding:13px 15px;border-bottom:1px solid #e3e9e6}.details div:nth-child(odd){border-right:1px solid #e3e9e6}.details small{display:block;color:#738078;font:9px Arial;letter-spacing:.1em;text-transform:uppercase}.details b{font-size:12px}.validation{display:flex;align-items:center;gap:18px;margin-top:45px;padding-top:20px;border-top:1px solid #d9e2dd}.validation img{width:92px;height:92px}.validation h2{margin:0 0 6px;font-size:13px}.validation p{margin:3px 0;color:#607067;font-size:10px}.footer{position:absolute;left:22mm;right:22mm;bottom:16mm;border-top:1px solid #d9e2dd;padding-top:10px;text-align:center;color:#75827b;font-size:9px}@media print{body{print-color-adjust:exact}.page{border:0}}</style></head><body><main class="page"><header class="top"><div class="brand"><b>FECAP</b><span>FUNDAÇÃO ESCOLA DE COMÉRCIO ÁLVARES PENTEADO</span></div><div class="protocol">PROTOCOLO DE EMISSÃO<b>${esc(declaration.protocol)}</b></div></header><section class="title"><p>SECRETARIA ACADÊMICA</p><h1>DECLARAÇÃO DE MATRÍCULA</h1></section><p class="text">Declaramos, para os devidos fins, que <strong>${esc(declaration.name)}</strong>, Registro Acadêmico nº <strong>${esc(declaration.ra)}</strong>, encontra-se regularmente matriculado(a) no curso de <strong>${esc(declaration.course)}</strong>, cursando o <strong>${esc(declaration.semester)}º semestre</strong>, no período <strong>${esc(periodLabel(declaration.period))}</strong>, nesta Instituição de Ensino Superior.</p><div class="details"><div><small>Aluno(a)</small><b>${esc(declaration.name)}</b></div><div><small>Registro Acadêmico</small><b>${esc(declaration.ra)}</b></div><div><small>Curso</small><b>${esc(declaration.course)}</b></div><div><small>Situação acadêmica</small><b>Matrícula ativa</b></div></div><p class="text">Por ser expressão da verdade, firmamos a presente declaração, emitida eletronicamente em São Paulo, aos ${issued.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}.</p><section class="validation"><img src="${qr}" alt="QR Code para validação"/><div><h2>VALIDAÇÃO DIGITAL</h2><p>Escaneie o QR Code para verificar a autenticidade deste documento.</p><p>Emitido em ${issued.toLocaleString('pt-BR')} pelo portal iÁlvaro.</p></div></section><footer class="footer">Documento eletrônico verificável pelo protocolo ${esc(declaration.protocol)} · FECAP</footer></main></body></html>`)
   printDocument.close()
   await Promise.all(Array.from(printDocument.images).map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{image.onload=image.onerror=()=>resolve()})))
   const cleanup=()=>frame.remove()
   printWindow.addEventListener('afterprint',cleanup,{once:true})
   window.setTimeout(cleanup,60000)
   printWindow.focus()
   printWindow.print()
  }catch(caught){setError(caught instanceof Error?caught.message:'Não foi possível abrir a impressão do documento.')}
 }
 async function download(document:any){setBusy(document.id);setError(null);try{if(document.url.startsWith('https://')){window.open(document.url,'_blank','noopener,noreferrer');return}const response=await fetch(document.url,{headers:{Authorization:`Bearer ${localStorage.getItem('asaia_auth_token')||''}`}});if(!response.ok)throw new Error('Não foi possível baixar o arquivo.');const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=window.document.createElement('a');anchor.href=url;anchor.download=document.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(caught){setError(caught instanceof Error?caught.message:'Falha no download.')}finally{setBusy(null)}}
 return <div className="student-standard-page student-documents space-y-6">
  <header className="student-standard-header"><div><div className="section-kicker"><FileText size={15}/> SECRETARIA VIRTUAL</div><h1>Documentos digitais</h1><p>Emita documentos acadêmicos e consulte arquivos vinculados aos seus atendimentos.</p></div><span className="student-header-badge"><ShieldCheck size={15}/> Emissão segura</span></header>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
  <section className="student-issuable-documents"><div className="student-section-heading"><div><div className="section-kicker">EMISSÃO IMEDIATA</div><h2>Documentos disponíveis</h2><p>Gere seu documento em poucos segundos.</p></div></div><article><span><GraduationCap/></span><div><div className="flex items-center gap-2"><h2>Declaração de Matrícula</h2><em><BadgeCheck size={12}/> Disponível</em></div><p>Comprova seu vínculo e situação acadêmica atual na instituição.</p><ul><li><FileCheck2/> Emissão imediata</li><li><ShieldCheck/> Validação por QR Code</li></ul></div><button onClick={()=>void issue()} disabled={busy==='declaration'}><FileText size={16}/>{busy==='declaration'?'Emitindo…':'Emitir documento'}</button></article></section>
  <section className="student-stored-documents"><header><div><div className="section-kicker">MEUS ARQUIVOS</div><h2>Documentos dos atendimentos</h2></div></header><DataState loading={query.loading} error={query.error} onRetry={query.refresh} empty={!query.data?.length}><div className="student-document-list">{query.data?.map(document=><article key={document.id}><span><FileText/></span><div><h2>{document.name}</h2><p>{document.source} · {document.type||'Tipo não informado'} · {new Date(document.createdAt).toLocaleDateString('pt-BR')}</p></div><button onClick={()=>void download(document)} disabled={busy===document.id}><Download size={15}/>{busy===document.id?'Baixando…':'Baixar arquivo'}</button></article>)}</div></DataState></section>
  {declaration&&<div className="student-document-modal"><div><button onClick={()=>setDeclaration(null)} aria-label="Fechar"><X/></button><div className="student-document-sheet"><div className="document-brand"><b>FECAP</b><span>FUNDAÇÃO ESCOLA DE COMÉRCIO ÁLVARES PENTEADO</span></div><small>SECRETARIA ACADÊMICA</small><h2>DECLARAÇÃO DE MATRÍCULA</h2><p>Declaramos que <strong>{declaration.name}</strong>, RA <strong>{declaration.ra}</strong>, encontra-se regularmente matriculado(a) no curso de <strong>{declaration.course}</strong>, cursando o <strong>{declaration.semester}º semestre</strong>, período <strong>{periodLabel(declaration.period)}</strong>.</p><footer>Protocolo {declaration.protocol}</footer></div><button className="student-document-print" onClick={()=>void printDeclaration()}><Printer/> Imprimir ou salvar em PDF</button></div></div>}
 </div>
}
