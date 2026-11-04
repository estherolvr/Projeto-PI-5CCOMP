import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import express from 'express'
import jwt from 'jsonwebtoken'

test('notification feed and read receipts respect the authenticated recipient', async t => {
  const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dir=mkdtempSync(join(tmpdir(),'alvaro-notifications-')),path=join(dir,'db.sqlite')
  process.env.DATABASE_URL=`file:${path}`;process.env.JWT_SECRET='isolated-notifications-test';process.env.NODE_ENV='test';process.env.APP_AUTH_PROVIDER=''
  const require=createRequire(import.meta.url),db=new DatabaseSync(path)
  db.exec(execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',join(backend,'prisma/schema.prisma'),'--script'],{cwd:backend,encoding:'utf8'}));db.close()
  const [{prisma},{notificationsRouter}]=await Promise.all([import('../src/db'),import('../src/routes/notifications.routes')])
  const app=express();app.use(express.json());app.use('/notifications',notificationsRouter)
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert.ok(address&&typeof address!=='string')
  const base=`http://127.0.0.1:${address.port}`,tokens=Object.fromEntries([['a','aluno'],['b','aluno'],['staff','asa'],['staff2','asa'],['admin','admin']].map(([id,role])=>[id,jwt.sign({id,role,name:id,email:id+'@test.invalid'},process.env.JWT_SECRET!)]))
  async function request(path='',who='a',method='GET'){const r=await fetch(base+'/notifications'+path,{method,headers:who?{Authorization:`Bearer ${tokens[who]}`}:{}});return {status:r.status,data:await r.json() as any}}
  const mark=(id:string,who='a')=>request('/'+encodeURIComponent(id)+'/read',who,'PATCH')
  const now=Date.now()
  try {
    await prisma.student.createMany({data:['a','b'].map(id=>({id,name:id,ra:id,email:id+'@test.invalid',course:'Teste',semester:1,period:'noite'}))})
    await prisma.ticket.createMany({data:[
      {id:'ta',number:1,title:'Chamado A',description:'Pedido A',category:'academico',studentId:'a',slaDeadline:new Date(now+30*60_000),createdAt:new Date(now-3_600_000)},
      {id:'tb',number:2,title:'Chamado B',description:'Pedido B',category:'financeiro',studentId:'b',slaDeadline:new Date(now-60_000),createdAt:new Date(now-3_600_000)},
      {id:'tc',number:3,title:'Chamado C',description:'Pedido C',category:'academico',studentId:'b',slaDeadline:new Date(now+86_400_000),createdAt:new Date(now-31*60_000)},
    ]})
    await prisma.ticketMessage.createMany({data:[
      {id:'initial',ticketId:'ta',senderId:'a',senderName:'a',senderRole:'aluno',content:'Pedido A',createdAt:new Date(now-3_600_000)},
      {id:'answer',ticketId:'ta',senderId:'staff',senderName:'staff',senderRole:'asa',content:'Resposta pública',createdAt:new Date(now-60_000)},
      {id:'private',ticketId:'ta',senderId:'staff',senderName:'staff',senderRole:'asa',content:'Segredo interno',isInternal:true,createdAt:new Date(now-40_000)},
      {id:'followup',ticketId:'ta',senderId:'a',senderName:'a',senderRole:'aluno',content:'Resposta do aluno',createdAt:new Date(now-20_000)},
      {id:'other-answer',ticketId:'tb',senderId:'staff',senderName:'staff',senderRole:'asa',content:'Resposta aluno B',createdAt:new Date(now-10_000)},
    ]})
    await prisma.auditEvent.create({data:{id:'status-a',userId:'staff',userName:'staff',userRole:'asa',action:'ticket.updated',resource:'Chamado',resourceId:'#1',details:JSON.stringify({status:'aguardando_aluno',previousStatus:'em_atendimento',internalNotes:'NÃO EXPOR'})}})
    await prisma.auditEvent.create({data:{id:'policy-c',userId:'b',userName:'b',userRole:'aluno',action:'ticket.created',resource:'Chamado',resourceId:'#3',details:JSON.stringify({sla:{ruleId:'test-rule',ruleName:'Teste SLA',firstResponseMinutes:30,firstResponseDeadline:new Date(now-60_000).toISOString(),resolutionHours:24,resolutionDeadline:new Date(now+86_400_000).toISOString()}})}})
    await prisma.appointment.createMany({data:['a','b'].map(id=>({id:'apt-'+id,protocol:'APT-'+id,studentId:id,studentName:id,studentRa:id,studentEmail:id+'@test.invalid',subject:'Consulta '+id,date:'2030-04-01',time:'09:00'}))})
    await prisma.notification.create({data:{id:'legacy',type:'system',title:'Legado global sem destinatário',message:'Nunca expor ao aluno'}})

    await t.test('anonymous requests are rejected and GET creates no receipts',async()=>{
      assert.equal((await request('','')).status,401)
      assert.equal((await request()).status,200)
      assert.equal(await prisma.auditEvent.count({where:{action:'notification.read'}}),0)
    })
    await t.test('student receives only own records and public staff replies',async()=>{
      const {data}=await request();const ids=data.map((n:any)=>n.id)
      assert.ok(ids.includes('ticket-created:ta'));assert.ok(ids.includes('ticket-message:answer'));assert.ok(ids.includes('ticket-status:status-a'))
      assert.ok(ids.some((id:string)=>id.startsWith('appointment:apt-a:')))
      assert.ok(!ids.includes('ticket-message:private'));assert.ok(!ids.includes('ticket-message:followup'));assert.ok(!ids.includes('ticket-message:other-answer'));assert.ok(!ids.includes('ticket-created:tb'))
      assert.ok(!ids.some((id:string)=>id.startsWith('sla:')||id.startsWith('appointment:apt-b:')||id==='legacy'))
      assert.ok(data.every((n:any)=>n.link.startsWith('/aluno/')))
      assert.ok(!JSON.stringify(data).includes('NÃO EXPOR'))
    })
    await t.test('ASA receives student messages and live SLA alerts with staff routes',async()=>{
      const {data}=await request('','staff');const ids=data.map((n:any)=>n.id)
      assert.ok(ids.includes('ticket-created:ta'));assert.ok(ids.includes('ticket-created:tb'));assert.ok(ids.includes('ticket-message:followup'))
      assert.ok(!ids.includes('ticket-message:initial'));assert.ok(!ids.includes('ticket-message:private'));assert.ok(!ids.includes('ticket-message:answer'))
      assert.ok(ids.some((id:string)=>id.startsWith('sla:ta:')&&id.endsWith(':risk')))
      assert.ok(ids.some((id:string)=>id.startsWith('sla:tb:')&&id.endsWith(':breached')))
      assert.ok(ids.some((id:string)=>id.startsWith('sla-first-response:tc:')&&id.endsWith(':breached')))
      assert.ok(data.every((n:any)=>n.link.startsWith('/asa/')))
    })
    await t.test('read persists after a new request and is idempotent',async()=>{
      assert.equal((await mark('ticket-message:answer')).status,200)
      assert.equal((await mark('ticket-message:answer')).data.read,true)
      assert.equal((await request()).data.find((n:any)=>n.id==='ticket-message:answer').read,true)
      assert.equal(await prisma.auditEvent.count({where:{userId:'a',action:'notification.read',resourceId:'ticket-message:answer'}}),1)
    })
    await t.test('read state is individual, including shared ASA events',async()=>{
      await mark('ticket-created:ta','a');await mark('ticket-created:ta','staff')
      assert.equal((await request('','staff')).data.find((n:any)=>n.id==='ticket-created:ta').read,true)
      assert.equal((await request('','staff2')).data.find((n:any)=>n.id==='ticket-created:ta').read,false)
    })
    await t.test('student cannot acknowledge another student or staff-only events',async()=>{
      for(const id of ['ticket-message:answer','ticket-created:ta','ticket-status:status-a'])assert.equal((await mark(id,'b')).status,404)
      const staffFeed=(await request('','staff')).data
      assert.equal((await mark(staffFeed.find((n:any)=>n.type==='sla_risk').id,'a')).status,404)
      assert.equal(await prisma.auditEvent.count({where:{userId:'b',action:'notification.read'}}),0)
    })
    await t.test('completed tickets no longer generate active SLA warnings',async()=>{
      await prisma.ticket.update({where:{id:'tb'},data:{status:'resolvido'}})
      assert.ok(!(await request('','staff')).data.some((n:any)=>n.id.startsWith('sla:tb:')))
    })
    await t.test('first-response alert clears after a public response',async()=>{
      await prisma.ticketMessage.create({data:{ticketId:'tc',senderId:'staff',senderName:'staff',senderRole:'asa',content:'Primeira resposta pública'}})
      assert.ok(!(await request('','staff')).data.some((n:any)=>n.id.startsWith('sla-first-response:tc:')))
    })
  } finally {
    await prisma.$disconnect();await new Promise<void>(r=>server.close(()=>r()));rmSync(dir,{recursive:true,force:true})
  }
})
