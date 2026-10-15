import React,{useEffect,useRef,useState} from 'react';
import {auth} from '../firebase/config';
import {mayaAnswer,mayaIntent,type MayaData,type MayaEmployee,type MayaOrder} from './mayaBrain';

type Msg={q:string;a:string;at:number};
const ORDER_CAP=500;
const CACHE_MS=5*60*1000;

function isOwner(){const u=auth.currentUser;return !!u?.emailVerified&&['sksaharukhossain1996@gmail.com','ecommerceunickdigital@gmail.com'].includes(u.email||'');}

const css=`.maya{background:#08150d;border:1px solid #36573e;border-radius:15px;padding:22px;margin:20px 0;color:#b9f5c8;font:14px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}
.maya *{box-sizing:border-box}
.maya-eyebrow{font-size:11px;letter-spacing:1px;font-weight:700;color:#70bc87;margin:0}
.maya h2{color:#a4ffbc;font-size:24px;margin:5px 0 8px}
.maya-desc{color:#97c7a4;font-size:13px;margin:0 0 14px}
.maya-log{display:flex;flex-direction:column;gap:10px;max-height:380px;overflow-y:auto;background:#0c1a11;border:1px solid #2c4b35;border-radius:10px;padding:14px}
.maya-q{align-self:flex-end;background:#1d3a28;border:1px solid #376e49;color:#cdffd9;border-radius:10px 10px 2px 10px;padding:8px 12px;max-width:85%;font-size:13px;white-space:pre-wrap}
.maya-a{align-self:flex-start;background:#102218;border:1px solid #33553c;color:#b9f5c8;border-radius:10px 10px 10px 2px;padding:10px 12px;max-width:92%;font-size:13px;white-space:pre-wrap}
.maya-a small{display:block;margin-top:6px;color:#7ba487;font-size:10px}
.maya-empty{color:#8db59a;font-size:12px;text-align:center;padding:18px}
.maya form{display:flex;gap:10px;margin-top:14px}
.maya input{flex:1;background:#08150d;border:1px solid #4e775b;border-radius:8px;color:#bdf9ca;padding:11px 12px;font:13px/1.4 ui-monospace,Consolas,monospace}
.maya button{background:#a3ffb7;color:#07110b;border:none;border-radius:8px;padding:0 18px;font:inherit;font-weight:700;cursor:pointer}
.maya button:disabled{opacity:.5;cursor:default}
.maya-foot{margin-top:12px;font-size:11px;color:#7ba487}
@media(max-width:700px){.maya{padding:14px 10px}.maya form{flex-direction:column}.maya button{padding:10px}}`;

