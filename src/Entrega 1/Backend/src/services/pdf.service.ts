/** Local extraction; production calls the private PDF Worker through a binding. */
export async function extractPdfText(buffer:Buffer):Promise<string>{
 try{
  const {extractText}=await import('unpdf')
  const result=await extractText(new Uint8Array(buffer),{mergePages:true})
  const text=result.text.trim()
  if(!text)throw new Error('PDF sem texto legível.')
  return text
 }catch{throw new Error('Não foi possível extrair texto legível do PDF. Envie uma versão com texto selecionável, TXT ou Markdown.')}
}
