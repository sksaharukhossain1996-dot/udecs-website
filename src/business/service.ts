import {collection,query,orderBy,limit,getDocsFromServer,doc,runTransaction,serverTimestamp,getDocFromServer} from 'firebase/firestore';
import {auth,db} from '../firebase/config';
export const owners=['sksaharukhossain1996@gmail.com','ecommerceunickdigital@gmail.com'];
export function owner(){const u=auth.currentUser;if(!u?.emailVerified||!owners.includes((u.email||'').toLowerCase()))throw Error('Verified owner sign-in required.');return u;}
export type Row={id:string;[k:string]:any};
export async function readRows(name:string,sort?:string,count=100){const u=owner();const q=query(collection(db,name),...(sort?[orderBy(sort,'desc')]:[]),limit(count));const s=await getDocsFromServer(q);if(owner().uid!==u.uid)throw Error('Account changed');return{rows:s.docs.map(d=>({id:d.id,...d.data()}as Row)),capped:s.size===count};}
export async function saveFollowUp(key:string,input:{source:string;sourceId:string;status:string;note:string;dueDate:string},expected:string|null){const u=owner();if(!['customers','orders','investorLeads','inquiries'].includes(input.source)||!['new','contacted','qualified','waiting','won','closed'].includes(input.status)||input.note.length>3000||!/^$|^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))throw Error('Review follow-up fields');const ref=doc(db,'crmFollowUps',key);await runTransaction(db,async tx=>{if(owner().uid!==u.uid)throw Error('Account changed');const d=await tx.get(ref);const current=d.exists()?d.data().revision:null;if(current!==expected)throw Error('Follow-up changed. Refresh before saving.');tx.set(ref,{...input,updatedBy:u.uid,updatedAt:serverTimestamp(),revision:crypto.randomUUID()})});const d=await getDocFromServer(ref);if(owner().uid!==u.uid||!d.exists())throw Error('Save not confirmed');return{id:d.id,...d.data()}as Row;}
export function text(v:any){return typeof v==='string'?v:''}
export function rupees(v:any){return typeof v==='number'&&Number.isFinite(v)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v):'Not recorded'}
export function dateText(v:any){const d=v?.toDate?.()||new Date(v);return Number.isFinite(d?.getTime?.())?d.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'Not recorded'}

export async function createInvestorLead(id:string,input:Record<string,string>,createdAt:string){
 const u=owner(),ref=doc(db,'investorLeads',id),audit=doc(collection(db,'auditLogs'));
 if(!input.name?.trim()||!input.company?.trim()||!input.email?.trim()||!input.city?.trim()||!/^\+?[0-9]{7,15}$/.test(input.phone))throw Error('Enter name, company, email, city and a valid phone.');
 await runTransaction(db,async tx=>{if(owner().uid!==u.uid)throw Error('Account changed');const old=await tx.get(ref);if(old.exists()){if(old.data().createdBy===u.uid&&old.data().createdAt===createdAt)return;throw Error('Lead reference already exists.');}tx.set(ref,{...input,approved:false,createdAt,createdBy:u.uid});tx.set(audit,{action:'INVESTOR_LEAD_ADDED',details:'Added lead '+id,userId:u.uid,timestamp:serverTimestamp()});});
}
export async function archiveInvestorLead(row:Row){
 const u=owner(),ref=doc(db,'investorLeads',row.id),audit=doc(collection(db,'auditLogs'));
 await runTransaction(db,async tx=>{if(owner().uid!==u.uid)throw Error('Account changed');const old=await tx.get(ref);if(!old.exists()||old.data().archived)throw Error('Lead is missing or already archived. Refresh.');const data=old.data();for(const key of ['name','company','email','phone','city','amount','message','approved'])if(data[key]!==row[key])throw Error('Lead changed. Refresh and confirm again.');tx.update(ref,{archived:true,archivedBy:u.uid,archivedAt:serverTimestamp()});tx.set(audit,{action:'INVESTOR_LEAD_ARCHIVED',details:'Archived lead '+row.id+'; original details and deck approval retained',userId:u.uid,timestamp:serverTimestamp()});});
}
