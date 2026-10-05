import {collection,doc,getDocsFromServer,limit,orderBy,query,runTransaction} from 'firebase/firestore';
import {auth,db} from '../firebase/config';
import {GstDraft,GstDraftInput,validateGstDraft,assertDraftRevision} from './draftInvoices';
function owner(){const u=auth.currentUser;if(!u?.emailVerified||!['sksaharukhossain1996@gmail.com','ecommerceunickdigital@gmail.com'].includes(u.email?.toLowerCase()||''))throw Error('Verified owner sign-in required.');return u.uid;}
export async function readGstDrafts(){owner();const s=await getDocsFromServer(query(collection(db,'gstInvoiceDrafts'),orderBy('updatedAt','desc'),limit(101)));if(s.size>100)throw Error('More than 100 GST drafts: filtered paging is required before exporting. No partial export.');return s.docs.map(d=>({...d.data(),id:d.id}as GstDraft));}
export function newGstDraftId(){return doc(collection(db,'gstInvoiceDrafts')).id;}
export async function saveGstDraft(id:string,input:GstDraftInput,opened?:GstDraft){
 const uid=owner(),fields=validateGstDraft(input),now=new Date().toISOString(),audit=doc(collection(db,'gstInvoiceAudit'));
 await runTransaction(db,async tx=>{const ref=doc(db,'gstInvoiceDrafts',id),old=await tx.get(ref);if(opened){if(!old.exists())throw Error('Draft missing. Refresh.');assertDraftRevision({...old.data(),id}as GstDraft,opened);}else if(old.exists()){const d=old.data();if(d.createdBy===uid&&JSON.stringify(Object.fromEntries(Object.keys(fields).map(k=>[k,d[k]])))===JSON.stringify(fields))return;throw Error('Draft ID already exists. Refresh before retry.');}
 const before=old.exists()?old.data():null;const after={...fields,status:'draft',revision:opened?opened.revision+1:1,createdBy:before?.createdBy||uid,createdAt:before?.createdAt||now,updatedBy:uid,updatedAt:now,auditId:audit.id};
 tx.set(ref,after);tx.set(audit,{draftId:id,action:opened?'edit':'add',before,after,actorUid:uid,at:now});});
}
export async function archiveGstDraft(opened:GstDraft,reason:string){const uid=owner(),now=new Date().toISOString();if(!reason.trim()||reason.length>500)throw Error('Archive reason required (max 500 characters).');const audit=doc(collection(db,'gstInvoiceAudit'));
 await runTransaction(db,async tx=>{const ref=doc(db,'gstInvoiceDrafts',opened.id),old=await tx.get(ref);if(!old.exists())throw Error('Draft missing.');assertDraftRevision({...old.data(),id:opened.id}as GstDraft,opened);const before=old.data(),after={...before,status:'archived',revision:opened.revision+1,updatedAt:now,updatedBy:uid,archiveReason:reason.trim(),auditId:audit.id};tx.update(ref,after);tx.set(audit,{draftId:opened.id,action:'archive',before,after,actorUid:uid,at:now});});
                                                                    }
