import { useId, useState } from 'react'
import { Paperclip, UploadCloud, X } from 'lucide-react'
import { api } from '../../lib/api'

export function TicketFilePicker({files,onChange,onError,compact=false,disabled=false}:{files:File[];onChange:(files:File[])=>void;onError:(message:string)=>void;compact?:boolean;disabled?:boolean}) {
  const id = useId()
  function add(incoming: FileList | File[]) {
    if(disabled)return
    const next=[...files,...Array.from(incoming)]
    if(next.length>5)return onError('Selecione no máximo 5 anexos.')
    if(next.some(file=>!file.size||file.size>10*1024*1024))return onError('Cada arquivo deve ter entre 1 byte e 10 MB.')
    if(next.reduce((sum,file)=>sum+file.size,0)>20*1024*1024)return onError('Os anexos devem somar no máximo 20 MB.')
    if(next.some(file=>!(/\.(pdf|jpe?g|png)$/i.test(file.name))))return onError('Envie arquivos PDF, JPG ou PNG.')
    onError('');onChange(next)
  }
  return <div className={compact?'space-y-2':'space-y-3'}>
    <input id={id} type="file" className="sr-only" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={disabled} onChange={event=>{if(event.target.files)add(event.target.files);event.target.value=''}} />
    <label htmlFor={id} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();add(event.dataTransfer.files)}} className={compact?'inline-flex p-2 text-gray-500 hover:text-brand-600 cursor-pointer rounded-lg':'block border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer'}>
      {compact?<><Paperclip size={20}/><span className="sr-only">Anexar arquivos</span></>:<><UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2"/><p className="text-sm font-medium text-gray-700 dark:text-slate-300">Clique ou arraste arquivos aqui</p><p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG · até 5 arquivos de 10 MB · 20 MB no total</p></>}
    </label>
    {files.length>0&&<ul className="space-y-1 text-xs text-gray-600 dark:text-slate-300">{files.map((file,index)=><li key={`${file.name}-${index}`} className="flex items-center gap-2"><Paperclip size={13}/><span className="break-all">{file.name} ({(file.size/1024).toFixed(1)} KB)</span><button type="button" disabled={disabled} onClick={()=>onChange(files.filter((_,i)=>i!==index))} aria-label={`Remover ${file.name}`} className="p-1 text-red-500"><X size={14}/></button></li>)}</ul>}
  </div>
}

export function TicketAttachmentList({ticketId,attachments,onError}:{ticketId:string;attachments?:Array<{id:string;name:string;size:string}>;onError:(error:string)=>void}) {
  const [downloading,setDownloading]=useState<string|null>(null)
  if(!attachments?.length)return null
  async function download(file:{id:string;name:string}){setDownloading(file.id);try{await api.tickets.downloadAttachment(ticketId,file.id,file.name)}catch(error){onError(error instanceof Error?error.message:'Não foi possível baixar o anexo.')}finally{setDownloading(null)}}
  return <ul className="mt-3 space-y-2">{attachments.map(file=><li key={file.id}><button type="button" disabled={Boolean(downloading)} onClick={()=>void download(file)} className="flex items-center gap-2 text-xs underline break-all disabled:opacity-50"><Paperclip size={14} className="shrink-0"/>{downloading===file.id?'Baixando…':file.name}<span className="text-[10px] opacity-70">({file.size})</span></button></li>)}</ul>
}
