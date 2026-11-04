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

test('SLA assignments, public replies and admin rule changes persist through the API', async () => {
 const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dir=mkdtempSync(join(tmpdir(),'alvaro-sla-')),path=join(dir,'db.sqlite')
 process.env.DATABASE_URL=`file:${path}`;process.env.JWT_SECRET='isolated-sla-test';process.env.NODE_ENV='test';process.env.APP_AUTH_PROVIDER='';process.env.GEMINI_API_KEY=''
 const require=createRequire(import.meta.url),db=new DatabaseSync(path)
 db.exec(execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',join(backend,'prisma/schema.prisma'),'--script'],{cwd:backend,encoding:'utf8'}));db.close()
 const [{prisma},{ticketRouter},{adminRouter}]=await Promise.all([import('../src/db'),import('../src/routes/ticket.routes'),import('../src/routes/admin.routes')])
 const app=express();app.use(express.json());app.use('/tickets',ticketRouter);app.use('/admin',adminRouter)
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert.ok(address&&typeof address!=='string')
 const base=`http://127.0.0.1:${address.port}`,tokens=Object.fromEntries(['aluno','asa','admin'].map(role=>[role,jwt.sign({id:role,role,name:role,email:role+'@test.invalid'},process.env.JWT_SECRET!)]))
 async function request(path:string,who='admin',method='GET',body?:unknown){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${tokens[who]}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json() as any}}
 const rule={name:'Financeiro SLA',priority:'media',category:'financeiro',firstResponseMinutes:15,resolutionHours:4,active:true}
 try{
  await prisma.student.create({data:{id:'aluno',name:'Aluno',ra:'sla-test',email:'aluno@test.invalid',course:'Teste',semester:1,period:'noite'}})
  for(const who of ['asa','aluno'])assert.equal((await request('/admin/sla-rules',who,'POST',rule)).status,403)
  assert.equal((await request('/admin/sla-monitor','aluno')).status,403)
  assert.equal((await request('/admin/sla-rules','admin','POST',{...rule,firstResponseMinutes:999})).status,400)
  const createdRule=await request('/admin/sla-rules','admin','POST',rule);assert.equal(createdRule.status,201)
  const created=await request('/tickets','aluno','POST',{title:'SLA de teste',description:'Conferir os prazos',category:'financeiro',priority:'media'});assert.equal(created.status,201)
  const ticket=created.data,id=ticket.id
  assert.equal(+new Date(ticket.slaDeadline)-+new Date(ticket.createdAt),4*3600000)
  let monitor=(await request('/admin/sla-monitor','asa')).data.find((t:any)=>t.id===id)
  assert.equal(+new Date(monitor.firstResponseDeadline)-+new Date(ticket.createdAt),15*60000)
  assert.equal(monitor.firstResponseAt,null)
  assert.equal((await request(`/tickets/${id}/messages`,'asa','POST',{content:'Nota privada',isInternal:true})).status,201)
  monitor=(await request('/admin/sla-monitor','asa')).data.find((t:any)=>t.id===id);assert.equal(monitor.firstResponseAt,null)
  assert.equal((await request(`/tickets/${id}/messages`,'asa','POST',{content:'Resposta pública',isInternal:false})).status,201)
  monitor=(await request('/admin/sla-monitor','asa')).data.find((t:any)=>t.id===id);assert.equal(monitor.firstResponseStatus,'met')
  assert.equal((await request(`/admin/sla-rules/${createdRule.data.id}`,'asa','PUT',{resolutionHours:8})).status,403)
  assert.equal((await request(`/admin/sla-rules/${createdRule.data.id}`,'admin','PUT',{resolutionHours:8})).status,200)
  assert.equal((await request(`/tickets/${id}`,'asa')).data.slaDeadline,ticket.slaDeadline)
  assert.equal((await request(`/tickets/${id}`,'asa','PATCH',{priority:'alta'})).status,200)
  monitor=(await request('/admin/sla-monitor','asa')).data.find((t:any)=>t.id===id)
  assert.equal(+new Date(monitor.resolutionDeadline)-+new Date(ticket.createdAt),4*3600000)
  assert.equal(+new Date(monitor.firstResponseDeadline)-+new Date(ticket.createdAt),15*60000)
  const next=await request('/tickets','aluno','POST',{title:'Novo SLA',description:'Novo prazo conforme regra',category:'financeiro',priority:'media'})
  assert.equal(+new Date(next.data.slaDeadline)-+new Date(next.data.createdAt),8*3600000)
  assert.equal((await request(`/admin/sla-rules/${createdRule.data.id}`,'admin','PUT',{active:false})).status,200)
  const fallback=await request('/tickets','aluno','POST',{title:'Prazo padrão',description:'Sem regra ativa',category:'financeiro',priority:'media'})
  assert.equal(+new Date(fallback.data.slaDeadline)-+new Date(fallback.data.createdAt),24*3600000)
  assert.equal((await request('/admin/sla-monitor','asa')).data.find((t:any)=>t.id===fallback.data.id).firstResponseStatus,'unknown')
  assert.equal((await request(`/tickets/${id}`,'asa','PATCH',{status:'resolvido'})).status,200)
  assert.ok(!(await request('/admin/sla-monitor','asa')).data.some((t:any)=>t.id===id))
  assert.equal((await request(`/tickets/${id}`,'asa')).status,200)
 }finally{await prisma.$disconnect();await new Promise<void>(r=>server.close(()=>r()));rmSync(dir,{recursive:true,force:true})}
})