export function MayaChat(){
 const[owner,setOwner]=useState(isOwner());
 const[msgs,setMsgs]=useState<Msg[]>([]);
 const[draft,setDraft]=useState('');
 const[busy,setBusy]=useState(false);
 const cache=useRef<MayaData|null>(null);
 const logRef=useRef<HTMLDivElement|null>(null);

 useEffect(()=>auth.onAuthStateChanged(()=>{setOwner(isOwner());cache.current=null;setMsgs([]);}),[]);
 useEffect(()=>{logRef.current?.scrollTo({top:logRef.current.scrollHeight});},[msgs]);

 async function loadData():Promise<MayaData>{
  if(cache.current&&Date.now()-cache.current.loadedAt<CACHE_MS)return cache.current;
  const u=auth.currentUser;
  if(!u)throw Error('Sign in required.');
  const token=await u.getIdToken();
  const base='https://firestore.googleapis.com/v1/projects/udecs-store/databases/(default)/documents/';
  const val=(v:any):any=>v?('stringValue'in v?v.stringValue:'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'timestampValue'in v?v.timestampValue:'booleanValue'in v?v.booleanValue:null):null;
  async function readCol(name:string,pageSize:number):Promise<Record<string,any>[]|null>{
   try{
    const res=await fetch(base+name+'?pageSize='+pageSize,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
    if(!res.ok)return null;
    const j=await res.json();
    const docs=Array.isArray(j.documents)?j.documents:[];
    return docs.map((d:any)=>({__id:String(d.name||'').split('/').pop(),...Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,val(v)]))}));
   }catch{return null;}
  }
  const orderRows=await readCol('orders',ORDER_CAP+1);
  const orderLimitHit=!!orderRows&&orderRows.length>ORDER_CAP;
  const orders:MayaOrder[]|null=orderRows?orderRows.slice(0,ORDER_CAP).map(r=>({id:String(r.__id||''),createdAt:typeof r.createdAt==='string'?r.createdAt:undefined,totalAmount:Number.isFinite(Number(r.totalAmount))?Number(r.totalAmount):undefined,paymentStatus:typeof r.paymentStatus==='string'?r.paymentStatus:undefined,orderStatus:typeof r.orderStatus==='string'?r.orderStatus:undefined,paymentMethod:typeof r.paymentMethod==='string'?r.paymentMethod:undefined,totalGst:Number.isFinite(Number(r.totalGst))?Number(r.totalGst):undefined})):null;
  const empRows=await readCol('employees',200);
  const employees:MayaEmployee[]|null=empRows?empRows.map(r=>({baseSalary:Number.isFinite(Number(r.baseSalary))?Number(r.baseSalary):undefined,status:typeof r.status==='string'?r.status:undefined,name:typeof r.name==='string'?r.name:undefined})):null;
  const expRows=await readCol('expenses',500);
  let expensesMonth:number|null=null;
  if(expRows&&expRows.length){
   const month=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}).slice(0,7);
   let sum=0,seen=false;
   for(const r of expRows){const when=typeof r.date==='string'?r.date:typeof r.createdAt==='string'?r.createdAt:'';const amount=Number(r.amount);if(when.startsWith(month)&&Number.isFinite(amount)&&amount>=0){sum+=amount;seen=true;}}
   if(seen)expensesMonth=sum;
  }
  const data:MayaData={orders,orderLimitHit,employees,expensesMonth,loadedAt:Date.now()};
  cache.current=data;
  return data;
 }
 async function send(text:string){
  const q=text.trim();
  if(!q||busy)return;
  setBusy(true);setDraft('');
  const intent=mayaIntent(q);
  let data:MayaData|null=null;
  if(['sales','orders','salary','profit','gst','expense'].includes(intent)){
   try{data=await loadData();}catch{data=null;}
  }
  const a=mayaAnswer(intent,data);
  setMsgs(m=>[...m.slice(-11),{q,a,at:Date.now()}]);
  setBusy(false);
 }

 if(!owner)return <section className="maya"><style>{css}</style><p className="maya-eyebrow">MAYA · HISAAB ASSISTANT</p><h2>Talk to Maya</h2><p className="maya-empty">Sign in with your owner account to chat with Maya.</p></section>;

 return <section className="maya"><style>{css}</style>
  <p className="maya-eyebrow">MAYA · HISAAB ASSISTANT · LIVE DATA</p>
  <h2>Talk to Maya</h2>
  <p className="maya-desc">Accounts, finance aur business ka hisaab - live orders/staff data se. Sirf jawab deti hai, koi action ya payment kabhi nahi karti.</p>
  <div className="maya-log" ref={logRef}>
   {msgs.length===0&&<p className="maya-empty">Boss, kuch bhi poochho - jaise "aaj kitni sale hui?", "kitne orders pending?", "GST kitna jama hua?" ya "help".</p>}
   {msgs.map((m,i)=><React.Fragment key={i}>
    <div className="maya-q">{m.q}</div>
    <div className="maya-a">{m.a}<small>Maya · {new Date(m.at).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})} IST · live data, read-only</small></div>
   </React.Fragment>)}
  </div>
  <form onSubmit={e=>{e.preventDefault();void send(draft);}}>
   <input value={draft} maxLength={500} onChange={e=>setDraft(e.target.value)} placeholder="Hindi ya English me poochho..." aria-label="Message for Maya"/>
   <button type="submit" disabled={busy||!draft.trim()}>{busy?'...':'Send'}</button>
  </form>
  <p className="maya-foot">Maya sirf hisaab aur salah deti hai. Payment, refund, order change, customer message - yeh sab hamesha aapke haath mein. Numbers live data se aate hain; jahan data connected nahi, wahan saaf bolti hai.</p>
 </section>;
}
