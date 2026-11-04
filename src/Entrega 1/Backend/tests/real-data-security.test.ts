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

test('real records and ownership remain enforced without demos', async t => {
 const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dir=mkdtempSync(join(tmpdir(),'alvaro-real-')),path=join(dir,'db.sqlite')
 process.env.DATABASE_URL=`file:${path}`;process.env.JWT_SECRET='isolated-security-test';process.env.NODE_ENV='test';process.env.APP_AUTH_PROVIDER=''
 const require=createRequire(import.meta.url),db=new DatabaseSync(path)
 db.exec(execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',join(backend,'prisma/schema.prisma'),'--script'],{cwd:backend,encoding:'utf8'}));db.close()
 const [{prisma},{chatRouter},{kbRouter},{studentRouter},{authRouter},{adminRouter}]=await Promise.all([import('../src/db'),import('../src/routes/chat.routes'),import('../src/routes/kb.routes'),import('../src/routes/student.routes'),import('../src/routes/auth.routes'),import('../src/routes/admin.routes')])
 const app=express();app.use(express.json());app.use('/chat',chatRouter);app.use('/kb',kbRouter);app.use('/students',studentRouter);app.use('/auth',authRouter);app.use('/admin',adminRouter)
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert.ok(address&&typeof address!=='string')
 const base=`http://127.0.0.1:${address.port}`,tokens=Object.fromEntries([['a','aluno'],['b','aluno'],['staff','asa'],['missing','aluno']].map(([id,role])=>[id,jwt.sign({id,role,name:id,email:id+'@test.invalid'},process.env.JWT_SECRET!)]))
 async function request(path:string,who='a',method='GET',body?:unknown){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${tokens[who]}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json() as any}}
 try{
  await prisma.student.createMany({data:['a','b'].map(id=>({id,name:id,ra:id,email:id+'@test.invalid',course:'Teste',semester:1,period:'noite'}))})
  await prisma.conversation.createMany({data:[{id:'ca',studentId:'a',title:'A'},{id:'cb',studentId:'b',title:'B'}]})
  await prisma.kBDocument.createMany({data:[{id:'active',title:'Ativo',category:'Teste',content:'Texto real de teste',status:'ativo'},{id:'archived',title:'Arquivo',category:'Teste',content:'Restrito',status:'arquivado'}]})
  await t.test('student lists only own conversations; staff sees both',async()=>{assert.deepEqual((await request('/chat/conversations')).data.map((x:any)=>x.id),['ca']);const staff=await request('/chat/conversations','staff');assert.equal(staff.data.length,2);assert.ok(staff.data.every((x:any)=>x.student?.id))})
  await t.test('cross-student read, send, snapshot and feedback are forbidden',async()=>{for(const p of ['/chat/conversations/cb','/chat/conversations/cb/r2-snapshot'])assert.equal((await request(p)).status,403);assert.equal((await request('/chat/conversations/cb/messages','a','POST',{content:'No'})).status,403);assert.equal((await request('/chat/feedback','a','POST',{conversationId:'cb',type:'positive',snippet:'No'})).status,403);assert.equal(await prisma.chatMessage.count(),0);assert.equal(await prisma.aIFeedback.count(),0)})
  await t.test('staff cannot impersonate a student',async()=>{assert.equal((await request('/chat/conversations','staff','POST',{})).status,403);assert.equal((await request('/chat/conversations/ca/messages','staff','POST',{content:'No'})).status,403)})
  await t.test('missing student never inherits the first student',async()=>{assert.deepEqual((await request('/chat/conversations','missing')).data,[]);assert.equal((await request('/chat/conversations','missing','POST',{})).status,404);assert.equal(await prisma.conversation.count(),2)})
  await t.test('every institutional KB write rejects students',async()=>{for(const [p,m,b] of [['/kb','POST',{title:'No',category:'Teste',content:'No'}],['/kb/active','PUT',{title:'No'}],['/kb/active','DELETE',undefined],['/kb/upload','POST',{}]] as const)assert.equal((await request(p,'a',m,b)).status,403);assert.equal((await prisma.kBDocument.findUnique({where:{id:'active'}}))?.title,'Ativo');assert.equal(await prisma.kBDocument.count(),2)})
  await t.test('archived documents remain hidden from students',async()=>{assert.deepEqual((await request('/kb?status=arquivado')).data.map((x:any)=>x.id),['active']);assert.equal((await request('/kb/archived')).status,404);assert.equal((await request('/kb/archived/download')).status,404);assert.equal((await request('/kb/archived','staff')).status,200)})
  await t.test('empty document list is real and scoped',async()=>{assert.deepEqual((await request('/students/a/documents')).data,[]);assert.equal((await request('/students/b/documents')).status,403)})
  await t.test('contact update persists only for its owner',async()=>{assert.equal((await request('/students/b/contact','a','PATCH',{phone:'11987654321'})).status,403);assert.equal((await request('/students/a/contact','a','PATCH',{phone:'invalid'})).status,400);assert.equal((await request('/students/a/contact','a','PATCH',{phone:'11987654321'})).status,200);assert.equal((await prisma.student.findUnique({where:{id:'a'}}))?.phone,'11987654321');assert.equal((await prisma.student.findUnique({where:{id:'b'}}))?.phone,null)})
  await t.test('staff edits real institutional content',async()=>{assert.equal((await request('/kb/active','staff','PUT',{title:'Equipe'})).status,200);assert.equal((await prisma.kBDocument.findUnique({where:{id:'active'}}))?.title,'Equipe')})
  await t.test('demo login never issues tokens',async()=>{const r=await request('/auth/demo-login','staff','POST',{role:'admin'});assert.equal(r.status,403);assert.equal(r.data.token,undefined)})
  await t.test('students cannot read or mutate administrator API routes',async()=>{
   assert.equal((await request('/admin/users','a')).status,403)
   assert.equal((await request('/admin/integrations','a')).status,403)
   assert.equal((await request('/admin/users','a','POST',{name:'No',email:'no@test.invalid',role:'admin'})).status,403)
   assert.equal((await request('/admin/students','a','POST',{name:'No',ra:'no',email:'no@test.invalid',course:'No'})).status,403)
   assert.equal((await request('/admin/users','a','PATCH',{status:'inativo'})).status,403)
   assert.equal(await prisma.user.count(),0)
  })
  await t.test('KB search retrieves late PDF deadlines and excludes archived or unindexed sources', async () => {
   const introduction = 'Projeto Órbita: aplicativo de atendimento acadêmico e integração com serviços de nuvem. '.repeat(120)
   const content = introduction + 'Cronograma de entregas. Entrega final: 15/12/2034 até 20:35. '
   const ids = ['rag-active', 'rag-archived', 'rag-unindexed']
   await prisma.kBDocument.createMany({data: [
    {id:ids[0],title:'Projeto Órbita',category:'Acadêmico',content,status:'ativo',indexed:true},
    {id:ids[1],title:'Projeto Órbita arquivado',category:'Acadêmico',content,status:'arquivado',indexed:true},
    {id:ids[2],title:'Projeto Órbita não indexado',category:'Acadêmico',content,status:'ativo',indexed:false},
   ]})
   try {
    const result = await request('/kb/search?q=' + encodeURIComponent('Qual o prazo de entrega do projeto Órbita?'))
    assert.equal(result.status, 200)
    assert.deepEqual(result.data.map((match:any) => match.docId), [ids[0]])
    assert.match(result.data[0].content, /15\/12\/2034 até 20:35/)
    assert.ok(result.data[0].content.length <= 6000)
    assert.equal((await prisma.kBDocument.findUnique({where:{id:ids[0]}}))?.content, content)
    assert.deepEqual((await request('/kb/search?q=neurocirurgia')).data, [])
   } finally {
    await prisma.kBDocument.deleteMany({where:{id:{in:ids}}})
   }
  })
 }finally{await prisma.$disconnect();await new Promise<void>(r=>server.close(()=>r()));rmSync(dir,{recursive:true,force:true})}
})
