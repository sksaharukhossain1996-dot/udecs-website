import {auth}from'../firebase/config';import{QuoteDraft}from'./model';
export const QUOTE_API=import.meta.env.VITE_QUOTATION_API_URL||'';
export async function quoteRequest(path:string,method='GET',body?:unknown){if(!QUOTE_API)throw Error('Quotation service is not configured. Local draft/PDF only; no public link created.');const user=auth.currentUser;if(!user?.emailVerified)throw Error('Verified owner sign-in required.');const r=await fetch(QUOTE_API+path,{method,headers:{Authorization:'Bearer '+await user.getIdToken(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'Request not confirmed');return data}
export async function saveDraft(draft:QuoteDraft,expectedRevision:number){return quoteRequest('/v1/drafts','PUT',{draft,expectedRevision})}
export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function blob64(blob:Blob){const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(s)}
