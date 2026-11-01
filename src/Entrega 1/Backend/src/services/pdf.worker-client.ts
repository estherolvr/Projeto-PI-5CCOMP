import { currentPdfExtractor } from './runtime-context'
export async function extractPdfText(buffer:Buffer):Promise<string>{
 const extractor=currentPdfExtractor()
 if(!extractor)throw new Error('Serviço de extração de PDF indisponível.')
 const response=await extractor.fetch('https://pdf-extractor/extract',{method:'POST',headers:{'Content-Type':'application/pdf'},body:new Uint8Array(buffer).buffer,signal:AbortSignal.timeout(20000)})
 if(!response.ok)throw new Error('Não foi possível extrair texto legível do PDF. Envie uma versão com texto selecionável, TXT ou Markdown.')
 const data=await response.json() as {text?:string}
 if(!data.text?.trim())throw new Error('Não foi possível extrair texto legível do PDF.')
 return data.text.trim()
}
