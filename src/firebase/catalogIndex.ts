import {collection,doc,getDocsFromServer,getDocFromServer,getCountFromServer,query,where,documentId,limit,orderBy,startAfter, type DocumentSnapshot} from 'firebase/firestore';
import {db} from './config';
import type {Product} from '../types';
import {INDEX_COLLECTION,CHUNK_COUNT,INDEX_VERSION,matchesEntry} from '../../public/catalog-index-core.mjs';
export type SearchEntry={id:string;name:string;nameBn:string;sku:string;category:string;hsn:string;supplier:string};
export const CATALOG_PAGE_SIZE=24;
const CACHE_MS=30*60*1000;
function cacheGet<T>(key:string):T|null{try{const raw=localStorage.getItem(key);if(!raw)return null;const v=JSON.parse(raw);if(!v||typeof v.t!=='number'||Date.now()-v.t>CACHE_MS||v.t>Date.now()+60000||v.ver!==INDEX_VERSION)return null;return v.d as T;}catch{return null;}}
function cachePut(key:string,d:unknown){try{localStorage.setItem(key,JSON.stringify({t:Date.now(),ver:INDEX_VERSION,d}));}catch{}}
export async function readSearchIndex(useCache=false):Promise<SearchEntry[]>{
 if(!useCache)return readSearchIndexFresh();
 const cached=cacheGet<SearchEntry[]>('udecs.catIdx.v1');if(cached&&Array.isArray(cached)&&cached.length)return cached;
 const fresh=await readSearchIndexFresh();cachePut('udecs.catIdx.v1',fresh);return fresh;
}
async function readSearchIndexFresh():Promise<SearchEntry[]>{
 const snapshots=await Promise.all(Array.from({length:CHUNK_COUNT},(_,n)=>getDocFromServer(doc(db,INDEX_COLLECTION,String(n).padStart(2,'0')))));
 const seen=new Set<string>();const entries:SearchEntry[]=[];
 for(const d of snapshots){if(!d.exists())throw Error('Catalog search index is incomplete. Please try later.');const v=d.data();if(v.version!==INDEX_VERSION||!Array.isArray(v.entries))throw Error('Catalog search index version unavailable.');for(const e of v.entries){if(!e?.id||seen.has(e.id))throw Error('Catalog search index invalid.');seen.add(e.id);entries.push(e);}}
 return entries.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export function matchCatalog(index:SearchEntry[],text='',category='all',extra=false){return index.filter(e=>matchesEntry(e,text,category,extra));}
export async function readProductsByIds(ids:string[]):Promise<Product[]>{
 if(ids.length>CATALOG_PAGE_SIZE)throw Error('Catalog page size exceeded');if(!ids.length)return [];
 const snapshot=await getDocsFromServer(query(collection(db,'products'),where(documentId(),'in',ids),limit(CATALOG_PAGE_SIZE)));
 const byId=new Map(snapshot.docs.map(d=>[d.id,{...d.data(),id:d.id} as Product]));
 return ids.flatMap(id=>{const p=byId.get(id);return p&&!(p as any).hidden&&!(p as any).gatewayVerification?[p]:[];});
}
// Admin-only: merge supplier cost/source fields from productsPrivate. Rules deny
// this collection to non-admins; callers must be owner-verified admin views.
export async function readProductsPrivateByIds(ids:string[]):Promise<Map<string,Record<string,any>>>{
 const out=new Map<string,Record<string,any>>();
 for(let i=0;i<ids.length;i+=10){
  const snap=await getDocsFromServer(query(collection(db,'productsPrivate'),where(documentId(),'in',ids.slice(i,i+10))));
  snap.docs.forEach(d=>out.set(d.id,d.data()));
 }
 return out;
}
export async function readProductPage(cursor?:DocumentSnapshot){
 const constraints:any[]=[orderBy(documentId()),limit(CATALOG_PAGE_SIZE)];if(cursor)constraints.push(startAfter(cursor));
 const snapshot=await getDocsFromServer(query(collection(db,'products'),...constraints));
 return {products:snapshot.docs.map(d=>({...d.data(),id:d.id} as Product)).filter(p=>!(p as any).hidden&&!(p as any).gatewayVerification),cursor:snapshot.docs.at(-1),hasMore:snapshot.size===CATALOG_PAGE_SIZE};
}

export async function readCatalogCount(useCache=false){
 if(!useCache)return (await getCountFromServer(collection(db,'products'))).data().count;
 const cached=cacheGet<number>('udecs.catCount.v1');if(typeof cached==='number')return cached;
 const n=(await getCountFromServer(collection(db,'products'))).data().count;cachePut('udecs.catCount.v1',n);return n;
}
