import { AsyncLocalStorage } from 'node:async_hooks'
export interface StorageObject { arrayBuffer():Promise<ArrayBuffer>; httpMetadata?:{contentType?:string} }
export interface StorageBucket { put(key:string,value:Uint8Array,options?:{httpMetadata:{contentType:string}}):Promise<unknown>; get(key:string):Promise<StorageObject|null>; delete(key:string):Promise<void> }
interface RuntimeContext {storage?:StorageBucket;pdfExtractor?:{fetch(input:string,init?:RequestInit):Promise<Response>};waitUntil:(promise:Promise<unknown>)=>void}
const runtime=new AsyncLocalStorage<RuntimeContext>()
export function withRuntimeContext<T>(context:RuntimeContext,callback:()=>T):T{return runtime.run(context,callback)}
export function currentStorage(){return runtime.getStore()?.storage}
export function scheduleBackground(task:Promise<unknown>){const context=runtime.getStore();if(context)context.waitUntil(task);else void task.catch(()=>{})}

export function currentPdfExtractor(){return runtime.getStore()?.pdfExtractor}
