import test from 'node:test'
import assert from 'node:assert/strict'
import { assignedSlaPolicies, evaluateTicketSla, resolveSlaPolicy, validateSlaRule } from '../src/services/ticket-sla'

const opened = new Date('2030-01-01T12:00:00Z')
const rule = { id: 'specific', name: 'Acadêmico', active: true, priority: 'media', category: 'Acadêmico', firstResponseMinutes: 30, resolutionHours: 6, updatedAt: opened }

test('SLA category rules precede newer general rules and inactive rules are ignored', () => {
 const selected = resolveSlaPolicy('media', 'academico', [rule, {...rule,id:'general',category:null,updatedAt:new Date(+opened+1000)}, {...rule,id:'inactive',active:false,updatedAt:new Date(+opened+2000)}], opened)
 assert.equal(selected.ruleId, 'specific')
 assert.equal(selected.firstResponseDeadline, '2030-01-01T12:30:00.000Z')
 assert.equal(selected.resolutionDeadline, '2030-01-01T18:00:00.000Z')
 assert.equal(resolveSlaPolicy('alta','financeiro',[rule],opened).resolutionDeadline,'2030-01-01T16:00:00.000Z')
 assert.equal(resolveSlaPolicy('alta','financeiro',[rule],opened).firstResponseDeadline,null)
})

test('first response measures public staff replies, ignoring opening description and private notes', () => {
 const policy=resolveSlaPolicy('media','academico',[rule],opened)
 const ticket={createdAt:opened,slaDeadline:policy.resolutionDeadline,messages:[
  {senderRole:'asa',isInternal:false,createdAt:opened},
  {senderRole:'asa',isInternal:true,createdAt:new Date(+opened+60000)},
  {senderRole:'aluno',isInternal:false,createdAt:new Date(+opened+120000)},
 ]}
 assert.equal(evaluateTicketSla(ticket,policy,opened).firstResponseStatus,'ok')
 assert.equal(evaluateTicketSla(ticket,policy,new Date(+opened+25*60000)).firstResponseStatus,'risk')
 assert.equal(evaluateTicketSla(ticket,policy,new Date(+opened+31*60000)).firstResponseStatus,'breached')
 ticket.messages.push({senderRole:'asa',isInternal:false,createdAt:new Date(+opened+20*60000)})
 assert.equal(evaluateTicketSla(ticket,policy,new Date(+opened+5*3600000)).firstResponseStatus,'met')
 assert.equal(evaluateTicketSla(ticket,undefined,opened).firstResponseStatus,'unknown')
})

test('SLA edits reject inverted deadlines and preserve explicit booleans', () => {
 assert.equal(validateSlaRule({...rule,firstResponseMinutes:361}),null)
 assert.equal(validateSlaRule({...rule,active:'false'}),null)
 assert.equal(validateSlaRule({...rule,resolutionHours:0}),null)
 assert.equal(validateSlaRule({...rule,resolutionHours:1.5}),null)
 assert.equal(validateSlaRule({...rule,active:false})?.active,false)
 assert.equal(validateSlaRule(rule)?.category,'academico')
})

test('persisted SLA snapshots survive later rule edits without guessing legacy response limits', () => {
 const policy=resolveSlaPolicy('media','academico',[rule],opened)
 const snapshots=assignedSlaPolicies([{resourceId:'#1',details:'Old human audit'}, {resourceId:'#2',details:JSON.stringify({sla:policy})}, {resourceId:'#2',details:JSON.stringify({status:'em_atendimento'})}])
 assert.equal(snapshots.has('#1'),false)
 assert.equal(snapshots.get('#2')?.resolutionDeadline,policy.resolutionDeadline)
})
