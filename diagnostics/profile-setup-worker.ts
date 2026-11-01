import { Client } from '../src/Entrega 1/Backend/node_modules/pg'
const emails = ['joao.fsantana@outlook.com', 'higorlfonsecas@gmail.com', 'oliveiracostaesther@gmail.com']
export default {
  async fetch(request: Request, env: any) {
    if (Date.now() > Number(env.EXPIRES_AT)) return new Response('Expired', { status: 410 })
    if (!env.DIAGNOSTIC_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.DIAGNOSTIC_TOKEN}`) return new Response('Unauthorized', {status:401})
    if (request.method !== 'POST' || !['/inspect','/apply'].includes(new URL(request.url).pathname)) return new Response('Not found', {status:404})
    const client = new Client({ connectionString:env.HYPERDRIVE.connectionString,connectionTimeoutMillis:10000,query_timeout:10000 })
    client.on('error',()=>{})
    try {
      await client.connect()
      if (new URL(request.url).pathname === '/apply') {
        await client.query('BEGIN')
        try {
          const staff = [
            {name:'João',email:emails[0],role:'asa',department:'ASA',auth:'54233c21-bb63-46b1-ba15-aa4b6b9c2613'},
            {name:'Esther',email:emails[2],role:'admin',department:'Administração',auth:'ecb979f4-a991-4ec9-bdc6-e9720fee4dd6'},
          ]
          const profiles: any[] = []
          for (const user of staff) {
            const row = await client.query(`INSERT INTO public."User" (id,name,email,password,role,department,status,auth_user_id,"updatedAt")
              VALUES ($1,$2,$3,$4,$5,$6,'ativo',$7::uuid,now())
              ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,department=EXCLUDED.department,status='ativo',auth_user_id=EXCLUDED.auth_user_id,"updatedAt"=now()
              WHERE "User".auth_user_id IS NULL OR "User".auth_user_id=EXCLUDED.auth_user_id
              RETURNING id,name,email,role,status,auth_user_id`,
              [crypto.randomUUID(),user.name,user.email,'!supabase-auth-only!'+crypto.randomUUID(),user.role,user.department,user.auth])
            if (row.rows.length !== 1) throw new Error('An existing staff identity has a different Auth link; transaction canceled.')
            profiles.push(row.rows[0])
          }
          let ra = '202600123'
          for (let attempt=0;attempt<100;attempt++) {
            ra=String(202600123+attempt)
            const existing=await client.query('SELECT email FROM public."Student" WHERE ra=$1',[ra])
            if (!existing.rows.length || existing.rows[0].email===emails[1]) break
            if(attempt===99) throw new Error('No test RA available; transaction canceled.')
          }
          const student = await client.query(`INSERT INTO public."Student" (id,name,email,ra,course,semester,period,status,auth_user_id,"updatedAt")
            VALUES ($1,'Higor',$2,$3,'Ciência da Computação',5,'noite','regular',$4::uuid,now())
            ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,ra=EXCLUDED.ra,course=EXCLUDED.course,semester=EXCLUDED.semester,period=EXCLUDED.period,status='regular',auth_user_id=EXCLUDED.auth_user_id,"updatedAt"=now()
            WHERE "Student".auth_user_id IS NULL OR "Student".auth_user_id=EXCLUDED.auth_user_id
            RETURNING id,name,email,ra,course,semester,period,status,auth_user_id`,
            [crypto.randomUUID(),emails[1],ra,'e1e59dd0-1c10-4890-aca3-6afe10ab0271'])
          if (student.rows.length!==1) throw new Error('An existing student identity has a different Auth link; transaction canceled.')
          profiles.push({...student.rows[0],role:'aluno'})
          const admin=profiles.find(profile=>profile.role==='admin')
          await client.query(`INSERT INTO public."AuditEvent" (id,"userId","userName","userRole",action,resource,"resourceId",details,ip,severity,"createdAt")
            VALUES ($1,$2,'Esther','admin','VINCULOU_PERFIS_AUTH','User',$2,$3,'127.0.0.1','info',now())`,
            [crypto.randomUUID(),admin.id,JSON.stringify({source:'authorized_initial_profile_setup',profiles:profiles.map(profile=>({email:profile.email,role:profile.role})),studentData:'synthetic_test_data_requested_by_user'})])
          await client.query('COMMIT')
          return Response.json({committed:true,profiles},{headers:{'Cache-Control':'no-store'}})
        } catch(error) {await client.query('ROLLBACK');throw error}
      }
      const columns = await client.query(`SELECT table_name,column_name,is_nullable,column_default,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('User','Student') ORDER BY table_name,ordinal_position`)
      const users = await client.query('SELECT id,name,email,role,status FROM public."User" WHERE email=ANY($1)',[emails])
      const students = await client.query('SELECT id,name,email,ra,course,semester,period,status FROM public."Student" WHERE email=ANY($1)',[emails])
      const policies = await client.query(`SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('User','Student')`)
      return Response.json({columns:columns.rows,users:users.rows,students:students.rows,policies:policies.rows},{headers:{'Cache-Control':'no-store'}})
    } catch(error:any) {return Response.json({error:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').slice(0,400),code:error.code},{status:500})}
    finally {await client.end().catch(()=>{})}
  }
}
