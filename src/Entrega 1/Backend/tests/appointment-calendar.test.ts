import test from 'node:test'
import assert from 'node:assert/strict'
import { appointmentService } from '../src/services/appointment.service'
test('calendar exports preserve São Paulo time and cancellations',()=>{
 const a={id:'test',protocol:'TEST',date:'2026-11-05',time:'08:30',durationMinutes:30,subject:'Teste',studentName:'Teste',studentRa:'TEST',location:'Teste',status:'confirmado'}
 const ics=appointmentService.generateICalendar(a)
 assert.ok(ics.includes('DTSTART:20261105T113000Z'));assert.ok(ics.includes('DTEND:20261105T120000Z'))
 assert.equal(new URL(appointmentService.buildGoogleCalendarUrl(a)).searchParams.get('dates'),'20261105T113000Z/20261105T120000Z')
 assert.ok(appointmentService.generateICalendar({...a,status:'cancelado'}).includes('STATUS:CANCELLED'))
})
