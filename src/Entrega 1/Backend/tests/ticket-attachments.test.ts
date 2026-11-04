import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import express from 'express'
import jwt from 'jsonwebtoken'
import { withRuntimeContext, type StorageBucket } from '../src/services/runtime-context'

test('ticket files persist with the ticket and remain private to authorized viewers', async t => {
  const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..')
  const directory=mkdtempSync(join(tmpdir(),'alvaro-ticket-files-')),path=join(directory,'db.sqlite')
  process.env.DATABASE_URL=`file:${path}`;process.env.JWT_SECRET='isolated-attachment-test';process.env.NODE_ENV='test';process.env.APP_AUTH_PROVIDER='';process.env.GEMINI_API_KEY=''
  const require=createRequire(import.meta.url),db=new DatabaseSync(path)
  db.exec(execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',join(backend,'prisma/schema.prisma'),'--script'],{cwd:backend,encoding:'utf8'}))
  const [{prisma},{ticketRouter}]=await Promise.all([import('../src/db'),import('../src/routes/ticket.routes')])
  const files=new Map<string,{bytes:Uint8Array;contentType:string}>()
  const bucket:StorageBucket={async put(key,value,options){files.set(key,{bytes:new Uint8Array(value),contentType:options?.httpMetadata.contentType||''})},async get(key){const f=files.get(key);return f?{arrayBuffer:async()=>new Uint8Array(f.bytes).buffer,httpMetadata:{contentType:f.contentType}}:null},async delete(key){files.delete(key)}}
  let storage:StorageBucket|undefined=bucket
  const app=express();app.use(express.json());app.use((_req,_res,next)=>withRuntimeContext({storage,waitUntil:()=>{}},next));app.use('/tickets',ticketRouter)
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert.ok(address&&typeof address!=='string')
  const base=`http://127.0.0.1:${address.port}`
  const tokens=Object.fromEntries([['a','aluno'],['b','aluno'],['staff','asa']].map(([id,role])=>[id,jwt.sign({id,role,name:id,email:id+'@test.invalid'},process.env.JWT_SECRET!)]))
  async function request(path:string,who='a',method='GET',body?:unknown){return fetch(base+path,{method,headers:{Authorization:`Bearer ${tokens[who]}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)})}
  const bytes=Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF')
  function form(message=false,file=bytes,name='evidencia.pdf',mime='application/pdf'){
    const form=new FormData();if(message){form.set('content','Resposta com evidência');form.set('isInternal','true')}else{form.set('title','Solicitação isolada');form.set('description','Conferir documentação anexada');form.set('category','academico')}
    form.append('files',new Blob([new Uint8Array(file)],{type:mime}),name);return form
  }
  let ticket:any,attachment:any
  try {
    await prisma.student.createMany({data:['a','b'].map(id=>({id,name:id,ra:id,email:id+'@test.invalid',course:'Teste',semester:1,period:'noite'}))})
    await prisma.user.create({data:{id:'staff',name:'ASA',email:'asa@test.invalid',role:'asa'}})
    await t.test('student creation stores bytes and opening attachments, ASA reloads the persisted record',async()=>{
      const response=await request('/tickets','a','POST',form());assert.equal(response.status,201);ticket=await response.json();attachment=ticket.messages[0].attachments[0]
      assert.equal(attachment.name,'evidencia.pdf');assert.equal(files.size,1)
      const loaded=await (await request('/tickets/'+ticket.id,'staff')).json() as any
      assert.equal(loaded.messages[0].attachments[0].id,attachment.id)
      const listed=await (await request('/tickets','staff')).json() as any[];assert.ok(listed.some(t=>t.id===ticket.id))
      for(const role of ['a','staff']){const download=await request(`/tickets/${ticket.id}/attachments/${attachment.id}/download`,role);assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'application/pdf');assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes)}
    })
    await t.test('foreign student, mismatched ticket and unauthenticated downloads are denied',async()=>{
      assert.equal((await request(`/tickets/${ticket.id}/attachments/${attachment.id}/download`,'b')).status,403)
      assert.equal((await request(`/tickets/missing/attachments/${attachment.id}/download`,'staff')).status,404)
      assert.equal((await fetch(base+`/tickets/${ticket.id}/attachments/${attachment.id}/download`)).status,401)
    })
    await t.test('internal note attachments are hidden from students and public replies remain downloadable',async()=>{
      const response=await request(`/tickets/${ticket.id}/messages`,'staff','POST',form(true));assert.equal(response.status,201);const note=await response.json() as any
      assert.equal(note.isInternal,true)
      const loaded=await (await request('/tickets/'+ticket.id)).json() as any;assert.ok(!loaded.messages.some((m:any)=>m.id===note.id))
      assert.equal((await request(`/tickets/${ticket.id}/attachments/${note.attachments[0].id}/download`)).status,403)
      assert.equal((await request(`/tickets/${ticket.id}/attachments/${note.attachments[0].id}/download`,'staff')).status,200)
      const ownReply=await request(`/tickets/${ticket.id}/messages`,'a','POST',form(true));assert.equal(ownReply.status,201);assert.equal((await ownReply.json() as any).isInternal,false)
      assert.equal((await request(`/tickets/${ticket.id}/messages`,'b','POST',form(true))).status,403)
      assert.equal((await request(`/tickets/${ticket.id}/messages`,'a','POST',{content:'URL inválida',attachments:[{name:'x.pdf',url:'https://untrusted.invalid/file'}]})).status,400)
    })
    await t.test('invalid files and missing storage fail without creating records',async()=>{
      const count=await prisma.ticket.count(),stored=files.size
      assert.equal((await request('/tickets','a','POST',form(false,Buffer.from('<html>invalid</html>')))).status,400)
      assert.equal((await request('/tickets','a','POST',form(false,bytes,'script.html','text/html'))).status,400)
      assert.equal((await request('/tickets','a','POST',form(false,Buffer.alloc(10*1024*1024+1)))).status,413)
      storage=undefined
      assert.equal((await request('/tickets','a','POST',form())).status,503)
      storage=bucket
      assert.equal(await prisma.ticket.count(),count);assert.equal(files.size,stored)
    })
    await t.test('database failure rolls back ticket, message and attachments and removes uploaded bytes',async()=>{
      const count=await prisma.ticket.count(),stored=files.size
      db.exec("CREATE TRIGGER reject_ticket_audit BEFORE INSERT ON AuditEvent WHEN NEW.action = 'ticket.created' BEGIN SELECT RAISE(ABORT, 'isolated test failure'); END")
      try{assert.equal((await request('/tickets','a','POST',form())).status,500)}finally{db.exec('DROP TRIGGER reject_ticket_audit')}
      assert.equal(await prisma.ticket.count(),count);assert.equal(files.size,stored)
    })
    await t.test('JSON tickets without files still persist and resolved tickets stay available to ASA',async()=>{
      storage=undefined
      const response=await request('/tickets','a','POST',{title:'Sem anexo',description:'Descrição',category:'outros'});assert.equal(response.status,201)
      const created=await response.json() as any
      assert.equal((await request('/tickets/'+created.id,'staff','PATCH',{status:'resolvido'})).status,200)
      const list=await (await request('/tickets','staff')).json() as any[];assert.ok(list.some(t=>t.id===created.id&&t.status==='resolvido'))
      assert.equal((await request('/tickets/'+created.id,'staff')).status,200)
    })
    await t.test('concurrent submissions receive unique persisted protocols',async()=>{
      const responses=await Promise.all([1,2,3].map(index=>request('/tickets','a','POST',{title:`Concorrência ${index}`,description:'Abertura simultânea',category:'outros'})))
      assert.ok(responses.every(response=>response.status===201))
      const created=await Promise.all(responses.map(response=>response.json())) as any[]
      assert.equal(new Set(created.map(ticket=>ticket.number)).size,3)
      assert.equal(await prisma.ticket.count({where:{id:{in:created.map(ticket=>ticket.id)}}}),3)
    })
  } finally {
    await new Promise<void>(r=>server.close(()=>r()));await prisma.$disconnect();db.close();rmSync(directory,{recursive:true,force:true})
  }
})
