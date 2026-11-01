import { extractPdfText } from './src/Entrega 1/Backend/src/services/pdf.service'
export default {
 async fetch(request:Request):Promise<Response>{
  if(request.method!=='POST'||new URL(request.url).pathname!=='/extract')return new Response('Not found',{status:404})
  if(Number(request.headers.get('Content-Length'))>25*1024*1024)return new Response('File too large',{status:413})
  const bytes=await request.arrayBuffer()
  if(bytes.byteLength>25*1024*1024)return new Response('File too large',{status:413})
  try{return Response.json({text:await extractPdfText(Buffer.from(bytes))},{headers:{'Cache-Control':'no-store'}})}
  catch{return Response.json({error:'Não foi possível extrair texto legível do PDF.'},{status:422})}
 }
}
