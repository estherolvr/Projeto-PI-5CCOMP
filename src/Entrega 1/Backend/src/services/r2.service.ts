import { currentStorage } from './runtime-context'
class R2StorageService {
 public isConfigured():boolean{return Boolean(currentStorage())}
 public async uploadBuffer(key:string,buffer:Buffer,contentType:string):Promise<string>{const bucket=currentStorage();if(!bucket)throw new Error('Armazenamento de arquivos indisponível.');await bucket.put(key,buffer,{httpMetadata:{contentType}});return key}
 public async uploadBase64(key:string,data:string){const match=data.match(/^data:([^;]+);base64,([\s\S]+)$/);if(!match)throw new Error('Arquivo em formato inválido.');const buffer=Buffer.from(match[2],'base64'),contentType=match[1];await this.uploadBuffer(key,buffer,contentType);return {key,sizeBytes:buffer.length,contentType}}
 public async getFile(key:string){const bucket=currentStorage();if(!bucket)throw new Error('Armazenamento de arquivos indisponível.');const object=await bucket.get(key);return object?{buffer:Buffer.from(await object.arrayBuffer()),contentType:object.httpMetadata?.contentType||'application/octet-stream'}:null}
 public async saveConversationSnapshot(conversationId:string,studentId:string,data:{title?:string;student?:unknown;messages:unknown[];updatedAt?:Date|string;metadata?:Record<string,unknown>}):Promise<string|null>{
  if(!this.isConfigured())return null
  const key=`conversas/${studentId}/${conversationId}.json`,snapshot={conversationId,studentId,title:data.title,student:data.student??null,messages:data.messages,messageCount:data.messages.length,updatedAt:data.updatedAt??new Date().toISOString(),syncedAt:new Date().toISOString(),metadata:data.metadata??{}}
  await this.uploadBuffer(key,Buffer.from(JSON.stringify(snapshot)),'application/json');return key
 }
 public async getConversationSnapshot(conversationId:string,studentId:string){if(!this.isConfigured())return null;const file=await this.getFile(`conversas/${studentId}/${conversationId}.json`);return file?JSON.parse(file.buffer.toString('utf8')):null}
 public async deleteObject(key:string):Promise<boolean>{const bucket=currentStorage();if(!bucket)return false;await bucket.delete(key);return true}
}
export const r2Service=new R2StorageService()
