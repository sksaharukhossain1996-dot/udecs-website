import {collection,documentId,getDocsFromServer,limit,orderBy,query,startAfter,where} from 'firebase/firestore';
import {db} from '../firebase/config';
import {owner,Row} from '../business/service';
import {collectServerPages} from './paging';
const sources=['products','orders','crmFollowUps','hrEmployees','erpBankTransactions','workflowReviewDrafts','operationsRegisters','operationsMatches'] as const;
const privateSources=new Set<string>(['workflowReviewDrafts','operationsRegisters','operationsMatches']);
export async function readWorkflowSources(){
  const uid=owner().uid;
  const check=()=>{if(owner().uid!==uid)throw Error('Account changed. Source load stopped.');};
  const values:Record<string,Row[]>={};
  // Sequential pages and collections avoid a burst of parallel source reads.
  for(const name of sources){
    values[name]=await collectServerPages<Row>(async(after,size)=>{
      check();
      const s=await getDocsFromServer(query(collection(db,name),...(privateSources.has(name)?[where('ownerUid','==',uid)]:[]),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(size)));
      check();
      return s.docs.map(d=>({...d.data(),id:d.id}));
    },check);
  }
  check();
  return {...values,drafts:values.workflowReviewDrafts,bank:values.erpBankTransactions,operations:values.operationsRegisters,matches:values.operationsMatches};
}
