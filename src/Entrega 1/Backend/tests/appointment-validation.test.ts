import { withRuntimeContext } from '../src/services/runtime-context'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import express from 'express'
import jwt from 'jsonwebtoken'

test('appointments validate creation and protect calendar exports by ownership', async t => {
  const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const directory = mkdtempSync(join(tmpdir(), 'alvaro-appointment-validation-'))
  const databasePath = join(directory, 'test.db')
  process.env.DATABASE_URL = `file:${databasePath}`
  process.env.JWT_SECRET = 'isolated-appointment-validation'
  process.env.NODE_ENV = 'test'
  process.env.APP_AUTH_PROVIDER = ''
  const require = createRequire(import.meta.url)
  const database = new DatabaseSync(databasePath)
  database.exec(execFileSync(process.execPath, [
    require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty',
    '--to-schema-datamodel', join(backend, 'prisma/schema.prisma'), '--script',
  ], { cwd: backend, encoding: 'utf8' }))
  database.close()

  const [{ prisma }, { appointmentRouter }] = await Promise.all([
    import('../src/db'), import('../src/routes/appointment.routes'),
  ])
  const app = express()
  app.use(express.json())
  const objects=new Map<string,Uint8Array>()
  app.use((_req,_res,next)=>withRuntimeContext({storage:{async put(key,bytes){objects.set(key,new Uint8Array(bytes))},async get(key){const b=objects.get(key);return b?{arrayBuffer:async()=>b.buffer as ArrayBuffer}:null},async delete(key){objects.delete(key)}},waitUntil:()=>{}},next))
  app.use('/appointments', appointmentRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const baseUrl = `http://127.0.0.1:${address.port}`
  const token = (id: string, role: string) => jwt.sign({ id, role, name: 'Teste', email: 'teste@example.invalid' }, process.env.JWT_SECRET!)
  async function request(role: 'aluno' | 'asa', body: unknown, id = role === 'aluno' ? 'student-1' : 'staff-1') {
    const response = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token(id, role)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, data: await response.json() as any }
  }

  try {
    await prisma.student.create({ data: {
      id: 'student-1', name: 'Aluna de Teste', ra: '900001', email: 'aluna@example.invalid',
      course: 'Ciência da Computação', semester: 3, period: 'noite',
    } })
    await prisma.user.create({ data: {
      id: 'staff-1', name: 'Atendente de Teste', email: 'asa@example.invalid', role: 'asa',
    } })
    await prisma.user.create({ data: {
      id: 'admin-1', name: 'Administrador de Teste', email: 'admin@example.invalid', role: 'admin',
    } })
    await prisma.student.create({ data: {
      id: 'student-2', name: 'Outro Aluno de Teste', ra: '900002', email: 'outro@example.invalid',
      course: 'Ciência da Computação', semester: 3, period: 'noite',
    } })

    const futureWeekday = new Date()
    futureWeekday.setUTCDate(futureWeekday.getUTCDate() + 7)
    while ([0, 6].includes(futureWeekday.getUTCDay())) futureWeekday.setUTCDate(futureWeekday.getUTCDate() + 1)
    const futureSaturday = new Date(futureWeekday)
    while (futureSaturday.getUTCDay() !== 6) futureSaturday.setUTCDate(futureSaturday.getUTCDate() + 1)
    const valid = { subject: 'Orientação acadêmica', date: futureWeekday.toISOString().slice(0, 10), time: '14:15', notes: 'Descrição acadêmica privada do aluno de teste.' }
    const byRa = await request('asa', { ...valid, studentRa: '900001' })
    assert.equal(byRa.status, 201)
    assert.equal(byRa.data.studentId, 'student-1')

    assert.equal((await request('asa', { ...valid, studentRa: '999999' })).status, 400)
    assert.equal((await request('asa', valid)).status, 400)
    assert.equal((await request('aluno', { ...valid, date: '2020-01-04' })).status, 400)
    assert.equal((await request('aluno', { ...valid, date: futureSaturday.toISOString().slice(0, 10) })).status, 400)
    assert.equal((await request('aluno', { ...valid, time: '03:17' })).status, 400)
    assert.equal((await request('aluno', { ...valid, date: '2026-02-30' })).status, 400)

    const rows = await prisma.appointment.findMany({ select: { studentId: true } })
    assert.deepEqual(rows, [{ studentId: 'student-1' }])

    const calendarUrl = `${baseUrl}/appointments/${byRa.data.id}/ics`
    await t.test('calendar exports deny anonymous access and another student without exposing notes', async () => {
      assert.equal((await fetch(calendarUrl)).status, 401)
      const forbidden = await fetch(calendarUrl, { headers: { Authorization: `Bearer ${token('student-2', 'aluno')}` } })
      assert.equal(forbidden.status, 403)
      assert.ok(!(await forbidden.text()).includes(valid.notes))
    })
    await t.test('calendar exports retain the description for the owner, ASA and administrator', async () => {
      for (const [id, role] of [['student-1', 'aluno'], ['staff-1', 'asa'], ['admin-1', 'admin']]) {
        const calendar = await fetch(calendarUrl, { headers: { Authorization: `Bearer ${token(id, role)}` } })
        assert.equal(calendar.status, 200)
        assert.match(calendar.headers.get('content-type') || '', /text\/calendar/)
        const text = await calendar.text()
        assert.ok(text.includes('BEGIN:VCALENDAR'))
        assert.ok(text.includes(valid.notes))
      }
    })
    await t.test('lists and details exclude file bytes while authorized download retains original', async()=>{
      const bytes=Buffer.alloc(1024*1024,65)
      await prisma.appointment.update({where:{id:byRa.data.id},data:{documentName:'test.txt',documentType:'text/plain',documentData:'data:text/plain;base64,'+bytes.toString('base64')}})
      for(const [path,id,role] of [['/my','student-1','aluno'],['','staff-1','asa'],['/'+byRa.data.id,'student-1','aluno']]){
        const response=await fetch(baseUrl+'/appointments'+path,{headers:{Authorization:`Bearer ${token(id,role)}`}})
        assert.equal(response.status,200)
        const text=await response.text();assert.ok(text.length<10000);assert.ok(!text.includes('documentData'))
      }
      const file=await fetch(baseUrl+'/appointments/'+byRa.data.id+'/download',{headers:{Authorization:`Bearer ${token('student-1','aluno')}`}})
      assert.equal(file.status,200);assert.deepEqual(Buffer.from(await file.arrayBuffer()),bytes)
    })
    await t.test('new appointment attachments live in object storage and failed bookings clean up uploads',async()=>{
      const body={...valid,time:'09:15',documentName:'qa.jpg',documentType:'image/jpeg',documentData:'data:image/jpeg;base64,/9j/2Q=='}
      const created=await request('aluno',body,'student-2');assert.equal(created.status,201)
      const stored=await prisma.appointment.findUniqueOrThrow({where:{id:created.data.id}})
      assert.equal(stored.documentData,null);assert.ok(stored.r2Key);assert.ok(objects.has(stored.r2Key!))
      assert.equal(created.data.documentData,undefined)
      const count=objects.size;assert.equal((await request('aluno',body,'student-2')).status,500);assert.equal(objects.size,count)
    })
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await prisma.$disconnect()
    rmSync(directory, { recursive: true, force: true })
  }
})
