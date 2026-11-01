import test from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { r2Service } from '../src/services/r2.service'
import { withRuntimeContext, currentStorage, type StorageBucket } from '../src/services/runtime-context'
import { extractPdfText } from '../src/routes/kb.routes'

function bucket():StorageBucket {
 const files=new Map<string,{data:Uint8Array;type:string}>()
 return {async put(key,value,options){files.set(key,{data:new Uint8Array(value),type:options?.httpMetadata.contentType||''})},async get(key){const value=files.get(key);return value?{arrayBuffer:async()=>new Uint8Array(value.data).buffer,httpMetadata:{contentType:value.type}}:null},async delete(key){files.delete(key)}}
}
test('bound storage persists actual bytes, snapshots, metadata and deletions',async()=>{
 const storage=bucket()
 await withRuntimeContext({storage,waitUntil:()=>{}},async()=>{
  assert.equal(r2Service.isConfigured(),true)
  await r2Service.uploadBuffer('test/file',Buffer.from('Conteúdo real'),'text/plain')
  const file=await r2Service.getFile('test/file');assert.equal(file?.buffer.toString(),'Conteúdo real');assert.equal(file?.contentType,'text/plain')
  await r2Service.saveConversationSnapshot('c','s',{title:'Teste',messages:[{role:'user',content:'Mensagem persistida'}]})
  assert.equal((await r2Service.getConversationSnapshot('c','s')).messages[0].content,'Mensagem persistida')
  assert.equal(await r2Service.deleteObject('test/file'),true);assert.equal(await r2Service.getFile('test/file'),null)
 })
 assert.equal(currentStorage(),undefined);assert.equal(r2Service.isConfigured(),false)
 await assert.rejects(r2Service.uploadBuffer('no-binding',Buffer.from('x'),'text/plain'),/indisponível/)
})
test('concurrent runtime contexts do not share storage',async()=>{
 const a=bucket(),b=bucket()
 await Promise.all([a,b].map((storage,index)=>withRuntimeContext({storage,waitUntil:()=>{}},async()=>{await r2Service.uploadBuffer('same-key',Buffer.from(String(index)),'text/plain');await new Promise(resolve=>setImmediate(resolve));assert.equal((await r2Service.getFile('same-key'))?.buffer.toString(),String(index))})))
})
test('compressed PDF is extracted instead of indexing binary as text',async()=>{
 const stream=deflateSync(Buffer.from('BT /F1 12 Tf 40 720 Td (ALVARO-PDF-6421) Tj ET'))
 const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>'),Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`),stream,Buffer.from('\nendstream')]),Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')]
 let pdf=Buffer.from('%PDF-1.4\n');const offsets=[0]
 for(const [i,obj] of objects.entries()){offsets.push(pdf.length);pdf=Buffer.concat([pdf,Buffer.from(`${i+1} 0 obj\n`),obj,Buffer.from('\nendobj\n')])}
 const start=pdf.length;pdf=Buffer.concat([pdf,Buffer.from('xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`)])
 assert.ok((await extractPdfText(pdf)).includes('ALVARO-PDF-6421'))
 await assert.rejects(extractPdfText(Buffer.from('This is not a PDF')),/extrair texto/)
})
