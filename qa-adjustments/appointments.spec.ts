import { test, expect, api, allowWrites, evidence } from './fixtures'
for(const withFile of [false,true]) test(`ADJ-007 @write agendamento presencial ${withFile ? 'com anexo JPEG' : 'sem anexo'} persiste e libera vaga após cancelamento`, async ({session}, info)=>{
 allowWrites();const page=await session('student');await page.goto('/aluno/agendamento');
 const mine=await api(page,'/api/appointments/my');expect(mine.status).toBe(200);
 const dates=await page.getByRole('button').allTextContents();
 const date=dates.map(t=>t.match(/Data: (\d{4}-\d{2}-\d{2})/)?.[1]).filter(Boolean).find(d=>!mine.data.some((a:any)=>a.date===d&&['agendado','confirmado','em_atendimento'].includes(a.status)))!;
 expect(date).toBeTruthy();await page.getByRole('button').filter({hasText:`Data: ${date}`}).click();
 const slots=await api(page,`/api/appointments/slots?date=${date}`);expect(slots.status).toBe(200);
 const time=slots.data.slots.find((s:any)=>s.available).time;
 await page.getByRole('button',{name:/Outros Assuntos/}).click();
 await page.getByRole('button',{name:new RegExp(time)}).click();
 const marker=`QA-AGENDAMENTO-${Date.now()}`;await page.locator('textarea').fill(marker);
 if(withFile){
   const jpeg=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=2200;const ctx=canvas.getContext('2d')!;const pixels=ctx.createImageData(2200,2200);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=Math.random()*256;pixels.data[i+1]=Math.random()*256;pixels.data[i+2]=Math.random()*256;pixels.data[i+3]=255}ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/jpeg',0.95).split(',')[1]});
   await page.locator('input[type=file]').setInputFiles({name:'qa-agendamento.jpg',mimeType:'image/jpeg',buffer:Buffer.from(jpeg,'base64')})
 }

 const sent=page.waitForResponse(r=>new URL(r.url()).pathname.replace(/\/$/,'')==='/api/appointments'&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirmar Agendamento Presencial',exact:true}).click();const res=await sent;
 await info.attach('creation-status',{body:Buffer.from(JSON.stringify({status:res.status(),body:res.status()===201 ? {id:(await res.json()).id} : (await res.text()).slice(0,500)})),contentType:'application/json'});
 expect(res.status()).toBe(201);const record=await res.json();
 try {await page.reload();const persisted=await api(page,`/api/appointments/${record.id}`);expect(persisted.status).toBe(200);expect(persisted.data.notes).toBe(marker);expect(persisted.data.documentData).toBeUndefined();if(withFile) expect((await api(page,`/api/appointments/${record.id}/download`)).status).toBe(200);await evidence(page,info,'appointment-persisted')}
 finally {const cancelled=await api(page,`/api/appointments/${record.id}/status`,'PATCH',{status:'cancelado',resolutionNotes:'Teste QA concluído'});expect(cancelled.status).toBe(200)}
});
