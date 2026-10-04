export type DomainHealth={isLive:boolean;status:string;latency:string;ssl:string;edge:string;registrar:string;aRecords:string[];cnameRecords:string[];nameservers:string[];timestamp:string};
export async function checkStoreHealth(apiUrl:string,request:typeof fetch=fetch):Promise<DomainHealth>{
 const checked=()=>new Date().toLocaleTimeString();
 try{
  const r=await request(apiUrl,{cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('Checker unavailable');
  const d=await r.json();
  if(d.domain!=='udecs.store'||typeof d.isLive!=='boolean'||!Number.isInteger(d.httpStatus))throw Error('Invalid checker response');
  return{isLive:d.isLive,status:d.isLive?`HTTPS response ${d.httpStatus} (checker probe)`:`Checker probe failed (${d.httpStatus||'no response'}); local reachability unverified`,latency:typeof d.latencyMs==='number'&&Number.isFinite(d.latencyMs)?`${d.latencyMs} ms (complete checker time, not edge latency)`:'Not measured',ssl:d.isLive?'HTTPS reachable from checker; certificate details not inspected':'Not verified',edge:d.currentRouting||'Not verified',registrar:d.registrar||'Not verified',aRecords:Array.isArray(d.aRecords)?d.aRecords:[],cnameRecords:Array.isArray(d.cnameRecords)?d.cnameRecords:[],nameservers:Array.isArray(d.nameservers)?d.nameservers:[],timestamp:checked()};
 }catch{
  const start=performance.now();
  try{
   const r=await request('https://udecs.store/',{method:'HEAD',mode:'cors',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(7000)});
   const live=r.status>=200&&r.status<400;
   return{isLive:live,status:`HTTPS response ${r.status} (direct client probe; diagnostic API unavailable)`,latency:`${Math.round(performance.now()-start)} ms (client round-trip, not edge latency)`,ssl:'HTTPS connection accepted by this client; expiry/protocol not inspected',edge:'DNS/routing not verified',registrar:'Not verified',aRecords:[],cnameRecords:[],nameservers:[],timestamp:checked()};
  }catch{
   return{isLive:false,status:'Check unavailable - site outage is not established',latency:'Not measured',ssl:'Not verified (probe unavailable)',edge:'Not verified',registrar:'Not verified',aRecords:[],cnameRecords:[],nameservers:[],timestamp:checked()};
  }
 }
}
